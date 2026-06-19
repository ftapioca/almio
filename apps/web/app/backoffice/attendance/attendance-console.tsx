'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from '@almio/design-system';
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
      <Card className="border-border/70 bg-card/95">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle>Attendance Console</CardTitle>
            <CardDescription>
              Filtros y marcación manual sobre el contrato actual de attendance.
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="secondary"
            loading={isLoading}
            onClick={handleRefresh}
            disabled={isLoading || !accessToken.trim()}
          >
            {isLoading ? 'Refrescando...' : 'Refrescar'}
          </Button>
        </CardHeader>

        <CardContent className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <Label htmlFor="attendance-api-base-url">API Base URL</Label>
              <Input
                id="attendance-api-base-url"
                value={apiBaseUrl}
                onChange={(event) => setApiBaseUrl(event.target.value)}
              />
            </label>

            <label className="grid gap-2">
              <Label htmlFor="attendance-tenant-id">Tenant</Label>
              <Input
                id="attendance-tenant-id"
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value)}
              />
            </label>
          </div>

          <form className="grid gap-4" onSubmit={handleFiltersSubmit}>
            <div className="grid gap-4 lg:grid-cols-5">
              <label className="grid gap-2">
                <Label htmlFor="attendance-filter-branch">Filtrar por sucursal</Label>
                <select
                  id="attendance-filter-branch"
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
                <Label htmlFor="attendance-filter-employee-search">Buscar colaborador</Label>
                <Input
                  id="attendance-filter-employee-search"
                  value={filterEmployeeSearchTerm}
                  onChange={(event) => setFilterEmployeeSearchTerm(event.target.value)}
                  placeholder="Nombre, email o UUID"
                />
              </label>

              <label className="grid gap-2">
                <Label htmlFor="attendance-filter-employee">Filtrar por colaborador</Label>
                <select
                  id="attendance-filter-employee"
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
                <Label htmlFor="attendance-filter-event-type">Filtrar por evento</Label>
                <select
                  id="attendance-filter-event-type"
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
                <Label htmlFor="attendance-filter-from">Desde</Label>
                <Input
                  id="attendance-filter-from"
                  type="datetime-local"
                  value={filterFrom}
                  onChange={(event) => setFilterFrom(event.target.value)}
                />
              </label>

              <label className="grid gap-2">
                <Label htmlFor="attendance-filter-to">Hasta</Label>
                <Input
                  id="attendance-filter-to"
                  type="datetime-local"
                  value={filterTo}
                  onChange={(event) => setFilterTo(event.target.value)}
                />
              </label>
            </div>

            <Button type="submit" loading={isLoading} disabled={isLoading || !accessToken.trim()}>
              Aplicar filtros
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle>
              {selectedRecordId ? 'Editar marcación' : 'Nueva marcación'}
            </CardTitle>
            <CardDescription>
              La UI genera `Idempotency-Key` para altas y permite ajustar source,
              fecha y notas.
            </CardDescription>
          </div>

          <Button type="button" variant="outline" onClick={resetEditor}>
            Nueva marcación
          </Button>
        </CardHeader>

        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={selectedRecordId ? handleUpdateAttendance : handleCreateAttendance}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2">
                <Label htmlFor="attendance-editor-branch">Sucursal</Label>
                <select
                  id="attendance-editor-branch"
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
                <Label htmlFor="attendance-editor-employee-search">Buscar colaborador</Label>
                <Input
                  id="attendance-editor-employee-search"
                  value={employeeSearchTerm}
                  onChange={(event) => setEmployeeSearchTerm(event.target.value)}
                  placeholder="Nombre, email o UUID"
                />
              </label>

              <label className="grid gap-2">
                <Label htmlFor="attendance-editor-employee">Colaborador</Label>
                <select
                  id="attendance-editor-employee"
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
                <Label htmlFor="attendance-editor-event-type">Evento</Label>
                <select
                  id="attendance-editor-event-type"
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
                <Label htmlFor="attendance-editor-source">Source</Label>
                <select
                  id="attendance-editor-source"
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
                <Label htmlFor="attendance-editor-event-at">Fecha y hora</Label>
                <Input
                  id="attendance-editor-event-at"
                  type="datetime-local"
                  value={eventAtInput}
                  onChange={(event) => setEventAtInput(event.target.value)}
                  required
                />
              </label>

              <label className="grid gap-2">
                <Label htmlFor="attendance-editor-idempotency-key">Idempotency Key</Label>
                <Input id="attendance-editor-idempotency-key" value={idempotencyKey} readOnly />
              </label>
            </div>

            <label className="grid gap-2">
              <Label htmlFor="attendance-editor-notes">Notas</Label>
              <Textarea
                id="attendance-editor-notes"
                className="min-h-28"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ingreso manual por supervision"
              />
            </label>

            <Button
              type="submit"
              size="lg"
              loading={isLoading}
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
                  ? 'Actualizar marcación'
                  : 'Registrar marcación'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle>Resumen de jornada</CardTitle>
          <CardDescription>
            Se recalcula con `GET /v1/attendance` sobre la sucursal, colaborador y día
            del editor.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {selectedBranchId && selectedEmployeeId ? (
            <div className="grid gap-4">
              <div className="grid gap-4 lg:grid-cols-4">
                <SummaryCard label="Día operativo" value={formatDate(eventAtInput)} />
                <SummaryCard
                  label="Estado derivado"
                  value={attendanceJourneySummary.currentStatus}
                />
                <SummaryCard
                  label="Primer evento"
                  value={
                    attendanceJourneySummary.firstRecord
                      ? formatDateTime(attendanceJourneySummary.firstRecord.eventAt)
                      : 'Sin registros'
                  }
                />
                <SummaryCard
                  label="Último evento"
                  value={
                    attendanceJourneySummary.lastRecord
                      ? formatDateTime(attendanceJourneySummary.lastRecord.eventAt)
                      : 'Sin registros'
                  }
                />
              </div>

              <Card className="border-border/70 bg-muted/20 shadow-none">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold">
                    {employeeNameById.get(selectedEmployeeId) ?? selectedEmployeeId}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {branchNameById.get(selectedBranchId) ?? selectedBranchId}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Eventos del día: {attendanceJourneySummary.totalEvents}
                  </p>

                  <div className="mt-4 grid gap-3">
                    {attendanceJourneySummary.orderedRecords.length > 0 ? (
                      attendanceJourneySummary.orderedRecords.map((record) => (
                        <Card
                          key={record.id}
                          className="border-border/70 bg-background shadow-none"
                        >
                          <CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {record.eventType}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDateTime(record.eventAt)}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline">{record.source}</Badge>
                              {record.notes ? <Badge variant="outline">con nota</Badge> : null}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No hay eventos para la jornada seleccionada.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Selecciona sucursal, colaborador y fecha en el editor para ver la jornada.
            </p>
          )}
        </CardContent>
      </Card>

      {(error || success) && (
        <div className="grid gap-3">
          {error ? (
            <Alert variant="danger">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {success ? (
            <Alert variant="success">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      )}

      <Card className="border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle>Marcaciones recientes</CardTitle>
          <CardDescription>
            Últimos 20 registros según los filtros activos.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          {records.length > 0 ? (
            records.map((record) => (
              <Card key={record.id} className="border-border/70 bg-muted/20 shadow-none">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {record.eventType} ·{' '}
                        {employeeNameById.get(record.employeeId) ?? record.employeeId}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {branchNameById.get(record.branchId) ?? record.branchId}
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        {formatDateTime(record.eventAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => void loadRecordIntoEditor(record.id)}
                      >
                        Cargar
                      </Button>
                      <Badge variant="outline">{record.source}</Badge>
                      <Badge variant="outline">{record.id}</Badge>
                    </div>
                  </div>

                  {record.notes ? (
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">
                      {record.notes}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay marcaciones para los filtros actuales.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border/70 bg-muted/20 shadow-none">
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
