import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from '@almio/design-system';
import { Branch, Employee } from '../../_lib/types';
import { attendanceEventOptions, attendanceSourceOptions, AttendanceRecord } from '../types';

type AttendanceEditorProps = {
  branches: Branch[];
  employees: Employee[];
  employeeSearchTerm: string;
  eventAtInput: string;
  eventType: AttendanceRecord['eventType'];
  hasSession: boolean;
  idempotencyKey: string;
  isLoading: boolean;
  notes: string;
  onEmployeeSearchTermChange: (value: string) => void;
  onEventAtInputChange: (value: string) => void;
  onEventTypeChange: (value: AttendanceRecord['eventType']) => void;
  onNotesChange: (value: string) => void;
  onReset: () => void;
  onSelectedBranchIdChange: (value: string) => void;
  onSelectedEmployeeIdChange: (value: string) => void;
  onSourceChange: (value: AttendanceRecord['source']) => void;
  onSubmit: () => void;
  selectedBranchId: string;
  selectedEmployeeId: string;
  selectedRecordId: string;
  source: AttendanceRecord['source'];
};

export function AttendanceEditor({
  branches,
  employees,
  employeeSearchTerm,
  eventAtInput,
  eventType,
  hasSession,
  idempotencyKey,
  isLoading,
  notes,
  onEmployeeSearchTermChange,
  onEventAtInputChange,
  onEventTypeChange,
  onNotesChange,
  onReset,
  onSelectedBranchIdChange,
  onSelectedEmployeeIdChange,
  onSourceChange,
  onSubmit,
  selectedBranchId,
  selectedEmployeeId,
  selectedRecordId,
  source,
}: AttendanceEditorProps) {
  return (
    <Card className="border-border/70 bg-card/95">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle>{selectedRecordId ? 'Editar marcación' : 'Nueva marcación'}</CardTitle>
          <CardDescription>
            La UI genera `Idempotency-Key` para altas y permite ajustar source, fecha y
            notas.
          </CardDescription>
        </div>

        <Button type="button" variant="outline" onClick={onReset}>
          Nueva marcación
        </Button>
      </CardHeader>

      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2">
              <Label htmlFor="attendance-editor-branch">Sucursal</Label>
              <select
                id="attendance-editor-branch"
                className="field-input"
                value={selectedBranchId}
                onChange={(event) => onSelectedBranchIdChange(event.target.value)}
                required
              >
                <option value="">Seleccionar sucursal</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.code} · {branch.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <Label htmlFor="attendance-editor-employee-search">Buscar colaborador</Label>
              <Input
                id="attendance-editor-employee-search"
                value={employeeSearchTerm}
                onChange={(event) => onEmployeeSearchTermChange(event.target.value)}
                placeholder="Nombre, email o UUID"
              />
            </label>

            <label className="grid gap-2">
              <Label htmlFor="attendance-editor-employee">Colaborador</Label>
              <select
                id="attendance-editor-employee"
                className="field-input"
                value={selectedEmployeeId}
                onChange={(event) => onSelectedEmployeeIdChange(event.target.value)}
                required
              >
                <option value="">Seleccionar colaborador</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <label className="grid gap-2">
              <Label htmlFor="attendance-editor-event-type">Evento</Label>
              <select
                id="attendance-editor-event-type"
                className="field-input"
                value={eventType}
                onChange={(event) => onEventTypeChange(event.target.value as AttendanceRecord['eventType'])}
              >
                {attendanceEventOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <Label htmlFor="attendance-editor-source">Source</Label>
              <select
                id="attendance-editor-source"
                className="field-input"
                value={source}
                onChange={(event) => onSourceChange(event.target.value as AttendanceRecord['source'])}
              >
                {attendanceSourceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <Label htmlFor="attendance-editor-event-at">Fecha y hora</Label>
              <Input
                id="attendance-editor-event-at"
                type="datetime-local"
                value={eventAtInput}
                onChange={(event) => onEventAtInputChange(event.target.value)}
                required
              />
            </label>

            <label className="grid gap-2">
              <Label htmlFor="attendance-editor-idempotency-key">Idempotency Key</Label>
              <Input id="attendance-editor-idempotency-key" value={idempotencyKey} readOnly />
            </label>
          </div>

          <label className="grid gap-2">
            <Label htmlFor="attendance-editor-notes">Notas</Label>
            <Textarea
              id="attendance-editor-notes"
              className="min-h-28"
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Ingreso manual por supervision"
            />
          </label>

          <Button
            type="submit"
            size="lg"
            loading={isLoading}
            disabled={isLoading || !selectedBranchId || !selectedEmployeeId || !hasSession}
          >
            {isLoading
              ? selectedRecordId
                ? 'Actualizando...'
                : 'Registrando...'
              : selectedRecordId
                ? 'Actualizar marcación'
                : 'Registrar marcación'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
