// Generated from the option lists in prototype/src/app/components/OnboardingScreen.tsx.
// IDs are stored in the database; labels live in src/i18n/en.ts.

export const FOOD_CATEGORIES = [
  {
    id: 'fish_seafood',
    emoji: '🐟',
    items: ['salmon', 'tuna', 'shrimp', 'shellfish', 'cod', 'tilapia', 'sardines'],
  },
  {
    id: 'meat',
    emoji: '🥩',
    items: ['beef', 'pork', 'lamb', 'turkey', 'chicken', 'bacon', 'sausage'],
  },
  { id: 'dairy', emoji: '🧀', items: ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'ice_cream'] },
  { id: 'eggs', emoji: '🥚', items: ['eggs', 'egg_whites', 'egg_yolks'] },
  {
    id: 'carbs_grains',
    emoji: '🍞',
    items: ['bread', 'pasta', 'rice', 'oats', 'wheat', 'barley', 'rye'],
  },
  {
    id: 'legumes',
    emoji: '🫘',
    items: ['beans', 'lentils', 'chickpeas', 'peanuts', 'soy', 'tofu', 'edamame'],
  },
  {
    id: 'nuts_seeds',
    emoji: '🥜',
    items: ['almonds', 'walnuts', 'cashews', 'sunflower_seeds', 'flaxseed', 'chia_seeds'],
  },
  {
    id: 'vegetables',
    emoji: '🥦',
    items: ['mushrooms', 'onions', 'garlic', 'brussels_sprouts', 'broccoli', 'cauliflower'],
  },
  {
    id: 'fruits',
    emoji: '🍌',
    items: ['bananas', 'grapes', 'mango', 'pineapple', 'watermelon', 'dates'],
  },
  {
    id: 'sweeteners',
    emoji: '🍬',
    items: ['sugar', 'honey', 'maple_syrup', 'artificial_sweeteners', 'stevia'],
  },
] as const;

export const ALLERGIES = [
  'peanuts',
  'tree_nuts',
  'dairy',
  'eggs',
  'wheat_gluten',
  'soy',
  'fish',
  'shellfish',
  'sesame',
  'mustard',
] as const;
