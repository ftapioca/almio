update public.company_memberships cm
set role = 'SUPERADMIN',
    updated_at = now()
from public.user_accounts ua,
     public.companies c
where cm.user_account_id = ua.id
  and cm.company_id = c.id
  and ua.email = 'ftapioca@gmail.com'
  and c.slug = 'almio';

select ua.email, c.slug, cm.role
from public.company_memberships cm
join public.user_accounts ua on ua.id = cm.user_account_id
join public.companies c on c.id = cm.company_id
where ua.email = 'ftapioca@gmail.com'
  and c.slug = 'almio';
