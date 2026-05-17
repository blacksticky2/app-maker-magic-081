
-- Inventory: split ALL into select(members) + write(admins)
drop policy if exists "Members modify inventory" on public.inventory_items;
create policy "Admins insert inventory"
on public.inventory_items for insert to authenticated
with check (public.is_family_admin(auth.uid(), family_id));
create policy "Admins update inventory"
on public.inventory_items for update to authenticated
using (public.is_family_admin(auth.uid(), family_id))
with check (public.is_family_admin(auth.uid(), family_id));
create policy "Admins delete inventory"
on public.inventory_items for delete to authenticated
using (public.is_family_admin(auth.uid(), family_id));

-- Vehicles: same split
drop policy if exists "Members modify vehicles" on public.vehicles;
create policy "Admins insert vehicles"
on public.vehicles for insert to authenticated
with check (public.is_family_admin(auth.uid(), family_id));
create policy "Admins update vehicles"
on public.vehicles for update to authenticated
using (public.is_family_admin(auth.uid(), family_id))
with check (public.is_family_admin(auth.uid(), family_id));
create policy "Admins delete vehicles"
on public.vehicles for delete to authenticated
using (public.is_family_admin(auth.uid(), family_id));

-- Fuel logs: only admins write
drop policy if exists "Members add fuel logs" on public.fuel_logs;
create policy "Admins add fuel logs"
on public.fuel_logs for insert to authenticated
with check (public.is_family_admin(auth.uid(), family_id));
