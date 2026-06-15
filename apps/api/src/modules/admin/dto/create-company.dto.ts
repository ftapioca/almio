import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 120)
  name!: string;

  @Transform(({ value }) => String(value).trim().toLowerCase())
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsString()
  @IsNotEmpty()
  planId!: string;

  @Transform(({ value }) => String(value).trim().toUpperCase())
  @IsString()
  @Length(2, 3)
  country!: string;

  @Transform(({ value }) => String(value).trim().toUpperCase())
  @IsString()
  @Length(3, 3)
  currency!: string;

  @Transform(({ value }) => String(value).trim().toLowerCase())
  @IsEmail()
  ownerEmail!: string;
}
