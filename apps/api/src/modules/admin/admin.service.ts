import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminService {
  getReadiness() {
    return {
      phase: 'Fase 1',
      status: 'planned',
      resources: ['companies', 'plans', 'subscriptions', 'global-audit'],
    };
  }
}
