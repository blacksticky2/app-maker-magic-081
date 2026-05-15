
-- ============ ENUMS ============
create type public.family_role as enum (
  'Dad','Mom','Brother','Sister','Grandmother','Grandfather','Uncle','Aunt','Cousin','Custom'
);
create type public.chore_status as enum ('open','accepted','in_progress','submitted','approved','rejected');
create type public.invite_status as enum ('pending','accepted','declined','cancelled');
create type public.conversation_type as enum ('family','dm');
create type public.notification_type as enum ('low_stock','empty_stock','chore_request','chore_approved','chore_rejected','family_invite','new_message','low_fuel','reward');

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text not null,
  avatar_url text,
  points integer not null default 0,
  completed_chores integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);
create policy "Users can update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Auto create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username text;
begin
  v_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  -- ensure uniqueness with random suffix on conflict
  if exists (select 1 from public.profiles where username = v_username) then
    v_username := v_username || '_' || substr(replace(new.id::text,'-',''),1,6);
  end if;
  insert into public.profiles (id, username, email, avatar_url)
  values (new.id, v_username, new.email, new.raw_user_meta_data->>'avatar_url');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ FAMILIES ============
create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_url text,
  banner_url text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.families enable row level security;

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.family_role not null default 'Custom',
  custom_role_name text,
  is_admin boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (family_id, user_id)
);
alter table public.family_members enable row level security;

-- Security definer helpers to avoid recursive RLS
create or replace function public.is_family_member(_user_id uuid, _family_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.family_members where user_id=_user_id and family_id=_family_id);
$$;

create or replace function public.is_family_admin(_user_id uuid, _family_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.family_members where user_id=_user_id and family_id=_family_id and is_admin=true);
$$;

create policy "Members can view their families"
  on public.families for select to authenticated
  using (public.is_family_member(auth.uid(), id));
create policy "Authenticated can create families"
  on public.families for insert to authenticated with check (created_by = auth.uid());
create policy "Admins can update families"
  on public.families for update to authenticated using (public.is_family_admin(auth.uid(), id));
create policy "Admins can delete families"
  on public.families for delete to authenticated using (public.is_family_admin(auth.uid(), id));

create policy "Members can view family_members"
  on public.family_members for select to authenticated
  using (public.is_family_member(auth.uid(), family_id));
create policy "Admins can insert members"
  on public.family_members for insert to authenticated
  with check (public.is_family_admin(auth.uid(), family_id) or user_id = auth.uid());
create policy "Admins can update members"
  on public.family_members for update to authenticated
  using (public.is_family_admin(auth.uid(), family_id) or user_id = auth.uid());
create policy "Admins or self can remove members"
  on public.family_members for delete to authenticated
  using (public.is_family_admin(auth.uid(), family_id) or user_id = auth.uid());

-- Trigger: family creator becomes admin member
create or replace function public.handle_new_family()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.family_members (family_id, user_id, role, is_admin)
  values (new.id, new.created_by, 'Custom', true);
  insert into public.conversations (family_id, type, name)
  values (new.id, 'family', new.name || ' Family Chat');
  insert into public.reward_settings (family_id, points_per_pkr) values (new.id, 1.0);
  return new;
end; $$;

-- ============ FAMILY INVITES ============
create table public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  invited_user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status public.invite_status not null default 'pending',
  message text,
  created_at timestamptz not null default now(),
  unique (family_id, invited_user_id, status)
);
alter table public.family_invites enable row level security;

create policy "Invitee or family admins can view invites"
  on public.family_invites for select to authenticated
  using (invited_user_id = auth.uid() or public.is_family_admin(auth.uid(), family_id));
create policy "Family admins can create invites"
  on public.family_invites for insert to authenticated
  with check (public.is_family_admin(auth.uid(), family_id) and invited_by = auth.uid());
create policy "Invitee or admin can update invites"
  on public.family_invites for update to authenticated
  using (invited_user_id = auth.uid() or public.is_family_admin(auth.uid(), family_id));

-- ============ INVENTORY ============
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  category text not null default 'Other',
  quantity numeric not null default 0,
  unit text not null default 'pcs',
  low_stock_threshold numeric not null default 1,
  expiry_date date,
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.inventory_items enable row level security;
create index on public.inventory_items(family_id);

create policy "Members view inventory" on public.inventory_items for select to authenticated
  using (public.is_family_member(auth.uid(), family_id));
create policy "Members modify inventory" on public.inventory_items for all to authenticated
  using (public.is_family_member(auth.uid(), family_id))
  with check (public.is_family_member(auth.uid(), family_id));

-- ============ FUEL / VEHICLES ============
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  vehicle_type text not null default 'bike',
  fuel_capacity numeric not null default 10,
  current_fuel numeric not null default 0,
  low_fuel_threshold numeric not null default 1,
  created_at timestamptz not null default now()
);
alter table public.vehicles enable row level security;
create policy "Members view vehicles" on public.vehicles for select to authenticated
  using (public.is_family_member(auth.uid(), family_id));
create policy "Members modify vehicles" on public.vehicles for all to authenticated
  using (public.is_family_member(auth.uid(), family_id))
  with check (public.is_family_member(auth.uid(), family_id));

create table public.fuel_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  liters numeric not null,
  cost numeric not null default 0,
  logged_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.fuel_logs enable row level security;
create policy "Members view fuel logs" on public.fuel_logs for select to authenticated
  using (public.is_family_member(auth.uid(), family_id));
create policy "Members add fuel logs" on public.fuel_logs for insert to authenticated
  with check (public.is_family_member(auth.uid(), family_id));

-- ============ CHORES ============
create table public.chores (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  description text,
  points integer not null default 10,
  status public.chore_status not null default 'open',
  created_by uuid not null references auth.users(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  proof_url text,
  proof_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.chores enable row level security;
create policy "Members view chores" on public.chores for select to authenticated
  using (public.is_family_member(auth.uid(), family_id));
create policy "Members create chores" on public.chores for insert to authenticated
  with check (public.is_family_member(auth.uid(), family_id) and created_by = auth.uid());
create policy "Members update chores" on public.chores for update to authenticated
  using (public.is_family_member(auth.uid(), family_id));
create policy "Creator or admin deletes chores" on public.chores for delete to authenticated
  using (created_by = auth.uid() or public.is_family_admin(auth.uid(), family_id));

-- Credit points on approval
create or replace function public.handle_chore_approval()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') and new.assigned_to is not null then
    update public.profiles
       set points = points + new.points,
           completed_chores = completed_chores + 1
     where id = new.assigned_to;
  end if;
  return new;
end; $$;
create trigger on_chore_approved
  after update on public.chores
  for each row execute function public.handle_chore_approval();

-- ============ CONVERSATIONS / MESSAGES ============
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade,
  type public.conversation_type not null,
  name text,
  created_at timestamptz not null default now()
);
alter table public.conversations enable row level security;

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
alter table public.conversation_members enable row level security;

create or replace function public.is_conv_member(_user_id uuid, _conv_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.conversation_members where user_id=_user_id and conversation_id=_conv_id)
  or exists(
    select 1 from public.conversations c
    join public.family_members fm on fm.family_id = c.family_id
    where c.id = _conv_id and c.type='family' and fm.user_id = _user_id
  );
$$;

create policy "Members view conversations" on public.conversations for select to authenticated
  using (
    (type='family' and public.is_family_member(auth.uid(), family_id))
    or exists(select 1 from public.conversation_members cm where cm.conversation_id = id and cm.user_id = auth.uid())
  );
create policy "Authenticated create conversations" on public.conversations for insert to authenticated with check (true);

create policy "Members view conversation_members" on public.conversation_members for select to authenticated
  using (public.is_conv_member(auth.uid(), conversation_id));
create policy "Authenticated add conversation_members" on public.conversation_members for insert to authenticated
  with check (user_id = auth.uid() or public.is_conv_member(auth.uid(), conversation_id));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text,
  image_url text,
  reply_to_id uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create index on public.messages(conversation_id, created_at desc);

create policy "Conv members view messages" on public.messages for select to authenticated
  using (public.is_conv_member(auth.uid(), conversation_id));
create policy "Conv members send messages" on public.messages for insert to authenticated
  with check (public.is_conv_member(auth.uid(), conversation_id) and sender_id = auth.uid());

create table public.message_reads (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
alter table public.message_reads enable row level security;
create policy "Self message reads select" on public.message_reads for select to authenticated using (user_id = auth.uid());
create policy "Self message reads insert" on public.message_reads for insert to authenticated with check (user_id = auth.uid());

-- ============ NOTIFICATIONS ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid references public.families(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create index on public.notifications(user_id, created_at desc);

create policy "Self notifications view" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "Self notifications update" on public.notifications for update to authenticated using (user_id = auth.uid());
create policy "Authenticated insert notifications" on public.notifications for insert to authenticated with check (true);

-- Low-stock trigger -> notify all family members
create or replace function public.notify_low_stock()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  crossed boolean;
  is_empty boolean;
  member record;
begin
  is_empty := new.quantity <= 0 and (tg_op = 'INSERT' or old.quantity > 0);
  crossed := new.quantity <= new.low_stock_threshold
             and (tg_op = 'INSERT' or old.quantity > new.low_stock_threshold);
  if is_empty or crossed then
    for member in select user_id from public.family_members where family_id = new.family_id loop
      insert into public.notifications(user_id, family_id, type, title, body, link)
      values (
        member.user_id,
        new.family_id,
        case when is_empty then 'empty_stock'::public.notification_type else 'low_stock'::public.notification_type end,
        case when is_empty then new.name || ' is empty' else new.name || ' is low in stock' end,
        'Quantity: ' || new.quantity::text || ' ' || new.unit,
        '/inventory'
      );
    end loop;
  end if;
  return new;
end; $$;
create trigger inventory_low_stock_notify
  after insert or update of quantity on public.inventory_items
  for each row execute function public.notify_low_stock();

-- ============ REWARD SETTINGS ============
create table public.reward_settings (
  family_id uuid primary key references public.families(id) on delete cascade,
  points_per_pkr numeric not null default 1.0,
  updated_at timestamptz not null default now()
);
alter table public.reward_settings enable row level security;
create policy "Members view reward settings" on public.reward_settings for select to authenticated
  using (public.is_family_member(auth.uid(), family_id));
create policy "Admins modify reward settings" on public.reward_settings for all to authenticated
  using (public.is_family_admin(auth.uid(), family_id))
  with check (public.is_family_admin(auth.uid(), family_id));

-- Now create the family trigger (after reward_settings + conversations exist)
create trigger on_family_created
  after insert on public.families
  for each row execute function public.handle_new_family();

-- ============ updated_at helper ============
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger inventory_touch before update on public.inventory_items for each row execute function public.touch_updated_at();
create trigger chores_touch before update on public.chores for each row execute function public.touch_updated_at();

-- ============ REALTIME ============
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.inventory_items;
alter publication supabase_realtime add table public.chores;
alter publication supabase_realtime add table public.vehicles;
alter publication supabase_realtime add table public.family_invites;
