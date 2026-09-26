/**
 * Code-level check of AI meal plans against the user's allergies, restrictions, diet style and
 * avoided foods (CLAUDE.md §9: validated in code after generation, not only by prompt).
 * Matching is on whole words in the food name and the USDA description, and deliberately
 * cautious: a false alarm only costs a regeneration, a miss could hurt someone.
 */

export interface DietPrefs {
  dietStyles: string[];
  restrictions: string[];
  restrictionOther: string | null;
  allergies: string[];
  allergyOther: string | null;
  avoidFoods: string[];
}

export interface CheckedItem {
  slot: string;
  name: string;
  /** USDA description of the food the numbers came from. */
  source: string;
}

export interface Violation {
  slot: string;
  name: string;
  reason: string;
}

const words = (...w: string[]) => w;

const FISH = words(
  'fish',
  'salmon',
  'tuna',
  'cod',
  'trout',
  'sardine',
  'sardines',
  'anchovy',
  'anchovies',
  'mackerel',
  'tilapia',
  'haddock',
  'halibut',
  'pollock',
  'herring',
  'bass',
  'snapper',
  'catfish',
  'swordfish',
  'sole',
  'plaice',
  'hake',
  'caviar',
  'roe',
);
const SHELLFISH = words(
  'shellfish',
  'shrimp',
  'shrimps',
  'prawn',
  'prawns',
  'crab',
  'crabs',
  'lobster',
  'lobsters',
  'mussel',
  'mussels',
  'clam',
  'clams',
  'oyster',
  'oysters',
  'scallop',
  'scallops',
  'squid',
  'calamari',
  'octopus',
  'crayfish',
  'langoustine',
);
const PORK = words(
  'pork',
  'bacon',
  'ham',
  'prosciutto',
  'pancetta',
  'chorizo',
  'salami',
  'pepperoni',
  'lard',
  'gelatin',
  'gelatine',
  'sausage',
  'sausages',
  'hot dog',
  'pastrami',
);
const MEAT = [
  ...PORK,
  ...words(
    'beef',
    'steak',
    'veal',
    'lamb',
    'mutton',
    'goat',
    'chicken',
    'turkey',
    'duck',
    'goose',
    'venison',
    'rabbit',
    'meat',
    'meatball',
    'meatballs',
    'burger',
    'mince',
    'jerky',
    'liver',
    'broth',
    'bone broth',
  ),
];
const DAIRY = words(
  'milk',
  'cheese',
  'cheddar',
  'mozzarella',
  'parmesan',
  'feta',
  'ricotta',
  'halloumi',
  'brie',
  'gouda',
  'cottage cheese',
  'yogurt',
  'yoghurt',
  'butter',
  'ghee',
  'cream',
  'kefir',
  'whey',
  'casein',
  'custard',
  'ice cream',
  'buttermilk',
  'skyr',
  'quark',
  'latte',
  'cappuccino',
  'milkshake',
);
const EGGS = words(
  'egg',
  'eggs',
  'omelet',
  'omelette',
  'frittata',
  'mayonnaise',
  'mayo',
  'meringue',
  'quiche',
  'aioli',
);
const GLUTEN = words(
  'wheat',
  'bread',
  'toast',
  'pasta',
  'spaghetti',
  'macaroni',
  'couscous',
  'bulgur',
  'barley',
  'rye',
  'spelt',
  'seitan',
  'flour',
  'cracker',
  'crackers',
  'bagel',
  'croissant',
  'pita',
  'tortilla',
  'wrap',
  'noodles',
  'noodle',
  'semolina',
  'farro',
  'muffin',
  'pancake',
  'pancakes',
  'waffle',
  'waffles',
  'cereal',
  'granola',
  'breadcrumbs',
  'sourdough',
  'udon',
  'ramen',
  'pizza',
  'biscuit',
  'cake',
);
const TREE_NUTS = words(
  'almond',
  'almonds',
  'walnut',
  'walnuts',
  'cashew',
  'cashews',
  'pecan',
  'pecans',
  'hazelnut',
  'hazelnuts',
  'pistachio',
  'pistachios',
  'macadamia',
  'brazil nut',
  'brazil nuts',
  'pine nut',
  'pine nuts',
  'praline',
  'marzipan',
  'nutella',
  'nut',
  'nuts',
  'nut butter',
  'almond butter',
  'almond milk',
  'cashew milk',
);
const PEANUTS = words('peanut', 'peanuts', 'peanut butter', 'groundnut', 'satay');
const SOY = words(
  'soy',
  'soya',
  'tofu',
  'tempeh',
  'edamame',
  'miso',
  'soybean',
  'soybeans',
  'tamari',
  'natto',
);
const SESAME = words('sesame', 'tahini', 'hummus', 'halva', 'halvah');
const MUSTARD = words('mustard', 'dijon');
const HONEY = words('honey');
const ALCOHOL = words(
  'wine',
  'beer',
  'rum',
  'vodka',
  'whisky',
  'whiskey',
  'liqueur',
  'brandy',
  'sake',
  'mirin',
);
const SWEETENERS = words(
  'aspartame',
  'sucralose',
  'saccharin',
  'sweetener',
  'sweeteners',
  'acesulfame',
);

const ALLERGY_WORDS: Record<string, string[]> = {
  peanuts: PEANUTS,
  tree_nuts: TREE_NUTS,
  dairy: DAIRY,
  eggs: EGGS,
  wheat_gluten: GLUTEN,
  soy: SOY,
  fish: FISH,
  shellfish: SHELLFISH,
  sesame: SESAME,
  mustard: MUSTARD,
};

const RESTRICTION_WORDS: Record<string, string[]> = {
  halal: [...PORK, ...ALCOHOL],
  kosher: [...PORK, ...SHELLFISH],
  gluten_free: GLUTEN,
  lactose_free: DAIRY,
};

const DIET_WORDS: Record<string, string[]> = {
  vegetarian: [...MEAT, ...FISH, ...SHELLFISH],
  vegan: [...MEAT, ...FISH, ...SHELLFISH, ...DAIRY, ...EGGS, ...HONEY],
};

/** Extra words for avoid-list IDs whose name alone isn't enough. */
const AVOID_EXTRA: Record<string, string[]> = {
  shellfish: SHELLFISH,
  eggs: EGGS,
  egg_whites: words('egg white', 'egg whites'),
  egg_yolks: words('egg yolk', 'egg yolks'),
  soy: SOY,
  artificial_sweeteners: SWEETENERS,
  ice_cream: words('ice cream'),
  wheat: GLUTEN,
  sugar: words('sugar'),
};

// Plant-based versions that shouldn't trip the dairy / meat rules.
const PLANT_BASED =
  /\b(almond|soy|soya|oat|rice|coconut|cashew|pea|plant[- ]based|vegan|dairy[- ]free|lactose[- ]free)\s+(milk|yogurt|yoghurt|cheese|cream|butter|mince|burger)\b/gi;

function pattern(list: string[]): RegExp {
  const escaped = list.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'));
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'i');
}

/** Singular/plural variants: berries ↔ berry, kiwis ↔ kiwi, tomatoes ↔ tomato. */
function forms(w: string): string[] {
  if (w.endsWith('ies')) return [`${w.slice(0, -3)}y`];
  if (w.endsWith('oes')) return [w.slice(0, -2)];
  if (w.endsWith('s')) return [w.slice(0, -1)];
  if (w.endsWith('y')) return [`${w.slice(0, -1)}ies`, `${w}s`];
  return [`${w}s`, `${w}es`];
}

/** Words from free-text allergies / restrictions ("kiwi, strawberries") as rules. */
function freeTextWords(text: string | null): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(
      (w) =>
        w.length >= 3 &&
        ![
          'and',
          'the',
          'with',
          'any',
          'all',
          'free',
          'food',
          'foods',
          'allergy',
          'allergic',
          'not',
          'nothing',
          'none',
        ].includes(w),
    )
    .flatMap((w) => [w, ...forms(w)]);
}

interface Rule {
  reason: string;
  re: RegExp;
  /** Plant-based wording exempts the match (dairy- and meat-type rules only). */
  plantOk: boolean;
}

export function rulesFor(prefs: DietPrefs): Rule[] {
  const rules: Rule[] = [];
  const add = (reason: string, list: string[], plantOk = false) =>
    list.length && rules.push({ reason, re: pattern(list), plantOk });
  for (const a of prefs.allergies)
    if (ALLERGY_WORDS[a]) add(`allergy:${a}`, ALLERGY_WORDS[a], a === 'dairy');
  add('allergy:other', freeTextWords(prefs.allergyOther));
  for (const r of prefs.restrictions)
    if (RESTRICTION_WORDS[r]) add(`restriction:${r}`, RESTRICTION_WORDS[r], r === 'lactose_free');
  add('restriction:other', freeTextWords(prefs.restrictionOther));
  for (const d of prefs.dietStyles) if (DIET_WORDS[d]) add(`diet:${d}`, DIET_WORDS[d], true);
  for (const f of prefs.avoidFoods) {
    const base = f.replace(/_/g, ' ');
    add(`avoid:${f}`, [...new Set([base, ...forms(base), ...(AVOID_EXTRA[f] ?? [])])]);
  }
  return rules;
}

export function findViolations(items: CheckedItem[], prefs: DietPrefs): Violation[] {
  const rules = rulesFor(prefs);
  const violations: Violation[] = [];
  for (const item of items) {
    const raw = `${item.name} | ${item.source}`;
    const plantStripped = raw.replace(PLANT_BASED, ' ');
    for (const rule of rules) {
      const text = rule.plantOk ? plantStripped : raw;
      if (rule.re.test(text)) {
        violations.push({ slot: item.slot, name: item.name, reason: rule.reason });
        break;
      }
    }
  }
  // Kosher: no meat and dairy in the same meal.
  if (prefs.restrictions.includes('kosher')) {
    const meat = pattern(MEAT);
    const dairy = pattern(DAIRY);
    for (const slot of new Set(items.map((i) => i.slot))) {
      const meal = items.filter((i) => i.slot === slot);
      const text = (i: CheckedItem) => `${i.name} | ${i.source}`.replace(PLANT_BASED, ' ');
      if (meal.some((i) => meat.test(text(i))) && meal.some((i) => dairy.test(text(i)))) {
        violations.push({
          slot,
          name: meal.map((i) => i.name).join(' + '),
          reason: 'restriction:kosher_mixing',
        });
      }
    }
  }
  return violations;
}
