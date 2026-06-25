'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@almio/design-system';
import { FeedbackBanners } from '../_components/common/feedback-banners';
import { useBackofficeContext } from '../_components/backoffice-client-context';
import { useBackofficeApi } from '../_hooks/use-backoffice-api';
import { useBackofficeDirectory } from '../_hooks/use-backoffice-directory';
import { formatDate, getDayBounds, toDatetimeLocalValue } from '../_lib/dates';
import {
  createBranchNameMap,
  createEmployeeNameMap,
  filterEmployeesByBranch,
} from '../_lib/people';
import { AttendanceRecord } from '../attendance/types';
import { deriveAttendanceJourneyStatus } from '../attendance/lib';
import { ShiftsCoverage } from './_components/shifts-coverage';
import { ShiftsEditor } from './_components/shifts-editor';
import { ShiftsFilters } from './_components/shifts-filters';
import { ShiftsRecordList } from './_components/shifts-record-list';
import {
  buildShiftAttendanceExceptions,
  canEditShiftStructure,
  getAllowedCommands,
  getLocalOverlapRecords,
} from './lib';
import { ShiftCommandGuardrail, ShiftRecord } from './types';

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
  const [records, setRecords] = useState<ShiftRecord[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'SCHEDULED' | 'PUBLISHED'>('SCHEDULED');
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
  const { branches, employees, error: directoryError, isLoading: directoryIsLoading, loadEmployees } =
    useBackofficeDirectory({ apiBaseUrl, tenantId });
  const api = useBackofficeApi({
    accessToken: backoffice.accessToken,
    apiBaseUrl,
    tenantId,
  });

  useEffect(() => {
    setTenantId(backoffice.tenantId);
  }, [backoffice.tenantId]);

  useEffect(() => {
    if (!filterBranchId && backoffice.activeBranchId) {
      setFilterBranchId(backoffice.activeBranchId);
    }
    if (!selectedBranchId && backoffice.activeBranchId) {
      setSelectedBranchId(backoffice.activeBranchId);
    }
  }, [backoffice.activeBranchId, filterBranchId, selectedBranchId]);

  useEffect(() => {
    if (directoryError) {
      setError(directoryError);
    }
  }, [directoryError]);

  const selectedShift = useMemo(
    () => records.find((record) => record.id === selectedShiftId) ?? null,
    [records, selectedShiftId],
  );
  const branchNameById = useMemo(() => createBranchNameMap(branches), [branches]);
  const employeeNameById = useMemo(() => createEmployeeNameMap(employees), [employees]);
  const employeesForSelectedBranch = useMemo(
    () => filterEmployeesByBranch(employees, selectedBranchId),
    [employees, selectedBranchId],
  );
  const employeesForFilterBranch = useMemo(
    () => filterEmployeesByBranch(employees, filterBranchId),
    [employees, filterBranchId],
  );

  const localOverlapRecords = useMemo(
    () =>
      getLocalOverlapRecords({
        endsAtInput,
        records,
        selectedBranchId,
        selectedEmployeeId,
        selectedShiftId,
        startsAtInput,
      }),
    [endsAtInput, records, selectedBranchId, selectedEmployeeId, selectedShiftId, startsAtInput],
  );

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
    const uniqueEmployees = new Set(assignedRecords.map((record) => record.employeeId).filter(Boolean));

    return {
      assignedShifts: assignedRecords.length,
      branchId,
      dateLabel: formatDate(coverageDateInput),
      publishedShifts: dayRecords.filter((record) => record.status === 'PUBLISHED').length,
      records: dayRecords.sort(
        (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
      ),
      totalShifts: dayRecords.length,
      uniqueEmployees: uniqueEmployees.size,
    };
  }, [coverageDateInput, filterBranchId, records, selectedBranchId]);

  const coverageBranchId = filterBranchId || selectedBranchId || backoffice.activeBranchId;
  const shiftAttendanceExceptions = useMemo(
    () =>
      buildShiftAttendanceExceptions({
        coverageAttendanceRecords,
        coverageBranchId,
        coverageRecords: coverageSummary.records,
      }),
    [coverageAttendanceRecords, coverageBranchId, coverageSummary.records],
  );

  const loadShifts = useCallback(async () => {
    const params = new URLSearchParams({ limit: '20', page: '1' });
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

    const nextRecords = await api.request<ShiftRecord[]>(`/shifts?${params.toString()}`, {
      fallbackMessage: 'No fue posible cargar shifts',
    });
    setRecords(nextRecords);

    if (selectedShiftId && !nextRecords.some((record) => record.id === selectedShiftId)) {
      setSelectedShiftId('');
    }
  }, [api, filterBranchId, filterEmployeeId, filterFrom, filterStatus, filterTo, selectedShiftId]);

  const loadAttendanceForShiftDay = useCallback(
    async (shift: ShiftRecord) => {
      if (!shift.employeeId) {
        return [];
      }

      const { start, end } = getDayBounds(shift.startsAt);
      const params = new URLSearchParams({
        branchId: shift.branchId,
        employeeId: shift.employeeId,
        from: start.toISOString(),
        limit: '100',
        page: '1',
        to: end.toISOString(),
      });

      return api.request<AttendanceRecord[]>(`/attendance?${params.toString()}`, {
        fallbackMessage: 'No fue posible validar attendance para el turno',
      });
    },
    [api],
  );

  const loadCoverageAttendance = useCallback(async () => {
    if (!coverageBranchId) {
      setCoverageAttendanceRecords([]);
      return;
    }

    const { start, end } = getDayBounds(coverageDateInput);
    const params = new URLSearchParams({
      branchId: coverageBranchId,
      from: start.toISOString(),
      limit: '200',
      page: '1',
      to: end.toISOString(),
    });

    try {
      const nextRecords = await api.request<AttendanceRecord[]>(`/attendance?${params.toString()}`, {
        fallbackMessage: 'No fue posible cargar attendance para la cobertura',
      });
      setCoverageAttendanceRecords(nextRecords);
    } catch {
      setCoverageAttendanceRecords([]);
    }
  }, [api, coverageBranchId, coverageDateInput]);

  const initializeConsole = useCallback(async () => {
    if (!api.hasSession || !tenantId.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([loadEmployees(), loadShifts()]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Error inesperado al cargar shifts');
    } finally {
      setIsLoading(false);
    }
  }, [api.hasSession, loadEmployees, loadShifts, tenantId]);

  useEffect(() => {
    void initializeConsole();
  }, [initializeConsole]);

  useEffect(() => {
    if (!api.hasSession || !tenantId.trim()) {
      setCoverageAttendanceRecords([]);
      return;
    }

    void loadCoverageAttendance();
  }, [api.hasSession, loadCoverageAttendance, tenantId]);

  const resetEditor = useCallback(() => {
    setSelectedShiftId('');
    setSelectedBranchId(backoffice.activeBranchId ?? '');
    setSelectedEmployeeId('');
    setSelectedStatus('SCHEDULED');
    setStartsAtInput(toDatetimeLocalValue());
    setEndsAtInput(toDatetimeLocalValue(new Date(Date.now() + 8 * 60 * 60 * 1000)));
    setNotes('');
  }, [backoffice.activeBranchId]);

  const loadShiftIntoEditor = useCallback((shift: ShiftRecord) => {
    setSelectedShiftId(shift.id);
    setSelectedBranchId(shift.branchId);
    setSelectedEmployeeId(shift.employeeId ?? '');
    setStartsAtInput(toDatetimeLocalValue(new Date(shift.startsAt)));
    setEndsAtInput(toDatetimeLocalValue(new Date(shift.endsAt)));
    setNotes(shift.notes ?? '');
  }, []);

  const hasValidScheduleRange = useCallback(
    () => new Date(startsAtInput).getTime() < new Date(endsAtInput).getTime(),
    [endsAtInput, startsAtInput],
  );

  const handleRefresh = useCallback(async () => {
    setSuccess(null);
    await initializeConsole();
  }, [initializeConsole]);

  const handleCreateShift = useCallback(async () => {
    if (!selectedBranchId || !api.hasSession) {
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
      const createdShift = await api.request<ShiftRecord>('/shifts', {
        body: {
          branchId: selectedBranchId,
          employeeId: selectedEmployeeId || undefined,
          endsAt: new Date(endsAtInput).toISOString(),
          notes: notes.trim() || undefined,
          startsAt: new Date(startsAtInput).toISOString(),
          status: selectedStatus,
        },
        fallbackMessage: 'No fue posible crear el turno',
        method: 'POST',
      });

      setSuccess(`Turno ${createdShift.status} creado para ${createdShift.startsAt}`);
      resetEditor();
      await loadShifts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Error inesperado al crear el turno');
    } finally {
      setIsLoading(false);
    }
  }, [
    api,
    endsAtInput,
    hasValidScheduleRange,
    loadShifts,
    localOverlapRecords.length,
    notes,
    resetEditor,
    selectedBranchId,
    selectedEmployeeId,
    selectedStatus,
    startsAtInput,
  ]);

  const handleUpdateShift = useCallback(async () => {
    if (!selectedShift || !selectedBranchId || !api.hasSession) {
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
      const updatedShift = await api.request<ShiftRecord>(`/shifts/${selectedShift.id}`, {
        body: {
          branchId: selectedBranchId,
          employeeId: selectedEmployeeId || null,
          endsAt: new Date(endsAtInput).toISOString(),
          notes: notes.trim() || null,
          startsAt: new Date(startsAtInput).toISOString(),
        },
        fallbackMessage: 'No fue posible actualizar el turno',
        method: 'PATCH',
      });

      setSuccess(`Turno ${updatedShift.id} actualizado`);
      await loadShifts();
      loadShiftIntoEditor(updatedShift);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Error inesperado al actualizar el turno');
    } finally {
      setIsLoading(false);
    }
  }, [
    api,
    endsAtInput,
    hasValidScheduleRange,
    loadShiftIntoEditor,
    loadShifts,
    localOverlapRecords.length,
    notes,
    selectedBranchId,
    selectedEmployeeId,
    selectedShift,
    startsAtInput,
  ]);

  const handleCommand = useCallback(async (shiftId: string, command: 'publish' | 'cancel' | 'complete') => {
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
        const dayRecords = await loadAttendanceForShiftDay(shift);
        const orderedRecords = [...dayRecords].sort(
          (left, right) => new Date(left.eventAt).getTime() - new Date(right.eventAt).getTime(),
        );
        const currentStatus = deriveAttendanceJourneyStatus(orderedRecords);
        const hasCheckIn = orderedRecords.some((record) => record.eventType === 'CHECK_IN');
        const hasCheckOut = orderedRecords.some((record) => record.eventType === 'CHECK_OUT');

        if (command === 'complete') {
          if (!hasCheckIn) {
            setError('No se puede completar el turno: no existe CHECK_IN para el colaborador en esa jornada');
            return;
          }

          if (!hasCheckOut || currentStatus !== 'Jornada cerrada') {
            setError('No se puede completar el turno: attendance aún no muestra una jornada cerrada con CHECK_OUT');
            return;
          }
        }

        setCommandGuardrail({
          command,
          detail:
            command === 'publish'
              ? orderedRecords.length === 0
                ? 'Precheck attendance: sin eventos del día para este colaborador. Se permite publicar, pero conviene validar planificación vs operación real.'
                : `Precheck attendance: ${orderedRecords.length} evento(s) del día, estado actual "${currentStatus}".`
              : `Precheck attendance: jornada cerrada con ${orderedRecords.length} evento(s).`,
          severity: command === 'publish' && orderedRecords.length === 0 ? 'warning' : 'info',
          shiftId,
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
      const updatedShift = await api.request<ShiftRecord>(`/shifts/${shiftId}/${command}`, {
        fallbackMessage: `No fue posible ejecutar ${command}`,
        method: 'POST',
      });

      setSuccess(`Turno ${updatedShift.id} pasó a ${updatedShift.status}`);
      await loadShifts();
      if (selectedShiftId === shiftId) {
        loadShiftIntoEditor(updatedShift);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : `Error inesperado al ejecutar ${command}`);
    } finally {
      setIsLoading(false);
    }
  }, [api, loadAttendanceForShiftDay, loadShiftIntoEditor, loadShifts, records, selectedShiftId]);

  return (
    <div className="grid gap-6">
      <ShiftsFilters
        apiBaseUrl={apiBaseUrl}
        branches={branches}
        employees={employeesForFilterBranch}
        filterBranchId={filterBranchId}
        filterEmployeeId={filterEmployeeId}
        filterFrom={filterFrom}
        filterStatus={filterStatus}
        filterTo={filterTo}
        hasSession={api.hasSession}
        isLoading={isLoading || directoryIsLoading}
        onApiBaseUrlChange={setApiBaseUrl}
        onFilterBranchChange={(value) => {
          setFilterBranchId(value);
          backoffice.setActiveBranchId(value);
          setFilterEmployeeId('');
        }}
        onFilterEmployeeChange={setFilterEmployeeId}
        onFilterFromChange={setFilterFrom}
        onFilterStatusChange={setFilterStatus}
        onFilterToChange={setFilterTo}
        onRefresh={() => void handleRefresh()}
        onSubmit={() => void handleRefresh()}
        onTenantIdChange={setTenantId}
        tenantId={tenantId}
      />

      <ShiftsCoverage
        branchLabel={
          coverageSummary.branchId
            ? branchNameById.get(coverageSummary.branchId) ?? coverageSummary.branchId
            : 'Todas las cargadas'
        }
        coverageDateInput={coverageDateInput}
        coverageRecords={coverageSummary.records}
        dateLabel={coverageSummary.dateLabel}
        employeeNameById={employeeNameById}
        exceptions={shiftAttendanceExceptions}
        onCoverageDateInputChange={setCoverageDateInput}
        summary={{
          assignedShifts: coverageSummary.assignedShifts,
          publishedShifts: coverageSummary.publishedShifts,
          totalShifts: coverageSummary.totalShifts,
          uniqueEmployees: coverageSummary.uniqueEmployees,
        }}
      />

      <ShiftsEditor
        branches={branches}
        canEditSelectedShift={selectedShift ? canEditShiftStructure(selectedShift.status) : true}
        employees={employeesForSelectedBranch}
        endsAtInput={endsAtInput}
        hasSession={api.hasSession}
        isLoading={isLoading}
        localOverlapCount={localOverlapRecords.length}
        notes={notes}
        onEndsAtInputChange={setEndsAtInput}
        onNotesChange={setNotes}
        onRefresh={() => void handleRefresh()}
        onReset={resetEditor}
        onSelectedBranchIdChange={(value) => {
          setSelectedBranchId(value);
          backoffice.setActiveBranchId(value);
          setSelectedEmployeeId('');
        }}
        onSelectedEmployeeIdChange={setSelectedEmployeeId}
        onSelectedStatusChange={setSelectedStatus}
        onStartsAtInputChange={setStartsAtInput}
        onSubmit={() => void (selectedShift ? handleUpdateShift() : handleCreateShift())}
        selectedBranchId={selectedBranchId}
        selectedEmployeeId={selectedEmployeeId}
        selectedShift={selectedShift}
        selectedStatus={selectedStatus}
        startsAtInput={startsAtInput}
      />

      <FeedbackBanners error={error} success={success} />

      {commandGuardrail ? (
        <Alert variant={commandGuardrail.severity === 'warning' ? 'warning' : 'info'}>
          <AlertDescription>{commandGuardrail.detail}</AlertDescription>
        </Alert>
      ) : null}

      <ShiftsRecordList
        branchNameById={branchNameById}
        employeeNameById={employeeNameById}
        getAllowedCommands={getAllowedCommands}
        hasSession={api.hasSession}
        isLoading={isLoading}
        onCommand={(shiftId, command) => void handleCommand(shiftId, command)}
        onLoadShift={loadShiftIntoEditor}
        records={records}
      />
    </div>
  );
}
