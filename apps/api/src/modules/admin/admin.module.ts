import { Module } from '@nestjs/common';
import { TenantModule } from '../../common/tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';
import {
  AdminBranchMembershipScopesController,
  AdminController,
  AdminPlansController,
} from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AuditModule, TenantModule],
  controllers: [AdminController, AdminPlansController, AdminBranchMembershipScopesController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
