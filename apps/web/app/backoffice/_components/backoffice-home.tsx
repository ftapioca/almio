'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
      <div className="rounded-[30px] border border-border/70 bg-surface/95 p-6 shadow-card backdrop-blur">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Inicio operativo
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-foreground">
            Entrada única al backoffice funcional actual.
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted">
            Este panel ya comparte sesión, tenant y sucursal activa. Sirve como
            punto base para operar mientras el design system definitivo sigue en
            construcción.
          </p>
        </div>
      </div>

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

      <div className="rounded-[30px] border border-border/70 bg-surface/95 p-6 shadow-card backdrop-blur">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Indicadores operativos de hoy</p>
          <p className="text-sm text-muted">
            Métricas mínimas derivadas de `attendance` y `shifts` para la sucursal activa.
          </p>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-4">
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
          <div className="mt-4 rounded-[20px] border border-danger/30 bg-danger/8 p-4 text-sm text-danger">
            {metricsError}
          </div>
        ) : null}

        <div className="mt-4 rounded-[24px] border border-border/70 bg-panel p-5">
          <p className="text-sm font-semibold">Alertas rápidas</p>
          <div className="mt-3 grid gap-3">
            {operationalAlerts.length > 0 ? (
              operationalAlerts.map((alert) => (
                <div
                  key={alert}
                  className="rounded-[18px] border border-border/70 bg-surface px-4 py-3 text-sm text-muted"
                >
                  {alert}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">
                Sin alertas mínimas para hoy en el alcance actual.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {modules.map((module) => (
          <div
            key={module.href}
            className="rounded-[30px] border border-border/70 bg-surface/95 p-6 shadow-card backdrop-blur"
          >
            <p className="text-sm font-semibold text-foreground">{module.label}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{module.description}</p>
            <Link
              href={module.href}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Abrir módulo
            </Link>
          </div>
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
    <div className="rounded-[24px] border border-border/70 bg-panel p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p className="mt-3 text-sm font-medium text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted">{detail}</p>
    </div>
  );
}
