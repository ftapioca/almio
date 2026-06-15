import { EmployeesService } from './employees.service';

describe('EmployeesService', () => {
  it('uses the tenant schema passed by the resolver when listing employees', async () => {
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
    const service = new EmployeesService(
      authorizationService as never,
      tenantDatabase as never,
      auditService as never,
    );

    await service.listEmployees(
      { id: 'company-2', slug: 'qa-foods', schemaName: 'tenant_qa_foods' },
      { page: 1, limit: 20 },
    );

    expect(tenantDatabase.query).toHaveBeenNthCalledWith(
      1,
      'tenant_qa_foods',
      expect.stringContaining('FROM __TENANT_SCHEMA__."employees" e'),
      0,
      20,
    );
  });
});
