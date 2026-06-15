import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsUUID()
  branchId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  hiredAt?: Date | null;
}
