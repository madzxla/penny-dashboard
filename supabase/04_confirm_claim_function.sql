-- 04_confirm_claim_function.sql
--
-- Backs the dashboard's Redeem page (staff-code confirmation UI).
-- Wraps the confirm step server-side so the client never writes to
-- `conversions` directly, and so the monthly-cap "gift" behaviour
-- (in-flight claims still confirm unbilled once the cap is hit) lives
-- in one place rather than being reimplemented in the client.
--
-- Assumes:
--   claims(id, status, staff_code, expires_at, deal_id, user_id, ...)
--   deals(id, rest_id, ...)
--   restaurants(id, monthly_cap, ...)
--   conversions(id, restaurant_id, claim_id, billed, confirmed_at, ...)
--
-- Adjust column names below if they differ from your actual schema —
-- written to match the 01-03 migrations' documented shape, but wasn't
-- run against the live schema in this session, so double check before
-- applying.

create or replace function confirm_claim(claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim record;
  v_restaurant_id uuid;
  v_confirmed_count int;
  v_monthly_cap int;
  v_will_bill boolean;
begin
  select c.*, d.rest_id
    into v_claim
    from claims c
    join deals d on d.id = c.deal_id
   where c.id = claim_id
   for update of c;

  if not found then
    raise exception 'Claim not found';
  end if;

  if v_claim.status = 'confirmed' then
    raise exception 'Claim already confirmed';
  end if;

  if v_claim.status <> 'claimed' then
    raise exception 'Claim is not in a confirmable state (status: %)', v_claim.status;
  end if;

  if v_claim.expires_at < now() then
    raise exception 'Claim has expired';
  end if;

  v_restaurant_id := v_claim.rest_id;

  select monthly_cap into v_monthly_cap
    from restaurants
   where id = v_restaurant_id;

  select count(*) into v_confirmed_count
    from conversions
   where restaurant_id = v_restaurant_id
     and confirmed_at >= date_trunc('month', now());

  -- Once the cap is hit, this claim still confirms for the customer,
  -- but is recorded unbilled — a gift to the restaurant rather than a
  -- mid-flow rejection at the counter.
  v_will_bill := (v_monthly_cap is null) or (v_confirmed_count < v_monthly_cap);

  update claims
     set status = 'confirmed',
         confirmed_at = now()
   where id = claim_id;

  insert into conversions (restaurant_id, claim_id, billed, confirmed_at)
  values (v_restaurant_id, claim_id, v_will_bill, now());
end;
$$;

-- Staff/managers call this via the anon/authenticated role through PostgREST rpc;
-- SECURITY DEFINER means it runs with elevated privileges, so RLS on claims/
-- conversions doesn't block the write. Restrict execute to authenticated users:
revoke all on function confirm_claim(uuid) from public;
grant execute on function confirm_claim(uuid) to authenticated;
