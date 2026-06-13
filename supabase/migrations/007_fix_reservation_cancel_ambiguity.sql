create or replace function public.ticketing_cancel_checkout_reservation(
  p_order_id uuid default null,
  p_stripe_checkout_session_id text default null,
  p_reason text default 'cancelled'
)
returns table (
  order_id uuid,
  stripe_checkout_session_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  cancelled_order public.ticketing_orders%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role access required'
      using errcode = '42501';
  end if;

  update public.ticketing_orders as order_to_cancel
  set
    status = case
      when p_reason = 'failed' then 'failed'
      else 'cancelled'
    end,
    reservation_released_at = coalesce(reservation_released_at, now())
  where order_to_cancel.status = 'pending'
    and (
      (
        p_order_id is not null
        and p_stripe_checkout_session_id is not null
        and order_to_cancel.id = p_order_id
        and order_to_cancel.stripe_checkout_session_id = p_stripe_checkout_session_id
      )
      or (
        p_order_id is not null
        and p_stripe_checkout_session_id is null
        and order_to_cancel.id = p_order_id
      )
      or (
        p_order_id is null
        and p_stripe_checkout_session_id is not null
        and order_to_cancel.stripe_checkout_session_id = p_stripe_checkout_session_id
      )
    )
  returning order_to_cancel.* into cancelled_order;

  if not found then
    return;
  end if;

  return query
  select cancelled_order.id, cancelled_order.stripe_checkout_session_id;
end;
$$;

revoke execute on function public.ticketing_cancel_checkout_reservation(
  uuid,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.ticketing_cancel_checkout_reservation(
  uuid,
  text,
  text
) to service_role;
