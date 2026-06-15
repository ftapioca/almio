import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../../common/auth/auth-user.type';
import { Roles } from '../../common/auth/roles.decorator';
import { Role } from '../../common/auth/role.enum';
import { AdminService } from './admin.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { ListCompaniesQueryDto } from './dto/list-companies.query';
import { ListPlansQueryDto } from './dto/list-plans.query';

type AuthenticatedRequest = Request & { user?: AuthUser };

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
