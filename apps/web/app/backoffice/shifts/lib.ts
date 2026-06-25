import { AttendanceRecord } from '../attendance/types';
import { deriveAttendanceJourneyStatus } from '../attendance/lib';
import { ShiftAttendanceException, ShiftRecord, ShiftStatus } from './types';

export function getAllowedCommands(status: ShiftStatus) {
  switch (status) {
    case 'SCHEDULED':
      return ['publish', 'cancel'] as const;
    case 'PUBLISHED':
      return ['complete', 'cancel'] as const;
    default:
      return [] as const;
  }
}

export function canEditShiftStructure(status: ShiftStatus) {
  return status !== 'COMPLETED' && status !== 'CANCELLED';
}

export function getLocalOverlapRecords({
  endsAtInput,
  records,
  selectedBranchId,
  selectedEmployeeId,
  selectedShiftId,
  startsAtInput,
}: {
  endsAtInput: string;
  records: ShiftRecord[];
  selectedBranchId: string;
  selectedEmployeeId: string;
  selectedShiftId: string;
  startsAtInput: string;
}) {
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
}

export function buildShiftAttendanceExceptions({
  coverageAttendanceRecords,
  coverageBranchId,
  coverageRecords,
}: {
  coverageAttendanceRecords: AttendanceRecord[];
  coverageBranchId: string;
  coverageRecords: ShiftRecord[];
}) {
  if (!coverageBranchId) {
    return [] as ShiftAttendanceException[];
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

  for (const shift of coverageRecords) {
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
        detail: `Turno ${shift.id} asignado sin eventos attendance para la jornada.`,
        employeeId: shift.employeeId,
        severity: 'warning',
        shiftId: shift.id,
        type: 'assigned_shift_without_attendance',
      });
    }

    if (shift.status === 'PUBLISHED' && !hasCheckIn && new Date(shift.startsAt).getTime() <= now) {
      exceptions.push({
        detail: `Turno ${shift.id} publicado ya inició y aún no registra CHECK_IN.`,
        employeeId: shift.employeeId,
        severity: 'danger',
        shiftId: shift.id,
        type: 'published_without_checkin',
      });
    }

    if (shift.status === 'COMPLETED' && (!hasCheckOut || attendanceStatus !== 'Jornada cerrada')) {
      exceptions.push({
        detail: `Turno ${shift.id} completado sin cierre consistente en attendance.`,
        employeeId: shift.employeeId,
        severity: 'danger',
        shiftId: shift.id,
        type: 'completed_without_checkout',
      });
    }
  }

  for (const [employeeId, employeeAttendance] of attendanceByEmployee.entries()) {
    if (!assignedShiftEmployeeIds.has(employeeId) && employeeAttendance.length > 0) {
      exceptions.push({
        detail: `Hay actividad attendance para ${employeeId} sin turno asignado en la cobertura del día.`,
        employeeId,
        severity: 'warning',
        type: 'attendance_without_shift',
      });
    }
  }

  return exceptions;
}
