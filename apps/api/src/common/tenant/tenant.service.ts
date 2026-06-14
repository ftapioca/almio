import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveCompanyBySlug(slug: string) {
    return this.prisma.company.findFirst({
      where: {
        slug,
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        slug: true,
        schemaName: true,
        status: true,
      },
    });
  }
}
