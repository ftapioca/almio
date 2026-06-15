import { TenantDatabaseService } from './tenant-database.service';

describe('TenantDatabaseService', () => {
  it('replaces the tenant schema placeholder for reads', async () => {
    const prisma = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([]),
      $executeRawUnsafe: jest.fn(),
    };
    const service = new TenantDatabaseService(prisma as never);

    await service.query(
      'tenant_almio',
      'SELECT * FROM __TENANT_SCHEMA__."branches" WHERE "id" = $1',
      'branch-1',
    );

    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
      'SELECT * FROM "tenant_almio"."branches" WHERE "id" = $1',
      'branch-1',
    );
  });

  it('rejects invalid tenant schema names', async () => {
    const prisma = {
      $queryRawUnsafe: jest.fn(),
      $executeRawUnsafe: jest.fn(),
    };
    const service = new TenantDatabaseService(prisma as never);

    expect(() => service.execute('public', 'SELECT 1')).toThrow(
      'Invalid tenant schema name',
    );
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });
});
