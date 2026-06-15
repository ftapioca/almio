import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthUser } from './auth-user.type';
import { Role } from './role.enum';

@Injectable()
export class AuthorizationService {
  isSuperadmin(user?: AuthUser): boolean {
    return user?.roles.includes(Role.SUPERADMIN) ?? false;
  }

  isOwner(user?: AuthUser): boolean {
    return user?.roles.includes(Role.OWNER) ?? false;
  }

  isBranchAdmin(user?: AuthUser): boolean {
    return user?.roles.includes(Role.BRANCH_ADMIN) ?? false;
  }

  getBranchScopeIds(user?: AuthUser): string[] {
    return user?.branchScopeIds ?? [];
  }

  enforceBranchScopeConfigured(user?: AuthUser) {
    if (!this.isBranchAdmin(user) || this.isSuperadmin(user) || this.isOwner(user)) {
      return;
    }

    if (this.getBranchScopeIds(user).length === 0) {
      throw new ForbiddenException('Branch admin has no assigned branch scope');
    }
  }

  canAccessBranch(user: AuthUser | undefined, branchId: string | null | undefined): boolean {
    if (!branchId) {
      return false;
    }

    if (this.isSuperadmin(user) || this.isOwner(user)) {
      return true;
    }

    if (!this.isBranchAdmin(user)) {
      return false;
    }

    this.enforceBranchScopeConfigured(user);
    return this.getBranchScopeIds(user).includes(branchId);
  }

  assertCanAccessBranch(user: AuthUser | undefined, branchId: string | null | undefined) {
    if (!this.canAccessBranch(user, branchId)) {
      throw new ForbiddenException('Branch scope forbidden');
    }
  }

  assertCanManageBranchCatalog(user?: AuthUser) {
    if (this.isSuperadmin(user) || this.isOwner(user)) {
      return;
    }

    throw new ForbiddenException('Only owner can manage branch catalog');
  }
}
