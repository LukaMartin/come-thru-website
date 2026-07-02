create table public.support_ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads(id) on delete cascade,
  trigger_message_id uuid references public.support_messages(id) on delete set null,
  matched_order_id uuid references public.ticketing_orders(id) on delete set null,
  provider text not null default 'openai',
  model text not null,
  status text not null default 'pending' check (
    status in (
      'pending',
      'completed',
      'failed'
    )
  ),
  category text check (
    category in (
      'missing_tickets',
      'refund_request',
      'event_question',
      'complaint',
      'spam',
      'other'
    )
  ),
  priority text check (
    priority in (
      'low',
      'normal',
      'high'
    )
  ),
  recommended_action text check (
    recommended_action in (
      'resend_tickets',
      'refund_order',
      'ask_for_more_info',
      'manual_review',
      'no_action'
    )
  ),
  summary text,
  action_reason text,
  draft_reply text,
  confidence numeric check (
    confidence is null
    or (
      confidence >= 0
      and confidence <= 1
    )
  ),
  error_message text,
  draft_reply_outcome text not null default 'unused' check (
    draft_reply_outcome in (
      'unused',
      'used',
      'rejected'
    )
  ),
  draft_reply_outcome_at timestamptz,
  draft_reply_used_message_id uuid references public.support_messages(id) on delete set null,
  input_snapshot jsonb not null default '{}'::jsonb,
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index support_ai_suggestions_thread_created_at_idx
  on public.support_ai_suggestions(thread_id, created_at desc);

create index support_ai_suggestions_status_created_at_idx
  on public.support_ai_suggestions(status, created_at desc);

create index support_ai_suggestions_matched_order_id_idx
  on public.support_ai_suggestions(matched_order_id);

create index support_ai_suggestions_draft_reply_outcome_idx
  on public.support_ai_suggestions(draft_reply_outcome, draft_reply_outcome_at desc);

alter table public.support_ai_suggestions enable row level security;

create policy "Admins can manage support AI suggestions"
  on public.support_ai_suggestions for all
  to authenticated
  using (public.ticketing_is_admin())
  with check (public.ticketing_is_admin());
