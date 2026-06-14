import { JWTPayload } from 'jose';
import { Role } from './role.enum';

export type AuthUser = {
  id: string;
  supabaseUserId: string;
  email: string | null;
  roles: Role[];
  tenantId: string | null;
  claims: JWTPayload;
};
