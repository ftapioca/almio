import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { PrismaService } from './common/prisma/prisma.service';
import { TenantDatabaseService } from './common/tenant/tenant-database.service';
import { TenantService } from './common/tenant/tenant.service';
import { AuditService } from './modules/audit/audit.service';
import { AuthService } from './modules/auth/auth.service';
import { Role } from './common/auth/role.enum';
import { AuthUser } from './common/auth/auth-user.type';

type BranchRecord = {
  id: string;
  code: string;
  name: string;
  status: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
};

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

const BRANCH_A1 = '11111111-1111-4111-8111-111111111111';
const BRANCH_A2 = '22222222-2222-4222-8222-222222222222';
const BRANCH_B1 = '33333333-3333-4333-8333-333333333333';
const EMPLOYEE_A1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const EMPLOYEE_A2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const EMPLOYEE_B1 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const ATTENDANCE_A1 = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
const ATTENDANCE_A2 = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2';
const SHIFT_A1 = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
const SHIFT_A2 = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2';

const tenantFixtures: Record<
  string,
  {
    companyId: string;
    slug: string;
    schemaName: string;
    branches: BranchRecord[];
    employees: EmployeeRecord[];
    attendanceRecords: AttendanceRecord[];
    shifts: ShiftRecord[];
  }
> = {
  acme: {
    companyId: 'company-acme',
    slug: 'acme',
    schemaName: 'tenant_acme',
    branches: [
      {
        id: BRANCH_A1,
        code: 'A1',
        name: 'Acme Centro',
        status: 'ACTIVE',
        timezone: 'America/Santiago',
        createdAt: new Date('2026-06-15T10:00:00.000Z'),
        updatedAt: new Date('2026-06-15T10:00:00.000Z'),
      },
      {
        id: BRANCH_A2,
        code: 'A2',
        name: 'Acme Norte',
        status: 'ACTIVE',
        timezone: 'America/Santiago',
        createdAt: new Date('2026-06-15T11:00:00.000Z'),
        updatedAt: new Date('2026-06-15T11:00:00.000Z'),
      },
    ],
    employees: [
      {
        id: EMPLOYEE_A1,
        branchId: BRANCH_A1,
        firstName: 'Ana',
        lastName: 'Uno',
        email: 'ana@acme.test',
        phone: null,
        status: 'ACTIVE',
        hiredAt: null,
        createdAt: new Date('2026-06-15T10:30:00.000Z'),
        updatedAt: new Date('2026-06-15T10:30:00.000Z'),
      },
      {
        id: EMPLOYEE_A2,
        branchId: BRANCH_A2,
        firstName: 'Beto',
        lastName: 'Dos',
        email: 'beto@acme.test',
        phone: null,
        status: 'ACTIVE',
        hiredAt: null,
        createdAt: new Date('2026-06-15T11:30:00.000Z'),
        updatedAt: new Date('2026-06-15T11:30:00.000Z'),
      },
    ],
    attendanceRecords: [
      {
        id: ATTENDANCE_A1,
        branchId: BRANCH_A1,
        employeeId: EMPLOYEE_A1,
        eventType: 'CHECK_IN',
        eventAt: new Date('2026-06-15T12:00:00.000Z'),
        source: 'MANUAL',
        notes: null,
        createdAt: new Date('2026-06-15T12:00:00.000Z'),
        updatedAt: new Date('2026-06-15T12:00:00.000Z'),
      },
      {
        id: ATTENDANCE_A2,
        branchId: BRANCH_A2,
        employeeId: EMPLOYEE_A2,
        eventType: 'CHECK_IN',
        eventAt: new Date('2026-06-15T13:00:00.000Z'),
        source: 'MANUAL',
        notes: null,
        createdAt: new Date('2026-06-15T13:00:00.000Z'),
        updatedAt: new Date('2026-06-15T13:00:00.000Z'),
      },
    ],
    shifts: [
      {
        id: SHIFT_A1,
        branchId: BRANCH_A1,
        employeeId: EMPLOYEE_A1,
        startsAt: new Date('2026-06-16T12:00:00.000Z'),
        endsAt: new Date('2026-06-16T20:00:00.000Z'),
        status: 'SCHEDULED',
        notes: null,
        createdAt: new Date('2026-06-15T14:00:00.000Z'),
        updatedAt: new Date('2026-06-15T14:00:00.000Z'),
      },
      {
        id: SHIFT_A2,
        branchId: BRANCH_A2,
        employeeId: EMPLOYEE_A2,
        startsAt: new Date('2026-06-17T12:00:00.000Z'),
        endsAt: new Date('2026-06-17T20:00:00.000Z'),
        status: 'SCHEDULED',
        notes: null,
        createdAt: new Date('2026-06-15T15:00:00.000Z'),
        updatedAt: new Date('2026-06-15T15:00:00.000Z'),
      },
    ],
  },
  beta: {
    companyId: 'company-beta',
    slug: 'beta',
    schemaName: 'tenant_beta',
    branches: [
      {
        id: BRANCH_B1,
        code: 'B1',
        name: 'Beta Sur',
        status: 'ACTIVE',
        timezone: 'America/Santiago',
        createdAt: new Date('2026-06-15T12:00:00.000Z'),
        updatedAt: new Date('2026-06-15T12:00:00.000Z'),
      },
    ],
    employees: [
      {
        id: EMPLOYEE_B1,
        branchId: BRANCH_B1,
        firstName: 'Carla',
        lastName: 'Tres',
        email: 'carla@beta.test',
        phone: null,
        status: 'ACTIVE',
        hiredAt: null,
        createdAt: new Date('2026-06-15T12:30:00.000Z'),
        updatedAt: new Date('2026-06-15T12:30:00.000Z'),
      },
    ],
    attendanceRecords: [],
    shifts: [],
  },
};

const usersByToken: Record<string, AuthUser> = {
  'owner-acme': {
    id: 'user-owner-acme',
    supabaseUserId: 'supabase-owner-acme',
    email: 'owner@acme.test',
    roles: [Role.OWNER],
    tenantId: tenantFixtures.acme.companyId,
    membershipId: 'membership-owner-acme',
    branchScopeIds: [],
    claims: {},
  },
  'branch-admin-acme-a1': {
    id: 'user-branch-admin-acme',
    supabaseUserId: 'supabase-branch-admin-acme',
    email: 'manager@acme.test',
    roles: [Role.BRANCH_ADMIN],
    tenantId: tenantFixtures.acme.companyId,
    membershipId: 'membership-branch-admin-acme',
    branchScopeIds: [BRANCH_A1],
    claims: {},
  },
  'owner-beta': {
    id: 'user-owner-beta',
    supabaseUserId: 'supabase-owner-beta',
    email: 'owner@beta.test',
    roles: [Role.OWNER],
    tenantId: tenantFixtures.beta.companyId,
    membershipId: 'membership-owner-beta',
    branchScopeIds: [],
    claims: {},
  },
  'no-membership': {
    id: 'user-no-membership',
    supabaseUserId: 'supabase-no-membership',
    email: 'outsider@test',
    roles: [],
    tenantId: null,
    membershipId: null,
    branchScopeIds: [],
    claims: {},
  },
};

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

function resolveTenantData(schemaName: string) {
  const tenant = Object.values(tenantFixtures).find(
    (fixture) => fixture.schemaName === schemaName,
  );

  if (!tenant) {
    throw new Error(`Unknown tenant schema: ${schemaName}`);
  }

  return tenant;
}

function buildTenantDatabaseMock() {
  return {
    query: jest.fn(async (schemaName: string, sql: string, ...params: unknown[]) => {
      const tenant = resolveTenantData(schemaName);

      if (sql.includes('__TENANT_SCHEMA__."branches"')) {
        if (sql.includes('COUNT(*)')) {
          return [{ total: BigInt(filterBranches(tenant.branches, params).length) }];
        }

        if (params.length === 1 && isUuid(params[0])) {
          return tenant.branches.filter((branch) => branch.id === params[0]);
        }

        return paginate(filterBranches(tenant.branches, params), params);
      }

      if (sql.includes('__TENANT_SCHEMA__."employees"')) {
        if (sql.includes('COUNT(*)')) {
          return [{ total: BigInt(filterEmployees(tenant.employees, params).length) }];
        }

        if (params.length === 1 && isUuid(params[0])) {
          return tenant.employees.filter((employee) => employee.id === params[0]);
        }

        return paginate(filterEmployees(tenant.employees, params), params);
      }

      if (sql.includes('__TENANT_SCHEMA__."attendance_records"')) {
        if (sql.includes('COUNT(*)')) {
          return [
            {
              total: BigInt(filterAttendanceRecords(tenant.attendanceRecords, params).length),
            },
          ];
        }

        if (params.length === 1 && isUuid(params[0])) {
          return tenant.attendanceRecords.filter((record) => record.id === params[0]);
        }

        return paginate(filterAttendanceRecords(tenant.attendanceRecords, params), params);
      }

      if (sql.includes('__TENANT_SCHEMA__."shifts"')) {
        if (sql.includes('COUNT(*)')) {
          return [{ total: BigInt(filterShifts(tenant.shifts, params).length) }];
        }

        if (params.length === 1 && isUuid(params[0])) {
          return tenant.shifts.filter((shift) => shift.id === params[0]);
        }

        return paginate(filterShifts(tenant.shifts, params), params);
      }

      throw new Error(`Unhandled tenant query: ${sql}`);
    }),
  };
}

function filterBranches(branches: BranchRecord[], params: unknown[]) {
  const status = params.find((param) => param === 'ACTIVE' || param === 'INACTIVE');
  const scopedBranchIds = params.find(Array.isArray) as string[] | undefined;

  return branches.filter((branch) => {
    if (status && branch.status !== status) {
      return false;
    }

    if (scopedBranchIds && !scopedBranchIds.includes(branch.id)) {
      return false;
    }

    return true;
  });
}

function filterEmployees(employees: EmployeeRecord[], params: unknown[]) {
  const status = params.find((param) => param === 'ACTIVE' || param === 'INACTIVE');
  const explicitBranchId = params.find((param) => isUuid(param)) as string | undefined;
  const scopedBranchIds = params.find(Array.isArray) as string[] | undefined;

  return employees.filter((employee) => {
    if (status && employee.status !== status) {
      return false;
    }

    if (explicitBranchId && employee.branchId !== explicitBranchId) {
      return false;
    }

    if (scopedBranchIds && (!employee.branchId || !scopedBranchIds.includes(employee.branchId))) {
      return false;
    }

    return true;
  });
}

function paginate<T>(items: T[], params: unknown[]) {
  const numberParams = params.filter((param): param is number => typeof param === 'number');
  const offset = numberParams.at(-2) ?? 0;
  const limit = numberParams.at(-1) ?? items.length;

  return items.slice(offset, offset + limit);
}

function filterAttendanceRecords(records: AttendanceRecord[], params: unknown[]) {
  const explicitBranchId = params.find((param) => isUuid(param)) as string | undefined;
  const explicitEmployeeId = params.find(
    (param, index) => isUuid(param) && index > 0,
  ) as string | undefined;
  const eventType = params.find(
    (param) =>
      param === 'CHECK_IN' ||
      param === 'CHECK_OUT' ||
      param === 'BREAK_START' ||
      param === 'BREAK_END',
  ) as string | undefined;
  const scopedBranchIds = params.find(Array.isArray) as string[] | undefined;

  return records.filter((record) => {
    if (explicitBranchId && record.branchId !== explicitBranchId) {
      return false;
    }

    if (explicitEmployeeId && record.employeeId !== explicitEmployeeId) {
      return false;
    }

    if (eventType && record.eventType !== eventType) {
      return false;
    }

    if (scopedBranchIds && !scopedBranchIds.includes(record.branchId)) {
      return false;
    }

    return true;
  });
}

function filterShifts(shifts: ShiftRecord[], params: unknown[]) {
  const explicitBranchId = params.find((param) => isUuid(param)) as string | undefined;
  const explicitEmployeeId = params.find(
    (param, index) => isUuid(param) && index > 0,
  ) as string | undefined;
  const status = params.find(
    (param) =>
      param === 'SCHEDULED' ||
      param === 'PUBLISHED' ||
      param === 'CANCELLED' ||
      param === 'COMPLETED',
  ) as string | undefined;
  const scopedBranchIds = params.find(Array.isArray) as string[] | undefined;

  return shifts.filter((shift) => {
    if (explicitBranchId && shift.branchId !== explicitBranchId) {
      return false;
    }

    if (explicitEmployeeId && shift.employeeId !== explicitEmployeeId) {
      return false;
    }

    if (status && shift.status !== status) {
      return false;
    }

    if (scopedBranchIds && !scopedBranchIds.includes(shift.branchId)) {
      return false;
    }

    return true;
  });
}

describe('Authorization e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(TenantService)
      .useValue({
        findActiveCompanyBySlug: jest.fn(async (slug: string) => {
          const tenant = tenantFixtures[slug];

          if (!tenant) {
            return null;
          }

          return {
            id: tenant.companyId,
            slug: tenant.slug,
            schemaName: tenant.schemaName,
          };
        }),
      })
      .overrideProvider(AuthService)
      .useValue({
        verifyAccessToken: jest.fn(async (token: string) => {
          const user = usersByToken[token];
          if (!user) {
            throw new Error(`Unknown token in test: ${token}`);
          }

          return user;
        }),
      })
      .overrideProvider(TenantDatabaseService)
      .useValue(buildTenantDatabaseMock())
      .overrideProvider(AuditService)
      .useValue({
        logTenant: jest.fn(),
        resolveUserAccountId: jest.fn(async (user?: AuthUser) => user?.id ?? null),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 403 when the caller has no active tenant membership', async () => {
    await request(app.getHttpServer())
      .get('/v1/branches')
      .set('Authorization', 'Bearer no-membership')
      .set('X-Tenant-ID', 'acme')
      .expect(403);
  });

  it('blocks branch admins from creating branches', async () => {
    await request(app.getHttpServer())
      .post('/v1/branches')
      .set('Authorization', 'Bearer branch-admin-acme-a1')
      .set('X-Tenant-ID', 'acme')
      .send({
        code: 'NEW',
        name: 'Nueva Sucursal',
        timezone: 'America/Santiago',
      })
      .expect(403);
  });

  it('limits branch admins to their assigned branches when listing branches', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/branches')
      .set('Authorization', 'Bearer branch-admin-acme-a1')
      .set('X-Tenant-ID', 'acme')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(BRANCH_A1);
  });

  it('returns 403 when a branch admin requests a branch outside its scope', async () => {
    await request(app.getHttpServer())
      .get(`/v1/branches/${BRANCH_A2}`)
      .set('Authorization', 'Bearer branch-admin-acme-a1')
      .set('X-Tenant-ID', 'acme')
      .expect(403);
  });

  it('returns 403 when a branch admin filters employees by a foreign branch', async () => {
    await request(app.getHttpServer())
      .get(`/v1/employees?branchId=${BRANCH_A2}`)
      .set('Authorization', 'Bearer branch-admin-acme-a1')
      .set('X-Tenant-ID', 'acme')
      .expect(403);
  });

  it('returns 403 when a branch admin requests an employee outside its scope', async () => {
    await request(app.getHttpServer())
      .get(`/v1/employees/${EMPLOYEE_A2}`)
      .set('Authorization', 'Bearer branch-admin-acme-a1')
      .set('X-Tenant-ID', 'acme')
      .expect(403);
  });

  it('keeps tenant data isolated across tenant schemas', async () => {
    const acmeResponse = await request(app.getHttpServer())
      .get('/v1/employees')
      .set('Authorization', 'Bearer owner-acme')
      .set('X-Tenant-ID', 'acme')
      .expect(200);

    const betaResponse = await request(app.getHttpServer())
      .get('/v1/employees')
      .set('Authorization', 'Bearer owner-beta')
      .set('X-Tenant-ID', 'beta')
      .expect(200);

    expect(acmeResponse.body.data.map((item: EmployeeRecord) => item.id)).toEqual(
      expect.arrayContaining([EMPLOYEE_A1, EMPLOYEE_A2]),
    );
    expect(betaResponse.body.data.map((item: EmployeeRecord) => item.id)).toEqual([
      EMPLOYEE_B1,
    ]);
  });

  it('limits branch admins to their assigned branches when listing attendance records', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/attendance')
      .set('Authorization', 'Bearer branch-admin-acme-a1')
      .set('X-Tenant-ID', 'acme')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(ATTENDANCE_A1);
  });

  it('returns 403 when a branch admin requests a shift outside its scope', async () => {
    await request(app.getHttpServer())
      .get(`/v1/shifts/${SHIFT_A2}`)
      .set('Authorization', 'Bearer branch-admin-acme-a1')
      .set('X-Tenant-ID', 'acme')
      .expect(403);
  });
});
