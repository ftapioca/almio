import { Body, Controller, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../../common/auth/auth-user.type';
import { Roles } from '../../common/auth/roles.decorator';
import { Role } from '../../common/auth/role.enum';
import { TenantContext } from '../../common/tenant/tenant-context.type';
import { AdminService } from './admin.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { GetBranchMembershipScopesQueryDto } from './dto/get-branch-membership-scopes.query';
import { ListCompaniesQueryDto } from './dto/list-companies.query';
import { ListPlansQueryDto } from './dto/list-plans.query';
import { ReplaceBranchMembershipScopesDto } from './dto/replace-branch-membership-scopes.dto';

type AuthenticatedRequest = Request & { user?: AuthUser };
type TenantRequest = Request & { tenant: TenantContext; user?: AuthUser };

@Controller('admin/companies')
@Roles(Role.SUPERADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  async listCompanies(
    @Query() query: ListCompaniesQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const result = await this.adminService.listCompanies(query, request.user);

    return {
      success: true,
      data: result.items,
      meta: result.meta,
    };
  }

  @Get(':slug')
  async getCompanyBySlug(
    @Param('slug') slug: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const company = await this.adminService.getCompanyBySlug(slug, request.user);

    return {
      success: true,
      data: company,
    };
  }

  @Post()
  async createCompany(
    @Body() dto: CreateCompanyDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const company = await this.adminService.createCompany(dto, request.user);

    return {
      success: true,
      data: company,
    };
  }
}

@Controller('admin/plans')
@Roles(Role.SUPERADMIN)
export class AdminPlansController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  async listPlans(
    @Query() query: ListPlansQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const result = await this.adminService.listPlans(query, request.user);

    return {
      success: true,
      data: result.items,
      meta: result.meta,
    };
  }
}

@Controller('admin/branch-membership-scopes')
@Roles(Role.SUPERADMIN, Role.OWNER)
export class AdminBranchMembershipScopesController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  async getBranchMembershipScopes(
    @Query() query: GetBranchMembershipScopesQueryDto,
    @Req() request: TenantRequest,
  ) {
    const result = await this.adminService.getBranchMembershipScopes(
      request.tenant,
      query.membershipId,
      request.user,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Put(':membershipId')
  async replaceBranchMembershipScopes(
    @Param('membershipId') membershipId: string,
    @Body() dto: ReplaceBranchMembershipScopesDto,
    @Req() request: TenantRequest,
  ) {
    const result = await this.adminService.replaceBranchMembershipScopes(
      request.tenant,
      membershipId,
      dto.branchIds,
      request.user,
    );

    return {
      success: true,
      data: result,
    };
  }
}
