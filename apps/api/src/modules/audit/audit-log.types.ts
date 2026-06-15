export type AuditLogInput = {
  action: string;
  resource: string;
  companyId?: string | null;
  userAccountId?: string | null;
  details?: Record<string, unknown>;
};
