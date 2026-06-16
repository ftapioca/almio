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
import { CreateAttendanceRecordDto } from './dto/create-attendance-record.dto';
import { ListAttendanceRecordsQueryDto } from './dto/list-attendance-records.query';
import { UpdateAttendanceRecordDto } from './dto/update-attendance-record.dto';

type AttendanceRecord = {
  id: string;
  branchId: string;
  employeeId: string;
  eventType: string;
  eventAt: Date;
  source: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AttendanceService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly tenantDatabase: TenantDatabaseService,
    private readonly auditService: AuditService,
  ) {}

  async listAttendanceRecords(
    tenant: TenantContext,
    query: ListAttendanceRecordsQueryDto,
    user?: AuthUser,
  ) {
    const filters = ['a."deleted_at" IS NULL'];
    const params: unknown[] = [];
    const scopedBranchIds = this.getScopedBranchIds(user);

    if (query.branchId) {
      this.assertCanAccessBranch(user, query.branchId);
      params.push(query.branchId);
      filters.push(`a."branch_id" = $${params.length}::uuid`);
    }

    if (query.employeeId) {
      params.push(query.employeeId);
      filters.push(`a."employee_id" = $${params.length}::uuid`);
    }

    if (query.eventType) {
      params.push(query.eventType);
      filters.push(`a."event_type" = $${params.length}`);
    }

    if (query.from) {
      params.push(query.from);
      filters.push(`a."event_at" >= $${params.length}`);
    }

    if (query.to) {
      params.push(query.to);
      filters.push(`a."event_at" <= $${params.length}`);
    }

    if (scopedBranchIds) {
      params.push(scopedBranchIds);
      filters.push(`a."branch_id" = ANY($${params.length}::uuid[])`);
    }

    params.push((query.page - 1) * query.limit);
    const offsetParam = params.length;
    params.push(query.limit);
    const limitParam = params.length;
    const filterParams = params.slice(0, params.length - 2);

    const [items, totalRows] = await Promise.all([
      this.tenantDatabase.query<AttendanceRecord[]>(
        tenant.schemaName,
        `SELECT
           a."id",
           a."branch_id" AS "branchId",
           a."employee_id" AS "employeeId",
           a."event_type" AS "eventType",
           a."event_at" AS "eventAt",
           a."source",
           a."notes",
           a."created_at" AS "createdAt",
           a."updated_at" AS "updatedAt"
         FROM __TENANT_SCHEMA__."attendance_records" a
         WHERE ${filters.join(' AND ')}
         ORDER BY a."event_at" DESC, a."created_at" DESC
         OFFSET $${offsetParam}
         LIMIT $${limitParam}`,
        ...params,
      ),
      this.tenantDatabase.query<Array<{ total: bigint | number }>>(
        tenant.schemaName,
        `SELECT COUNT(*)::bigint AS "total"
         FROM __TENANT_SCHEMA__."attendance_records" a
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

  async getAttendanceRecordById(
    tenant: TenantContext,
    attendanceRecordId: string,
    user?: AuthUser,
  ) {
    const record = await this.findAttendanceRecordById(tenant, attendanceRecordId);
    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }

    this.assertCanAccessBranch(user, record.branchId);
    return record;
  }

  async createAttendanceRecord(
    tenant: TenantContext,
    dto: CreateAttendanceRecordDto,
    user?: AuthUser,
  ) {
    this.assertCanAccessBranch(user, dto.branchId);
    const employee = await this.ensureEmployeeExists(tenant, dto.employeeId);
    await this.ensureBranchExists(tenant, dto.branchId);
    this.ensureEmployeeBelongsToBranch(employee.branchId, dto.branchId);
    await this.assertAttendanceSequenceAllowed(
      tenant,
      dto.employeeId,
      dto.branchId,
      dto.eventType,
      dto.eventAt,
    );

    const [record] = await this.tenantDatabase.query<AttendanceRecord[]>(
      tenant.schemaName,
      `INSERT INTO __TENANT_SCHEMA__."attendance_records"
        ("branch_id", "employee_id", "event_type", "event_at", "source", "notes")
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
       RETURNING
         "id",
         "branch_id" AS "branchId",
         "employee_id" AS "employeeId",
         "event_type" AS "eventType",
         "event_at" AS "eventAt",
         "source",
         "notes",
         "created_at" AS "createdAt",
         "updated_at" AS "updatedAt"`,
      dto.branchId,
      dto.employeeId,
      dto.eventType,
      dto.eventAt,
      dto.source ?? 'MANUAL',
      dto.notes?.trim() ?? null,
    );

    await this.auditService.logTenant(tenant.schemaName, {
      action: 'ATTENDANCE_RECORD_CREATE',
      resource: 'attendance_records',
      userAccountId: await this.auditService.resolveUserAccountId(user),
      details: {
        attendanceRecordId: record.id,
        branchId: record.branchId,
        employeeId: record.employeeId,
      },
    });

    return record;
  }

  async updateAttendanceRecord(
    tenant: TenantContext,
    attendanceRecordId: string,
    dto: UpdateAttendanceRecordDto,
    user?: AuthUser,
  ) {
    const existing = await this.findAttendanceRecordById(tenant, attendanceRecordId);
    if (!existing) {
      throw new NotFoundException('Attendance record not found');
    }

    this.assertCanAccessBranch(user, existing.branchId);

    const nextBranchId = dto.branchId ?? existing.branchId;
    const nextEmployeeId = dto.employeeId ?? existing.employeeId;
    this.assertCanAccessBranch(user, nextBranchId);

    if (dto.branchId) {
      await this.ensureBranchExists(tenant, dto.branchId);
    }

    if (dto.employeeId || dto.branchId) {
      const employee = await this.ensureEmployeeExists(tenant, nextEmployeeId);
      this.ensureEmployeeBelongsToBranch(employee.branchId, nextBranchId);
    }

    await this.assertAttendanceSequenceAllowed(
      tenant,
      nextEmployeeId,
      nextBranchId,
      dto.eventType ?? existing.eventType,
      dto.eventAt ?? existing.eventAt,
      attendanceRecordId,
    );

    const updates: Array<{ column: string; value: unknown }> = [];
    if (dto.branchId !== undefined) {
      updates.push({ column: 'branch_id', value: dto.branchId });
    }
    if (dto.employeeId !== undefined) {
      updates.push({ column: 'employee_id', value: dto.employeeId });
    }
    if (dto.eventType !== undefined) {
      updates.push({ column: 'event_type', value: dto.eventType });
    }
    if (dto.eventAt !== undefined) {
      updates.push({ column: 'event_at', value: dto.eventAt });
    }
    if (dto.source !== undefined) {
      updates.push({ column: 'source', value: dto.source });
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

    params.push(attendanceRecordId);

    const [record] = await this.tenantDatabase.query<AttendanceRecord[]>(
      tenant.schemaName,
      `UPDATE __TENANT_SCHEMA__."attendance_records"
       SET ${setClauses.join(', ')}, "updated_at" = NOW()
       WHERE "id" = $${params.length}::uuid AND "deleted_at" IS NULL
       RETURNING
         "id",
         "branch_id" AS "branchId",
         "employee_id" AS "employeeId",
         "event_type" AS "eventType",
         "event_at" AS "eventAt",
         "source",
         "notes",
         "created_at" AS "createdAt",
         "updated_at" AS "updatedAt"`,
      ...params,
    );

    await this.auditService.logTenant(tenant.schemaName, {
      action: 'ATTENDANCE_RECORD_UPDATE',
      resource: 'attendance_records',
      userAccountId: await this.auditService.resolveUserAccountId(user),
      details: {
        attendanceRecordId: record.id,
        updatedFields: updates.map((update) => update.column),
      },
    });

    return record;
  }

  private async findAttendanceRecordById(
    tenant: TenantContext,
    attendanceRecordId: string,
  ) {
    const [record] = await this.tenantDatabase.query<AttendanceRecord[]>(
      tenant.schemaName,
      `SELECT
         "id",
         "branch_id" AS "branchId",
         "employee_id" AS "employeeId",
         "event_type" AS "eventType",
         "event_at" AS "eventAt",
         "source",
         "notes",
         "created_at" AS "createdAt",
         "updated_at" AS "updatedAt"
       FROM __TENANT_SCHEMA__."attendance_records"
       WHERE "id" = $1::uuid AND "deleted_at" IS NULL`,
      attendanceRecordId,
    );

    return record ?? null;
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
      throw new NotFoundException('Branch not found for attendance');
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
      throw new NotFoundException('Employee not found for attendance');
    }

    return employee;
  }

  private async assertAttendanceSequenceAllowed(
    tenant: TenantContext,
    employeeId: string,
    branchId: string,
    nextEventType: string,
    nextEventAt: Date,
    excludeAttendanceRecordId?: string,
  ) {
    const previousRecord = await this.findPreviousAttendanceRecord(
      tenant,
      employeeId,
      branchId,
      nextEventAt,
      excludeAttendanceRecordId,
    );

    const nextAllowedEvents = this.getNextAllowedAttendanceEvents(previousRecord?.eventType);
    if (!nextAllowedEvents.includes(nextEventType)) {
      throw new BadRequestException(
        `Invalid attendance sequence. Expected one of: ${nextAllowedEvents.join(', ')}`,
      );
    }

    if (previousRecord && previousRecord.eventAt >= nextEventAt) {
      throw new BadRequestException('Attendance eventAt must be greater than the previous event');
    }

    const nextRecord = await this.findNextAttendanceRecord(
      tenant,
      employeeId,
      branchId,
      nextEventAt,
      excludeAttendanceRecordId,
    );

    if (!nextRecord) {
      return;
    }

    if (nextRecord.eventAt <= nextEventAt) {
      throw new BadRequestException('Attendance eventAt must be lower than the next event');
    }

    const allowedEventsAfterCandidate = this.getNextAllowedAttendanceEvents(nextEventType);
    if (!allowedEventsAfterCandidate.includes(nextRecord.eventType)) {
      throw new BadRequestException(
        `Invalid attendance sequence after ${nextEventType}. Expected next event to be one of: ${allowedEventsAfterCandidate.join(', ')}`,
      );
    }
  }

  private getNextAllowedAttendanceEvents(previousEventType?: string) {
    switch (previousEventType) {
      case undefined:
        return ['CHECK_IN'];
      case 'CHECK_IN':
        return ['BREAK_START', 'CHECK_OUT'];
      case 'BREAK_START':
        return ['BREAK_END'];
      case 'BREAK_END':
        return ['BREAK_START', 'CHECK_OUT'];
      case 'CHECK_OUT':
        return ['CHECK_IN'];
      default:
        return ['CHECK_IN'];
    }
  }

  private async findPreviousAttendanceRecord(
    tenant: TenantContext,
    employeeId: string,
    branchId: string,
    eventAt: Date,
    excludeAttendanceRecordId?: string,
  ) {
    const params: unknown[] = [employeeId, branchId, eventAt];
    const filters = [
      '"employee_id" = $1::uuid',
      '"branch_id" = $2::uuid',
      '"event_at" <= $3',
      '"deleted_at" IS NULL',
    ];

    if (excludeAttendanceRecordId) {
      params.push(excludeAttendanceRecordId);
      filters.push(`"id" <> $${params.length}::uuid`);
    }

    const [record] = await this.tenantDatabase.query<Array<{ id: string; eventType: string; eventAt: Date }>>(
      tenant.schemaName,
      `SELECT
         "id",
         "event_type" AS "eventType",
         "event_at" AS "eventAt"
       FROM __TENANT_SCHEMA__."attendance_records"
       WHERE ${filters.join(' AND ')}
       ORDER BY "event_at" DESC, "created_at" DESC
       LIMIT 1`,
      ...params,
    );

    return record ?? null;
  }

  private async findNextAttendanceRecord(
    tenant: TenantContext,
    employeeId: string,
    branchId: string,
    eventAt: Date,
    excludeAttendanceRecordId?: string,
  ) {
    const params: unknown[] = [employeeId, branchId, eventAt];
    const filters = [
      '"employee_id" = $1::uuid',
      '"branch_id" = $2::uuid',
      '"event_at" >= $3',
      '"deleted_at" IS NULL',
    ];

    if (excludeAttendanceRecordId) {
      params.push(excludeAttendanceRecordId);
      filters.push(`"id" <> $${params.length}::uuid`);
    }

    const [record] = await this.tenantDatabase.query<Array<{ id: string; eventType: string; eventAt: Date }>>(
      tenant.schemaName,
      `SELECT
         "id",
         "event_type" AS "eventType",
         "event_at" AS "eventAt"
       FROM __TENANT_SCHEMA__."attendance_records"
       WHERE ${filters.join(' AND ')}
       ORDER BY "event_at" ASC, "created_at" ASC
       LIMIT 1`,
      ...params,
    );

    return record ?? null;
  }

  private ensureEmployeeBelongsToBranch(
    employeeBranchId: string | null,
    branchId: string,
  ) {
    if (!employeeBranchId || employeeBranchId !== branchId) {
      throw new BadRequestException('Employee does not belong to the selected branch');
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
