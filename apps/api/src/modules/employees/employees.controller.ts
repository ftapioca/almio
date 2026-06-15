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
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ListEmployeesQueryDto } from './dto/list-employees.query';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

type TenantRequest = Request & { tenant: TenantContext; user?: AuthUser };

@Controller('employees')
@Roles(Role.SUPERADMIN, Role.OWNER, Role.BRANCH_ADMIN)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  async listEmployees(
    @Query() query: ListEmployeesQueryDto,
    @Req() request: TenantRequest,
  ) {
    const result = await this.employeesService.listEmployees(request.tenant, query);

    return {
      success: true,
      data: result.items,
      meta: result.meta,
    };
  }

  @Get(':id')
  async getEmployeeById(@Param('id') id: string, @Req() request: TenantRequest) {
    const employee = await this.employeesService.getEmployeeById(request.tenant, id);

    return {
      success: true,
      data: employee,
    };
  }

  @Post()
  async createEmployee(
    @Body() dto: CreateEmployeeDto,
    @Req() request: TenantRequest,
  ) {
    const employee = await this.employeesService.createEmployee(
      request.tenant,
      dto,
      request.user,
    );

    return {
      success: true,
      data: employee,
    };
  }

  @Patch(':id')
  async updateEmployee(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @Req() request: TenantRequest,
  ) {
    const employee = await this.employeesService.updateEmployee(
      request.tenant,
      id,
      dto,
      request.user,
    );

    return {
      success: true,
      data: employee,
    };
  }
}
