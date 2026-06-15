import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../../common/auth/auth-user.type';
import { TenantContext } from '../../common/tenant/tenant-context.type';
import { TenantDatabaseService } from '../../common/tenant/tenant-database.service';
import { AuditService } from '../audit/audit.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ListEmployeesQueryDto } from './dto/list-employees.query';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

type EmployeeRecord = {
  id: string;
  branchId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: string;
  hiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class EmployeesService {
  constructor(
    private readonly tenantDatabase: TenantDatabaseService,
    private readonly auditService: AuditService,
  ) {}

  async listEmployees(tenant: TenantContext, query: ListEmployeesQueryDto) {
    const filters = ['e."deleted_at" IS NULL'];
    const params: unknown[] = [];

    if (query.status) {
      params.push(query.status);
      filters.push(`e."status" = $${params.length}`);
    }

    if (query.branchId) {
      params.push(query.branchId);
      filters.push(`e."branch_id" = $${params.length}::uuid`);
    }

    params.push((query.page - 1) * query.limit);
    const offsetParam = params.length;
    params.push(query.limit);
    const limitParam = params.length;
    const filterParams = params.slice(0, params.length - 2);

    const [items, totalRows] = await Promise.all([
      this.tenantDatabase.query<EmployeeRecord[]>(
        tenant.schemaName,
        `SELECT
           e."id",
           e."branch_id" AS "branchId",
           e."first_name" AS "firstName",
           e."last_name" AS "lastName",
           e."email",
           e."phone",
           e."status",
           e."hired_at" AS "hiredAt",
           e."created_at" AS "createdAt",
           e."updated_at" AS "updatedAt"
         FROM __TENANT_SCHEMA__."employees" e
         WHERE ${filters.join(' AND ')}
         ORDER BY e."created_at" DESC
         OFFSET $${offsetParam}
         LIMIT $${limitParam}`,
        ...params,
      ),
      this.tenantDatabase.query<Array<{ total: bigint | number }>>(
        tenant.schemaName,
        `SELECT COUNT(*)::bigint AS "total"
         FROM __TENANT_SCHEMA__."employees" e
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

  async getEmployeeById(tenant: TenantContext, employeeId: string) {
    const employee = await this.findEmployeeById(tenant, employeeId);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async createEmployee(
    tenant: TenantContext,
    dto: CreateEmployeeDto,
    user?: AuthUser,
  ) {
    if (dto.branchId) {
      await this.ensureBranchExists(tenant, dto.branchId);
    }

    const email = dto.email?.trim().toLowerCase() ?? null;
    if (email) {
      await this.ensureEmployeeEmailAvailable(tenant, email);
    }

    const [employee] = await this.tenantDatabase.query<EmployeeRecord[]>(
      tenant.schemaName,
      `INSERT INTO __TENANT_SCHEMA__."employees"
        ("branch_id", "first_name", "last_name", "email", "phone", "status", "hired_at")
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
       RETURNING
         "id",
         "branch_id" AS "branchId",
         "first_name" AS "firstName",
         "last_name" AS "lastName",
         "email",
         "phone",
         "status",
         "hired_at" AS "hiredAt",
         "created_at" AS "createdAt",
         "updated_at" AS "updatedAt"`,
      dto.branchId ?? null,
      dto.firstName.trim(),
      dto.lastName.trim(),
      email,
      dto.phone?.trim() ?? null,
      dto.status ?? 'ACTIVE',
      dto.hiredAt ?? null,
    );

    await this.auditService.logTenant(tenant.schemaName, {
      action: 'EMPLOYEE_CREATE',
      resource: 'employees',
      userAccountId: await this.auditService.resolveUserAccountId(user),
      details: {
        employeeId: employee.id,
        branchId: employee.branchId,
      },
    });

    return employee;
  }

  async updateEmployee(
    tenant: TenantContext,
    employeeId: string,
    dto: UpdateEmployeeDto,
    user?: AuthUser,
  ) {
    const existing = await this.findEmployeeById(tenant, employeeId);
    if (!existing) {
      throw new NotFoundException('Employee not found');
    }

    if (dto.branchId) {
      await this.ensureBranchExists(tenant, dto.branchId);
    }

    if (dto.email !== undefined && dto.email !== null) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      if (normalizedEmail !== existing.email) {
        await this.ensureEmployeeEmailAvailable(tenant, normalizedEmail, employeeId);
      }
    }

    const updates: Array<{ column: string; value: unknown }> = [];
    if (dto.branchId !== undefined) {
      updates.push({ column: 'branch_id', value: dto.branchId });
    }
    if (dto.firstName !== undefined) {
      updates.push({ column: 'first_name', value: dto.firstName.trim() });
    }
    if (dto.lastName !== undefined) {
      updates.push({ column: 'last_name', value: dto.lastName.trim() });
    }
    if (dto.email !== undefined) {
      updates.push({
        column: 'email',
        value: dto.email ? dto.email.trim().toLowerCase() : null,
      });
    }
    if (dto.phone !== undefined) {
      updates.push({
        column: 'phone',
        value: dto.phone ? dto.phone.trim() : null,
      });
    }
    if (dto.status !== undefined) {
      updates.push({ column: 'status', value: dto.status });
    }
    if (dto.hiredAt !== undefined) {
      updates.push({ column: 'hired_at', value: dto.hiredAt });
    }

    if (updates.length === 0) {
      return existing;
    }

    const params: unknown[] = [];
    const setClauses = updates.map(({ column, value }) => {
      params.push(value);
      return `"${column}" = ${
        column === 'branch_id' ? `$${params.length}::uuid` : `$${params.length}`
      }`;
    });

    params.push(employeeId);

    const [employee] = await this.tenantDatabase.query<EmployeeRecord[]>(
      tenant.schemaName,
      `UPDATE __TENANT_SCHEMA__."employees"
       SET ${setClauses.join(', ')}, "updated_at" = NOW()
       WHERE "id" = $${params.length}::uuid AND "deleted_at" IS NULL
       RETURNING
         "id",
         "branch_id" AS "branchId",
         "first_name" AS "firstName",
         "last_name" AS "lastName",
         "email",
         "phone",
         "status",
         "hired_at" AS "hiredAt",
         "created_at" AS "createdAt",
         "updated_at" AS "updatedAt"`,
      ...params,
    );

    await this.auditService.logTenant(tenant.schemaName, {
      action: 'EMPLOYEE_UPDATE',
      resource: 'employees',
      userAccountId: await this.auditService.resolveUserAccountId(user),
      details: {
        employeeId: employee.id,
        updatedFields: updates.map((update) => update.column),
      },
    });

    return employee;
  }

  private async findEmployeeById(tenant: TenantContext, employeeId: string) {
    const [employee] = await this.tenantDatabase.query<EmployeeRecord[]>(
      tenant.schemaName,
      `SELECT
         "id",
         "branch_id" AS "branchId",
         "first_name" AS "firstName",
         "last_name" AS "lastName",
         "email",
         "phone",
         "status",
         "hired_at" AS "hiredAt",
         "created_at" AS "createdAt",
         "updated_at" AS "updatedAt"
       FROM __TENANT_SCHEMA__."employees"
       WHERE "id" = $1::uuid AND "deleted_at" IS NULL`,
      employeeId,
    );

    return employee ?? null;
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
      throw new NotFoundException('Branch not found for employee');
    }
  }

  private async ensureEmployeeEmailAvailable(
    tenant: TenantContext,
    email: string,
    excludeEmployeeId?: string,
  ) {
    const params: unknown[] = [email];
    const conditions = ['"email" = $1', '"deleted_at" IS NULL'];

    if (excludeEmployeeId) {
      params.push(excludeEmployeeId);
      conditions.push(`"id" <> $${params.length}::uuid`);
    }

    const [existing] = await this.tenantDatabase.query<Array<{ id: string }>>(
      tenant.schemaName,
      `SELECT "id"
       FROM __TENANT_SCHEMA__."employees"
       WHERE ${conditions.join(' AND ')}
       LIMIT 1`,
      ...params,
    );

    if (existing) {
      throw new ConflictException('Employee email already exists');
    }
  }
}
