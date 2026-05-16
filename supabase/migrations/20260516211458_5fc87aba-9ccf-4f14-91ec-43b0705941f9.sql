
-- Add FK aliases to public.profiles so PostgREST can embed profile info.
-- profiles.id is 1:1 with auth.users.id, so these are always satisfied.

ALTER TABLE public.chores
  ADD CONSTRAINT chores_created_by_profile_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT chores_assigned_to_profile_fkey
    FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_profile_fkey
    FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.family_members
  ADD CONSTRAINT family_members_user_profile_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.fuel_logs
  ADD CONSTRAINT fuel_logs_logged_by_profile_fkey
    FOREIGN KEY (logged_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.inventory_items
  ADD CONSTRAINT inventory_items_updated_by_profile_fkey
    FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.conversation_members
  ADD CONSTRAINT conversation_members_user_profile_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.family_invites
  ADD CONSTRAINT family_invites_invited_user_profile_fkey
    FOREIGN KEY (invited_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT family_invites_invited_by_profile_fkey
    FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
