import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateAttendanceRecordDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsIn(['CHECK_IN', 'CHECK_OUT', 'BREAK_START', 'BREAK_END'])
  eventType?: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END';

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  eventAt?: Date;

  @IsOptional()
  @IsIn(['MANUAL', 'DEVICE', 'IMPORT'])
  source?: 'MANUAL' | 'DEVICE' | 'IMPORT';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}
