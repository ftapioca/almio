import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PrismaModule } from './common/prisma/prisma.module';
import { TenantModule } from './common/tenant/tenant.module';
import { TenantResolverMiddleware } from './common/tenant/tenant-resolver.middleware';
import { AdminModule } from './modules/admin/admin.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { MeModule } from './modules/me/me.module';

@Module({
  imports: [
    PrismaModule,
    TenantModule,
    AuthModule,
    AdminModule,
    AuditModule,
    HealthModule,
    MeModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantResolverMiddleware).forRoutes('*');
  }
}
