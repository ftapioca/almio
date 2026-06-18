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

type ShiftStatus = 'SCHEDULED' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';

type ShiftRecord = {
  id: string;
  branchId: string;
  employeeId: string | null;
  startsAt: string;
  endsAt: string;
  status: ShiftStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type AttendanceRecord = {
  id: string;
  branchId: string;
  employeeId: string;
  eventType: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END';
  eventAt: string;
  source: 'MANUAL' | 'DEVICE' | 'IMPORT';
  notes: string | null;
};

type ShiftCommandGuardrail = {
  command: 'publish' | 'cancel' | 'complete';
  shiftId: string;
  detail: string;
  severity: 'info' | 'warning';
};

const shiftStatusOptions: ShiftStatus[] = [
  'SCHEDULED',
  'PUBLISHED',
  'CANCELLED',
  'COMPLETED',
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

function getAllowedCommands(status: ShiftStatus) {
  switch (status) {
    case 'SCHEDULED':
      return ['publish', 'cancel'] as const;
    case 'PUBLISHED':
      return ['complete', 'cancel'] as const;
    default:
      return [] as const;
  }
}

function canEditShiftStructure(status: ShiftStatus) {
  return status !== 'COMPLETED' && status !== 'CANCELLED';
}

export function ShiftsConsole({
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
  const [records, setRecords] = useState<ShiftRecord[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'SCHEDULED' | 'PUBLISHED'>(
    'SCHEDULED',
  );
  const [startsAtInput, setStartsAtInput] = useState(toDatetimeLocalValue());
  const [endsAtInput, setEndsAtInput] = useState(
    toDatetimeLocalValue(new Date(Date.now() + 8 * 60 * 60 * 1000)),
  );
  const [notes, setNotes] = useState('');
  const [filterBranchId, setFilterBranchId] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [coverageDateInput, setCoverageDateInput] = useState(toDatetimeLocalValue());
  const [commandGuardrail, setCommandGuardrail] = useState<ShiftCommandGuardrail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const selectedShift = useMemo(
    () => records.find((record) => record.id === selectedShiftId) ?? null,
    [records, selectedShiftId],
  );

  const branchNameById = useMemo(
    () =>
      new Map(
        branches.map((branch) => [branch.id, `${branch.code} · ${branch.name}`]),
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

  const localOverlapRecords = useMemo(() => {
    if (!selectedEmployeeId || !selectedBranchId || !startsAtInput || !endsAtInput) {
      return [];
    }

    const nextStart = new Date(startsAtInput).getTime();
    const nextEnd = new Date(endsAtInput).getTime();

    if (Number.isNaN(nextStart) || Number.isNaN(nextEnd) || nextStart >= nextEnd) {
      return [];
    }

    return records.filter((record) => {
      if (record.id === selectedShiftId) {
        return false;
      }
      if (record.branchId !== selectedBranchId || record.employeeId !== selectedEmployeeId) {
        return false;
      }

      const recordStart = new Date(record.startsAt).getTime();
      const recordEnd = new Date(record.endsAt).getTime();

      return nextStart < recordEnd && nextEnd > recordStart;
    });
  }, [endsAtInput, records, selectedBranchId, selectedEmployeeId, selectedShiftId, startsAtInput]);

  const coverageSummary = useMemo(() => {
    const branchId = filterBranchId || selectedBranchId;
    const { start, end } = getDayBounds(coverageDateInput);

    const dayRecords = records.filter((record) => {
      if (branchId && record.branchId !== branchId) {
        return false;
      }

      const recordStart = new Date(record.startsAt).getTime();
      return recordStart >= start.getTime() && recordStart <= end.getTime();
    });

    const assignedRecords = dayRecords.filter((record) => !!record.employeeId);
    const uniqueEmployees = new Set(
      assignedRecords.map((record) => record.employeeId).filter(Boolean),
    );

    return {
      branchId,
      dateLabel: formatDate(coverageDateInput),
      totalShifts: dayRecords.length,
      assignedShifts: assignedRecords.length,
      publishedShifts: dayRecords.filter((record) => record.status === 'PUBLISHED').length,
      completedShifts: dayRecords.filter((record) => record.status === 'COMPLETED').length,
      uniqueEmployees: uniqueEmployees.size,
      records: dayRecords.sort(
        (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
      ),
    };
  }, [coverageDateInput, filterBranchId, records, selectedBranchId]);

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

  async function loadShifts(currentToken: string) {
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
    if (filterStatus) {
      params.set('status', filterStatus);
    }
    if (filterFrom) {
      params.set('from', new Date(filterFrom).toISOString());
    }
    if (filterTo) {
      params.set('to', new Date(filterTo).toISOString());
    }

    const response = await fetch(`${baseUrl}/shifts?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${currentToken.trim()}`,
        'X-Tenant-ID': tenantId.trim(),
      },
    });

    const payload = await parseApiResponse(response);
    const nextRecords = payload.data as ShiftRecord[];
    setRecords(nextRecords);

    if (selectedShiftId && !nextRecords.some((record) => record.id === selectedShiftId)) {
      setSelectedShiftId('');
    }
  }

  async function initializeConsole() {
    if (!accessToken.trim() || !tenantId.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([loadReferenceData(accessToken), loadShifts(accessToken)]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Error inesperado al cargar shifts',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void initializeConsole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, tenantId]);

  function resetEditor() {
    setSelectedShiftId('');
    setSelectedBranchId(backoffice.activeBranchId ?? '');
    setSelectedEmployeeId('');
    setSelectedStatus('SCHEDULED');
    setStartsAtInput(toDatetimeLocalValue());
    setEndsAtInput(toDatetimeLocalValue(new Date(Date.now() + 8 * 60 * 60 * 1000)));
    setNotes('');
  }

  function loadShiftIntoEditor(shift: ShiftRecord) {
    setSelectedShiftId(shift.id);
    setSelectedBranchId(shift.branchId);
    setSelectedEmployeeId(shift.employeeId ?? '');
    setStartsAtInput(toDatetimeLocalValue(new Date(shift.startsAt)));
    setEndsAtInput(toDatetimeLocalValue(new Date(shift.endsAt)));
    setNotes(shift.notes ?? '');
  }

  function hasValidScheduleRange() {
    return new Date(startsAtInput).getTime() < new Date(endsAtInput).getTime();
  }

  async function handleRefresh() {
    setSuccess(null);
    await initializeConsole();
  }

  async function handleFiltersSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess(null);
    await handleRefresh();
  }

  async function handleCreateShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedBranchId || !accessToken.trim()) {
      setError('Sucursal y sesion son obligatorias');
      return;
    }
    if (!hasValidScheduleRange()) {
      setError('La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }
    if (selectedStatus === 'PUBLISHED' && !selectedEmployeeId) {
      setError('Un turno PUBLISHED debe quedar asignado a un colaborador');
      return;
    }
    if (localOverlapRecords.length > 0) {
      setError('El turno se solapa con otro turno ya cargado para el mismo colaborador');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${normalizeApiBaseUrl(apiBaseUrl)}/shifts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken.trim()}`,
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId.trim(),
        },
        body: JSON.stringify({
          branchId: selectedBranchId,
          employeeId: selectedEmployeeId || undefined,
          startsAt: new Date(startsAtInput).toISOString(),
          endsAt: new Date(endsAtInput).toISOString(),
          status: selectedStatus,
          notes: notes.trim() || undefined,
        }),
      });

      const payload = await parseApiResponse(response);
      const createdShift = payload.data as ShiftRecord;

      setSuccess(
        `Turno ${createdShift.status} creado para ${formatDateTime(createdShift.startsAt)}`,
      );
      resetEditor();
      await loadShifts(accessToken);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Error inesperado al crear el turno',
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdateShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedShift || !selectedBranchId || !accessToken.trim()) {
      setError('Debes seleccionar un turno, una sucursal y una sesion válida');
      return;
    }
    if (!canEditShiftStructure(selectedShift.status)) {
      setError(`No se puede editar la estructura de un turno ${selectedShift.status}`);
      return;
    }
    if (!hasValidScheduleRange()) {
      setError('La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }
    if (localOverlapRecords.length > 0) {
      setError('El turno se solapa con otro turno ya cargado para el mismo colaborador');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `${normalizeApiBaseUrl(apiBaseUrl)}/shifts/${selectedShift.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken.trim()}`,
            'Content-Type': 'application/json',
            'X-Tenant-ID': tenantId.trim(),
          },
          body: JSON.stringify({
            branchId: selectedBranchId,
            employeeId: selectedEmployeeId || null,
            startsAt: new Date(startsAtInput).toISOString(),
            endsAt: new Date(endsAtInput).toISOString(),
            notes: notes.trim() || null,
          }),
        },
      );

      const payload = await parseApiResponse(response);
      const updatedShift = payload.data as ShiftRecord;

      setSuccess(`Turno ${updatedShift.id} actualizado`);
      await loadShifts(accessToken);
      loadShiftIntoEditor(updatedShift);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Error inesperado al actualizar el turno',
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAttendanceForShiftDay(
    currentToken: string,
    shift: ShiftRecord,
  ): Promise<AttendanceRecord[]> {
    if (!shift.employeeId) {
      return [];
    }

    const { start, end } = getDayBounds(shift.startsAt);
    const params = new URLSearchParams({
      page: '1',
      limit: '100',
      branchId: shift.branchId,
      employeeId: shift.employeeId,
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
    return payload.data as AttendanceRecord[];
  }

  async function handleCommand(shiftId: string, command: 'publish' | 'cancel' | 'complete') {
    const shift = records.find((record) => record.id === shiftId) ?? null;

    if (!shift) {
      setError('No fue posible encontrar el turno a operar');
      return;
    }

    setCommandGuardrail(null);
    setError(null);
    setSuccess(null);

    if ((command === 'publish' || command === 'complete') && !shift.employeeId) {
      setError(`El comando ${command} requiere colaborador asignado`);
      return;
    }

    if ((command === 'publish' || command === 'complete') && shift.employeeId) {
      try {
        const dayRecords = await loadAttendanceForShiftDay(accessToken, shift);
        const orderedRecords = [...dayRecords].sort(
          (left, right) =>
            new Date(left.eventAt).getTime() - new Date(right.eventAt).getTime(),
        );
        const currentStatus = deriveAttendanceJourneyStatus(orderedRecords);
        const hasCheckIn = orderedRecords.some((record) => record.eventType === 'CHECK_IN');
        const hasCheckOut = orderedRecords.some((record) => record.eventType === 'CHECK_OUT');

        if (command === 'complete') {
          if (!hasCheckIn) {
            setError(
              'No se puede completar el turno: no existe CHECK_IN para el colaborador en esa jornada',
            );
            return;
          }

          if (!hasCheckOut || currentStatus !== 'Jornada cerrada') {
            setError(
              'No se puede completar el turno: attendance aún no muestra una jornada cerrada con CHECK_OUT',
            );
            return;
          }
        }

        setCommandGuardrail({
          command,
          shiftId,
          severity:
            command === 'publish' && orderedRecords.length === 0 ? 'warning' : 'info',
          detail:
            command === 'publish'
              ? orderedRecords.length === 0
                ? 'Precheck attendance: sin eventos del día para este colaborador. Se permite publicar, pero conviene validar planificación vs operación real.'
                : `Precheck attendance: ${orderedRecords.length} evento(s) del día, estado actual "${currentStatus}".`
              : `Precheck attendance: jornada cerrada con ${orderedRecords.length} evento(s).`,
        });
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : `Error inesperado al validar attendance previo a ${command}`,
        );
        return;
      }
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${normalizeApiBaseUrl(apiBaseUrl)}/shifts/${shiftId}/${command}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken.trim()}`,
            'X-Tenant-ID': tenantId.trim(),
          },
        },
      );

      const payload = await parseApiResponse(response);
      const updatedShift = payload.data as ShiftRecord;

      setSuccess(`Turno ${updatedShift.id} pasó a ${updatedShift.status}`);
      await loadShifts(accessToken);
      if (selectedShiftId === shiftId) {
        loadShiftIntoEditor(updatedShift);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : `Error inesperado al ejecutar ${command}`,
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
            <p className="text-sm font-semibold">Shifts Console</p>
            <p className="text-sm text-muted">
              Filtros, edición y comandos operativos sobre el contrato actual de shifts.
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
          <div className="grid gap-4 lg:grid-cols-2">
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
                Filtrar por colaborador
              </span>
              <select
                className="field-input"
                value={filterEmployeeId}
                onChange={(event) => setFilterEmployeeId(event.target.value)}
              >
                <option value="">Todos</option>
                {employees
                  .filter((employee) => !filterBranchId || employee.branchId === filterBranchId)
                  .map((employee) => (
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
                Filtrar por estado
              </span>
              <select
                className="field-input"
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
              >
                <option value="">Todos</option>
                {shiftStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
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
            <p className="text-sm font-semibold">Cobertura del día</p>
            <p className="text-sm text-muted">
              Resumen operativo con la data cargada para sucursal y fecha objetivo.
            </p>
          </div>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Día de cobertura
            </span>
            <input
              className="field-input"
              type="datetime-local"
              value={coverageDateInput}
              onChange={(event) => setCoverageDateInput(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <div className="rounded-[24px] border border-border/70 bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Sucursal analizada
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {coverageSummary.branchId
                ? branchNameById.get(coverageSummary.branchId) ?? coverageSummary.branchId
                : 'Todas las cargadas'}
            </p>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Turnos del día
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {coverageSummary.totalShifts}
            </p>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Asignados / publicados
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {coverageSummary.assignedShifts} / {coverageSummary.publishedShifts}
            </p>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Dotación única
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {coverageSummary.uniqueEmployees}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-[24px] border border-border/70 bg-panel p-5">
          <p className="text-sm font-semibold">Agenda de cobertura: {coverageSummary.dateLabel}</p>
          <div className="mt-4 grid gap-3">
            {coverageSummary.records.length > 0 ? (
              coverageSummary.records.map((record) => (
                <div
                  key={record.id}
                  className="flex flex-col gap-2 rounded-[18px] border border-border/70 bg-surface px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {employeeNameById.get(record.employeeId ?? '') ?? 'Sin asignar'}
                    </p>
                    <p className="text-sm text-muted">
                      {formatDateTime(record.startsAt)} → {formatDateTime(record.endsAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted">
                    <span className="rounded-full border border-border/70 px-3 py-1">
                      {record.status}
                    </span>
                    <span className="rounded-full border border-border/70 px-3 py-1">
                      {record.id}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">
                No hay turnos cargados para esa fecha con los filtros actuales.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[30px] border border-border/70 bg-surface/95 p-6 shadow-card backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold">Editor de turnos</p>
            <p className="text-sm text-muted">
              Crea un turno nuevo o carga uno existente para editar datos permitidos.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={resetEditor}
              className="inline-flex h-11 items-center justify-center rounded-full border border-border/70 bg-panel px-5 text-sm font-semibold text-foreground transition hover:bg-surface"
            >
              Nuevo turno
            </button>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="inline-flex h-11 items-center justify-center rounded-full border border-brand/30 bg-brand/8 px-5 text-sm font-semibold text-brand transition hover:border-brand/50 hover:bg-brand/12 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading || !accessToken.trim()}
            >
              Recargar lista
            </button>
          </div>
        </div>

        <form
          className="mt-6 grid gap-4"
          onSubmit={selectedShift ? handleUpdateShift : handleCreateShift}
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
                Colaborador
              </span>
              <select
                className="field-input"
                value={selectedEmployeeId}
                onChange={(event) => setSelectedEmployeeId(event.target.value)}
              >
                <option value="">Sin asignar</option>
                {employeesForSelectedBranch.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!selectedShift ? (
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Estado inicial
              </span>
              <select
                className="field-input"
                value={selectedStatus}
                onChange={(event) =>
                  setSelectedStatus(event.target.value as 'SCHEDULED' | 'PUBLISHED')
                }
              >
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="PUBLISHED">PUBLISHED</option>
              </select>
            </label>
          ) : (
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Estado actual
              </span>
              <input className="field-input" value={selectedShift.status} readOnly />
            </label>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Inicio
              </span>
              <input
                className="field-input"
                type="datetime-local"
                value={startsAtInput}
                onChange={(event) => setStartsAtInput(event.target.value)}
                required
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Fin
              </span>
              <input
                className="field-input"
                type="datetime-local"
                value={endsAtInput}
                onChange={(event) => setEndsAtInput(event.target.value)}
                required
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
              placeholder="Apertura, cierre, reemplazo, observaciones operativas"
            />
          </label>

          {localOverlapRecords.length > 0 ? (
            <div className="rounded-[20px] border border-danger/30 bg-danger/8 p-4 text-sm text-danger">
              El turno propuesto se solapa con {localOverlapRecords.length} turno(s) ya cargado(s)
              para este colaborador en la misma sucursal.
            </div>
          ) : null}

          {selectedShift && !canEditShiftStructure(selectedShift.status) ? (
            <div className="rounded-[20px] border border-border/70 bg-panel p-4 text-sm text-muted">
              Este turno está en estado {selectedShift.status}. Solo conviene revisarlo o usar
              comandos permitidos desde la lista; la edición estructural queda bloqueada.
            </div>
          ) : null}

          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-full bg-brand px-6 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            disabled={
              isLoading ||
              !selectedBranchId ||
              !accessToken.trim() ||
              localOverlapRecords.length > 0 ||
              !!(selectedShift && !canEditShiftStructure(selectedShift.status))
            }
          >
            {isLoading
              ? selectedShift
                ? 'Actualizando...'
                : 'Creando...'
              : selectedShift
                ? 'Actualizar turno'
                : 'Crear turno'}
          </button>
        </form>
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

      {commandGuardrail ? (
        <div
          className={
            commandGuardrail.severity === 'warning'
              ? 'rounded-[20px] border border-brand/30 bg-brand/8 p-4 text-sm text-brand'
              : 'rounded-[20px] border border-border/70 bg-panel p-4 text-sm text-muted'
          }
        >
          {commandGuardrail.detail}
        </div>
      ) : null}

      <div className="rounded-[30px] border border-border/70 bg-surface/95 p-6 shadow-card backdrop-blur">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Turnos recientes</p>
          <p className="text-sm text-muted">
            Últimos 20 registros según los filtros activos. Haz click en “Cargar” para editar.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          {records.length > 0 ? (
            records.map((record) => {
              const allowedCommands = getAllowedCommands(record.status);

              return (
                <div
                  key={record.id}
                  className="rounded-[24px] border border-border/70 bg-panel p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {branchNameById.get(record.branchId) ?? record.branchId}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {record.employeeId
                          ? employeeNameById.get(record.employeeId) ?? record.employeeId
                          : 'Sin colaborador asignado'}
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        {formatDateTime(record.startsAt)} → {formatDateTime(record.endsAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted">
                      <span className="rounded-full border border-border/70 px-3 py-1">
                        {record.status}
                      </span>
                      <span className="rounded-full border border-border/70 px-3 py-1">
                        {record.id}
                      </span>
                    </div>
                  </div>

                  {record.notes ? (
                    <p className="mt-4 text-sm leading-6 text-muted">{record.notes}</p>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => loadShiftIntoEditor(record)}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-brand/30 bg-brand/8 px-4 text-sm font-semibold text-brand transition hover:border-brand/50 hover:bg-brand/12"
                    >
                      Cargar
                    </button>

                    {allowedCommands.map((command) => (
                      <button
                        key={command}
                        type="button"
                        onClick={() => void handleCommand(record.id, command)}
                        className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 bg-surface px-4 text-sm font-semibold text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isLoading || !accessToken.trim()}
                      >
                        {command === 'publish'
                          ? 'Publish'
                          : command === 'cancel'
                            ? 'Cancel'
                            : 'Complete'}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted">
              No hay turnos para los filtros actuales.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
