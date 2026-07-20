-- PickleAI — initial schema
-- Apply with the Supabase SQL editor, `supabase db push`, or the MCP apply_migration tool.

-- ============ tables ============

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  skill_level numeric(2, 1) not null default 3.0,
  primary_goal text,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro')),
  status text not null default 'active',
  monthly_quota int not null default 1,          -- free = 1 total analysis
  used_this_period int not null default 0,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  shot_type text not null default 'third_shot_drop',
  note text,
  duration_s numeric,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'processing', 'done', 'failed')),
  error text,
  created_at timestamptz not null default now()
);
create index videos_user_created_idx on public.videos (user_id, created_at desc);
create index videos_status_idx on public.videos (status) where status in ('uploaded', 'processing');

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null unique references public.videos (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  summary text,
  confidence text,
  confidence_note text,
  scores jsonb,          -- {technique, footwork, contact, consistency}
  top_fixes jsonb,       -- [{rank,title,observation,why_it_matters,how_to_fix,drill,evidence}]
  encouragement text,
  metrics jsonb,         -- the measured metrics the coaching was grounded in
  model_meta jsonb,
  created_at timestamptz not null default now()
);
create index analyses_user_created_idx on public.analyses (user_id, created_at desc);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  insight_rank int,      -- null = whole-report rating
  rating text not null check (rating in ('up', 'down')),
  comment text,
  created_at timestamptz not null default now()
);

-- ============ row level security ============

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.videos enable row level security;
alter table public.analyses enable row level security;
alter table public.feedback enable row level security;

create policy "read own profile"    on public.profiles      for select using (auth.uid() = id);
create policy "update own profile"  on public.profiles      for update using (auth.uid() = id);
create policy "read own sub"        on public.subscriptions for select using (auth.uid() = user_id);
-- subscriptions are written only by the server (service role) via Stripe webhooks / quota checks.
create policy "read own videos"     on public.videos        for select using (auth.uid() = user_id);
create policy "delete own videos"   on public.videos        for delete using (auth.uid() = user_id);
-- videos are INSERTed only by the server (service role) so quota is enforced.
create policy "read own analyses"   on public.analyses      for select using (auth.uid() = user_id);
create policy "insert own feedback" on public.feedback      for insert with check (auth.uid() = user_id);
create policy "read own feedback"   on public.feedback      for select using (auth.uid() = user_id);

-- ============ signup bootstrap: profile + free plan ============

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(coalesce(new.email, 'player'), '@', 1));
  insert into public.subscriptions (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Server-internal: not callable via the API (PUBLIC holds the default grant).
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ============ atomic quota claim (called by the server before queuing a video) ============

create or replace function public.claim_analysis(uid uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.subscriptions
     set used_this_period = used_this_period + 1
   where user_id = uid
     and used_this_period < monthly_quota;
  return found;
end;
$$;

revoke execute on function public.claim_analysis(uuid) from public, anon, authenticated;

-- ============ storage: private videos bucket ============

insert into storage.buckets (id, name, public)
values ('videos', 'videos', false)
on conflict (id) do nothing;

-- Users may only touch objects inside their own folder: videos/<uid>/...
create policy "own folder read" on storage.objects for select
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own folder insert" on storage.objects for insert
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own folder delete" on storage.objects for delete
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
