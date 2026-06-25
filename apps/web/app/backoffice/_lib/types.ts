export type BackofficeUser = {
  id: string;
  supabaseUserId: string;
  email: string | null;
  roles: string[];
  tenantId: string | null;
  membershipId: string | null;
  branchScopeIds: string[];
};

export type BackofficeTenant = {
  id: string;
  slug: string;
  schemaName: string;
};

export type Branch = {
  id: string;
  code: string;
  name: string;
  status: string;
  timezone: string;
};

export type Employee = {
  id: string;
  branchId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  status: string;
};
