import { ShiftsService } from './shifts.service';
import { BadRequestException } from '@nestjs/common';

describe('ShiftsService', () => {
  it('uses the tenant schema passed by the resolver when listing shifts', async () => {
    const authorizationService = {
      isBranchAdmin: jest.fn().mockReturnValue(false),
      isSuperadmin: jest.fn().mockReturnValue(false),
      isOwner: jest.fn().mockReturnValue(false),
    };
    const tenantDatabase = {
      query: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 0 }]),
    };
    const auditService = {};
    const service = new ShiftsService(
      authorizationService as never,
      tenantDatabase as never,
      auditService as never,
    );

    await service.listShifts(
      { id: 'company-1', slug: 'almio', schemaName: 'tenant_almio' },
      { page: 1, limit: 20 },
    );

    expect(tenantDatabase.query).toHaveBeenNthCalledWith(
      1,
      'tenant_almio',
      expect.stringContaining('FROM __TENANT_SCHEMA__."shifts" s'),
      0,
      20,
    );
  });

  it('rejects overlapping shifts for the same employee', async () => {
    const authorizationService = {
      isBranchAdmin: jest.fn().mockReturnValue(false),
      isSuperadmin: jest.fn().mockReturnValue(false),
      isOwner: jest.fn().mockReturnValue(false),
    };
    const tenantDatabase = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ id: 'branch-1' }])
        .mockResolvedValueOnce([{ id: 'employee-1', branchId: 'branch-1' }])
        .mockResolvedValueOnce([{ id: 'existing-shift' }]),
    };
    const auditService = {};
    const service = new ShiftsService(
      authorizationService as never,
      tenantDatabase as never,
      auditService as never,
    );

    await expect(
      service.createShift(
        { id: 'company-1', slug: 'almio', schemaName: 'tenant_almio' },
        {
          branchId: 'branch-1',
          employeeId: 'employee-1',
          startsAt: new Date('2026-06-16T12:00:00.000Z'),
          endsAt: new Date('2026-06-16T20:00:00.000Z'),
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects creating a shift directly in a terminal status', async () => {
    const authorizationService = {
      isBranchAdmin: jest.fn().mockReturnValue(false),
      isSuperadmin: jest.fn().mockReturnValue(false),
      isOwner: jest.fn().mockReturnValue(false),
    };
    const tenantDatabase = {
      query: jest.fn(),
    };
    const auditService = {};
    const service = new ShiftsService(
      authorizationService as never,
      tenantDatabase as never,
      auditService as never,
    );

    await expect(
      service.createShift(
        { id: 'company-1', slug: 'almio', schemaName: 'tenant_almio' },
        {
          branchId: 'branch-1',
          startsAt: new Date('2026-06-16T12:00:00.000Z'),
          endsAt: new Date('2026-06-16T20:00:00.000Z'),
          status: 'COMPLETED' as never,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('publishes a scheduled shift through an explicit command', async () => {
    const authorizationService = {
      isBranchAdmin: jest.fn().mockReturnValue(false),
      isSuperadmin: jest.fn().mockReturnValue(false),
      isOwner: jest.fn().mockReturnValue(false),
    };
    const tenantDatabase = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          {
            id: 'shift-1',
            branchId: 'branch-1',
            employeeId: 'employee-1',
            startsAt: new Date('2026-06-16T12:00:00.000Z'),
            endsAt: new Date('2026-06-16T20:00:00.000Z'),
            status: 'SCHEDULED',
            notes: null,
            createdAt: new Date('2026-06-15T12:00:00.000Z'),
            updatedAt: new Date('2026-06-15T12:00:00.000Z'),
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'shift-1',
            branchId: 'branch-1',
            employeeId: 'employee-1',
            startsAt: new Date('2026-06-16T12:00:00.000Z'),
            endsAt: new Date('2026-06-16T20:00:00.000Z'),
            status: 'PUBLISHED',
            notes: null,
            createdAt: new Date('2026-06-15T12:00:00.000Z'),
            updatedAt: new Date('2026-06-15T12:05:00.000Z'),
          },
        ]),
    };
    const auditService = {
      logTenant: jest.fn(),
      resolveUserAccountId: jest.fn().mockResolvedValue('user-1'),
    };
    const service = new ShiftsService(
      authorizationService as never,
      tenantDatabase as never,
      auditService as never,
    );

    const result = await service.publishShift(
      { id: 'company-1', slug: 'almio', schemaName: 'tenant_almio' },
      'shift-1',
    );

    expect(result.status).toBe('PUBLISHED');
    expect(auditService.logTenant).toHaveBeenCalledWith(
      'tenant_almio',
      expect.objectContaining({
        action: 'SHIFT_PUBLISHED',
        resource: 'shifts',
      }),
    );
  });

  it('rejects publishing a shift without an assigned employee', async () => {
    const authorizationService = {
      isBranchAdmin: jest.fn().mockReturnValue(false),
      isSuperadmin: jest.fn().mockReturnValue(false),
      isOwner: jest.fn().mockReturnValue(false),
    };
    const tenantDatabase = {
      query: jest.fn().mockResolvedValueOnce([
        {
          id: 'shift-1',
          branchId: 'branch-1',
          employeeId: null,
          startsAt: new Date('2026-06-16T12:00:00.000Z'),
          endsAt: new Date('2026-06-16T20:00:00.000Z'),
          status: 'SCHEDULED',
          notes: null,
          createdAt: new Date('2026-06-15T12:00:00.000Z'),
          updatedAt: new Date('2026-06-15T12:00:00.000Z'),
        },
      ]),
    };
    const auditService = {};
    const service = new ShiftsService(
      authorizationService as never,
      tenantDatabase as never,
      auditService as never,
    );

    await expect(
      service.publishShift(
        { id: 'company-1', slug: 'almio', schemaName: 'tenant_almio' },
        'shift-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
