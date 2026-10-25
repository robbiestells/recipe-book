-- Mise en Place: storage for recipes, favorites, meal plans and shopping lists.
-- Run once in your Supabase project: SQL Editor -> New query -> paste -> Run.
--
-- Each row belongs to one signed-in person:
--   id = 'r_…'  a recipe (favorite flag is data->>'fav')
--   id = 'plan' that person's weekly meal plan
--   id = 'shop' that person's shopping-list checkmarks and extra items

create table if not exists public.recipe_docs (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.recipe_docs enable row level security;

drop policy if exists "Read own rows"   on public.recipe_docs;
drop policy if exists "Insert own rows" on public.recipe_docs;
drop policy if exists "Update own rows" on public.recipe_docs;
drop policy if exists "Delete own rows" on public.recipe_docs;

create policy "Read own rows"   on public.recipe_docs for select to authenticated using (auth.uid() = user_id);
create policy "Insert own rows" on public.recipe_docs for insert to authenticated with check (auth.uid() = user_id);
create policy "Update own rows" on public.recipe_docs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Delete own rows" on public.recipe_docs for delete to authenticated using (auth.uid() = user_id);

-- Handy view for browsing recipes in the Table Editor.
create or replace view public.my_recipes with (security_invoker = true) as
select id,
       data->>'title'              as title,
       data->>'category'           as category,
       coalesce((data->>'fav')::boolean, false) as favorite,
       updated_at
from public.recipe_docs
where id like 'r\_%';
