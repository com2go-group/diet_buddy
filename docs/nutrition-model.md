# Nutrition model

How `src/lib/nutrition` turns a profile into targets. CLAUDE.md §8–9 is the spec. This file records where the spec left room for interpretation, so the owner can review those choices. Every rule here is covered by the tests in `src/lib/nutrition/__tests__`.

## Straight from the spec

| Rule               | Implementation                                                                 |
| ------------------ | ------------------------------------------------------------------------------ |
| BMR                | Mifflin-St Jeor (`energy.ts`)                                                  |
| TDEE               | BMR × 1.2 / 1.375 / 1.55 / 1.725                                               |
| Pace → deficit     | `weeklyKg × 7700 / 7` (0.25 → 275, 0.5 → 550, 0.75 → 825, 1.0 → 1100 kcal/day) |
| Muscle gain        | +250 kcal/day                                                                  |
| Protein            | 1.8 g/kg; 2.2 g/kg if goals include Build Muscle                               |
| Fat / carbs        | 30 % of calories / the remainder                                               |
| Macro %            | Computed from the gram targets (largest-remainder rounding, sums to 100)       |
| Timeline           | `weeks = ceil(kgToLose / weeklyKg)`                                            |
| Calorie floor      | max(1,200 women / 1,500 men, BMR)                                              |
| Weekly loss cap    | 1 % of body weight                                                             |
| Goal BMI < 18.5    | Blocked (`validateGoalWeight`, `PlanInputError`)                               |
| Current BMI < 18.5 | `underweight_current` warning (UI suggests a professional)                     |
| Fast pace          | Always returns a `fast_pace` caution                                           |
| Age gate           | `isAdult(birthDate)`: 18+                                                      |

All three prototype bugs are fixed and have regression tests: the ~7× timeline error, the fixed 250/500/750 deficits and the fixed 30/40/30 macro split.

## Interpretation choices (please review)

1. **"Other / prefer not to say"**: BMR averages the two equations (constant −78). The calorie floor is 1,350, the midpoint. The Deurenberg sex term is 0.5. _(Decision log, 2026-09-25.)_
2. **Fast pace rate**: advertised as 0.75–1.0 kg/week. The plan uses 1 % of body weight, clamped to that band (60 kg → 0.75, 85 kg → 0.85, 100+ kg → 1.0). The 1 % cap then applies, so a 60 kg user on Fast gets 0.6 kg/week plus a `weekly_loss_capped` caution.
3. **Floor handling**: if the deficit would put calories below the floor, calories are set to the floor and the timeline slows to match (`calorie_floor_applied`). If TDEE is at or below the floor, no loss is planned (`no_safe_deficit`, no timeline).
4. **Several goals at once**: Lose Fat takes priority over Recomposition, which takes priority over Build Muscle, which takes priority over maintenance. Protein still uses 2.2 g/kg whenever Build Muscle is selected.
5. **Recomposition**: 250 kcal/day deficit at BMI ≥ 25, maintenance below that.
6. **Protein at BMI ≥ 30**: based on the goal weight when there is one. Otherwise adjusted body weight: `w25 + 0.4 × (current − w25)`, where `w25` is the weight at BMI 25.
7. **Rounding**: calories are rounded to 10 kcal, and rounded _up_ at the floor so the result never lands below it. The reported deficit and weekly rate come from the rounded number.
8. **Surplus**: a surplus is not turned into a weight-gain projection (`weeklyChangeKg = 0`).
9. **Fiber**: 14 g per 1,000 kcal.
10. **Water**: 35 ml/kg, plus 500 ml for Active and Very Active, clamped to 1.5–4 L and rounded to 100 ml.
11. **Body fat estimate** (manual body scan): Deurenberg 1991, `1.2 × BMI + 0.23 × age − 10.8 × S − 5.4`, clamped to 3–60 %. The fat / muscle / water / bone split uses fixed heuristic ratios of lean mass (55 / 38 / 7). The UI must label it as an estimate.
12. **Input limits**: age 18–120, height 100–250 cm, weight 30–350 kg. Anything outside throws `RangeError`. Forms should validate earlier with zod.
13. **User overrides**: an edited BMR or TDEE from the body-scan screen replaces the calculated value (`PlanInput.overrides`). An edited BMR also feeds the calorie floor.
