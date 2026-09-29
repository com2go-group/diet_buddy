import { anthropicProvider } from '../_shared/llm.ts';
import { handleFoodSearch } from './handler.ts';

const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
// A small model is enough to translate a search term.
const model = Deno.env.get('SEARCH_TRANSLATE_MODEL') || 'claude-haiku-4-5-20251001';
const llm = anthropicKey ? anthropicProvider(anthropicKey, model) : null;

Deno.serve((req) => handleFoodSearch(req, { apiKey: Deno.env.get('USDA_API_KEY'), fetch, llm }));
