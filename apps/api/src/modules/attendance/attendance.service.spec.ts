import { AttendanceService } from './attendance.service';
import { BadRequestException } from '@nestjs/common';

describe('AttendanceService', () => {
  it('uses the tenant schema passed by the resolver when listing attendance records', async () => {
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
    const service = new AttendanceService(
      authorizationService as never,
      tenantDatabase as never,
      auditService as never,
    );

    await service.listAttendanceRecords(
      { id: 'company-1', slug: 'almio', schemaName: 'tenant_almio' },
      { page: 1, limit: 20 },
    );

    expect(tenantDatabase.query).toHaveBeenNthCalledWith(
      1,
      'tenant_almio',
      expect.stringContaining('FROM __TENANT_SCHEMA__."attendance_records" a'),
      0,
      20,
    );
  });

  it('rejects invalid attendance event sequences for the same employee and branch', async () => {
    const authorizationService = {
      isBranchAdmin: jest.fn().mockReturnValue(false),
      isSuperadmin: jest.fn().mockReturnValue(false),
      isOwner: jest.fn().mockReturnValue(false),
    };
    const tenantDatabase = {
      query: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'employee-1', branchId: 'branch-1' }])
        .mockResolvedValueOnce([{ id: 'branch-1' }])
        .mockResolvedValueOnce([{ id: 'prev-1', eventType: 'CHECK_IN', eventAt: new Date() }]),
    };
    const auditService = {};
    const service = new AttendanceService(
      authorizationService as never,
      tenantDatabase as never,
      auditService as never,
    );

    await expect(
      service.createAttendanceRecord(
        { id: 'company-1', slug: 'almio', schemaName: 'tenant_almio' },
        {
          branchId: 'branch-1',
          employeeId: 'employee-1',
          eventType: 'CHECK_IN',
          eventAt: new Date('2026-06-15T12:00:00.000Z'),
        },
        '11111111-1111-4111-8111-111111111111',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an attendance event when it would break the next recorded transition', async () => {
    const authorizationService = {
      isBranchAdmin: jest.fn().mockReturnValue(false),
      isSuperadmin: jest.fn().mockReturnValue(false),
      isOwner: jest.fn().mockReturnValue(false),
    };
    const tenantDatabase = {
      query: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'employee-1', branchId: 'branch-1' }])
        .mockResolvedValueOnce([{ id: 'branch-1' }])
        .mockResolvedValueOnce([
          {
            id: 'prev-1',
            eventType: 'CHECK_IN',
            eventAt: new Date('2026-06-15T09:00:00.000Z'),
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'next-1',
            eventType: 'BREAK_START',
            eventAt: new Date('2026-06-15T11:00:00.000Z'),
          },
        ]),
    };
    const auditService = {};
    const service = new AttendanceService(
      authorizationService as never,
      tenantDatabase as never,
      auditService as never,
    );

    await expect(
      service.createAttendanceRecord(
        { id: 'company-1', slug: 'almio', schemaName: 'tenant_almio' },
        {
          branchId: 'branch-1',
          employeeId: 'employee-1',
          eventType: 'CHECK_OUT',
          eventAt: new Date('2026-06-15T10:00:00.000Z'),
        },
        '11111111-1111-4111-8111-111111111111',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns the existing attendance record when the same idempotency key is replayed', async () => {
    const authorizationService = {
      isBranchAdmin: jest.fn().mockReturnValue(false),
      isSuperadmin: jest.fn().mockReturnValue(false),
      isOwner: jest.fn().mockReturnValue(false),
    };
    const tenantDatabase = {
      query: jest.fn().mockResolvedValueOnce([
        {
          id: 'attendance-1',
          branchId: 'branch-1',
          employeeId: 'employee-1',
          eventType: 'CHECK_IN',
          eventAt: new Date('2026-06-15T12:00:00.000Z'),
          source: 'MANUAL',
          notes: null,
          idempotencyKey: '11111111-1111-4111-8111-111111111111',
          createdAt: new Date('2026-06-15T12:00:00.000Z'),
          updatedAt: new Date('2026-06-15T12:00:00.000Z'),
        },
      ]),
    };
    const auditService = {};
    const service = new AttendanceService(
      authorizationService as never,
      tenantDatabase as never,
      auditService as never,
    );

    const result = await service.createAttendanceRecord(
      { id: 'company-1', slug: 'almio', schemaName: 'tenant_almio' },
      {
        branchId: 'branch-1',
        employeeId: 'employee-1',
        eventType: 'CHECK_IN',
        eventAt: new Date('2026-06-15T12:00:00.000Z'),
      },
      '11111111-1111-4111-8111-111111111111',
    );

    expect(result.id).toBe('attendance-1');
    expect(tenantDatabase.query).toHaveBeenCalledTimes(1);
  });

  it('rejects creating attendance without an idempotency key', async () => {
    const authorizationService = {
      isBranchAdmin: jest.fn().mockReturnValue(false),
      isSuperadmin: jest.fn().mockReturnValue(false),
      isOwner: jest.fn().mockReturnValue(false),
    };
    const tenantDatabase = {
      query: jest.fn(),
    };
    const auditService = {};
    const service = new AttendanceService(
      authorizationService as never,
      tenantDatabase as never,
      auditService as never,
    );

    await expect(
      service.createAttendanceRecord(
        { id: 'company-1', slug: 'almio', schemaName: 'tenant_almio' },
        {
          branchId: 'branch-1',
          employeeId: 'employee-1',
          eventType: 'CHECK_IN',
          eventAt: new Date('2026-06-15T12:00:00.000Z'),
        },
        undefined,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
