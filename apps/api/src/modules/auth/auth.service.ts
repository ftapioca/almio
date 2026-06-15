import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { createRemoteJWKSet, JWTPayload, jwtVerify } from 'jose';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role } from '../../common/auth/role.enum';
import { AuthUser } from '../../common/auth/auth-user.type';
import { TenantContext } from '../../common/tenant/tenant-context.type';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  getReadiness() {
    return {
      provider: 'Supabase Auth',
      phase: 'Fase 1',
      status: 'in_progress',
      capabilities: [
        'jwt-verification',
        'tenant-membership-resolution',
        'login',
        'logout',
        'refresh',
        'mfa',
        'session-revocation',
      ],
    };
  }

  async verifyAccessToken(token: string, request: Request): Promise<AuthUser> {
    const { payload } = await jwtVerify(token, this.getProjectJwks(), {
      issuer: this.getJwtIssuer(),
    });

    const tenant = (request as Request & { tenant?: TenantContext }).tenant;
    const access = await this.resolveAccessForTenant(payload, tenant);

    return {
      id: this.getRequiredStringClaim(payload, 'sub'),
      supabaseUserId: this.getRequiredStringClaim(payload, 'sub'),
      email: this.getOptionalStringClaim(payload, 'email'),
      roles: access.roles,
      tenantId: tenant?.id ?? null,
      membershipId: access.membershipId,
      branchScopeIds: access.branchScopeIds,
      claims: payload,
    };
  }

  private async resolveAccessForTenant(
    payload: JWTPayload,
    tenant?: TenantContext,
  ): Promise<{
    roles: Role[];
    membershipId: string | null;
    branchScopeIds: string[];
  }> {
    const globalRoles = this.extractRolesFromClaims(payload);
    const superadminRoles = globalRoles.includes(Role.SUPERADMIN)
      ? [Role.SUPERADMIN]
      : [];

    if (!tenant) {
      return {
        roles: globalRoles,
        membershipId: null,
        branchScopeIds: [],
      };
    }

    const supabaseUserId = this.getRequiredStringClaim(payload, 'sub');
    const email = this.getOptionalStringClaim(payload, 'email');

    const membership = await this.prisma.companyMembership.findFirst({
      where: {
        companyId: tenant.id,
        status: 'ACTIVE',
        deletedAt: null,
        userAccount: {
          deletedAt: null,
          status: 'ACTIVE',
          OR: [
            { supabaseUserId },
            ...(email ? [{ email }] : []),
          ],
        },
      },
      select: {
        id: true,
        role: true,
        branchScopes: {
          where: {
            deletedAt: null,
            companyId: tenant.id,
          },
          select: {
            branchId: true,
          },
        },
      },
    });

    if (!membership) {
      return {
        roles: superadminRoles,
        membershipId: null,
        branchScopeIds: [],
      };
    }

    return {
      roles: this.normalizeRoles([membership.role, ...superadminRoles]),
      membershipId: membership.id,
      branchScopeIds: membership.branchScopes.map((scope) => scope.branchId),
    };
  }

  private extractRolesFromClaims(payload: JWTPayload): Role[] {
    const appMetadata = this.readRecord(payload.app_metadata);
    const claimRoles = Array.isArray(appMetadata?.roles)
      ? appMetadata.roles.filter((value): value is string => typeof value === 'string')
      : [];
    const singleRole = typeof payload.role === 'string' ? [payload.role] : [];

    return this.normalizeRoles([...claimRoles, ...singleRole]);
  }

  private normalizeRoles(values: string[]): Role[] {
    const allowedRoles = new Set(Object.values(Role));
    return values
      .map((value) => value.toUpperCase())
      .filter((value): value is Role => allowedRoles.has(value as Role));
  }

  private getProjectJwks() {
    return createRemoteJWKSet(
      new URL(`${this.getSupabaseUrl()}/auth/v1/.well-known/jwks.json`),
    );
  }

  private getJwtIssuer(): string {
    return `${this.getSupabaseUrl()}/auth/v1`;
  }

  private getSupabaseUrl(): string {
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) {
      throw new UnauthorizedException('SUPABASE_URL is not configured');
    }

    return supabaseUrl.replace(/\/$/, '');
  }

  private getRequiredStringClaim(payload: JWTPayload, claim: string): string {
    const value = payload[claim];
    if (typeof value !== 'string' || value.length === 0) {
      throw new UnauthorizedException(`Invalid token claim: ${claim}`);
    }

    return value;
  }

  private getOptionalStringClaim(
    payload: JWTPayload,
    claim: string,
  ): string | null {
    const value = payload[claim];
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private readRecord(value: JWTPayload['app_metadata']): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }
}
