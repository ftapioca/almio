import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const auditContext = {
      method: request.method,
      path: request.path,
      userId: request.user?.id ?? null,
      tenantId: request.tenant?.id ?? null,
    };

    return next.handle().pipe(
      tap(() => {
        void auditContext;
      }),
    );
  }
}

