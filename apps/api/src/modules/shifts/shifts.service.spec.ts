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
});
