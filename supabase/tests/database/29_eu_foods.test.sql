-- EU food data: word search in the user's language, English otherwise; server-only.
begin;
select plan(4);

insert into public.eu_foods (source, code, name_en, name_local, local_lang, kcal, protein_g, carbs_g, fat_g, fiber_g) values
  ('ciqual', '13000', 'Apple, raw, pulp and peel', 'Pomme, crue, pulpe et peau', 'fr', 53, 0.3, 11.6, 0.2, 1.4),
  ('ciqual', '12001', 'Emmental cheese', 'Emmental', 'fr', 380, 28, 0.5, 30, 0),
  ('ciqual', '13001', 'Apple compote', 'Compote de pomme', 'fr', 70, 0.3, 16, 0.1, 1.5);

select results_eq(
  $$ select code from public.search_eu_foods('pomme crue', 'fr', 10) $$,
  $$ values ('13000'::text) $$, 'French users search French names, every word must match');
select results_eq(
  $$ select name from public.search_eu_foods('apple', 'de', 10) $$,
  $$ values ('Apple compote'::text), ('Apple, raw, pulp and peel'::text) $$,
  'others search English names, shorter matches first');
select is((select count(*)::int from public.search_eu_foods(' ', 'en', 10)), 0, 'empty queries find nothing');

set local role authenticated;
select throws_ok($$ select * from public.search_eu_foods('apple', 'en', 5) $$, '42501', null,
  'searched only through food-search');

select * from finish();
rollback;
