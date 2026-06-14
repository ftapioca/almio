import {
  ForbiddenException,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantContext } from './tenant-context.type';
import { TenantService } from './tenant.service';

@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  constructor(private readonly tenantService: TenantService) {}

  async use(
    req: Request & { tenant?: TenantContext },
    _: Response,
    next: NextFunction,
  ) {
    if (this.isExcludedPath(req)) {
      next();
      return;
    }

    const tenantId = this.extractTenant(req);
    if (!tenantId) {
      throw new ForbiddenException('Tenant not identified');
    }

    const company = await this.tenantService.findActiveCompanyBySlug(tenantId);
    if (!company) {
      throw new ForbiddenException('Tenant not found or inactive');
    }

    req.tenant = {
      id: company.id,
      slug: company.slug,
      schemaName: company.schemaName,
    };

    next();
  }

  private isExcludedPath(req: Request): boolean {
    const path = req.originalUrl || req.path || '';
    return path.includes('/health') || path.startsWith('/v1/auth');
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
