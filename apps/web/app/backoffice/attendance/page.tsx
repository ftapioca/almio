import { BackofficeShell } from '../_components/backoffice-shell';
import { getBackofficePageContext } from '../lib/get-backoffice-page-context';
import { AttendanceConsole } from './attendance-console';

export default async function AttendancePage() {
  const { apiBaseUrl, currentUserEmail, tenantId } = await getBackofficePageContext(
    '/backoffice/attendance',
  );

  return (
    <BackofficeShell
      activeSection="attendance"
      apiBaseUrl={apiBaseUrl}
      currentUserEmail={currentUserEmail}
      tenantId={tenantId}
      title="Marcaciones operativas sobre el contrato real de attendance."
      description="Esta pantalla consume `GET|POST /v1/attendance` sin relajar la secuencia de eventos ni la idempotencia. La UI genera un `Idempotency-Key` nuevo por envio y refresca el listado despues de cada marcacion."
      highlightCards={[
        {
          title: 'Contratos fijos',
          body: 'Eventos validos: `CHECK_IN`, `BREAK_START`, `BREAK_END`, `CHECK_OUT`. La API rechaza secuencias invalidas y replaya el mismo `POST` cuando se repite la misma key con el mismo payload.',
        },
        {
          title: 'Uso previsto',
          body: 'Filtrar marcaciones por sucursal o colaborador, registrar una nueva marcacion manual y verificar la respuesta del contrato en el mismo flujo.',
        },
      ]}
    >
      <AttendanceConsole initialApiBaseUrl={apiBaseUrl} initialTenantId={tenantId} />
    </BackofficeShell>
  );
}
