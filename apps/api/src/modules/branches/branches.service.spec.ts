import { BranchesService } from './branches.service';

describe('BranchesService', () => {
  it('uses the tenant schema passed by the resolver when listing branches', async () => {
    const tenantDatabase = {
      query: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 0 }]),
    };
    const auditService = {};
    const service = new BranchesService(
      tenantDatabase as never,
      auditService as never,
    );

    await service.listBranches(
      { id: 'company-1', slug: 'almio', schemaName: 'tenant_almio' },
      { page: 1, limit: 20 },
    );

    expect(tenantDatabase.query).toHaveBeenNthCalledWith(
      1,
      'tenant_almio',
      expect.stringContaining('FROM __TENANT_SCHEMA__."branches"'),
      0,
      20,
    );
  });
});
