import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './common/prisma/prisma.module';
import { TenantModule } from './common/tenant/tenant.module';
import { TenantResolverMiddleware } from './common/tenant/tenant-resolver.middleware';
import { RequestContextMiddleware } from './common/observability/request-context.middleware';
import { RequestLoggingInterceptor } from './common/observability/request-logging.interceptor';
import { ExceptionLoggingFilter } from './common/observability/exception-logging.filter';
import { AdminModule } from './modules/admin/admin.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BranchesModule } from './modules/branches/branches.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { HealthModule } from './modules/health/health.module';
import { MeModule } from './modules/me/me.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ShiftsModule } from './modules/shifts/shifts.module';

@Module({
  imports: [
    PrismaModule,
    TenantModule,
    AuthModule,
    AdminModule,
    AuditModule,
    BranchesModule,
    EmployeesModule,
    AttendanceModule,
    ShiftsModule,
    HealthModule,
    MeModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: ExceptionLoggingFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestContextMiddleware, TenantResolverMiddleware)
      .forRoutes('*');
  }
}
