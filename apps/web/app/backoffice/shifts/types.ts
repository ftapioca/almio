export type ShiftStatus = 'SCHEDULED' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';

export type ShiftRecord = {
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

export type ShiftCommandGuardrail = {
  command: 'publish' | 'cancel' | 'complete';
  shiftId: string;
  detail: string;
  severity: 'info' | 'warning';
};

export type ShiftAttendanceException = {
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

export const shiftStatusOptions: ShiftStatus[] = [
  'SCHEDULED',
  'PUBLISHED',
  'CANCELLED',
  'COMPLETED',
];
