import { BackofficeShell } from '../_components/backoffice-shell';
import { getBackofficePageContext } from '../lib/get-backoffice-page-context';
import { ShiftsConsole } from './shifts-console';

export default async function ShiftsPage() {
  const { apiBaseUrl, currentUserEmail } = await getBackofficePageContext(
    '/backoffice/shifts',
  );

  return (
    <BackofficeShell
      activeSection="shifts"
      currentUserEmail={currentUserEmail}
      title="Turnos operativos sobre el contrato real de shifts."
      description="Esta pantalla consume `GET|POST|PATCH /v1/shifts` y los comandos `publish`, `cancel` y `complete` sin relajar la máquina de estados del backend."
      highlightCards={[
        {
          title: 'Contratos fijos',
          body: 'Estados válidos: `SCHEDULED`, `PUBLISHED`, `CANCELLED`, `COMPLETED`. La UI no intenta mutar `status` vía `PATCH`; usa sólo comandos explícitos.',
        },
        {
          title: 'Uso previsto',
          body: 'Filtrar turnos, crear nuevos turnos, ajustar datos estructurales permitidos y ejecutar transiciones de estado operativas desde la misma consola.',
        },
      ]}
    >
      <ShiftsConsole initialApiBaseUrl={apiBaseUrl} initialTenantId="almio" />
    </BackofficeShell>
  );
}
