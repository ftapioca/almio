import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@almio/design-system';
import { formatDateTime } from '../../_lib/dates';
import { ShiftRecord } from '../types';

type ShiftsRecordListProps = {
  branchNameById: Map<string, string>;
  employeeNameById: Map<string, string>;
  getAllowedCommands: (status: ShiftRecord['status']) => readonly ('publish' | 'cancel' | 'complete')[];
  hasSession: boolean;
  isLoading: boolean;
  onCommand: (shiftId: string, command: 'publish' | 'cancel' | 'complete') => void;
  onLoadShift: (shift: ShiftRecord) => void;
  records: ShiftRecord[];
};

export function ShiftsRecordList({
  branchNameById,
  employeeNameById,
  getAllowedCommands,
  hasSession,
  isLoading,
  onCommand,
  onLoadShift,
  records,
}: ShiftsRecordListProps) {
  return (
    <Card className="border-border/70 bg-card/95">
      <CardHeader>
        <CardTitle>Turnos recientes</CardTitle>
        <CardDescription>
          Últimos 20 registros según los filtros activos. Haz click en “Cargar” para editar.
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
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">{record.notes}</p>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button type="button" variant="secondary" onClick={() => onLoadShift(record)}>
                      Cargar
                    </Button>

                    {allowedCommands.map((command) => (
                      <Button
                        key={command}
                        type="button"
                        variant="outline"
                        onClick={() => onCommand(record.id, command)}
                        disabled={isLoading || !hasSession}
                      >
                        {command === 'publish' ? 'Publish' : command === 'cancel' ? 'Cancel' : 'Complete'}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">No hay turnos para los filtros actuales.</p>
        )}
      </CardContent>
    </Card>
  );
}
