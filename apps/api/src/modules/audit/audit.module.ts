import { Module } from '@nestjs/common';
import { TenantModule } from '../../common/tenant/tenant.module';
import { AuditService } from './audit.service';

@Module({
  imports: [TenantModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
