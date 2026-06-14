import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  getReadiness() {
    return {
      provider: 'Supabase Auth',
      phase: 'Fase 1',
      status: 'planned',
      capabilities: ['login', 'logout', 'refresh', 'mfa', 'session-revocation'],
    };
  }
}
