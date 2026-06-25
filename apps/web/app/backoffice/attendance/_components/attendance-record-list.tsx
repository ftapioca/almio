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
import { AttendanceRecord } from '../types';

type AttendanceRecordListProps = {
  branchNameById: Map<string, string>;
  employeeNameById: Map<string, string>;
  onLoadRecord: (recordId: string) => void;
  records: AttendanceRecord[];
};

export function AttendanceRecordList({
  branchNameById,
  employeeNameById,
  onLoadRecord,
  records,
}: AttendanceRecordListProps) {
  return (
    <Card className="border-border/70 bg-card/95">
      <CardHeader>
        <CardTitle>Marcaciones recientes</CardTitle>
        <CardDescription>Últimos 20 registros según los filtros activos.</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        {records.length > 0 ? (
          records.map((record) => (
            <Card key={record.id} className="border-border/70 bg-muted/20 shadow-none">
              <CardContent className="p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {record.eventType} · {employeeNameById.get(record.employeeId) ?? record.employeeId}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {branchNameById.get(record.branchId) ?? record.branchId}
                    </p>
                    <p className="mt-2 text-sm text-foreground">{formatDateTime(record.eventAt)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => onLoadRecord(record.id)}>
                      Cargar
                    </Button>
                    <Badge variant="outline">{record.source}</Badge>
                    <Badge variant="outline">{record.id}</Badge>
                  </div>
                </div>

                {record.notes ? (
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">{record.notes}</p>
                ) : null}
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No hay marcaciones para los filtros actuales.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
