import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../../common/auth/roles.decorator';
import { Role } from '../../common/auth/role.enum';
import { AdminService } from './admin.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { ListCompaniesQueryDto } from './dto/list-companies.query';

@Controller('admin/companies')
@Roles(Role.SUPERADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  async listCompanies(@Query() query: ListCompaniesQueryDto) {
    const result = await this.adminService.listCompanies(query);

    return {
      success: true,
      data: result.items,
      meta: result.meta,
    };
  }

  @Get(':slug')
  async getCompanyBySlug(@Param('slug') slug: string) {
    const company = await this.adminService.getCompanyBySlug(slug);

    return {
      success: true,
      data: company,
    };
  }

  @Post()
  async createCompany(@Body() dto: CreateCompanyDto) {
    const company = await this.adminService.createCompany(dto);

    return {
      success: true,
      data: company,
    };
  }
}
