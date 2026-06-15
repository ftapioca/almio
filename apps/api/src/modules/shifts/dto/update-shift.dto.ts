import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateShiftDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date;

  @IsOptional()
  @IsIn(['SCHEDULED', 'PUBLISHED', 'CANCELLED', 'COMPLETED'])
  status?: 'SCHEDULED' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}
