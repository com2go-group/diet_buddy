import { handleFoodSearch } from './handler.ts';

Deno.serve((req) => handleFoodSearch(req, { apiKey: Deno.env.get('USDA_API_KEY'), fetch }));
