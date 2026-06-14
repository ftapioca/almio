import {
  ForbiddenException,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantContext } from './tenant-context.type';

@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  use(req: Request & { tenant?: TenantContext }, _: Response, next: NextFunction) {
    if (req.path.endsWith('/health') || req.originalUrl.endsWith('/health')) {
      next();
      return;
    }

    const tenantId = this.extractTenant(req);
    if (!tenantId) {
      throw new ForbiddenException('Tenant not identified');
    }

    req.tenant = {
      id: tenantId,
      slug: tenantId,
      schemaName: `tenant_${tenantId}`,
    };

    next();
  }

  private extractTenant(req: Request): string | undefined {
    const headerValue = req.headers['x-tenant-id'];
    if (typeof headerValue === 'string' && headerValue.length > 0) {
      return headerValue;
    }

    const [subdomain] = req.hostname.split('.');
    if (subdomain && !['localhost', 'www'].includes(subdomain)) {
      return subdomain;
    }

    return undefined;
  }
}
