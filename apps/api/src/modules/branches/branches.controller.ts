import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../../common/auth/auth-user.type';
import { Roles } from '../../common/auth/roles.decorator';
import { Role } from '../../common/auth/role.enum';
import { TenantContext } from '../../common/tenant/tenant-context.type';
import { CreateBranchDto } from './dto/create-branch.dto';
import { ListBranchesQueryDto } from './dto/list-branches.query';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchesService } from './branches.service';

type TenantRequest = Request & { tenant: TenantContext; user?: AuthUser };

@Controller('branches')
@Roles(Role.SUPERADMIN, Role.OWNER, Role.BRANCH_ADMIN)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  async listBranches(
    @Query() query: ListBranchesQueryDto,
    @Req() request: TenantRequest,
  ) {
    const result = await this.branchesService.listBranches(request.tenant, query);

    return {
      success: true,
      data: result.items,
      meta: result.meta,
    };
  }

  @Get(':id')
  async getBranchById(@Param('id') id: string, @Req() request: TenantRequest) {
    const branch = await this.branchesService.getBranchById(request.tenant, id);

    return {
      success: true,
      data: branch,
    };
  }

  @Post()
  async createBranch(@Body() dto: CreateBranchDto, @Req() request: TenantRequest) {
    const branch = await this.branchesService.createBranch(
      request.tenant,
      dto,
      request.user,
    );

    return {
      success: true,
      data: branch,
    };
  }

  @Patch(':id')
  async updateBranch(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
    @Req() request: TenantRequest,
  ) {
    const branch = await this.branchesService.updateBranch(
      request.tenant,
      id,
      dto,
      request.user,
    );

    return {
      success: true,
      data: branch,
    };
  }
}
