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
    const roles = await this.resolveRolesForTenant(payload, tenant);

    return {
      id: this.getRequiredStringClaim(payload, 'sub'),
      supabaseUserId: this.getRequiredStringClaim(payload, 'sub'),
      email: this.getOptionalStringClaim(payload, 'email'),
      roles,
      tenantId: tenant?.id ?? null,
      claims: payload,
    };
  }

  private async resolveRolesForTenant(
    payload: JWTPayload,
    tenant?: TenantContext,
  ): Promise<Role[]> {
    if (!tenant) {
      return this.extractRolesFromClaims(payload);
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
        role: true,
      },
    });

    if (!membership) {
      return this.extractRolesFromClaims(payload);
    }

    return this.normalizeRoles([membership.role]);
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
