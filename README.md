# Mise en Place

A recipe book, weekly meal planner and shopping list in a single web page.

**Live site:** https://robbiestells.github.io/recipe-book/

## What it does

- **Add recipes** from a recipe website's link, screenshots, or pasted recipe text. Claude reads the title, ingredients, steps, servings, time, category and tags, and you review them before saving. You can also type a recipe in.
- **Organize** by category and tag, and search across titles, tags and ingredients.
- **Plan the week** (Sunday to Saturday) by adding recipes to each day.
- **Shop** from a list that combines every ingredient in the week's recipes, sorted by aisle, with checkboxes and room for extra items.

## Reading recipes

Recipe reading calls the Anthropic API with your own key. Website import uses the API's web fetch tool, which opens the page on Anthropic's side; sites that require a login or block automated visits won't import. Open **Settings** (the gear icon), paste a key from [console.anthropic.com](https://console.anthropic.com/settings/keys), and save. The key is stored only in your browser and is sent only to `api.anthropic.com`.

## Where data lives

Recipes, plans and shopping lists are saved in your browser's local storage on the device you use. Clearing site data removes them.
