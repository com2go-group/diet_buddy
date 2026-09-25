import type { ComponentType } from 'react';

import type { StepId } from '../options';
import { ActivityStep, TrainingStep } from './ActivityStep';
import { AllergiesStep } from './AllergiesStep';
import { AvoidFoodsStep } from './AvoidFoodsStep';
import { ConsentStep } from './ConsentStep';
import { DietStep, RestrictionsStep } from './DietStep';
import { GoalDateStep } from './GoalDateStep';
import { GoalStep } from './GoalStep';
import { GoalWeightStep } from './GoalWeightStep';
import { DevicesStep, HealthAppsStep } from './HealthStep';
import { MeasurementsStep } from './MeasurementsStep';
import { MotivationStep } from './MotivationStep';
import { PaceStep } from './PaceStep';
import { PersonalStep } from './PersonalStep';
import { PlanStep } from './PlanStep';
import type { StepProps } from './shared';

export const STEP_COMPONENTS: Record<StepId, ComponentType<StepProps>> = {
  personal: PersonalStep,
  consent: ConsentStep,
  measurements: MeasurementsStep,
  goal: GoalStep,
  goalWeight: GoalWeightStep,
  pace: PaceStep,
  goalDate: GoalDateStep,
  motivation: MotivationStep,
  activity: ActivityStep,
  trainingFreq: TrainingStep,
  dietStyle: DietStep,
  restrictions: RestrictionsStep,
  avoidFoods: AvoidFoodsStep,
  allergies: AllergiesStep,
  healthApps: HealthAppsStep,
  devices: DevicesStep,
  aiPlan: PlanStep,
};
