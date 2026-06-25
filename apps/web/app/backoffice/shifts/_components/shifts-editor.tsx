import {
  Alert,
  AlertDescription,
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
import { ShiftRecord } from '../types';

type ShiftsEditorProps = {
  branches: Branch[];
  canEditSelectedShift: boolean;
  employees: Employee[];
  endsAtInput: string;
  hasSession: boolean;
  isLoading: boolean;
  localOverlapCount: number;
  notes: string;
  onEndsAtInputChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onRefresh: () => void;
  onReset: () => void;
  onSelectedBranchIdChange: (value: string) => void;
  onSelectedEmployeeIdChange: (value: string) => void;
  onSelectedStatusChange: (value: 'SCHEDULED' | 'PUBLISHED') => void;
  onStartsAtInputChange: (value: string) => void;
  onSubmit: () => void;
  selectedBranchId: string;
  selectedEmployeeId: string;
  selectedShift: ShiftRecord | null;
  selectedStatus: 'SCHEDULED' | 'PUBLISHED';
  startsAtInput: string;
};

export function ShiftsEditor({
  branches,
  canEditSelectedShift,
  employees,
  endsAtInput,
  hasSession,
  isLoading,
  localOverlapCount,
  notes,
  onEndsAtInputChange,
  onNotesChange,
  onRefresh,
  onReset,
  onSelectedBranchIdChange,
  onSelectedEmployeeIdChange,
  onSelectedStatusChange,
  onStartsAtInputChange,
  onSubmit,
  selectedBranchId,
  selectedEmployeeId,
  selectedShift,
  selectedStatus,
  startsAtInput,
}: ShiftsEditorProps) {
  return (
    <Card className="border-border/70 bg-card/95">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle>Editor de turnos</CardTitle>
          <CardDescription>
            Crea un turno nuevo o carga uno existente para editar datos permitidos.
          </CardDescription>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={onReset}>
            Nuevo turno
          </Button>
          <Button
            type="button"
            variant="secondary"
            loading={isLoading}
            onClick={onRefresh}
            disabled={isLoading || !hasSession}
          >
            Recargar lista
          </Button>
        </div>
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
              <Label htmlFor="shifts-editor-branch">Sucursal</Label>
              <select
                id="shifts-editor-branch"
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
              <Label htmlFor="shifts-editor-employee">Colaborador</Label>
              <select
                id="shifts-editor-employee"
                className="field-input"
                value={selectedEmployeeId}
                onChange={(event) => onSelectedEmployeeIdChange(event.target.value)}
              >
                <option value="">Sin asignar</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!selectedShift ? (
            <label className="grid gap-2">
              <Label htmlFor="shifts-editor-initial-status">Estado inicial</Label>
              <select
                id="shifts-editor-initial-status"
                className="field-input"
                value={selectedStatus}
                onChange={(event) => onSelectedStatusChange(event.target.value as 'SCHEDULED' | 'PUBLISHED')}
              >
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="PUBLISHED">PUBLISHED</option>
              </select>
            </label>
          ) : (
            <label className="grid gap-2">
              <Label htmlFor="shifts-editor-current-status">Estado actual</Label>
              <Input id="shifts-editor-current-status" value={selectedShift.status} readOnly />
            </label>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2">
              <Label htmlFor="shifts-editor-starts-at">Inicio</Label>
              <Input
                id="shifts-editor-starts-at"
                type="datetime-local"
                value={startsAtInput}
                onChange={(event) => onStartsAtInputChange(event.target.value)}
                required
              />
            </label>

            <label className="grid gap-2">
              <Label htmlFor="shifts-editor-ends-at">Fin</Label>
              <Input
                id="shifts-editor-ends-at"
                type="datetime-local"
                value={endsAtInput}
                onChange={(event) => onEndsAtInputChange(event.target.value)}
                required
              />
            </label>
          </div>

          <label className="grid gap-2">
            <Label htmlFor="shifts-editor-notes">Notas</Label>
            <Textarea
              id="shifts-editor-notes"
              className="min-h-28"
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Apertura, cierre, reemplazo, observaciones operativas"
            />
          </label>

          {localOverlapCount > 0 ? (
            <Alert variant="danger">
              <AlertDescription>
                El turno propuesto se solapa con {localOverlapCount} turno(s) ya cargado(s) para este colaborador en la misma sucursal.
              </AlertDescription>
            </Alert>
          ) : null}

          {selectedShift && !canEditSelectedShift ? (
            <Alert variant="warning">
              <AlertDescription>
                Este turno está en estado {selectedShift.status}. Solo conviene revisarlo o usar comandos permitidos desde la lista; la edición estructural queda bloqueada.
              </AlertDescription>
            </Alert>
          ) : null}

          <Button
            type="submit"
            size="lg"
            loading={isLoading}
            disabled={
              isLoading ||
              !selectedBranchId ||
              !hasSession ||
              localOverlapCount > 0 ||
              !!(selectedShift && !canEditSelectedShift)
            }
          >
            {isLoading ? (selectedShift ? 'Actualizando...' : 'Creando...') : selectedShift ? 'Actualizar turno' : 'Crear turno'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
