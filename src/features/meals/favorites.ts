import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { optional, supabase, type Json } from '@/lib/supabase';

import { useSessionStore } from '../auth/sessionStore';
import type { PortionFood } from './types';

/**
 * Starred foods (Log Food → Favourites). Each keeps the portion data it was starred with, so it
 * can be logged again without searching. Stored per user in `favorite_foods` (max 100).
 */

const macros = z.object({
  kcal: z.number().min(0),
  proteinG: z.number().min(0),
  carbsG: z.number().min(0),
  fatG: z.number().min(0),
});
const portionFoodSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('per100g'),
    ref: z.string().nullable(),
    name: z.string().min(1),
    brand: z.string().nullable(),
    per100g: macros,
    servings: z.array(z.object({ label: z.string(), grams: z.number().positive() })),
  }),
  z.object({
    kind: z.literal('portion'),
    ref: z.string().nullable(),
    name: z.string().min(1),
    brand: z.string().nullable(),
    portion: macros,
    portionLabel: z.string(),
    logged: z.object({ quantity: z.number().nullable(), unit: z.string().nullable() }),
  }),
]);

/** Same key as the database's unique `food_key`: the database reference, else the name. */
export const favoriteKey = (food: Pick<PortionFood, 'ref' | 'name'>) =>
  food.ref ?? food.name.trim().toLowerCase();

export interface Favorite {
  id: string;
  food: PortionFood;
}

export async function loadFavorites(userId: string): Promise<Favorite[]> {
  const rows = optional(
    await supabase
      .from('favorite_foods')
      .select('id, food')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  );
  // Rows that no longer match the app's shape are skipped rather than breaking the list.
  return (rows ?? []).flatMap((r) => {
    const parsed = portionFoodSchema.safeParse(r.food);
    return parsed.success ? [{ id: r.id, food: parsed.data }] : [];
  });
}

export async function addFavorite(food: PortionFood): Promise<void> {
  optional(
    await supabase.from('favorite_foods').insert({
      name: food.name.trim().slice(0, 200),
      food_ref: food.ref,
      food: food as unknown as Json,
    }),
  );
}

export async function removeFavorite(id: string): Promise<void> {
  optional(await supabase.from('favorite_foods').delete().eq('id', id));
}

export function useFavorites() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const key = ['favorites', userId];
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    queryFn: () => loadFavorites(userId!),
  });
  const find = (food: PortionFood) =>
    query.data?.find((f) => favoriteKey(f.food) === favoriteKey(food)) ?? null;
  const toggle = useMutation({
    mutationFn: async (food: PortionFood) => {
      const existing = find(food);
      if (existing) await removeFavorite(existing.id);
      else await addFavorite(food);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  return { query, isFavorite: (food: PortionFood) => Boolean(find(food)), toggle };
}
