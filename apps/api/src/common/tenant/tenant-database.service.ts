import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { quoteTenantSchemaName } from './tenant-migration.util';

@Injectable()
export class TenantDatabaseService {
  constructor(private readonly prisma: PrismaService) {}

  query<T = unknown>(schemaName: string, sql: string, ...params: unknown[]) {
    return this.prisma.$queryRawUnsafe<T>(
      this.interpolateTenantSchema(schemaName, sql),
      ...params,
    );
  }

  execute(schemaName: string, sql: string, ...params: unknown[]) {
    return this.prisma.$executeRawUnsafe(
      this.interpolateTenantSchema(schemaName, sql),
      ...params,
    );
  }

  private interpolateTenantSchema(schemaName: string, sql: string) {
    return sql.replaceAll('__TENANT_SCHEMA__', quoteTenantSchemaName(schemaName));
  }
}
