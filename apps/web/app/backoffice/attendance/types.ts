export type AttendanceRecord = {
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

export const attendanceEventOptions: AttendanceRecord['eventType'][] = [
  'CHECK_IN',
  'BREAK_START',
  'BREAK_END',
  'CHECK_OUT',
];

export const attendanceSourceOptions: AttendanceRecord['source'][] = [
  'MANUAL',
  'DEVICE',
  'IMPORT',
];
