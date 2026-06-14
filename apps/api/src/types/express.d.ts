import { AuthUser } from '../common/auth/auth-user.type';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}
