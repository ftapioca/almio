import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../../common/auth/auth-user.type';
import { Role } from '../../common/auth/role.enum';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantContext } from '../../common/tenant/tenant-context.type';
import { CreateShiftDto } from './dto/create-shift.dto';
import { ListShiftsQueryDto } from './dto/list-shifts.query';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { ShiftsService } from './shifts.service';

type TenantRequest = Request & { tenant: TenantContext; user?: AuthUser };

@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.OWNER, Role.BRANCH_ADMIN)
  async listShifts(@Query() query: ListShiftsQueryDto, @Req() request: TenantRequest) {
    const result = await this.shiftsService.listShifts(
      request.tenant,
      query,
      request.user,
    );

    return {
      success: true,
      data: result.items,
      meta: result.meta,
    };
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.OWNER, Role.BRANCH_ADMIN)
  async getShiftById(@Param('id') id: string, @Req() request: TenantRequest) {
    const shift = await this.shiftsService.getShiftById(
      request.tenant,
      id,
      request.user,
    );

    return {
      success: true,
      data: shift,
    };
  }

  @Post()
  @Roles(Role.SUPERADMIN, Role.OWNER, Role.BRANCH_ADMIN)
  async createShift(@Body() dto: CreateShiftDto, @Req() request: TenantRequest) {
    const shift = await this.shiftsService.createShift(
      request.tenant,
      dto,
      request.user,
    );

    return {
      success: true,
      data: shift,
    };
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.OWNER, Role.BRANCH_ADMIN)
  async updateShift(
    @Param('id') id: string,
    @Body() dto: UpdateShiftDto,
    @Req() request: TenantRequest,
  ) {
    const shift = await this.shiftsService.updateShift(
      request.tenant,
      id,
      dto,
      request.user,
    );

    return {
      success: true,
      data: shift,
    };
  }

  @Post(':id/publish')
  @HttpCode(200)
  @Roles(Role.SUPERADMIN, Role.OWNER, Role.BRANCH_ADMIN)
  async publishShift(@Param('id') id: string, @Req() request: TenantRequest) {
    const shift = await this.shiftsService.publishShift(request.tenant, id, request.user);

    return {
      success: true,
      data: shift,
    };
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Roles(Role.SUPERADMIN, Role.OWNER, Role.BRANCH_ADMIN)
  async cancelShift(@Param('id') id: string, @Req() request: TenantRequest) {
    const shift = await this.shiftsService.cancelShift(request.tenant, id, request.user);

    return {
      success: true,
      data: shift,
    };
  }

  @Post(':id/complete')
  @HttpCode(200)
  @Roles(Role.SUPERADMIN, Role.OWNER, Role.BRANCH_ADMIN)
  async completeShift(@Param('id') id: string, @Req() request: TenantRequest) {
    const shift = await this.shiftsService.completeShift(request.tenant, id, request.user);

    return {
      success: true,
      data: shift,
    };
  }
}
