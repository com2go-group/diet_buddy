-- Restaurant mode (CLAUDE.md §7.11): dishes logged from a menu are estimates built from typical
-- ingredients, so they get their own source.
alter type public.food_source add value if not exists 'restaurant';
