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
import { attendanceEventOptions } from '../types';

type AttendanceFiltersProps = {
  apiBaseUrl: string;
  branches: Branch[];
  employees: Employee[];
  filterBranchId: string;
  filterEmployeeId: string;
  filterEmployeeSearchTerm: string;
  filterEventType: string;
  filterFrom: string;
  filterTo: string;
  hasSession: boolean;
  isLoading: boolean;
  onApiBaseUrlChange: (value: string) => void;
  onFilterBranchChange: (value: string) => void;
  onFilterEmployeeChange: (value: string) => void;
  onFilterEmployeeSearchTermChange: (value: string) => void;
  onFilterEventTypeChange: (value: string) => void;
  onFilterFromChange: (value: string) => void;
  onFilterToChange: (value: string) => void;
  onRefresh: () => void;
  onSubmit: () => void;
  tenantId: string;
  onTenantIdChange: (value: string) => void;
};

export function AttendanceFilters({
  apiBaseUrl,
  branches,
  employees,
  filterBranchId,
  filterEmployeeId,
  filterEmployeeSearchTerm,
  filterEventType,
  filterFrom,
  filterTo,
  hasSession,
  isLoading,
  onApiBaseUrlChange,
  onFilterBranchChange,
  onFilterEmployeeChange,
  onFilterEmployeeSearchTermChange,
  onFilterEventTypeChange,
  onFilterFromChange,
  onFilterToChange,
  onRefresh,
  onSubmit,
  tenantId,
  onTenantIdChange,
}: AttendanceFiltersProps) {
  return (
    <Card className="border-border/70 bg-card/95">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle>Attendance Console</CardTitle>
          <CardDescription>
            Filtros y marcación manual sobre el contrato actual de attendance.
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
            <Label htmlFor="attendance-api-base-url">API Base URL</Label>
            <Input
              id="attendance-api-base-url"
              value={apiBaseUrl}
              onChange={(event) => onApiBaseUrlChange(event.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <Label htmlFor="attendance-tenant-id">Tenant</Label>
            <Input
              id="attendance-tenant-id"
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
          <div className="grid gap-4 lg:grid-cols-5">
            <label className="grid gap-2">
              <Label htmlFor="attendance-filter-branch">Filtrar por sucursal</Label>
              <select
                id="attendance-filter-branch"
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
              <Label htmlFor="attendance-filter-employee-search">Buscar colaborador</Label>
              <Input
                id="attendance-filter-employee-search"
                value={filterEmployeeSearchTerm}
                onChange={(event) => onFilterEmployeeSearchTermChange(event.target.value)}
                placeholder="Nombre, email o UUID"
              />
            </label>

            <label className="grid gap-2">
              <Label htmlFor="attendance-filter-employee">Filtrar por colaborador</Label>
              <select
                id="attendance-filter-employee"
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

            <label className="grid gap-2">
              <Label htmlFor="attendance-filter-event-type">Filtrar por evento</Label>
              <select
                id="attendance-filter-event-type"
                className="field-input"
                value={filterEventType}
                onChange={(event) => onFilterEventTypeChange(event.target.value)}
              >
                <option value="">Todos</option>
                {attendanceEventOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <Label htmlFor="attendance-filter-from">Desde</Label>
              <Input
                id="attendance-filter-from"
                type="datetime-local"
                value={filterFrom}
                onChange={(event) => onFilterFromChange(event.target.value)}
              />
            </label>

            <label className="grid gap-2">
              <Label htmlFor="attendance-filter-to">Hasta</Label>
              <Input
                id="attendance-filter-to"
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
