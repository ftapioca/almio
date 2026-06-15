import { Module } from '@nestjs/common';
import { TenantModule } from '../../common/tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';

@Module({
  imports: [TenantModule, AuditModule],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
