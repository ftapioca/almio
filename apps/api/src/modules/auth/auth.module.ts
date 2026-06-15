import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from '../../common/auth/auth.guard';
import { AuthorizationService } from '../../common/auth/authorization.service';
import { RolesGuard } from '../../common/auth/roles.guard';
import { AuthService } from './auth.service';

@Module({
  providers: [
    AuthService,
    AuthorizationService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService, AuthorizationService],
})
export class AuthModule {}
