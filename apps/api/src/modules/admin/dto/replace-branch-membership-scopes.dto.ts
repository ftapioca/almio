import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class ReplaceBranchMembershipScopesDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  branchIds!: string[];
}
