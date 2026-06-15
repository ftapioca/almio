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

export class CreateEmployeeDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsString()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @MaxLength(80)
  lastName!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  hiredAt?: Date;
}
