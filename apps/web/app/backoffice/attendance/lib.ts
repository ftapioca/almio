import { AttendanceRecord } from './types';

export function deriveAttendanceJourneyStatus(records: AttendanceRecord[]) {
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
