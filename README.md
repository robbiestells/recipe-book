# Mise en Place

A recipe book, weekly meal planner and shopping list in a single web page.

**Live site:** https://robbiestells.github.io/recipe-book/

## What it does

- **Add recipes** from a recipe website's link, screenshots, or pasted recipe text. Claude reads the title, ingredients, steps, servings, time, category and tags, and you review them before saving. You can also type a recipe in.
- **Organize** by category and tag, and search across titles, tags and ingredients.
- **Plan the week** (Sunday to Saturday) by adding recipes to each day.
- **Favorite** recipes with the star, then filter to ★ Favorites or find them at the top of the day picker.
- **Shop** from a list that combines every ingredient in the week's recipes, sorted by aisle, with checkboxes and room for extra items.

## Reading recipes

Recipe reading calls the Anthropic API with your own key. Website import uses the API's web fetch tool, which opens the page on Anthropic's side; sites that require a login or block automated visits won't import. Open **Settings** (the gear icon), paste a key from [console.anthropic.com](https://console.anthropic.com/settings/keys), and save. The key is stored only in your browser and is sent only to `api.anthropic.com`.

## Where data lives

When account sync is set up, recipes, favorites, meal plans and shopping lists are stored in a Supabase database. You sign in with an email link, and row-level security keeps each person's data private. The browser also keeps a copy so the app opens instantly and keeps working offline; changes made offline sync when you reconnect.

Without sync set up, everything is saved in the browser on the device you use.

## Setting up account sync (one time)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the project, open **SQL Editor**, paste the contents of [`supabase/setup.sql`](supabase/setup.sql), and run it.
3. Open **Authentication → URL Configuration**. Set **Site URL** to `https://robbiestells.github.io/recipe-book/` and add the same address under **Redirect URLs**.
4. Open **Project Settings → API** (or **API Keys**) and copy the **Project URL** and the **publishable / anon** key into [`config.js`](config.js). Both are safe to publish. Never put the secret or service_role key here.
