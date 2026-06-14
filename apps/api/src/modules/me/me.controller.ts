import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../../common/auth/roles.decorator';
import { Role } from '../../common/auth/role.enum';
import { RolesGuard } from '../../common/auth/roles.guard';
import { TenantContext } from '../../common/tenant/tenant-context.type';
import { AuthUser } from '../../common/auth/auth-user.type';

type AuthenticatedRequest = Request & {
  user?: AuthUser;
  tenant?: TenantContext;
};

@Controller('me')
@UseGuards(RolesGuard)
export class MeController {
  @Get()
  getCurrentContext(@Req() request: AuthenticatedRequest) {
    return {
      success: true,
      data: {
        user: request.user ?? null,
        tenant: request.tenant ?? null,
      },
    };
  }

  @Get('owner')
  @Roles(Role.OWNER)
  getOwnerContext(@Req() request: AuthenticatedRequest) {
    return {
      success: true,
      data: {
        authorized: true,
        role: Role.OWNER,
        user: request.user ?? null,
        tenant: request.tenant ?? null,
      },
    };
  }
}
