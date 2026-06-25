'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FeedbackBanners } from '../_components/common/feedback-banners';
import { useBackofficeContext } from '../_components/backoffice-client-context';
import { useBackofficeDirectory } from '../_hooks/use-backoffice-directory';
import { useBackofficeApi } from '../_hooks/use-backoffice-api';
import { getDayBounds, toDatetimeLocalValue } from '../_lib/dates';
import {
  createBranchNameMap,
  createEmployeeNameMap,
  filterEmployeesByBranch,
  filterEmployeesBySearch,
} from '../_lib/people';
import { AttendanceEditor } from './_components/attendance-editor';
import { AttendanceFilters } from './_components/attendance-filters';
import { AttendanceRecordList } from './_components/attendance-record-list';
import { AttendanceSummary } from './_components/attendance-summary';
import { deriveAttendanceJourneyStatus } from './lib';
import { AttendanceRecord } from './types';

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
  const directory = useBackofficeDirectory({ apiBaseUrl, tenantId });
  const api = useBackofficeApi({
    accessToken: backoffice.accessToken,
    apiBaseUrl,
    tenantId,
  });

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, []);

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
    if (directory.error) {
      setError(directory.error);
    }
  }, [directory.error]);

  const branchNameById = useMemo(
    () => createBranchNameMap(directory.branches),
    [directory.branches],
  );
  const employeeNameById = useMemo(
    () => createEmployeeNameMap(directory.employees),
    [directory.employees],
  );

  const employeesForSelectedBranchFiltered = useMemo(
    () =>
      filterEmployeesBySearch(
        filterEmployeesByBranch(directory.employees, selectedBranchId),
        employeeSearchTerm,
      ),
    [directory.employees, employeeSearchTerm, selectedBranchId],
  );

  const employeesForFilterBranchFiltered = useMemo(
    () =>
      filterEmployeesBySearch(
        filterEmployeesByBranch(directory.employees, filterBranchId),
        filterEmployeeSearchTerm,
      ),
    [directory.employees, filterBranchId, filterEmployeeSearchTerm],
  );

  const attendanceJourneySummary = useMemo(() => {
    const ordered = [...employeeDayRecords].sort(
      (left, right) => new Date(left.eventAt).getTime() - new Date(right.eventAt).getTime(),
    );

    return {
      currentStatus: deriveAttendanceJourneyStatus(ordered),
      firstRecord: ordered.at(0) ?? null,
      lastRecord: ordered.at(-1) ?? null,
      orderedRecords: ordered,
      totalEvents: ordered.length,
    };
  }, [employeeDayRecords]);

  const resetEditor = useCallback(() => {
    setSelectedRecordId('');
    setSelectedBranchId(backoffice.activeBranchId ?? '');
    setSelectedEmployeeId('');
    setEmployeeSearchTerm('');
    setEventType('CHECK_IN');
    setSource('MANUAL');
    setEventAtInput(toDatetimeLocalValue());
    setNotes('');
    setIdempotencyKey(crypto.randomUUID());
  }, [backoffice.activeBranchId]);

  const loadAttendance = useCallback(async () => {
    const params = new URLSearchParams({ limit: '20', page: '1' });
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

    const nextRecords = await api.request<AttendanceRecord[]>(
      `/attendance?${params.toString()}`,
      { fallbackMessage: 'No fue posible cargar attendance' },
    );

    setRecords(nextRecords);

    if (selectedRecordId && !nextRecords.some((record) => record.id === selectedRecordId)) {
      setSelectedRecordId('');
    }
  }, [
    api,
    filterBranchId,
    filterEmployeeId,
    filterEventType,
    filterFrom,
    filterTo,
    selectedRecordId,
  ]);

  const loadRecordById = useCallback(
    (recordId: string) =>
      api.request<AttendanceRecord>(`/attendance/${recordId}`, {
        fallbackMessage: 'No fue posible cargar la marcación',
      }),
    [api],
  );

  const loadEmployeeDaySummary = useCallback(async () => {
    if (!api.hasSession || !selectedBranchId || !selectedEmployeeId || !eventAtInput) {
      setEmployeeDayRecords([]);
      return;
    }

    const { start, end } = getDayBounds(eventAtInput);
    const params = new URLSearchParams({
      branchId: selectedBranchId,
      employeeId: selectedEmployeeId,
      from: start.toISOString(),
      limit: '100',
      page: '1',
      to: end.toISOString(),
    });

    try {
      const nextRecords = await api.request<AttendanceRecord[]>(
        `/attendance?${params.toString()}`,
        { fallbackMessage: 'No fue posible cargar la jornada attendance' },
      );
      setEmployeeDayRecords(nextRecords);
    } catch {
      setEmployeeDayRecords([]);
    }
  }, [api, eventAtInput, selectedBranchId, selectedEmployeeId]);

  const initializeConsole = useCallback(async () => {
    if (!api.hasSession || !tenantId.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([directory.loadEmployees(), loadAttendance()]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Error inesperado al cargar attendance',
      );
    } finally {
      setIsLoading(false);
    }
  }, [api.hasSession, directory, loadAttendance, tenantId]);

  useEffect(() => {
    void initializeConsole();
  }, [initializeConsole]);

  useEffect(() => {
    void loadEmployeeDaySummary();
  }, [loadEmployeeDaySummary]);

  const handleRefresh = useCallback(async () => {
    setSuccess(null);
    await initializeConsole();
  }, [initializeConsole]);

  const handleCreateAttendance = useCallback(async () => {
    if (!selectedBranchId || !selectedEmployeeId || !eventAtInput || !api.hasSession) {
      setError('Sucursal, colaborador y sesion son obligatorios');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const createdRecord = await api.request<AttendanceRecord>('/attendance', {
        body: {
          branchId: selectedBranchId,
          employeeId: selectedEmployeeId,
          eventAt: new Date(eventAtInput).toISOString(),
          eventType,
          notes: notes.trim() || undefined,
          source,
        },
        fallbackMessage: 'No fue posible crear la marcación',
        headers: { 'Idempotency-Key': idempotencyKey },
        method: 'POST',
      });

      setSuccess(`Marcacion ${createdRecord.eventType} registrada para ${createdRecord.eventAt}`);
      resetEditor();
      await loadAttendance();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Error inesperado al crear la marcacion',
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    api,
    eventAtInput,
    eventType,
    idempotencyKey,
    loadAttendance,
    notes,
    resetEditor,
    selectedBranchId,
    selectedEmployeeId,
    source,
  ]);

  const handleUpdateAttendance = useCallback(async () => {
    if (!selectedRecordId || !selectedBranchId || !selectedEmployeeId || !eventAtInput || !api.hasSession) {
      setError('Debes cargar una marcacion y completar sucursal, colaborador y fecha');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updatedRecord = await api.request<AttendanceRecord>(`/attendance/${selectedRecordId}`, {
        body: {
          branchId: selectedBranchId,
          employeeId: selectedEmployeeId,
          eventAt: new Date(eventAtInput).toISOString(),
          eventType,
          notes: notes.trim() || null,
          source,
        },
        fallbackMessage: 'No fue posible actualizar la marcación',
        method: 'PATCH',
      });

      setSuccess(`Marcacion ${updatedRecord.id} actualizada`);
      await loadAttendance();
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
  }, [
    api,
    eventAtInput,
    eventType,
    loadAttendance,
    notes,
    selectedBranchId,
    selectedEmployeeId,
    selectedRecordId,
    source,
  ]);

  const loadRecordIntoEditor = useCallback(async (recordId: string) => {
    if (!api.hasSession) {
      setError('No hay sesion activa para cargar la marcacion');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const record = await loadRecordById(recordId);
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
  }, [api.hasSession, backoffice, loadRecordById]);

  return (
    <div className="grid gap-6">
      <AttendanceFilters
        apiBaseUrl={apiBaseUrl}
        branches={directory.branches}
        employees={employeesForFilterBranchFiltered}
        filterBranchId={filterBranchId}
        filterEmployeeId={filterEmployeeId}
        filterEmployeeSearchTerm={filterEmployeeSearchTerm}
        filterEventType={filterEventType}
        filterFrom={filterFrom}
        filterTo={filterTo}
        hasSession={api.hasSession}
        isLoading={isLoading || directory.isLoading}
        onApiBaseUrlChange={setApiBaseUrl}
        onFilterBranchChange={(value) => {
          setFilterBranchId(value);
          backoffice.setActiveBranchId(value);
          setFilterEmployeeId('');
          setFilterEmployeeSearchTerm('');
        }}
        onFilterEmployeeChange={setFilterEmployeeId}
        onFilterEmployeeSearchTermChange={setFilterEmployeeSearchTerm}
        onFilterEventTypeChange={setFilterEventType}
        onFilterFromChange={setFilterFrom}
        onFilterToChange={setFilterTo}
        onRefresh={() => void handleRefresh()}
        onSubmit={() => void handleRefresh()}
        tenantId={tenantId}
        onTenantIdChange={setTenantId}
      />

      <AttendanceEditor
        branches={directory.branches}
        employees={employeesForSelectedBranchFiltered}
        employeeSearchTerm={employeeSearchTerm}
        eventAtInput={eventAtInput}
        eventType={eventType}
        hasSession={api.hasSession}
        idempotencyKey={idempotencyKey}
        isLoading={isLoading}
        notes={notes}
        onEmployeeSearchTermChange={setEmployeeSearchTerm}
        onEventAtInputChange={setEventAtInput}
        onEventTypeChange={setEventType}
        onNotesChange={setNotes}
        onReset={resetEditor}
        onSelectedBranchIdChange={(value) => {
          setSelectedBranchId(value);
          backoffice.setActiveBranchId(value);
          setSelectedEmployeeId('');
          setEmployeeSearchTerm('');
        }}
        onSelectedEmployeeIdChange={setSelectedEmployeeId}
        onSourceChange={setSource}
        onSubmit={() => void (selectedRecordId ? handleUpdateAttendance() : handleCreateAttendance())}
        selectedBranchId={selectedBranchId}
        selectedEmployeeId={selectedEmployeeId}
        selectedRecordId={selectedRecordId}
        source={source}
      />

      <AttendanceSummary
        branchLabel={branchNameById.get(selectedBranchId) ?? selectedBranchId}
        currentStatus={attendanceJourneySummary.currentStatus}
        eventAtInput={eventAtInput}
        firstRecord={attendanceJourneySummary.firstRecord}
        lastRecord={attendanceJourneySummary.lastRecord}
        orderedRecords={attendanceJourneySummary.orderedRecords}
        selectedBranchId={selectedBranchId}
        selectedEmployeeId={selectedEmployeeId}
        selectedEmployeeLabel={employeeNameById.get(selectedEmployeeId) ?? selectedEmployeeId}
        totalEvents={attendanceJourneySummary.totalEvents}
      />

      <FeedbackBanners error={error} success={success} />

      <AttendanceRecordList
        branchNameById={branchNameById}
        employeeNameById={employeeNameById}
        onLoadRecord={(recordId) => void loadRecordIntoEditor(recordId)}
        records={records}
      />
    </div>
  );
}
