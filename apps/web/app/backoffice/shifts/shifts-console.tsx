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

type ShiftAttendanceException = {
  type:
    | 'published_without_checkin'
    | 'completed_without_checkout'
    | 'assigned_shift_without_attendance'
    | 'attendance_without_shift';
  employeeId: string;
  shiftId?: string;
  detail: string;
  severity: 'warning' | 'danger';
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
  const [coverageAttendanceRecords, setCoverageAttendanceRecords] = useState<AttendanceRecord[]>([]);
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

  const coverageBranchId = filterBranchId || selectedBranchId || backoffice.activeBranchId;

  const shiftAttendanceExceptions = useMemo(() => {
    if (!coverageBranchId) {
      return [];
    }

    const attendanceByEmployee = new Map<string, AttendanceRecord[]>();
    for (const record of coverageAttendanceRecords) {
      const items = attendanceByEmployee.get(record.employeeId) ?? [];
      items.push(record);
      attendanceByEmployee.set(record.employeeId, items);
    }

    const exceptions: ShiftAttendanceException[] = [];
    const now = Date.now();
    const assignedShiftEmployeeIds = new Set<string>();

    for (const shift of coverageSummary.records) {
      if (!shift.employeeId) {
        continue;
      }

      assignedShiftEmployeeIds.add(shift.employeeId);
      const employeeAttendance = attendanceByEmployee.get(shift.employeeId) ?? [];
      const attendanceStatus = deriveAttendanceJourneyStatus(employeeAttendance);
      const hasCheckIn = employeeAttendance.some((record) => record.eventType === 'CHECK_IN');
      const hasCheckOut = employeeAttendance.some((record) => record.eventType === 'CHECK_OUT');

      if (employeeAttendance.length === 0) {
        exceptions.push({
          type: 'assigned_shift_without_attendance',
          employeeId: shift.employeeId,
          shiftId: shift.id,
          severity: 'warning',
          detail: `Turno ${shift.id} asignado sin eventos attendance para la jornada.`,
        });
      }

      if (
        shift.status === 'PUBLISHED' &&
        !hasCheckIn &&
        new Date(shift.startsAt).getTime() <= now
      ) {
        exceptions.push({
          type: 'published_without_checkin',
          employeeId: shift.employeeId,
          shiftId: shift.id,
          severity: 'danger',
          detail: `Turno ${shift.id} publicado ya inició y aún no registra CHECK_IN.`,
        });
      }

      if (shift.status === 'COMPLETED' && (!hasCheckOut || attendanceStatus !== 'Jornada cerrada')) {
        exceptions.push({
          type: 'completed_without_checkout',
          employeeId: shift.employeeId,
          shiftId: shift.id,
          severity: 'danger',
          detail: `Turno ${shift.id} completado sin cierre consistente en attendance.`,
        });
      }
    }

    for (const [employeeId, employeeAttendance] of attendanceByEmployee.entries()) {
      if (!assignedShiftEmployeeIds.has(employeeId) && employeeAttendance.length > 0) {
        exceptions.push({
          type: 'attendance_without_shift',
          employeeId,
          severity: 'warning',
          detail: `Hay actividad attendance para ${employeeId} sin turno asignado en la cobertura del día.`,
        });
      }
    }

    return exceptions;
  }, [coverageAttendanceRecords, coverageBranchId, coverageSummary.records]);

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

  async function loadCoverageAttendance(currentToken: string) {
    if (!coverageBranchId) {
      setCoverageAttendanceRecords([]);
      return;
    }

    const { start, end } = getDayBounds(coverageDateInput);
    const params = new URLSearchParams({
      page: '1',
      limit: '200',
      branchId: coverageBranchId,
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
    setCoverageAttendanceRecords(payload.data as AttendanceRecord[]);
  }

  useEffect(() => {
    if (!accessToken.trim() || !tenantId.trim()) {
      setCoverageAttendanceRecords([]);
      return;
    }

    void loadCoverageAttendance(accessToken).catch(() => {
      setCoverageAttendanceRecords([]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, tenantId, coverageDateInput, coverageBranchId, apiBaseUrl]);

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
      <Card className="border-border/70 bg-card/95">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle>Shifts Console</CardTitle>
            <CardDescription>
              Filtros, edición y comandos operativos sobre el contrato actual de shifts.
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
              <Label htmlFor="shifts-api-base-url">API Base URL</Label>
              <Input
                id="shifts-api-base-url"
                value={apiBaseUrl}
                onChange={(event) => setApiBaseUrl(event.target.value)}
              />
            </label>

            <label className="grid gap-2">
              <Label htmlFor="shifts-tenant-id">Tenant</Label>
              <Input
                id="shifts-tenant-id"
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value)}
              />
            </label>
          </div>

          <form className="grid gap-4" onSubmit={handleFiltersSubmit}>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2">
                <Label htmlFor="shifts-filter-branch">Filtrar por sucursal</Label>
                <select
                  id="shifts-filter-branch"
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
                <Label htmlFor="shifts-filter-employee">Filtrar por colaborador</Label>
                <select
                  id="shifts-filter-employee"
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
                <Label htmlFor="shifts-filter-status">Filtrar por estado</Label>
                <select
                  id="shifts-filter-status"
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
                <Label htmlFor="shifts-filter-from">Desde</Label>
                <Input
                  id="shifts-filter-from"
                  type="datetime-local"
                  value={filterFrom}
                  onChange={(event) => setFilterFrom(event.target.value)}
                />
              </label>

              <label className="grid gap-2">
                <Label htmlFor="shifts-filter-to">Hasta</Label>
                <Input
                  id="shifts-filter-to"
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
            <CardTitle>Cobertura del día</CardTitle>
            <CardDescription>
              Resumen operativo con la data cargada para sucursal y fecha objetivo.
            </CardDescription>
          </div>

          <label className="grid gap-2">
            <Label htmlFor="shifts-coverage-date">Día de cobertura</Label>
            <Input
              id="shifts-coverage-date"
              type="datetime-local"
              value={coverageDateInput}
              onChange={(event) => setCoverageDateInput(event.target.value)}
            />
          </label>
        </CardHeader>

        <CardContent className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-4">
            <SummaryCard
              label="Sucursal analizada"
              value={
                coverageSummary.branchId
                  ? branchNameById.get(coverageSummary.branchId) ?? coverageSummary.branchId
                  : 'Todas las cargadas'
              }
            />
            <SummaryCard label="Turnos del día" value={String(coverageSummary.totalShifts)} />
            <SummaryCard
              label="Asignados / publicados"
              value={`${coverageSummary.assignedShifts} / ${coverageSummary.publishedShifts}`}
            />
            <SummaryCard
              label="Dotación única"
              value={String(coverageSummary.uniqueEmployees)}
            />
          </div>

          <Card className="border-border/70 bg-muted/20 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">
                Agenda de cobertura: {coverageSummary.dateLabel}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {coverageSummary.records.length > 0 ? (
                coverageSummary.records.map((record) => (
                  <Card key={record.id} className="border-border/70 bg-background shadow-none">
                    <CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {employeeNameById.get(record.employeeId ?? '') ?? 'Sin asignar'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(record.startsAt)} → {formatDateTime(record.endsAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{record.status}</Badge>
                        <Badge variant="outline">{record.id}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay turnos cargados para esa fecha con los filtros actuales.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-muted/20 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Excepciones shift vs attendance</CardTitle>
              <CardDescription>
                Cruce operativo sobre la misma sucursal y jornada de cobertura.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {shiftAttendanceExceptions.length > 0 ? (
                shiftAttendanceExceptions.map((exception, index) => (
                  <Alert
                    key={`${exception.type}-${exception.shiftId ?? exception.employeeId}-${index}`}
                    variant={exception.severity === 'danger' ? 'danger' : 'warning'}
                  >
                    <AlertDescription>
                      <p className="font-semibold">
                        {employeeNameById.get(exception.employeeId) ?? exception.employeeId}
                      </p>
                      <p>{exception.detail}</p>
                    </AlertDescription>
                  </Alert>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin excepciones mínimas detectadas entre turnos y attendance para esta
                  cobertura.
                </p>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle>Editor de turnos</CardTitle>
            <CardDescription>
              Crea un turno nuevo o carga uno existente para editar datos permitidos.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={resetEditor}>
              Nuevo turno
            </Button>
            <Button
              type="button"
              variant="secondary"
              loading={isLoading}
              onClick={() => void handleRefresh()}
              disabled={isLoading || !accessToken.trim()}
            >
              Recargar lista
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={selectedShift ? handleUpdateShift : handleCreateShift}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2">
                <Label htmlFor="shifts-editor-branch">Sucursal</Label>
                <select
                  id="shifts-editor-branch"
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
                <Label htmlFor="shifts-editor-employee">Colaborador</Label>
                <select
                  id="shifts-editor-employee"
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
                <Label htmlFor="shifts-editor-initial-status">Estado inicial</Label>
                <select
                  id="shifts-editor-initial-status"
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
                <Label htmlFor="shifts-editor-current-status">Estado actual</Label>
                <Input id="shifts-editor-current-status" value={selectedShift.status} readOnly />
              </label>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2">
                <Label htmlFor="shifts-editor-starts-at">Inicio</Label>
                <Input
                  id="shifts-editor-starts-at"
                  type="datetime-local"
                  value={startsAtInput}
                  onChange={(event) => setStartsAtInput(event.target.value)}
                  required
                />
              </label>

              <label className="grid gap-2">
                <Label htmlFor="shifts-editor-ends-at">Fin</Label>
                <Input
                  id="shifts-editor-ends-at"
                  type="datetime-local"
                  value={endsAtInput}
                  onChange={(event) => setEndsAtInput(event.target.value)}
                  required
                />
              </label>
            </div>

            <label className="grid gap-2">
              <Label htmlFor="shifts-editor-notes">Notas</Label>
              <Textarea
                id="shifts-editor-notes"
                className="min-h-28"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Apertura, cierre, reemplazo, observaciones operativas"
              />
            </label>

            {localOverlapRecords.length > 0 ? (
              <Alert variant="danger">
                <AlertDescription>
                  El turno propuesto se solapa con {localOverlapRecords.length} turno(s)
                  ya cargado(s) para este colaborador en la misma sucursal.
                </AlertDescription>
              </Alert>
            ) : null}

            {selectedShift && !canEditShiftStructure(selectedShift.status) ? (
              <Alert variant="warning">
                <AlertDescription>
                  Este turno está en estado {selectedShift.status}. Solo conviene
                  revisarlo o usar comandos permitidos desde la lista; la edición
                  estructural queda bloqueada.
                </AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="submit"
              size="lg"
              loading={isLoading}
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
            </Button>
          </form>
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

      {commandGuardrail ? (
        <Alert variant={commandGuardrail.severity === 'warning' ? 'warning' : 'info'}>
          <AlertDescription>{commandGuardrail.detail}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle>Turnos recientes</CardTitle>
          <CardDescription>
            Últimos 20 registros según los filtros activos. Haz click en “Cargar” para
            editar.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          {records.length > 0 ? (
            records.map((record) => {
              const allowedCommands = getAllowedCommands(record.status);

              return (
                <Card key={record.id} className="border-border/70 bg-muted/20 shadow-none">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          {branchNameById.get(record.branchId) ?? record.branchId}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {record.employeeId
                            ? employeeNameById.get(record.employeeId) ?? record.employeeId
                            : 'Sin colaborador asignado'}
                        </p>
                        <p className="mt-2 text-sm text-foreground">
                          {formatDateTime(record.startsAt)} → {formatDateTime(record.endsAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{record.status}</Badge>
                        <Badge variant="outline">{record.id}</Badge>
                      </div>
                    </div>

                    {record.notes ? (
                      <p className="mt-4 text-sm leading-6 text-muted-foreground">
                        {record.notes}
                      </p>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => loadShiftIntoEditor(record)}
                      >
                        Cargar
                      </Button>

                      {allowedCommands.map((command) => (
                        <Button
                          key={command}
                          type="button"
                          variant="outline"
                          onClick={() => void handleCommand(record.id, command)}
                          disabled={isLoading || !accessToken.trim()}
                        >
                          {command === 'publish'
                            ? 'Publish'
                            : command === 'cancel'
                              ? 'Cancel'
                              : 'Complete'}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay turnos para los filtros actuales.
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
