'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, buttonVariants } from '@almio/design-system';
import { useBackofficeContext } from './backoffice-client-context';

type AttendanceRecord = {
  id: string;
  branchId: string;
  employeeId: string;
  eventType: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END';
  eventAt: string;
};

type ShiftRecord = {
  id: string;
  branchId: string;
  employeeId: string | null;
  status: 'SCHEDULED' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  startsAt: string;
  endsAt: string;
};

const modules = [
  {
    href: '/backoffice/attendance',
    label: 'Attendance',
    description:
      'Registrar marcaciones manuales, revisar últimos eventos y probar secuencias reales del contrato.',
  },
  {
    href: '/backoffice/shifts',
    label: 'Shifts',
    description:
      'Crear turnos, ajustar datos estructurales y ejecutar comandos publish, cancel y complete.',
  },
  {
    href: '/backoffice/branch-scopes',
    label: 'Branch Scopes',
    description:
      'Consultar memberships y reemplazar el scope completo de sucursales para BRANCH_ADMIN.',
  },
];

function getDayBounds() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

async function parseApiResponse(response: Response) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      payload?.error?.message ??
        payload?.message ??
        'No fue posible cargar los indicadores operativos',
    );
  }

  return payload;
}

function deriveJourneyStatus(records: AttendanceRecord[]) {
  const lastRecord = [...records].sort(
    (left, right) => new Date(left.eventAt).getTime() - new Date(right.eventAt).getTime(),
  ).at(-1);

  if (!lastRecord) {
    return 'Sin actividad';
  }

  switch (lastRecord.eventType) {
    case 'CHECK_IN':
      return 'En jornada';
    case 'BREAK_START':
      return 'En pausa';
    case 'BREAK_END':
      return 'De vuelta';
    case 'CHECK_OUT':
      return 'Cerrada';
    default:
      return 'Indefinida';
  }
}

export function BackofficeHome() {
  const { accessToken, apiBaseUrl, tenantId, me, branches, activeBranchId } = useBackofficeContext();
  const [attendanceToday, setAttendanceToday] = useState<AttendanceRecord[]>([]);
  const [shiftsToday, setShiftsToday] = useState<ShiftRecord[]>([]);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState(false);

  const activeBranch = branches.find((branch) => branch.id === activeBranchId) ?? null;
  const scopedBranchCount = me?.user?.branchScopeIds.length ?? 0;

  useEffect(() => {
    if (!accessToken.trim() || !tenantId.trim()) {
      setAttendanceToday([]);
      setShiftsToday([]);
      return;
    }

    const { start, end } = getDayBounds();
    const params = new URLSearchParams({
      limit: '100',
      from: start.toISOString(),
      to: end.toISOString(),
    });

    if (activeBranchId) {
      params.set('branchId', activeBranchId);
    }

    let isMounted = true;

    async function loadOperationalMetrics() {
      setIsMetricsLoading(true);
      setMetricsError(null);

      try {
        const headers = {
          Authorization: `Bearer ${accessToken.trim()}`,
          'X-Tenant-ID': tenantId,
        };

        const [attendanceResponse, shiftsResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/attendance?${params.toString()}`, { headers }),
          fetch(`${apiBaseUrl}/shifts?${params.toString()}`, { headers }),
        ]);

        const [attendancePayload, shiftsPayload] = await Promise.all([
          parseApiResponse(attendanceResponse),
          parseApiResponse(shiftsResponse),
        ]);

        if (!isMounted) {
          return;
        }

        setAttendanceToday(attendancePayload.data as AttendanceRecord[]);
        setShiftsToday(shiftsPayload.data as ShiftRecord[]);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setMetricsError(
          requestError instanceof Error
            ? requestError.message
            : 'No fue posible cargar los indicadores operativos',
        );
      } finally {
        if (isMounted) {
          setIsMetricsLoading(false);
        }
      }
    }

    void loadOperationalMetrics();

    return () => {
      isMounted = false;
    };
  }, [accessToken, activeBranchId, apiBaseUrl, tenantId]);

  const operationalMetrics = useMemo(() => {
    const recordsByEmployee = new Map<string, AttendanceRecord[]>();

    for (const record of attendanceToday) {
      const existing = recordsByEmployee.get(record.employeeId) ?? [];
      existing.push(record);
      recordsByEmployee.set(record.employeeId, existing);
    }

    const openJourneys = Array.from(recordsByEmployee.values()).filter((records) => {
      const status = deriveJourneyStatus(records);
      return status === 'En jornada' || status === 'En pausa' || status === 'De vuelta';
    }).length;

    return {
      attendanceEvents: attendanceToday.length,
      openJourneys,
      shiftsTotal: shiftsToday.length,
      shiftsPublished: shiftsToday.filter((shift) => shift.status === 'PUBLISHED').length,
      shiftsCompleted: shiftsToday.filter((shift) => shift.status === 'COMPLETED').length,
      unassignedShifts: shiftsToday.filter((shift) => !shift.employeeId).length,
    };
  }, [attendanceToday, shiftsToday]);

  const operationalAlerts = useMemo(() => {
    const alerts: string[] = [];

    if (operationalMetrics.unassignedShifts > 0) {
      alerts.push(`${operationalMetrics.unassignedShifts} turno(s) de hoy siguen sin colaborador asignado`);
    }

    if (operationalMetrics.openJourneys > 0) {
      alerts.push(`${operationalMetrics.openJourneys} jornada(s) siguen abiertas en attendance`);
    }

    if (operationalMetrics.shiftsPublished > operationalMetrics.shiftsCompleted) {
      alerts.push(
        `${operationalMetrics.shiftsPublished - operationalMetrics.shiftsCompleted} turno(s) publicados aún no aparecen completados`,
      );
    }

    return alerts;
  }, [operationalMetrics]);

  return (
    <div className="grid gap-6">
      <Card className="shadow-elevation-2">
        <CardHeader className="max-w-3xl p-6">
          <Badge variant="info" className="w-fit">Inicio operativo</Badge>
          <CardTitle className="mt-3 text-h4">
            Entrada única al backoffice funcional actual.
          </CardTitle>
          <CardDescription className="mt-2 text-body-sm leading-7">
            Este panel ya comparte sesión, tenant y sucursal activa. Sirve como
            punto base para operar mientras el design system definitivo sigue en
            construcción.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <StatCard
          label="Roles efectivos"
          value={me?.user?.roles.join(', ') || 'Sin roles'}
          detail={`membership: ${me?.user?.membershipId ?? 'n/a'}`}
        />
        <StatCard
          label="Scope de sucursales"
          value={scopedBranchCount > 0 ? `${scopedBranchCount} sucursal(es)` : 'Sin restricción'}
          detail="Basado en /v1/me y branchScopeIds"
        />
        <StatCard
          label="Sucursal activa"
          value={activeBranch ? `${activeBranch.code} · ${activeBranch.name}` : 'Sin seleccionar'}
          detail={activeBranch?.timezone ?? 'Selecciona una sucursal desde el panel superior'}
        />
      </div>

      <Card className="shadow-elevation-2">
        <CardHeader className="p-6">
          <CardTitle className="text-body font-semibold">Indicadores operativos de hoy</CardTitle>
          <CardDescription className="text-body-sm">
            Métricas mínimas derivadas de `attendance` y `shifts` para la sucursal activa.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-0">
          <div className="grid gap-4 xl:grid-cols-4">
            <StatCard
              label="Eventos attendance"
              value={isMetricsLoading ? 'Cargando...' : String(operationalMetrics.attendanceEvents)}
              detail="Marcaciones del día en el alcance actual"
            />
            <StatCard
              label="Jornadas abiertas"
              value={isMetricsLoading ? 'Cargando...' : String(operationalMetrics.openJourneys)}
              detail="Colaboradores cuyo último evento no es CHECK_OUT"
            />
            <StatCard
              label="Turnos publicados"
              value={
                isMetricsLoading
                  ? 'Cargando...'
                  : `${operationalMetrics.shiftsPublished} / ${operationalMetrics.shiftsTotal}`
              }
              detail="Publicados sobre total de turnos del día"
            />
            <StatCard
              label="Turnos sin asignar"
              value={isMetricsLoading ? 'Cargando...' : String(operationalMetrics.unassignedShifts)}
              detail="Riesgo operativo inmediato"
            />
          </div>

          {metricsError ? (
            <Alert variant="danger" className="mt-4">
              <AlertDescription>{metricsError}</AlertDescription>
            </Alert>
          ) : null}

          <Card className="mt-4 bg-muted shadow-none">
            <CardHeader className="p-5">
              <CardTitle className="text-body font-semibold">Alertas rápidas</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0">
              <div className="mt-3 grid gap-3">
                {operationalAlerts.length > 0 ? (
                  operationalAlerts.map((alert) => (
                    <div
                      key={alert}
                      className="rounded-xl border border-border bg-background px-4 py-3 text-body-sm text-muted-foreground"
                    >
                      {alert}
                    </div>
                  ))
                ) : (
                  <p className="text-body-sm text-muted-foreground">
                    Sin alertas mínimas para hoy en el alcance actual.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {modules.map((module) => (
          <Card key={module.href} className="shadow-elevation-2">
            <CardHeader className="p-6">
              <CardTitle className="text-body font-semibold">{module.label}</CardTitle>
              <CardDescription className="mt-1 text-body-sm leading-6">
                {module.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              <Link href={module.href} className={buttonVariants({})}>
                Abrir módulo
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="bg-muted shadow-none">
      <CardContent className="p-5">
        <p className="text-caption font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-3 text-body-sm font-medium text-foreground">{value}</p>
        <p className="mt-2 text-body-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
