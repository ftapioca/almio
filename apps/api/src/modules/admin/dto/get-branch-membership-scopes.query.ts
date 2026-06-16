import { IsUUID } from 'class-validator';

export class GetBranchMembershipScopesQueryDto {
  @IsUUID()
  membershipId!: string;
}
