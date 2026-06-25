import {
  Alert,
  AlertDescription,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@almio/design-system';
import { SummaryCard } from '../../_components/common/summary-card';
import { formatDateTime } from '../../_lib/dates';
import { ShiftAttendanceException, ShiftRecord } from '../types';

type ShiftsCoverageProps = {
  branchLabel: string;
  coverageDateInput: string;
  coverageRecords: ShiftRecord[];
  dateLabel: string;
  employeeNameById: Map<string, string>;
  exceptions: ShiftAttendanceException[];
  onCoverageDateInputChange: (value: string) => void;
  summary: {
    assignedShifts: number;
    publishedShifts: number;
    totalShifts: number;
    uniqueEmployees: number;
  };
};

export function ShiftsCoverage({
  branchLabel,
  coverageDateInput,
  coverageRecords,
  dateLabel,
  employeeNameById,
  exceptions,
  onCoverageDateInputChange,
  summary,
}: ShiftsCoverageProps) {
  return (
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
            onChange={(event) => onCoverageDateInputChange(event.target.value)}
          />
        </label>
      </CardHeader>

      <CardContent className="grid gap-4">
        <div className="grid gap-4 lg:grid-cols-4">
          <SummaryCard label="Sucursal analizada" value={branchLabel} />
          <SummaryCard label="Turnos del día" value={String(summary.totalShifts)} />
          <SummaryCard
            label="Asignados / publicados"
            value={`${summary.assignedShifts} / ${summary.publishedShifts}`}
          />
          <SummaryCard label="Dotación única" value={String(summary.uniqueEmployees)} />
        </div>

        <Card className="border-border/70 bg-muted/20 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Agenda de cobertura: {dateLabel}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {coverageRecords.length > 0 ? (
              coverageRecords.map((record) => (
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
            <CardDescription>Cruce operativo sobre la misma sucursal y jornada de cobertura.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {exceptions.length > 0 ? (
              exceptions.map((exception, index) => (
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
                Sin excepciones mínimas detectadas entre turnos y attendance para esta cobertura.
              </p>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
