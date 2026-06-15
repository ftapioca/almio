import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @MaxLength(50)
  code!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;
}
