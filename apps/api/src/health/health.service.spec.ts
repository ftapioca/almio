import { HealthService } from './health.service';

describe('HealthService', () => {
  it('reports ready when the database check succeeds', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const service = new HealthService(prisma as never);

    await expect(service.getReadiness()).resolves.toMatchObject({
      service: 'almio-api',
      status: 'ready',
      checks: {
        database: {
          status: 'up',
        },
      },
    });
  });

  it('reports not_ready when the database check fails', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('db unavailable')),
    };
    const service = new HealthService(prisma as never);

    await expect(service.getReadiness()).resolves.toMatchObject({
      service: 'almio-api',
      status: 'not_ready',
      checks: {
        database: {
          status: 'down',
        },
      },
    });
  });
});
