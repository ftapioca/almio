import { Module } from '@nestjs/common';
import { TenantDatabaseService } from './tenant-database.service';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { TenantService } from './tenant.service';

@Module({
  providers: [TenantService, TenantProvisioningService, TenantDatabaseService],
  exports: [TenantService, TenantProvisioningService, TenantDatabaseService],
})
export class TenantModule {}
