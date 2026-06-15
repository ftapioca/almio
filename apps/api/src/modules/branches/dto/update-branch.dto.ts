import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;
}
