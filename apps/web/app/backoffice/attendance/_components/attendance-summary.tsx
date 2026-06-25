import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@almio/design-system';
import { formatDate, formatDateTime } from '../../_lib/dates';
import { SummaryCard } from '../../_components/common/summary-card';
import { AttendanceRecord } from '../types';

type AttendanceSummaryProps = {
  branchLabel: string;
  currentStatus: string;
  eventAtInput: string;
  firstRecord: AttendanceRecord | null;
  lastRecord: AttendanceRecord | null;
  orderedRecords: AttendanceRecord[];
  selectedBranchId: string;
  selectedEmployeeId: string;
  selectedEmployeeLabel: string;
  totalEvents: number;
};

export function AttendanceSummary({
  branchLabel,
  currentStatus,
  eventAtInput,
  firstRecord,
  lastRecord,
  orderedRecords,
  selectedBranchId,
  selectedEmployeeId,
  selectedEmployeeLabel,
  totalEvents,
}: AttendanceSummaryProps) {
  return (
    <Card className="border-border/70 bg-card/95">
      <CardHeader>
        <CardTitle>Resumen de jornada</CardTitle>
        <CardDescription>
          Se recalcula con `GET /v1/attendance` sobre la sucursal, colaborador y día del
          editor.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {selectedBranchId && selectedEmployeeId ? (
          <div className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-4">
              <SummaryCard label="Día operativo" value={formatDate(eventAtInput)} />
              <SummaryCard label="Estado derivado" value={currentStatus} />
              <SummaryCard
                label="Primer evento"
                value={firstRecord ? formatDateTime(firstRecord.eventAt) : 'Sin registros'}
              />
              <SummaryCard
                label="Último evento"
                value={lastRecord ? formatDateTime(lastRecord.eventAt) : 'Sin registros'}
              />
            </div>

            <Card className="border-border/70 bg-muted/20 shadow-none">
              <CardContent className="p-5">
                <p className="text-sm font-semibold">{selectedEmployeeLabel}</p>
                <p className="mt-1 text-sm text-muted-foreground">{branchLabel}</p>
                <p className="mt-3 text-sm text-muted-foreground">Eventos del día: {totalEvents}</p>

                <div className="mt-4 grid gap-3">
                  {orderedRecords.length > 0 ? (
                    orderedRecords.map((record) => (
                      <Card key={record.id} className="border-border/70 bg-background shadow-none">
                        <CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{record.eventType}</p>
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
  );
}
