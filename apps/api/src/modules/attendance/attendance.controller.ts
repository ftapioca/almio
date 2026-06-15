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
import { Role } from '../../common/auth/role.enum';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantContext } from '../../common/tenant/tenant-context.type';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceRecordDto } from './dto/create-attendance-record.dto';
import { ListAttendanceRecordsQueryDto } from './dto/list-attendance-records.query';
import { UpdateAttendanceRecordDto } from './dto/update-attendance-record.dto';

type TenantRequest = Request & { tenant: TenantContext; user?: AuthUser };

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.OWNER, Role.BRANCH_ADMIN)
  async listAttendanceRecords(
    @Query() query: ListAttendanceRecordsQueryDto,
    @Req() request: TenantRequest,
  ) {
    const result = await this.attendanceService.listAttendanceRecords(
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
  async getAttendanceRecordById(
    @Param('id') id: string,
    @Req() request: TenantRequest,
  ) {
    const record = await this.attendanceService.getAttendanceRecordById(
      request.tenant,
      id,
      request.user,
    );

    return {
      success: true,
      data: record,
    };
  }

  @Post()
  @Roles(Role.SUPERADMIN, Role.OWNER, Role.BRANCH_ADMIN)
  async createAttendanceRecord(
    @Body() dto: CreateAttendanceRecordDto,
    @Req() request: TenantRequest,
  ) {
    const record = await this.attendanceService.createAttendanceRecord(
      request.tenant,
      dto,
      request.user,
    );

    return {
      success: true,
      data: record,
    };
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.OWNER, Role.BRANCH_ADMIN)
  async updateAttendanceRecord(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceRecordDto,
    @Req() request: TenantRequest,
  ) {
    const record = await this.attendanceService.updateAttendanceRecord(
      request.tenant,
      id,
      dto,
      request.user,
    );

    return {
      success: true,
      data: record,
    };
  }
}
