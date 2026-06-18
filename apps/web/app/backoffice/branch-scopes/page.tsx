import { BackofficeShell } from '../_components/backoffice-shell';
import { getBackofficePageContext } from '../lib/get-backoffice-page-context';
import { BranchScopesConsole } from './scopes-console';

export default async function BranchScopesPage() {
  const { apiBaseUrl, currentUserEmail } = await getBackofficePageContext(
    '/backoffice/branch-scopes',
  );

  return (
    <BackofficeShell
      activeSection="branch-scopes"
      currentUserEmail={currentUserEmail}
      title="Administracion de scopes por sucursal."
      description="Esta consola usa `GET|PUT /v1/admin/branch-membership-scopes` para operar `BRANCH_ADMIN` sin depender de scripts. Se mantiene manual a proposito hasta cerrar auth web y shell SaaS."
      highlightCards={[
        {
          title: 'Uso previsto',
          body: 'Buscar una membership, revisar las sucursales asignadas y reemplazar el scope completo con una lista nueva.',
        },
        {
          title: 'Requisitos',
          body: '`Authorization Bearer`, `X-Tenant-ID`, `membershipId` y la URL base de la API. La sesión ya viene desde Supabase Auth.',
        },
      ]}
    >
      <BranchScopesConsole initialApiBaseUrl={apiBaseUrl} initialTenantId="almio" />
    </BackofficeShell>
  );
}
