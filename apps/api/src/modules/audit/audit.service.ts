import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../../common/auth/auth-user.type';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantDatabaseService } from '../../common/tenant/tenant-database.service';
import { AuditLogInput, TenantAuditLogInput } from './audit-log.types';

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantDatabase: TenantDatabaseService,
  ) {}

  async log(input: AuditLogInput) {
    return this.prisma.auditLogSaaS.create({
      data: {
        action: input.action,
        resource: input.resource,
        companyId: input.companyId ?? null,
        userAccountId: input.userAccountId ?? null,
        detailsJson: input.details
          ? (input.details as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  async logTenant(schemaName: string, input: TenantAuditLogInput) {
    await this.tenantDatabase.execute(
      schemaName,
      `INSERT INTO __TENANT_SCHEMA__."audit_log_tenant"
        ("actor_user_account_id", "action", "resource", "details_json")
       VALUES ($1::uuid, $2, $3, $4::jsonb)`,
      input.userAccountId ?? null,
      input.action,
      input.resource,
      JSON.stringify(input.details ?? null),
    );
  }

  async resolveUserAccountId(user?: AuthUser): Promise<string | null> {
    if (!user?.email && !user?.supabaseUserId) {
      return null;
    }

    const account = await this.prisma.userAccount.findFirst({
      where: {
        deletedAt: null,
        OR: [
          ...(user.supabaseUserId ? [{ supabaseUserId: user.supabaseUserId }] : []),
          ...(user.email ? [{ email: user.email }] : []),
        ],
      },
      select: {
        id: true,
      },
    });

    return account?.id ?? null;
  }
}
