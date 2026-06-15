import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../../common/auth/auth-user.type';
import { AuthorizationService } from '../../common/auth/authorization.service';
import { TenantContext } from '../../common/tenant/tenant-context.type';
import { TenantDatabaseService } from '../../common/tenant/tenant-database.service';
import { AuditService } from '../audit/audit.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { ListBranchesQueryDto } from './dto/list-branches.query';
import { UpdateBranchDto } from './dto/update-branch.dto';

type BranchRecord = {
  id: string;
  code: string;
  name: string;
  status: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class BranchesService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly tenantDatabase: TenantDatabaseService,
    private readonly auditService: AuditService,
  ) {}

  async listBranches(
    tenant: TenantContext,
    query: ListBranchesQueryDto,
    user?: AuthUser,
  ) {
    const filters = ['"deleted_at" IS NULL'];
    const params: unknown[] = [];
    const scopedBranchIds = this.getScopedBranchIds(user);

    if (query.status) {
      params.push(query.status);
      filters.push(`"status" = $${params.length}`);
    }

    if (scopedBranchIds) {
      params.push(scopedBranchIds);
      filters.push(`"id" = ANY($${params.length}::uuid[])`);
    }

    params.push((query.page - 1) * query.limit);
    const offsetParam = params.length;
    params.push(query.limit);
    const limitParam = params.length;
    const filterParams = params.slice(0, params.length - 2);

    const [items, totalRows] = await Promise.all([
      this.tenantDatabase.query<BranchRecord[]>(
        tenant.schemaName,
        `SELECT
           "id",
           "code",
           "name",
           "status",
           "timezone",
           "created_at" AS "createdAt",
           "updated_at" AS "updatedAt"
         FROM __TENANT_SCHEMA__."branches"
         WHERE ${filters.join(' AND ')}
         ORDER BY "created_at" DESC
         OFFSET $${offsetParam}
         LIMIT $${limitParam}`,
        ...params,
      ),
      this.tenantDatabase.query<Array<{ total: bigint | number }>>(
        tenant.schemaName,
        `SELECT COUNT(*)::bigint AS "total"
         FROM __TENANT_SCHEMA__."branches"
         WHERE ${filters.join(' AND ')}`,
        ...filterParams,
      ),
    ]);

    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total: Number(totalRows[0]?.total ?? 0),
      },
    };
  }

  async getBranchById(tenant: TenantContext, branchId: string, user?: AuthUser) {
    this.assertCanAccessBranch(user, branchId);

    const branch = await this.findBranchById(tenant, branchId);
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async createBranch(
    tenant: TenantContext,
    dto: CreateBranchDto,
    user?: AuthUser,
  ) {
    this.authorizationService.assertCanManageBranchCatalog(user);

    const normalizedCode = dto.code.trim();
    const normalizedName = dto.name.trim();
    const timezone = dto.timezone?.trim() || 'America/Santiago';
    const status = dto.status ?? 'ACTIVE';

    await this.ensureBranchCodeAvailable(tenant, normalizedCode);

    const [branch] = await this.tenantDatabase.query<BranchRecord[]>(
      tenant.schemaName,
      `INSERT INTO __TENANT_SCHEMA__."branches"
        ("code", "name", "status", "timezone")
       VALUES ($1, $2, $3, $4)
       RETURNING
         "id",
         "code",
         "name",
         "status",
         "timezone",
         "created_at" AS "createdAt",
         "updated_at" AS "updatedAt"`,
      normalizedCode,
      normalizedName,
      status,
      timezone,
    );

    await this.auditService.logTenant(tenant.schemaName, {
      action: 'BRANCH_CREATE',
      resource: 'branches',
      userAccountId: await this.auditService.resolveUserAccountId(user),
      details: {
        branchId: branch.id,
        code: branch.code,
        name: branch.name,
      },
    });

    return branch;
  }

  async updateBranch(
    tenant: TenantContext,
    branchId: string,
    dto: UpdateBranchDto,
    user?: AuthUser,
  ) {
    this.authorizationService.assertCanManageBranchCatalog(user);

    const existing = await this.findBranchById(tenant, branchId);
    if (!existing) {
      throw new NotFoundException('Branch not found');
    }

    if (dto.code && dto.code.trim() !== existing.code) {
      await this.ensureBranchCodeAvailable(tenant, dto.code.trim(), branchId);
    }

    const updates: Array<{ column: string; value: unknown }> = [];
    if (dto.code !== undefined) {
      updates.push({ column: 'code', value: dto.code.trim() });
    }
    if (dto.name !== undefined) {
      updates.push({ column: 'name', value: dto.name.trim() });
    }
    if (dto.status !== undefined) {
      updates.push({ column: 'status', value: dto.status });
    }
    if (dto.timezone !== undefined) {
      updates.push({ column: 'timezone', value: dto.timezone.trim() });
    }

    if (updates.length === 0) {
      return existing;
    }

    const params: unknown[] = [];
    const setClauses = updates.map(({ column, value }) => {
      params.push(value);
      return `"${column}" = $${params.length}`;
    });

    params.push(branchId);

    const [branch] = await this.tenantDatabase.query<BranchRecord[]>(
      tenant.schemaName,
      `UPDATE __TENANT_SCHEMA__."branches"
       SET ${setClauses.join(', ')}, "updated_at" = NOW()
       WHERE "id" = $${params.length}::uuid AND "deleted_at" IS NULL
       RETURNING
         "id",
         "code",
         "name",
         "status",
         "timezone",
         "created_at" AS "createdAt",
         "updated_at" AS "updatedAt"`,
      ...params,
    );

    await this.auditService.logTenant(tenant.schemaName, {
      action: 'BRANCH_UPDATE',
      resource: 'branches',
      userAccountId: await this.auditService.resolveUserAccountId(user),
      details: {
        branchId: branch.id,
        updatedFields: updates.map((update) => update.column),
      },
    });

    return branch;
  }

  private async findBranchById(tenant: TenantContext, branchId: string) {
    const [branch] = await this.tenantDatabase.query<BranchRecord[]>(
      tenant.schemaName,
      `SELECT
         "id",
         "code",
         "name",
         "status",
         "timezone",
         "created_at" AS "createdAt",
         "updated_at" AS "updatedAt"
       FROM __TENANT_SCHEMA__."branches"
       WHERE "id" = $1::uuid AND "deleted_at" IS NULL`,
      branchId,
    );

    return branch ?? null;
  }

  private getScopedBranchIds(user?: AuthUser): string[] | null {
    if (
      !this.authorizationService.isBranchAdmin(user) ||
      this.authorizationService.isSuperadmin(user) ||
      this.authorizationService.isOwner(user)
    ) {
      return null;
    }

    this.authorizationService.enforceBranchScopeConfigured(user);
    return this.authorizationService.getBranchScopeIds(user);
  }

  private assertCanAccessBranch(user: AuthUser | undefined, branchId: string) {
    if (!this.authorizationService.isBranchAdmin(user)) {
      return;
    }

    if (!this.authorizationService.canAccessBranch(user, branchId)) {
      throw new ForbiddenException('Branch scope forbidden');
    }
  }

  private async ensureBranchCodeAvailable(
    tenant: TenantContext,
    code: string,
    excludeBranchId?: string,
  ) {
    const params: unknown[] = [code];
    const conditions = ['"code" = $1', '"deleted_at" IS NULL'];

    if (excludeBranchId) {
      params.push(excludeBranchId);
      conditions.push(`"id" <> $${params.length}::uuid`);
    }

    const [existing] = await this.tenantDatabase.query<Array<{ id: string }>>(
      tenant.schemaName,
      `SELECT "id"
       FROM __TENANT_SCHEMA__."branches"
       WHERE ${conditions.join(' AND ')}
       LIMIT 1`,
      ...params,
    );

    if (existing) {
      throw new ConflictException('Branch code already exists');
    }
  }
}
