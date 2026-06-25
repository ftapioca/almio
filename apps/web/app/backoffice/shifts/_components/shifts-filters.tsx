import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@almio/design-system';
import { Branch, Employee } from '../../_lib/types';
import { shiftStatusOptions } from '../types';

type ShiftsFiltersProps = {
  apiBaseUrl: string;
  branches: Branch[];
  employees: Employee[];
  filterBranchId: string;
  filterEmployeeId: string;
  filterFrom: string;
  filterStatus: string;
  filterTo: string;
  hasSession: boolean;
  isLoading: boolean;
  onApiBaseUrlChange: (value: string) => void;
  onFilterBranchChange: (value: string) => void;
  onFilterEmployeeChange: (value: string) => void;
  onFilterFromChange: (value: string) => void;
  onFilterStatusChange: (value: string) => void;
  onFilterToChange: (value: string) => void;
  onRefresh: () => void;
  onSubmit: () => void;
  onTenantIdChange: (value: string) => void;
  tenantId: string;
};

export function ShiftsFilters({
  apiBaseUrl,
  branches,
  employees,
  filterBranchId,
  filterEmployeeId,
  filterFrom,
  filterStatus,
  filterTo,
  hasSession,
  isLoading,
  onApiBaseUrlChange,
  onFilterBranchChange,
  onFilterEmployeeChange,
  onFilterFromChange,
  onFilterStatusChange,
  onFilterToChange,
  onRefresh,
  onSubmit,
  onTenantIdChange,
  tenantId,
}: ShiftsFiltersProps) {
  return (
    <Card className="border-border/70 bg-card/95">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle>Shifts Console</CardTitle>
          <CardDescription>
            Filtros, edición y comandos operativos sobre el contrato actual de shifts.
          </CardDescription>
        </div>

        <Button
          type="button"
          variant="secondary"
          loading={isLoading}
          onClick={onRefresh}
          disabled={isLoading || !hasSession}
        >
          {isLoading ? 'Refrescando...' : 'Refrescar'}
        </Button>
      </CardHeader>

      <CardContent className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <Label htmlFor="shifts-api-base-url">API Base URL</Label>
            <Input
              id="shifts-api-base-url"
              value={apiBaseUrl}
              onChange={(event) => onApiBaseUrlChange(event.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <Label htmlFor="shifts-tenant-id">Tenant</Label>
            <Input
              id="shifts-tenant-id"
              value={tenantId}
              onChange={(event) => onTenantIdChange(event.target.value)}
            />
          </label>
        </div>

        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2">
              <Label htmlFor="shifts-filter-branch">Filtrar por sucursal</Label>
              <select
                id="shifts-filter-branch"
                className="field-input"
                value={filterBranchId}
                onChange={(event) => onFilterBranchChange(event.target.value)}
              >
                <option value="">Todas</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.code} · {branch.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <Label htmlFor="shifts-filter-employee">Filtrar por colaborador</Label>
              <select
                id="shifts-filter-employee"
                className="field-input"
                value={filterEmployeeId}
                onChange={(event) => onFilterEmployeeChange(event.target.value)}
              >
                <option value="">Todos</option>
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
              <Label htmlFor="shifts-filter-status">Filtrar por estado</Label>
              <select
                id="shifts-filter-status"
                className="field-input"
                value={filterStatus}
                onChange={(event) => onFilterStatusChange(event.target.value)}
              >
                <option value="">Todos</option>
                {shiftStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <Label htmlFor="shifts-filter-from">Desde</Label>
              <Input
                id="shifts-filter-from"
                type="datetime-local"
                value={filterFrom}
                onChange={(event) => onFilterFromChange(event.target.value)}
              />
            </label>

            <label className="grid gap-2">
              <Label htmlFor="shifts-filter-to">Hasta</Label>
              <Input
                id="shifts-filter-to"
                type="datetime-local"
                value={filterTo}
                onChange={(event) => onFilterToChange(event.target.value)}
              />
            </label>
          </div>

          <Button type="submit" loading={isLoading} disabled={isLoading || !hasSession}>
            Aplicar filtros
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
