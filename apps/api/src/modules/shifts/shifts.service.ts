import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../../common/auth/auth-user.type';
import { AuthorizationService } from '../../common/auth/authorization.service';
import { TenantContext } from '../../common/tenant/tenant-context.type';
import { TenantDatabaseService } from '../../common/tenant/tenant-database.service';
import { AuditService } from '../audit/audit.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { ListShiftsQueryDto } from './dto/list-shifts.query';
import { UpdateShiftDto } from './dto/update-shift.dto';

type ShiftRecord = {
  id: string;
  branchId: string;
  employeeId: string | null;
  startsAt: Date;
  endsAt: Date;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ShiftsService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly tenantDatabase: TenantDatabaseService,
    private readonly auditService: AuditService,
  ) {}

  async listShifts(
    tenant: TenantContext,
    query: ListShiftsQueryDto,
    user?: AuthUser,
  ) {
    const filters = ['s."deleted_at" IS NULL'];
    const params: unknown[] = [];
    const scopedBranchIds = this.getScopedBranchIds(user);

    if (query.branchId) {
      this.assertCanAccessBranch(user, query.branchId);
      params.push(query.branchId);
      filters.push(`s."branch_id" = $${params.length}::uuid`);
    }

    if (query.employeeId) {
      params.push(query.employeeId);
      filters.push(`s."employee_id" = $${params.length}::uuid`);
    }

    if (query.status) {
      params.push(query.status);
      filters.push(`s."status" = $${params.length}`);
    }

    if (query.from) {
      params.push(query.from);
      filters.push(`s."starts_at" >= $${params.length}`);
    }

    if (query.to) {
      params.push(query.to);
      filters.push(`s."starts_at" <= $${params.length}`);
    }

    if (scopedBranchIds) {
      params.push(scopedBranchIds);
      filters.push(`s."branch_id" = ANY($${params.length}::uuid[])`);
    }

    params.push((query.page - 1) * query.limit);
    const offsetParam = params.length;
    params.push(query.limit);
    const limitParam = params.length;
    const filterParams = params.slice(0, params.length - 2);

    const [items, totalRows] = await Promise.all([
      this.tenantDatabase.query<ShiftRecord[]>(
        tenant.schemaName,
        `SELECT
           s."id",
           s."branch_id" AS "branchId",
           s."employee_id" AS "employeeId",
           s."starts_at" AS "startsAt",
           s."ends_at" AS "endsAt",
           s."status",
           s."notes",
           s."created_at" AS "createdAt",
           s."updated_at" AS "updatedAt"
         FROM __TENANT_SCHEMA__."shifts" s
         WHERE ${filters.join(' AND ')}
         ORDER BY s."starts_at" DESC, s."created_at" DESC
         OFFSET $${offsetParam}
         LIMIT $${limitParam}`,
        ...params,
      ),
      this.tenantDatabase.query<Array<{ total: bigint | number }>>(
        tenant.schemaName,
        `SELECT COUNT(*)::bigint AS "total"
         FROM __TENANT_SCHEMA__."shifts" s
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

  async getShiftById(tenant: TenantContext, shiftId: string, user?: AuthUser) {
    const shift = await this.findShiftById(tenant, shiftId);
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    this.assertCanAccessBranch(user, shift.branchId);
    return shift;
  }

  async createShift(
    tenant: TenantContext,
    dto: CreateShiftDto,
    user?: AuthUser,
  ) {
    this.assertCanAccessBranch(user, dto.branchId);
    this.ensureValidShiftRange(dto.startsAt, dto.endsAt);
    this.assertValidInitialShiftStatus(dto.status);
    await this.ensureBranchExists(tenant, dto.branchId);

    if (dto.employeeId) {
      const employee = await this.ensureEmployeeExists(tenant, dto.employeeId);
      this.ensureEmployeeBelongsToBranch(employee.branchId, dto.branchId);
      await this.ensureShiftDoesNotOverlap(
        tenant,
        dto.employeeId,
        dto.startsAt,
        dto.endsAt,
      );
    }

    this.assertShiftAssignmentCompatible(dto.employeeId, dto.status ?? 'SCHEDULED');

    const [shift] = await this.tenantDatabase.query<ShiftRecord[]>(
      tenant.schemaName,
      `INSERT INTO __TENANT_SCHEMA__."shifts"
        ("branch_id", "employee_id", "starts_at", "ends_at", "status", "notes")
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
       RETURNING
         "id",
         "branch_id" AS "branchId",
         "employee_id" AS "employeeId",
         "starts_at" AS "startsAt",
         "ends_at" AS "endsAt",
         "status",
         "notes",
         "created_at" AS "createdAt",
         "updated_at" AS "updatedAt"`,
      dto.branchId,
      dto.employeeId ?? null,
      dto.startsAt,
      dto.endsAt,
      dto.status ?? 'SCHEDULED',
      dto.notes?.trim() ?? null,
    );

    await this.auditService.logTenant(tenant.schemaName, {
      action: 'SHIFT_CREATE',
      resource: 'shifts',
      userAccountId: await this.auditService.resolveUserAccountId(user),
      details: {
        shiftId: shift.id,
        branchId: shift.branchId,
        employeeId: shift.employeeId,
      },
    });

    return shift;
  }

  async updateShift(
    tenant: TenantContext,
    shiftId: string,
    dto: UpdateShiftDto,
    user?: AuthUser,
  ) {
    const existing = await this.findShiftById(tenant, shiftId);
    if (!existing) {
      throw new NotFoundException('Shift not found');
    }

    this.assertCanAccessBranch(user, existing.branchId);
    const nextBranchId = dto.branchId ?? existing.branchId;
    const nextEmployeeId =
      dto.employeeId !== undefined ? dto.employeeId : existing.employeeId;

    this.assertCanAccessBranch(user, nextBranchId);
    this.assertShiftCanBeEdited(existing.status, dto);
    this.ensureValidShiftRange(dto.startsAt ?? existing.startsAt, dto.endsAt ?? existing.endsAt);

    if (dto.branchId) {
      await this.ensureBranchExists(tenant, dto.branchId);
    }

    if (nextEmployeeId) {
      const employee = await this.ensureEmployeeExists(tenant, nextEmployeeId);
      this.ensureEmployeeBelongsToBranch(employee.branchId, nextBranchId);
      await this.ensureShiftDoesNotOverlap(
        tenant,
        nextEmployeeId,
        dto.startsAt ?? existing.startsAt,
        dto.endsAt ?? existing.endsAt,
        shiftId,
      );
    }

    this.assertShiftAssignmentCompatible(nextEmployeeId, existing.status);

    const updates: Array<{ column: string; value: unknown }> = [];
    if (dto.branchId !== undefined) {
      updates.push({ column: 'branch_id', value: dto.branchId });
    }
    if (dto.employeeId !== undefined) {
      updates.push({ column: 'employee_id', value: dto.employeeId });
    }
    if (dto.startsAt !== undefined) {
      updates.push({ column: 'starts_at', value: dto.startsAt });
    }
    if (dto.endsAt !== undefined) {
      updates.push({ column: 'ends_at', value: dto.endsAt });
    }
    if (dto.notes !== undefined) {
      updates.push({ column: 'notes', value: dto.notes ? dto.notes.trim() : null });
    }

    if (updates.length === 0) {
      return existing;
    }

    const params: unknown[] = [];
    const setClauses = updates.map(({ column, value }) => {
      params.push(value);

      if (column === 'branch_id' || column === 'employee_id') {
        return `"${column}" = $${params.length}::uuid`;
      }

      return `"${column}" = $${params.length}`;
    });

    params.push(shiftId);

    const shift = await this.updateShiftRecord(
      tenant,
      setClauses,
      params,
    );

    await this.auditService.logTenant(tenant.schemaName, {
      action: 'SHIFT_UPDATE',
      resource: 'shifts',
      userAccountId: await this.auditService.resolveUserAccountId(user),
      details: {
        shiftId: shift.id,
        updatedFields: updates.map((update) => update.column),
      },
    });

    return shift;
  }

  async publishShift(tenant: TenantContext, shiftId: string, user?: AuthUser) {
    return this.transitionShiftStatus(tenant, shiftId, 'PUBLISHED', user);
  }

  async cancelShift(tenant: TenantContext, shiftId: string, user?: AuthUser) {
    return this.transitionShiftStatus(tenant, shiftId, 'CANCELLED', user);
  }

  async completeShift(tenant: TenantContext, shiftId: string, user?: AuthUser) {
    return this.transitionShiftStatus(tenant, shiftId, 'COMPLETED', user);
  }

  private async findShiftById(tenant: TenantContext, shiftId: string) {
    const [shift] = await this.tenantDatabase.query<ShiftRecord[]>(
      tenant.schemaName,
      `SELECT
         "id",
         "branch_id" AS "branchId",
         "employee_id" AS "employeeId",
         "starts_at" AS "startsAt",
         "ends_at" AS "endsAt",
         "status",
         "notes",
         "created_at" AS "createdAt",
         "updated_at" AS "updatedAt"
       FROM __TENANT_SCHEMA__."shifts"
       WHERE "id" = $1::uuid AND "deleted_at" IS NULL`,
      shiftId,
    );

    return shift ?? null;
  }

  private async ensureBranchExists(tenant: TenantContext, branchId: string) {
    const [branch] = await this.tenantDatabase.query<Array<{ id: string }>>(
      tenant.schemaName,
      `SELECT "id"
       FROM __TENANT_SCHEMA__."branches"
       WHERE "id" = $1::uuid AND "deleted_at" IS NULL`,
      branchId,
    );

    if (!branch) {
      throw new NotFoundException('Branch not found for shift');
    }
  }

  private async ensureEmployeeExists(tenant: TenantContext, employeeId: string) {
    const [employee] = await this.tenantDatabase.query<Array<{ id: string; branchId: string | null }>>(
      tenant.schemaName,
      `SELECT
         "id",
         "branch_id" AS "branchId"
       FROM __TENANT_SCHEMA__."employees"
       WHERE "id" = $1::uuid AND "deleted_at" IS NULL`,
      employeeId,
    );

    if (!employee) {
      throw new NotFoundException('Employee not found for shift');
    }

    return employee;
  }

  private async transitionShiftStatus(
    tenant: TenantContext,
    shiftId: string,
    nextStatus: 'PUBLISHED' | 'CANCELLED' | 'COMPLETED',
    user?: AuthUser,
  ) {
    const existing = await this.findShiftById(tenant, shiftId);
    if (!existing) {
      throw new NotFoundException('Shift not found');
    }

    this.assertCanAccessBranch(user, existing.branchId);
    this.assertShiftStatusTransitionAllowed(existing.status, nextStatus);
    this.assertShiftAssignmentCompatible(existing.employeeId, nextStatus);

    const shift = await this.updateShiftRecord(
      tenant,
      ['"status" = $1'],
      [nextStatus, shiftId],
    );

    await this.auditService.logTenant(tenant.schemaName, {
      action: `SHIFT_${nextStatus}`,
      resource: 'shifts',
      userAccountId: await this.auditService.resolveUserAccountId(user),
      details: {
        shiftId: shift.id,
        previousStatus: existing.status,
        nextStatus,
      },
    });

    return shift;
  }

  private ensureEmployeeBelongsToBranch(
    employeeBranchId: string | null,
    branchId: string,
  ) {
    if (!employeeBranchId || employeeBranchId !== branchId) {
      throw new BadRequestException('Employee does not belong to the selected branch');
    }
  }

  private ensureValidShiftRange(startsAt: Date, endsAt: Date) {
    if (startsAt >= endsAt) {
      throw new BadRequestException('Shift endsAt must be greater than startsAt');
    }
  }

  private assertValidInitialShiftStatus(status?: string) {
    if (!status || status === 'SCHEDULED' || status === 'PUBLISHED') {
      return;
    }

    throw new BadRequestException(
      'Shift can only be created with status SCHEDULED or PUBLISHED',
    );
  }

  private assertShiftCanBeEdited(currentStatus: string, dto: UpdateShiftDto) {
    const hasStructuralChanges =
      dto.branchId !== undefined ||
      dto.employeeId !== undefined ||
      dto.startsAt !== undefined ||
      dto.endsAt !== undefined;

    if (
      hasStructuralChanges &&
      (currentStatus === 'COMPLETED' || currentStatus === 'CANCELLED')
    ) {
      throw new BadRequestException(
        `Shift in status ${currentStatus} cannot modify branch, employee or schedule`,
      );
    }
  }

  private assertShiftAssignmentCompatible(
    employeeId: string | null | undefined,
    status: string,
  ) {
    if ((status === 'PUBLISHED' || status === 'COMPLETED') && !employeeId) {
      throw new BadRequestException(
        `Shift with status ${status} requires an assigned employee`,
      );
    }
  }

  private async updateShiftRecord(
    tenant: TenantContext,
    setClauses: string[],
    params: unknown[],
  ) {
    const [shift] = await this.tenantDatabase.query<ShiftRecord[]>(
      tenant.schemaName,
      `UPDATE __TENANT_SCHEMA__."shifts"
       SET ${setClauses.join(', ')}, "updated_at" = NOW()
       WHERE "id" = $${params.length}::uuid AND "deleted_at" IS NULL
       RETURNING
         "id",
         "branch_id" AS "branchId",
         "employee_id" AS "employeeId",
         "starts_at" AS "startsAt",
         "ends_at" AS "endsAt",
         "status",
         "notes",
         "created_at" AS "createdAt",
         "updated_at" AS "updatedAt"`,
      ...params,
    );

    return shift;
  }

  private assertShiftStatusTransitionAllowed(
    currentStatus: string,
    nextStatus?: string,
  ) {
    if (!nextStatus || currentStatus === nextStatus) {
      return;
    }

    const allowedTransitions: Record<string, string[]> = {
      SCHEDULED: ['PUBLISHED', 'CANCELLED'],
      PUBLISHED: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    const allowedNextStatuses = allowedTransitions[currentStatus] ?? [];
    if (!allowedNextStatuses.includes(nextStatus)) {
      throw new BadRequestException(
        `Invalid shift status transition from ${currentStatus} to ${nextStatus}`,
      );
    }
  }

  private async ensureShiftDoesNotOverlap(
    tenant: TenantContext,
    employeeId: string,
    startsAt: Date,
    endsAt: Date,
    excludeShiftId?: string,
  ) {
    const params: unknown[] = [employeeId, startsAt, endsAt];
    const filters = [
      '"employee_id" = $1::uuid',
      '"deleted_at" IS NULL',
      '"status" <> \'CANCELLED\'',
      '"starts_at" < $3',
      '"ends_at" > $2',
    ];

    if (excludeShiftId) {
      params.push(excludeShiftId);
      filters.push(`"id" <> $${params.length}::uuid`);
    }

    const [existing] = await this.tenantDatabase.query<Array<{ id: string }>>(
      tenant.schemaName,
      `SELECT "id"
       FROM __TENANT_SCHEMA__."shifts"
       WHERE ${filters.join(' AND ')}
       LIMIT 1`,
      ...params,
    );

    if (existing) {
      throw new BadRequestException('Shift overlaps an existing employee shift');
    }
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

  private assertCanAccessBranch(user: AuthUser | undefined, branchId: string | null) {
    if (!this.authorizationService.isBranchAdmin(user)) {
      return;
    }

    if (!this.authorizationService.canAccessBranch(user, branchId)) {
      throw new ForbiddenException('Branch scope forbidden');
    }
  }
}
