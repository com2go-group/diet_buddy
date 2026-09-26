import { Pressable, View } from 'react-native';

import { Callout, NumberField, SelectCard, Text } from '@/components';
import { t } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { kgToLb, lbToKg, type UnitSystem } from '@/lib/nutrition';
import { accentColor, MIN_TOUCH_TARGET, useTheme } from '@/theme';

import {
  ENERGY_LEVELS,
  energyTip,
  HUNGER_LEVELS,
  MOODS,
  SLEEP_HOURS,
  sleepTip,
  type CheckInAnswers,
  type CheckInStep,
} from '../logic';

interface Props {
  step: CheckInStep;
  answers: CheckInAnswers;
  onChange: (patch: Partial<CheckInAnswers>) => void;
  units: UnitSystem;
  weightError?: string;
}

/** The body of each check-in question (mood, energy, sleep, hunger, weight). */
export function CheckInQuestion({ step, answers, onChange, units, weightError }: Props) {
  const { scheme } = useTheme();
  const amber = accentColor('amber', scheme);
  const pick = (patch: Partial<CheckInAnswers>) => {
    haptics.selection();
    onChange(patch);
  };

  switch (step) {
    case 'mood':
      return (
        <View accessibilityRole="radiogroup" className="flex-row gap-2">
          {MOODS.map((m) => {
            const selected = answers.mood === m.id;
            return (
              <Pressable
                key={m.id}
                accessibilityRole="radio"
                aria-checked={selected}
                accessibilityLabel={t(`checkIn.moods.${m.id}`)}
                onPress={() => pick({ mood: m.id })}
                className={`flex-1 items-center rounded-2xl border-[1.5px] py-3.5 active:opacity-80 ${selected ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}
              >
                <Text className="text-[28px] leading-9">{m.emoji}</Text>
                <Text
                  variant="caption"
                  tone={selected ? 'primary' : 'muted'}
                  className="mt-1 font-bold"
                >
                  {t(`checkIn.moods.${m.id}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      );
    case 'energy':
      return (
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text variant="caption" tone="muted">
              {t('checkIn.energyMin')}
            </Text>
            <Text className="font-extrabold text-[32px] leading-10" style={{ color: amber }}>
              {answers.energy}
            </Text>
            <Text variant="caption" tone="muted">
              {t('checkIn.energyMax')}
            </Text>
          </View>
          <View accessibilityRole="radiogroup" className="flex-row gap-1">
            {ENERGY_LEVELS.map((n) => {
              const on = n <= answers.energy;
              return (
                <Pressable
                  key={n}
                  accessibilityRole="radio"
                  aria-checked={answers.energy === n}
                  accessibilityLabel={`${n}`}
                  onPress={() => pick({ energy: n })}
                  style={{ minHeight: MIN_TOUCH_TARGET }}
                  className={`flex-1 items-center justify-center rounded-xl active:opacity-80 ${on ? 'bg-primary' : 'bg-muted'}`}
                >
                  <Text
                    variant="label"
                    className={`font-bold ${on ? 'text-primary-foreground' : 'text-muted-foreground'}`}
                  >
                    {n}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text tone="muted" className="mt-2 text-[13px]" aria-live="polite">
            {t(`checkIn.${energyTip(answers.energy)}`)}
          </Text>
        </View>
      );
    case 'sleep':
      return (
        <View className="gap-3">
          <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
            {SLEEP_HOURS.map((h) => {
              const selected = answers.sleepHours === h;
              return (
                <Pressable
                  key={h}
                  accessibilityRole="radio"
                  aria-checked={selected}
                  onPress={() => pick({ sleepHours: h })}
                  style={{ minHeight: 48, minWidth: 56 }}
                  className={`items-center justify-center rounded-2xl border-[1.5px] px-4 active:opacity-80 ${selected ? 'border-primary bg-primary' : 'border-border bg-card'}`}
                >
                  <Text
                    className={`font-bold text-[15px] ${selected ? 'text-primary-foreground' : ''}`}
                  >
                    {t('checkIn.hours', { count: h })}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View className="rounded-2xl bg-muted p-3">
            <Text tone="muted" className="text-[13px]" aria-live="polite">
              {t(`checkIn.${sleepTip(answers.sleepHours)}`)}
            </Text>
          </View>
        </View>
      );
    case 'hunger':
      return (
        <View accessibilityRole="radiogroup" className="gap-2">
          {HUNGER_LEVELS.map((h) => (
            <SelectCard
              key={h}
              title={t(`checkIn.hungerLevels.${h}`)}
              selected={answers.hunger === h}
              selectionRole="radio"
              onPress={() => onChange({ hunger: h })}
            />
          ))}
        </View>
      );
    case 'weight': {
      const imperial = units === 'imperial';
      return (
        <View className="gap-3">
          <Text tone="muted" className="text-[13px]">
            {t('checkIn.weightHint')}
          </Text>
          <NumberField
            label={t('checkIn.weightLabel')}
            unit={imperial ? t('units.lb') : t('units.kg')}
            value={
              answers.weightKg === null
                ? null
                : imperial
                  ? kgToLb(answers.weightKg)
                  : answers.weightKg
            }
            onChangeValue={(v) =>
              onChange({ weightKg: v === null ? null : imperial ? lbToKg(v) : v })
            }
            error={weightError}
          />
          <Callout emoji="📉" tone="success">
            {t('checkIn.weightTrend')}
          </Callout>
        </View>
      );
    }
  }
}
