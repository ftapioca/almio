import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getLiveness() {
    return {
      service: 'almio-api',
      status: 'ok',
    };
  }

  async getReadiness() {
    const startedAt = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        service: 'almio-api',
        status: 'ready',
        checks: {
          database: {
            status: 'up',
            latencyMs: Date.now() - startedAt,
          },
        },
      };
    } catch {
      return {
        service: 'almio-api',
        status: 'not_ready',
        checks: {
          database: {
            status: 'down',
            latencyMs: Date.now() - startedAt,
          },
        },
      };
    }
  }
}
