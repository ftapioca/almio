'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';
import { useBackofficeContext } from '../_components/backoffice-client-context';

type Branch = {
  id: string;
  code: string;
  name: string;
  status: string;
  timezone: string;
};

type Employee = {
  id: string;
  branchId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  status: string;
};

type AttendanceRecord = {
  id: string;
  branchId: string;
  employeeId: string;
  eventType: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END';
  eventAt: string;
  source: 'MANUAL' | 'DEVICE' | 'IMPORT';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

const attendanceEventOptions: AttendanceRecord['eventType'][] = [
  'CHECK_IN',
  'BREAK_START',
  'BREAK_END',
  'CHECK_OUT',
];

const attendanceSourceOptions: AttendanceRecord['source'][] = [
  'MANUAL',
  'DEVICE',
  'IMPORT',
];

function normalizeApiBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function toDatetimeLocalValue(date = new Date()) {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-CL', {
    dateStyle: 'medium',
  });
}

function getDayBounds(value: string) {
  const source = value ? new Date(value) : new Date();
  const start = new Date(source);
  start.setHours(0, 0, 0, 0);

  const end = new Date(source);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function deriveAttendanceJourneyStatus(records: AttendanceRecord[]) {
  const ordered = [...records].sort(
    (left, right) => new Date(left.eventAt).getTime() - new Date(right.eventAt).getTime(),
  );
  const lastRecord = ordered.at(-1);

  if (!lastRecord) {
    return 'Sin actividad';
  }

  switch (lastRecord.eventType) {
    case 'CHECK_IN':
      return 'En jornada';
    case 'BREAK_START':
      return 'En colación/pausa';
    case 'BREAK_END':
      return 'De vuelta de pausa';
    case 'CHECK_OUT':
      return 'Jornada cerrada';
    default:
      return 'Estado no derivado';
  }
}

async function parseApiResponse(response: Response) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      payload?.error?.message ??
        payload?.message ??
        'No fue posible completar la operacion',
    );
  }

  return payload;
}

export function AttendanceConsole({
  initialApiBaseUrl,
  initialTenantId,
}: {
  initialApiBaseUrl: string;
  initialTenantId: string;
}) {
  const backoffice = useBackofficeContext();
  const [apiBaseUrl, setApiBaseUrl] = useState(initialApiBaseUrl);
  const [tenantId, setTenantId] = useState(initialTenantId);
  const [accessToken, setAccessToken] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employeeDayRecords, setEmployeeDayRecords] = useState<AttendanceRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [filterBranchId, setFilterBranchId] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [filterEmployeeSearchTerm, setFilterEmployeeSearchTerm] = useState('');
  const [filterEventType, setFilterEventType] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [eventType, setEventType] = useState<AttendanceRecord['eventType']>('CHECK_IN');
  const [source, setSource] = useState<AttendanceRecord['source']>('MANUAL');
  const [eventAtInput, setEventAtInput] = useState(toDatetimeLocalValue());
  const [notes, setNotes] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, []);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      setAccessToken(data.session?.access_token ?? '');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? '');
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setTenantId(backoffice.tenantId);
  }, [backoffice.tenantId]);

  useEffect(() => {
    if (backoffice.accessToken.trim()) {
      setAccessToken(backoffice.accessToken);
    }
  }, [backoffice.accessToken]);

  useEffect(() => {
    if (!filterBranchId && backoffice.activeBranchId) {
      setFilterBranchId(backoffice.activeBranchId);
    }
    if (!selectedBranchId && backoffice.activeBranchId) {
      setSelectedBranchId(backoffice.activeBranchId);
    }
  }, [backoffice.activeBranchId, filterBranchId, selectedBranchId]);

  const branchNameById = useMemo(
    () =>
      new Map(
        branches.map((branch) => [
          branch.id,
          `${branch.code} · ${branch.name}`,
        ]),
      ),
    [branches],
  );

  const employeeNameById = useMemo(
    () =>
      new Map(
        employees.map((employee) => [
          employee.id,
          `${employee.firstName} ${employee.lastName}`,
        ]),
      ),
    [employees],
  );

  const employeesForSelectedBranch = useMemo(() => {
    if (!selectedBranchId) {
      return employees;
    }

    return employees.filter((employee) => employee.branchId === selectedBranchId);
  }, [employees, selectedBranchId]);

  const employeesForSelectedBranchFiltered = useMemo(() => {
    const search = employeeSearchTerm.trim().toLowerCase();

    if (!search) {
      return employeesForSelectedBranch;
    }

    return employeesForSelectedBranch.filter((employee) => {
      const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
      return (
        fullName.includes(search) ||
        employee.email?.toLowerCase().includes(search) ||
        employee.id.toLowerCase().includes(search)
      );
    });
  }, [employeeSearchTerm, employeesForSelectedBranch]);

  const employeesForFilterBranchFiltered = useMemo(() => {
    const search = filterEmployeeSearchTerm.trim().toLowerCase();
    const scopedEmployees = employees.filter(
      (employee) => !filterBranchId || employee.branchId === filterBranchId,
    );

    if (!search) {
      return scopedEmployees;
    }

    return scopedEmployees.filter((employee) => {
      const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
      return (
        fullName.includes(search) ||
        employee.email?.toLowerCase().includes(search) ||
        employee.id.toLowerCase().includes(search)
      );
    });
  }, [employees, filterBranchId, filterEmployeeSearchTerm]);

  const attendanceJourneySummary = useMemo(() => {
    const ordered = [...employeeDayRecords].sort(
      (left, right) => new Date(left.eventAt).getTime() - new Date(right.eventAt).getTime(),
    );

    return {
      orderedRecords: ordered,
      firstRecord: ordered.at(0) ?? null,
      lastRecord: ordered.at(-1) ?? null,
      totalEvents: ordered.length,
      currentStatus: deriveAttendanceJourneyStatus(ordered),
    };
  }, [employeeDayRecords]);

  function resetEditor() {
    setSelectedRecordId('');
    setSelectedBranchId(backoffice.activeBranchId ?? '');
    setSelectedEmployeeId('');
    setEmployeeSearchTerm('');
    setEventType('CHECK_IN');
    setSource('MANUAL');
    setEventAtInput(toDatetimeLocalValue());
    setNotes('');
    setIdempotencyKey(crypto.randomUUID());
  }

  async function loadReferenceData(currentToken: string) {
    const baseUrl = normalizeApiBaseUrl(apiBaseUrl);
    const headers = {
      Authorization: `Bearer ${currentToken.trim()}`,
      'X-Tenant-ID': tenantId.trim(),
    };

    const [branchesResponse, employeesResponse] = await Promise.all([
      fetch(`${baseUrl}/branches?limit=100`, { headers }),
      fetch(`${baseUrl}/employees?limit=100`, { headers }),
    ]);

    const branchesPayload = await parseApiResponse(branchesResponse);
    const employeesPayload = await parseApiResponse(employeesResponse);
    setBranches(branchesPayload.data as Branch[]);
    setEmployees(employeesPayload.data as Employee[]);
  }

  async function loadAttendance(currentToken: string) {
    const baseUrl = normalizeApiBaseUrl(apiBaseUrl);
    const params = new URLSearchParams({
      page: '1',
      limit: '20',
    });

    if (filterBranchId) {
      params.set('branchId', filterBranchId);
    }
    if (filterEmployeeId) {
      params.set('employeeId', filterEmployeeId);
    }
    if (filterEventType) {
      params.set('eventType', filterEventType);
    }
    if (filterFrom) {
      params.set('from', new Date(filterFrom).toISOString());
    }
    if (filterTo) {
      params.set('to', new Date(filterTo).toISOString());
    }

    const response = await fetch(`${baseUrl}/attendance?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${currentToken.trim()}`,
        'X-Tenant-ID': tenantId.trim(),
      },
    });

    const payload = await parseApiResponse(response);
    const nextRecords = payload.data as AttendanceRecord[];
    setRecords(nextRecords);

    if (selectedRecordId && !nextRecords.some((record) => record.id === selectedRecordId)) {
      setSelectedRecordId('');
    }
  }

  async function loadAttendanceRecordById(recordId: string, currentToken: string) {
    const response = await fetch(
      `${normalizeApiBaseUrl(apiBaseUrl)}/attendance/${recordId}`,
      {
        headers: {
          Authorization: `Bearer ${currentToken.trim()}`,
          'X-Tenant-ID': tenantId.trim(),
        },
      },
    );

    const payload = await parseApiResponse(response);
    return payload.data as AttendanceRecord;
  }

  async function loadEmployeeDaySummary(
    currentToken: string,
    branchId: string,
    employeeId: string,
    eventAtValue: string,
  ) {
    const { start, end } = getDayBounds(eventAtValue);
    const params = new URLSearchParams({
      page: '1',
      limit: '100',
      branchId,
      employeeId,
      from: start.toISOString(),
      to: end.toISOString(),
    });

    const response = await fetch(
      `${normalizeApiBaseUrl(apiBaseUrl)}/attendance?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${currentToken.trim()}`,
          'X-Tenant-ID': tenantId.trim(),
        },
      },
    );

    const payload = await parseApiResponse(response);
    setEmployeeDayRecords(payload.data as AttendanceRecord[]);
  }

  async function initializeConsole() {
    if (!accessToken.trim() || !tenantId.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadReferenceData(accessToken),
        loadAttendance(accessToken),
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Error inesperado al cargar attendance',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void initializeConsole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, tenantId]);

  useEffect(() => {
    if (!accessToken.trim() || !selectedBranchId || !selectedEmployeeId || !eventAtInput) {
      setEmployeeDayRecords([]);
      return;
    }

    void loadEmployeeDaySummary(
      accessToken,
      selectedBranchId,
      selectedEmployeeId,
      eventAtInput,
    ).catch(() => {
      setEmployeeDayRecords([]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, selectedBranchId, selectedEmployeeId, eventAtInput, tenantId, apiBaseUrl]);

  async function handleRefresh() {
    setSuccess(null);
    await initializeConsole();
  }

  async function handleFiltersSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess(null);
    await handleRefresh();
  }

  async function handleCreateAttendance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !selectedBranchId ||
      !selectedEmployeeId ||
      !eventAtInput ||
      !accessToken.trim()
    ) {
      setError('Sucursal, colaborador y sesion son obligatorios');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${normalizeApiBaseUrl(apiBaseUrl)}/attendance`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken.trim()}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          'X-Tenant-ID': tenantId.trim(),
        },
        body: JSON.stringify({
          branchId: selectedBranchId,
          employeeId: selectedEmployeeId,
          eventType,
          eventAt: new Date(eventAtInput).toISOString(),
          source,
          notes: notes.trim() || undefined,
        }),
      });

      const payload = await parseApiResponse(response);
      const createdRecord = payload.data as AttendanceRecord;

      setSuccess(
        `Marcacion ${createdRecord.eventType} registrada para ${formatDateTime(createdRecord.eventAt)}`,
      );
      resetEditor();
      await loadAttendance(accessToken);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Error inesperado al crear la marcacion',
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdateAttendance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !selectedRecordId ||
      !selectedBranchId ||
      !selectedEmployeeId ||
      !eventAtInput ||
      !accessToken.trim()
    ) {
      setError('Debes cargar una marcacion y completar sucursal, colaborador y fecha');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `${normalizeApiBaseUrl(apiBaseUrl)}/attendance/${selectedRecordId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken.trim()}`,
            'Content-Type': 'application/json',
            'X-Tenant-ID': tenantId.trim(),
          },
          body: JSON.stringify({
            branchId: selectedBranchId,
            employeeId: selectedEmployeeId,
            eventType,
            eventAt: new Date(eventAtInput).toISOString(),
            source,
            notes: notes.trim() || null,
          }),
        },
      );

      const payload = await parseApiResponse(response);
      const updatedRecord = payload.data as AttendanceRecord;

      setSuccess(`Marcacion ${updatedRecord.id} actualizada`);
      await loadAttendance(accessToken);
      setSelectedRecordId(updatedRecord.id);
      setSelectedBranchId(updatedRecord.branchId);
      setSelectedEmployeeId(updatedRecord.employeeId);
      setEventType(updatedRecord.eventType);
      setSource(updatedRecord.source);
      setEventAtInput(toDatetimeLocalValue(new Date(updatedRecord.eventAt)));
      setNotes(updatedRecord.notes ?? '');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Error inesperado al actualizar la marcacion',
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function loadRecordIntoEditor(recordId: string) {
    if (!accessToken.trim()) {
      setError('No hay sesion activa para cargar la marcacion');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const record = await loadAttendanceRecordById(recordId, accessToken);
      setSelectedRecordId(record.id);
      setSelectedBranchId(record.branchId);
      backoffice.setActiveBranchId(record.branchId);
      setSelectedEmployeeId(record.employeeId);
      setEventType(record.eventType);
      setSource(record.source);
      setEventAtInput(toDatetimeLocalValue(new Date(record.eventAt)));
      setNotes(record.notes ?? '');
      setSuccess(`Marcacion ${record.id} cargada para edición`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Error inesperado al cargar la marcacion',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-[30px] border border-border/70 bg-surface/95 p-6 shadow-card backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold">Attendance Console</p>
            <p className="text-sm text-muted">
              Filtros y marcacion manual sobre el contrato actual de attendance.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex h-11 items-center justify-center rounded-full border border-brand/30 bg-brand/8 px-5 text-sm font-semibold text-brand transition hover:border-brand/50 hover:bg-brand/12 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading || !accessToken.trim()}
          >
            {isLoading ? 'Refrescando...' : 'Refrescar'}
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              API Base URL
            </span>
            <input
              className="field-input"
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Tenant
            </span>
            <input
              className="field-input"
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
            />
          </label>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={handleFiltersSubmit}>
          <div className="grid gap-4 lg:grid-cols-5">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Filtrar por sucursal
              </span>
              <select
                className="field-input"
                value={filterBranchId}
                onChange={(event) => {
                  setFilterBranchId(event.target.value);
                  backoffice.setActiveBranchId(event.target.value);
                  setFilterEmployeeId('');
                  setFilterEmployeeSearchTerm('');
                }}
              >
                <option value="">Todas</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.code} · {branch.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Buscar colaborador
              </span>
              <input
                className="field-input"
                value={filterEmployeeSearchTerm}
                onChange={(event) => setFilterEmployeeSearchTerm(event.target.value)}
                placeholder="Nombre, email o UUID"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Filtrar por colaborador
              </span>
              <select
                className="field-input"
                value={filterEmployeeId}
                onChange={(event) => setFilterEmployeeId(event.target.value)}
              >
                <option value="">Todos</option>
                {employeesForFilterBranchFiltered.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Filtrar por evento
              </span>
              <select
                className="field-input"
                value={filterEventType}
                onChange={(event) => setFilterEventType(event.target.value)}
              >
                <option value="">Todos</option>
                {attendanceEventOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Desde
              </span>
              <input
                className="field-input"
                type="datetime-local"
                value={filterFrom}
                onChange={(event) => setFilterFrom(event.target.value)}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Hasta
              </span>
              <input
                className="field-input"
                type="datetime-local"
                value={filterTo}
                onChange={(event) => setFilterTo(event.target.value)}
              />
            </label>
          </div>

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading || !accessToken.trim()}
          >
            Aplicar filtros
          </button>
        </form>
      </div>

      <div className="rounded-[30px] border border-border/70 bg-surface/95 p-6 shadow-card backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold">
              {selectedRecordId ? 'Editar marcacion' : 'Nueva marcacion'}
            </p>
            <p className="text-sm text-muted">
              La UI genera `Idempotency-Key` para altas y permite ajustar source, fecha y notas.
            </p>
          </div>

          <button
            type="button"
            onClick={resetEditor}
            className="inline-flex h-11 items-center justify-center rounded-full border border-border/70 bg-panel px-5 text-sm font-semibold text-foreground transition hover:bg-surface"
          >
            Nueva marcacion
          </button>
        </div>

        <form
          className="mt-6 grid gap-4"
          onSubmit={selectedRecordId ? handleUpdateAttendance : handleCreateAttendance}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Sucursal
              </span>
              <select
                className="field-input"
                value={selectedBranchId}
                onChange={(event) => {
                  setSelectedBranchId(event.target.value);
                  backoffice.setActiveBranchId(event.target.value);
                  setSelectedEmployeeId('');
                  setEmployeeSearchTerm('');
                }}
                required
              >
                <option value="">Seleccionar sucursal</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.code} · {branch.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Buscar colaborador
              </span>
              <input
                className="field-input"
                value={employeeSearchTerm}
                onChange={(event) => setEmployeeSearchTerm(event.target.value)}
                placeholder="Nombre, email o UUID"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Colaborador
              </span>
              <select
                className="field-input"
                value={selectedEmployeeId}
                onChange={(event) => setSelectedEmployeeId(event.target.value)}
                required
              >
                <option value="">Seleccionar colaborador</option>
                {employeesForSelectedBranchFiltered.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Evento
              </span>
              <select
                className="field-input"
                value={eventType}
                onChange={(event) =>
                  setEventType(event.target.value as AttendanceRecord['eventType'])
                }
              >
                {attendanceEventOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Source
              </span>
              <select
                className="field-input"
                value={source}
                onChange={(event) =>
                  setSource(event.target.value as AttendanceRecord['source'])
                }
              >
                {attendanceSourceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Fecha y hora
              </span>
              <input
                className="field-input"
                type="datetime-local"
                value={eventAtInput}
                onChange={(event) => setEventAtInput(event.target.value)}
                required
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Idempotency Key
              </span>
              <input
                className="field-input"
                value={idempotencyKey}
                readOnly
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Notas
            </span>
            <textarea
              className="field-input min-h-28 resize-y"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ingreso manual por supervision"
            />
          </label>

          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-full bg-brand px-6 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            disabled={
              isLoading ||
              !selectedBranchId ||
              !selectedEmployeeId ||
              !accessToken.trim()
            }
          >
            {isLoading
              ? selectedRecordId
                ? 'Actualizando...'
                : 'Registrando...'
              : selectedRecordId
                ? 'Actualizar marcacion'
                : 'Registrar marcacion'}
          </button>
        </form>
      </div>

      <div className="rounded-[30px] border border-border/70 bg-surface/95 p-6 shadow-card backdrop-blur">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Resumen de jornada</p>
          <p className="text-sm text-muted">
            Se recalcula con `GET /v1/attendance` sobre la sucursal, colaborador y día del editor.
          </p>
        </div>

        {selectedBranchId && selectedEmployeeId ? (
          <div className="mt-6 grid gap-4">
            <div className="grid gap-4 lg:grid-cols-4">
              <div className="rounded-[24px] border border-border/70 bg-panel p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Día operativo
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {formatDate(eventAtInput)}
                </p>
              </div>

              <div className="rounded-[24px] border border-border/70 bg-panel p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Estado derivado
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {attendanceJourneySummary.currentStatus}
                </p>
              </div>

              <div className="rounded-[24px] border border-border/70 bg-panel p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Primer evento
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {attendanceJourneySummary.firstRecord
                    ? formatDateTime(attendanceJourneySummary.firstRecord.eventAt)
                    : 'Sin registros'}
                </p>
              </div>

              <div className="rounded-[24px] border border-border/70 bg-panel p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Último evento
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {attendanceJourneySummary.lastRecord
                    ? formatDateTime(attendanceJourneySummary.lastRecord.eventAt)
                    : 'Sin registros'}
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-panel p-5">
              <p className="text-sm font-semibold">
                {employeeNameById.get(selectedEmployeeId) ?? selectedEmployeeId}
              </p>
              <p className="mt-1 text-sm text-muted">
                {branchNameById.get(selectedBranchId) ?? selectedBranchId}
              </p>
              <p className="mt-3 text-sm text-muted">
                Eventos del día: {attendanceJourneySummary.totalEvents}
              </p>

              <div className="mt-4 grid gap-3">
                {attendanceJourneySummary.orderedRecords.length > 0 ? (
                  attendanceJourneySummary.orderedRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex flex-col gap-2 rounded-[18px] border border-border/70 bg-surface px-4 py-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {record.eventType}
                        </p>
                        <p className="text-sm text-muted">
                          {formatDateTime(record.eventAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted">
                        <span className="rounded-full border border-border/70 px-3 py-1">
                          {record.source}
                        </span>
                        {record.notes ? (
                          <span className="rounded-full border border-border/70 px-3 py-1">
                            con nota
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">
                    No hay eventos para la jornada seleccionada.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted">
            Selecciona sucursal, colaborador y fecha en el editor para ver la jornada.
          </p>
        )}
      </div>

      {(error || success) && (
        <div className="grid gap-3">
          {error ? (
            <div className="rounded-[20px] border border-danger/30 bg-danger/8 p-4 text-sm text-danger">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-[20px] border border-brand/30 bg-brand/8 p-4 text-sm text-brand">
              {success}
            </div>
          ) : null}
        </div>
      )}

      <div className="rounded-[30px] border border-border/70 bg-surface/95 p-6 shadow-card backdrop-blur">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Marcaciones recientes</p>
          <p className="text-sm text-muted">
            Ultimos 20 registros segun los filtros activos.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          {records.length > 0 ? (
            records.map((record) => (
              <div
                key={record.id}
                className="rounded-[24px] border border-border/70 bg-panel p-5"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {record.eventType} · {employeeNameById.get(record.employeeId) ?? record.employeeId}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {branchNameById.get(record.branchId) ?? record.branchId}
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {formatDateTime(record.eventAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted">
                    <button
                      type="button"
                      onClick={() => void loadRecordIntoEditor(record.id)}
                      className="inline-flex items-center justify-center rounded-full border border-brand/30 bg-brand/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand transition hover:border-brand/50 hover:bg-brand/12"
                    >
                      Cargar
                    </button>
                    <span className="rounded-full border border-border/70 px-3 py-1">
                      {record.source}
                    </span>
                    <span className="rounded-full border border-border/70 px-3 py-1">
                      {record.id}
                    </span>
                  </div>
                </div>

                {record.notes ? (
                  <p className="mt-4 text-sm leading-6 text-muted">{record.notes}</p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">
              No hay marcaciones para los filtros actuales.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
