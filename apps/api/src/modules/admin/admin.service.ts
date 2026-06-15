import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { ListCompaniesQueryDto } from './dto/list-companies.query';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listCompanies(query: ListCompaniesQueryDto) {
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

    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };
  }

  async getCompanyBySlug(slug: string) {
    return this.prisma.company.findFirstOrThrow({
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
  }

  async createCompany(dto: CreateCompanyDto) {
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

    await this.createTenantSchema(schemaName);

    return {
      ...result.company,
      ownerEmail: result.ownerEmail,
    };
  }

  private buildSchemaName(slug: string): string {
    return `tenant_${slug.replace(/-/g, '_')}`;
  }

  private async createTenantSchema(schemaName: string) {
    if (!/^tenant_[a-z0-9_]+$/.test(schemaName)) {
      throw new BadRequestException('Invalid tenant schema name');
    }

    await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  }
}
