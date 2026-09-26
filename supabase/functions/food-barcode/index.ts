import { handleFoodBarcode } from './handler.ts';

const userAgent = Deno.env.get('OFF_USER_AGENT') ?? 'DietBuddy/1.0 (support@dietbuddy.app)';

Deno.serve((req) => handleFoodBarcode(req, { fetch, userAgent }));
