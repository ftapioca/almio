import { Module } from '@nestjs/common';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { TenantService } from './tenant.service';

@Module({
  providers: [TenantService, TenantProvisioningService],
  exports: [TenantService, TenantProvisioningService],
})
export class TenantModule {}
