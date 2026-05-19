
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists last_seen_at timestamptz default now(),
  add column if not exists status text not null default 'offline';

alter table public.families
  add column if not exists owner_id uuid;
update public.families set owner_id = created_by where owner_id is null;
alter table public.families alter column owner_id set not null;

create or replace function public.is_family_owner(_user_id uuid, _family_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.families where id = _family_id and owner_id = _user_id);
$$;

create or replace function public.transfer_family_ownership(_family_id uuid, _new_owner uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_family_owner(auth.uid(), _family_id) then
    raise exception 'Only the family owner can transfer ownership';
  end if;
  if not public.is_family_member(_new_owner, _family_id) then
    raise exception 'New owner must be a member of the family';
  end if;
  update public.families set owner_id = _new_owner where id = _family_id;
  update public.family_members set is_admin = true where family_id = _family_id and user_id = _new_owner;
end; $$;

create or replace function public.update_presence(_status text)
returns void language sql security definer set search_path = public as $$
  update public.profiles set last_seen_at = now(), status = coalesce(_status, 'online') where id = auth.uid();
$$;

drop policy if exists "Admins can delete families" on public.families;
create policy "Owner can delete family" on public.families for delete to authenticated using (owner_id = auth.uid());

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'family_members_family_fk') then
    alter table public.family_members add constraint family_members_family_fk foreign key (family_id) references public.families(id) on delete cascade; end if;
  if not exists (select 1 from pg_constraint where conname = 'family_invites_family_fk') then
    alter table public.family_invites add constraint family_invites_family_fk foreign key (family_id) references public.families(id) on delete cascade; end if;
  if not exists (select 1 from pg_constraint where conname = 'chores_family_fk') then
    alter table public.chores add constraint chores_family_fk foreign key (family_id) references public.families(id) on delete cascade; end if;
  if not exists (select 1 from pg_constraint where conname = 'inventory_items_family_fk') then
    alter table public.inventory_items add constraint inventory_items_family_fk foreign key (family_id) references public.families(id) on delete cascade; end if;
  if not exists (select 1 from pg_constraint where conname = 'vehicles_family_fk') then
    alter table public.vehicles add constraint vehicles_family_fk foreign key (family_id) references public.families(id) on delete cascade; end if;
  if not exists (select 1 from pg_constraint where conname = 'fuel_logs_family_fk') then
    alter table public.fuel_logs add constraint fuel_logs_family_fk foreign key (family_id) references public.families(id) on delete cascade; end if;
  if not exists (select 1 from pg_constraint where conname = 'conversations_family_fk') then
    alter table public.conversations add constraint conversations_family_fk foreign key (family_id) references public.families(id) on delete cascade; end if;
  if not exists (select 1 from pg_constraint where conname = 'reward_settings_family_fk') then
    alter table public.reward_settings add constraint reward_settings_family_fk foreign key (family_id) references public.families(id) on delete cascade; end if;
  if not exists (select 1 from pg_constraint where conname = 'notifications_family_fk') then
    alter table public.notifications add constraint notifications_family_fk foreign key (family_id) references public.families(id) on delete cascade; end if;
  if not exists (select 1 from pg_constraint where conname = 'messages_conversation_fk') then
    alter table public.messages add constraint messages_conversation_fk foreign key (conversation_id) references public.conversations(id) on delete cascade; end if;
  if not exists (select 1 from pg_constraint where conname = 'conversation_members_conversation_fk') then
    alter table public.conversation_members add constraint conversation_members_conversation_fk foreign key (conversation_id) references public.conversations(id) on delete cascade; end if;
end $$;

do $$ begin
  begin alter publication supabase_realtime add table public.profiles; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.family_members; exception when duplicate_object then null; end;
end $$;
