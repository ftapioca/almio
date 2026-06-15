import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { applyTenantMigrations } from './tenant-migration.util';

@Injectable()
export class TenantProvisioningService {
  constructor(private readonly prisma: PrismaService) {}

  async provisionSchema(schemaName: string) {
    return applyTenantMigrations(this.prisma, schemaName);
  }
}
