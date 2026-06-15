import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditLogInput } from './audit-log.types';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    return this.prisma.auditLogSaaS.create({
      data: {
        action: input.action,
        resource: input.resource,
        companyId: input.companyId ?? null,
        userAccountId: input.userAccountId ?? null,
        detailsJson: input.details
          ? (input.details as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }
}
