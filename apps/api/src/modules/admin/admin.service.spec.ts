import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Role } from '../../common/auth/role.enum';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  it('rejects managing branch scopes for a non-branch-admin membership', async () => {
    const prisma = {
      companyMembership: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'membership-owner',
          userAccountId: 'user-owner',
          role: Role.OWNER,
          branchScopes: [],
        }),
      },
    };
    const tenantDatabase = {
      query: jest.fn(),
    };
    const tenantProvisioningService = {};
    const auditService = {
      log: jest.fn(),
    };

    const service = new AdminService(
      prisma as never,
      tenantDatabase as never,
      tenantProvisioningService as never,
      auditService as never,
    );

    await expect(
      service.getBranchMembershipScopes(
        { id: 'company-1', slug: 'acme', schemaName: 'tenant_acme' },
        'membership-owner',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects replacing scopes when one branch does not exist in the tenant', async () => {
    const prisma = {
      companyMembership: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'membership-branch-admin',
          userAccountId: 'user-branch-admin',
          role: Role.BRANCH_ADMIN,
          branchScopes: [],
        }),
      },
      branchMembershipScope: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const tenantDatabase = {
      query: jest.fn().mockResolvedValue([
        {
          id: 'branch-1',
          code: 'A1',
          name: 'Acme Centro',
          status: 'ACTIVE',
          timezone: 'America/Santiago',
        },
      ]),
    };
    const tenantProvisioningService = {};
    const auditService = {
      log: jest.fn(),
    };

    const service = new AdminService(
      prisma as never,
      tenantDatabase as never,
      tenantProvisioningService as never,
      auditService as never,
    );

    await expect(
      service.replaceBranchMembershipScopes(
        { id: 'company-1', slug: 'acme', schemaName: 'tenant_acme' },
        'membership-branch-admin',
        ['branch-1', 'branch-2'],
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
