import { Injectable } from '@nestjs/common';

@Injectable()
export class AuditService {
  log(action: string, resource: string) {
    return {
      action,
      resource,
      status: 'planned',
    };
  }
}
