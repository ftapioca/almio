import { AuthUser } from '../common/auth/auth-user.type';
import { TenantContext } from '../common/tenant/tenant-context.type';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    user?: AuthUser;
    tenant?: TenantContext;
  }
}
