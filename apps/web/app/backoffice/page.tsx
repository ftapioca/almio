import { BackofficeHome } from './_components/backoffice-home';
import { BackofficeShell } from './_components/backoffice-shell';
import { getBackofficePageContext } from './lib/get-backoffice-page-context';

export default async function BackofficeIndexPage() {
  const { apiBaseUrl, currentUserEmail, tenantId } = await getBackofficePageContext(
    '/backoffice',
  );

  return (
    <BackofficeShell
      activeSection="home"
      apiBaseUrl={apiBaseUrl}
      currentUserEmail={currentUserEmail}
      tenantId={tenantId}
      title="Backoffice compartido para operación y validación."
      description="Este home concentra la navegación funcional ya disponible y expone el contexto compartido de tenant, roles y sucursal activa antes de enchufar el design system definitivo."
      highlightCards={[
        {
          title: 'Objetivo',
          body: 'Usar un punto único de entrada para abrir asistencia, turnos y scopes sin duplicar contexto ni navegación.',
        },
        {
          title: 'Estado actual',
          body: 'La capa visual sigue siendo provisional, pero la estructura operativa del backoffice ya es compartida y reutilizable.',
        },
      ]}
    >
      <BackofficeHome />
    </BackofficeShell>
  );
}
