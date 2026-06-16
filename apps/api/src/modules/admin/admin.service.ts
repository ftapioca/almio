import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../../common/auth/role.enum';
import { AuthUser } from '../../common/auth/auth-user.type';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantContext } from '../../common/tenant/tenant-context.type';
import { TenantDatabaseService } from '../../common/tenant/tenant-database.service';
import { TenantProvisioningService } from '../../common/tenant/tenant-provisioning.service';
import { AuditService } from '../audit/audit.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { ListCompaniesQueryDto } from './dto/list-companies.query';
import { ListPlansQueryDto } from './dto/list-plans.query';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantDatabase: TenantDatabaseService,
    private readonly tenantProvisioningService: TenantProvisioningService,
    private readonly auditService: AuditService,
  ) {}

  async listCompanies(query: ListCompaniesQueryDto, user?: AuthUser) {
    const where = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          name: true,
          slug: true,
          schemaName: true,
          status: true,
          createdAt: true,
          countryCode: true,
          currencyCode: true,
          saasPlan: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    const result = {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };

    await this.auditService.log({
      action: 'ADMIN_COMPANIES_LIST',
      resource: 'companies',
      userAccountId: await this.resolveUserAccountId(user),
      details: {
        page: query.page,
        limit: query.limit,
        status: query.status ?? null,
        total,
      },
    });

    return result;
  }

  async listPlans(query: ListPlansQueryDto, user?: AuthUser) {
    const [items, total] = await Promise.all([
      this.prisma.saaSPlan.findMany({
        where: {
          deletedAt: null,
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          id: true,
          code: true,
          name: true,
          maxCompanies: true,
          maxBranches: true,
          maxEmployees: true,
          maxUsers: true,
          priceMonthly: true,
          createdAt: true,
        },
      }),
      this.prisma.saaSPlan.count({
        where: {
          deletedAt: null,
        },
      }),
    ]);

    const result = {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };

    await this.auditService.log({
      action: 'ADMIN_PLANS_LIST',
      resource: 'saas_plans',
      userAccountId: await this.resolveUserAccountId(user),
      details: {
        page: query.page,
        limit: query.limit,
        total,
      },
    });

    return result;
  }

  async getCompanyBySlug(slug: string, user?: AuthUser) {
    const company = await this.prisma.company.findFirstOrThrow({
      where: {
        slug,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        schemaName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        country: {
          select: {
            code: true,
            name: true,
          },
        },
        currency: {
          select: {
            code: true,
            name: true,
            symbol: true,
          },
        },
        saasPlan: {
          select: {
            code: true,
            name: true,
            maxCompanies: true,
            maxBranches: true,
            maxEmployees: true,
            maxUsers: true,
            priceMonthly: true,
          },
        },
      },
    });

    await this.auditService.log({
      action: 'ADMIN_COMPANIES_GET',
      resource: 'companies',
      companyId: company.id,
      userAccountId: await this.resolveUserAccountId(user),
      details: {
        slug,
      },
    });

    return company;
  }

  async createCompany(dto: CreateCompanyDto, user?: AuthUser) {
    const schemaName = this.buildSchemaName(dto.slug);

    const [existingCompany, plan, country, currency] = await Promise.all([
      this.prisma.company.findFirst({
        where: {
          OR: [{ slug: dto.slug }, { schemaName }],
        },
        select: { id: true },
      }),
      this.prisma.saaSPlan.findFirst({
        where: {
          id: dto.planId,
          deletedAt: null,
        },
        select: { id: true },
      }),
      this.prisma.country.findUnique({
        where: { code: dto.country },
        select: { code: true },
      }),
      this.prisma.currency.findUnique({
        where: { code: dto.currency },
        select: { code: true },
      }),
    ]);

    if (existingCompany) {
      throw new ConflictException('Company slug or schema already exists');
    }

    if (!plan) {
      throw new BadRequestException('Invalid planId');
    }

    if (!country) {
      throw new BadRequestException('Invalid country code');
    }

    if (!currency) {
      throw new BadRequestException('Invalid currency code');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const userAccount = await tx.userAccount.upsert({
        where: { email: dto.ownerEmail },
        update: {
          status: 'ACTIVE',
          deletedAt: null,
        },
        create: {
          email: dto.ownerEmail,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          email: true,
        },
      });

      const company = await tx.company.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          schemaName,
          countryCode: dto.country,
          currencyCode: dto.currency,
          saasPlanId: dto.planId,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
          slug: true,
          schemaName: true,
          status: true,
          createdAt: true,
        },
      });

      await tx.subscription.create({
        data: {
          companyId: company.id,
          saasPlanId: dto.planId,
          status: 'ACTIVE',
          startsAt: new Date(),
        },
      });

      await tx.companyMembership.create({
        data: {
          companyId: company.id,
          userAccountId: userAccount.id,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });

      return {
        company,
        ownerEmail: userAccount.email,
      };
    });

    try {
      await this.tenantProvisioningService.provisionSchema(schemaName);
    } catch (error) {
      await this.markCompanyProvisioningFailed(result.company.id);

      await this.auditService.log({
        action: 'ADMIN_COMPANIES_PROVISION_FAILED',
        resource: 'companies',
        companyId: result.company.id,
        userAccountId: await this.resolveUserAccountId(user),
        details: {
          slug: result.company.slug,
          schemaName: result.company.schemaName,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw new InternalServerErrorException(
        'Company created but tenant provisioning failed',
      );
    }

    const response = {
      ...result.company,
      ownerEmail: result.ownerEmail,
    };

    await this.auditService.log({
      action: 'ADMIN_COMPANIES_CREATE',
      resource: 'companies',
      companyId: result.company.id,
      userAccountId: await this.resolveUserAccountId(user),
      details: {
        slug: result.company.slug,
        schemaName: result.company.schemaName,
        ownerEmail: result.ownerEmail,
      },
    });

    return response;
  }

  async getBranchMembershipScopes(
    tenant: TenantContext,
    membershipId: string,
    user?: AuthUser,
  ) {
    const membership = await this.findBranchAdminMembership(tenant.id, membershipId);
    const branches = await this.listBranchesForScopeIds(
      tenant,
      membership.branchScopes.map((scope) => scope.branchId),
    );

    await this.auditService.log({
      action: 'BRANCH_MEMBERSHIP_SCOPES_GET',
      resource: 'branch_membership_scopes',
      companyId: tenant.id,
      userAccountId: await this.resolveUserAccountId(user),
      details: {
        membershipId,
        scopeCount: branches.length,
      },
    });

    return {
      membershipId: membership.id,
      userAccountId: membership.userAccountId,
      role: membership.role,
      branchIds: branches.map((branch) => branch.id),
      branches,
    };
  }

  async replaceBranchMembershipScopes(
    tenant: TenantContext,
    membershipId: string,
    branchIds: string[],
    user?: AuthUser,
  ) {
    const membership = await this.findBranchAdminMembership(tenant.id, membershipId);
    const normalizedBranchIds = [...new Set(branchIds)];
    const branches = await this.listBranchesForScopeIds(tenant, normalizedBranchIds);

    if (branches.length !== normalizedBranchIds.length) {
      throw new NotFoundException('One or more branches were not found in the tenant');
    }

    const existingScopes = await this.prisma.branchMembershipScope.findMany({
      where: {
        companyId: tenant.id,
        membershipId,
      },
      select: {
        id: true,
        branchId: true,
        deletedAt: true,
      },
    });

    const nextScopeIds = new Set(normalizedBranchIds);
    const scopesToSoftDelete = existingScopes
      .filter((scope) => !scope.deletedAt && !nextScopeIds.has(scope.branchId))
      .map((scope) => scope.id);

    await this.prisma.$transaction(async (tx) => {
      if (scopesToSoftDelete.length > 0) {
        await tx.branchMembershipScope.updateMany({
          where: {
            id: {
              in: scopesToSoftDelete,
            },
          },
          data: {
            deletedAt: new Date(),
          },
        });
      }

      for (const branchId of normalizedBranchIds) {
        await tx.branchMembershipScope.upsert({
          where: {
            companyId_membershipId_branchId: {
              companyId: tenant.id,
              membershipId,
              branchId,
            },
          },
          update: {
            deletedAt: null,
          },
          create: {
            companyId: tenant.id,
            membershipId,
            branchId,
          },
        });
      }
    });

    await this.auditService.log({
      action: 'BRANCH_MEMBERSHIP_SCOPES_REPLACE',
      resource: 'branch_membership_scopes',
      companyId: tenant.id,
      userAccountId: await this.resolveUserAccountId(user),
      details: {
        membershipId,
        branchIds: normalizedBranchIds,
      },
    });

    return {
      membershipId: membership.id,
      userAccountId: membership.userAccountId,
      role: membership.role,
      branchIds: branches.map((branch) => branch.id),
      branches,
    };
  }

  private buildSchemaName(slug: string): string {
    return `tenant_${slug.replace(/-/g, '_')}`;
  }

  private async findBranchAdminMembership(companyId: string, membershipId: string) {
    const membership = await this.prisma.companyMembership.findFirst({
      where: {
        id: membershipId,
        companyId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        userAccountId: true,
        role: true,
        branchScopes: {
          where: {
            companyId,
            deletedAt: null,
          },
          select: {
            branchId: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Company membership not found');
    }

    if (membership.role !== Role.BRANCH_ADMIN) {
      throw new BadRequestException('Branch scopes can only be managed for BRANCH_ADMIN');
    }

    return membership;
  }

  private async listBranchesForScopeIds(tenant: TenantContext, branchIds: string[]) {
    if (branchIds.length === 0) {
      return [];
    }

    return this.tenantDatabase.query<
      Array<{ id: string; code: string; name: string; status: string; timezone: string }>
    >(
      tenant.schemaName,
      `SELECT
         "id",
         "code",
         "name",
         "status",
         "timezone"
       FROM __TENANT_SCHEMA__."branches"
       WHERE "id" = ANY($1::uuid[]) AND "deleted_at" IS NULL
       ORDER BY "created_at" DESC`,
      branchIds,
    );
  }

  private async resolveUserAccountId(user?: AuthUser): Promise<string | null> {
    if (!user?.email && !user?.supabaseUserId) {
      return null;
    }

    const account = await this.prisma.userAccount.findFirst({
      where: {
        deletedAt: null,
        OR: [
          ...(user.supabaseUserId ? [{ supabaseUserId: user.supabaseUserId }] : []),
          ...(user.email ? [{ email: user.email }] : []),
        ],
      },
      select: {
        id: true,
      },
    });

    return account?.id ?? null;
  }

  private async markCompanyProvisioningFailed(companyId: string) {
    await this.prisma.company.update({
      where: {
        id: companyId,
      },
      data: {
        status: 'SUSPENDED',
      },
    });
  }
}
