import { View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { Text } from '@/components';
import { t } from '@/i18n';
import { formatLongDate } from '@/lib/format';
import type { ForecastMilestone } from '@/lib/nutrition';
import { ACCENTS } from '@/theme';

const MILESTONE_COLORS = [ACCENTS.amber.dark, ACCENTS.green.dark, ACCENTS.blue.dark];
const CHART_H = 90;

/** Goal forecast (dark card, as in the prototype): projected weight line plus milestones. */
export function ForecastCard({
  curve,
  milestones,
  formatWeight,
}: {
  curve: number[];
  milestones: ForecastMilestone[];
  formatWeight: (kg: number, decimals?: number) => string;
}) {
  const start = curve[0]!;
  const goal = curve[curve.length - 1]!;
  const weeks = curve.length - 1;
  const span = Math.max(0.1, start - goal);
  const point = (w: number, kg: number) =>
    `${(w / weeks) * 100},${((start - kg) / span) * (CHART_H - 12) + 6}`;

  return (
    <View
      className="rounded-3xl border border-primary/20 p-4"
      style={{ backgroundColor: '#1A1A2E' }}
    >
      <View className="mb-3 flex-row items-center gap-2">
        <Text>📉</Text>
        <Text
          variant="label"
          accessibilityRole="header"
          className="font-extrabold"
          style={{ color: '#F1F5F9' }}
        >
          {t('initialPlan.forecastTitle')}
        </Text>
      </View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('initialPlan.forecastChart', {
          start: formatWeight(start),
          goal: formatWeight(goal),
          weeks,
        })}
        className="mb-2"
        style={{ height: CHART_H }}
      >
        <Svg
          width="100%"
          height={CHART_H}
          viewBox={`-2 0 104 ${CHART_H}`}
          preserveAspectRatio="none"
        >
          <Polyline
            points={curve.map((kg, w) => point(w, kg)).join(' ')}
            fill="none"
            stroke={ACCENTS.amber.dark}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          {milestones.map((m, i) => {
            const [x, y] = point(m.weeks, m.weightKg).split(',').map(Number) as [number, number];
            return (
              <Circle
                key={m.kind}
                cx={x}
                cy={y}
                r={2.2}
                fill={MILESTONE_COLORS[i] ?? ACCENTS.blue.dark}
              />
            );
          })}
        </Svg>
      </View>
      {milestones.map((m, i) => {
        const color = MILESTONE_COLORS[i] ?? ACCENTS.blue.dark;
        const title =
          m.kind === 'goal'
            ? t('initialPlan.goal', { weight: formatWeight(m.weightKg, 0) })
            : m.kind === 'halfway'
              ? t('initialPlan.halfway', { kg: formatWeight(m.lostKg) })
              : t('initialPlan.first_kg');
        const note =
          m.kind === 'goal'
            ? t('initialPlan.weeksInGoal', { count: m.weeks })
            : t('initialPlan.weeksIn', { count: m.weeks });
        return (
          <View
            key={m.kind}
            accessible
            accessibilityLabel={`${title}, ${note}, ${formatLongDate(m.date)}`}
            className="flex-row items-center gap-3 border-b py-2.5"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <View
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: `${color}33` }}
            >
              <View className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            </View>
            <View className="flex-1">
              <Text variant="label" className="font-bold" style={{ color: '#F1F5F9' }}>
                {title}
              </Text>
              <Text variant="caption" style={{ color: '#94A3B8' }}>
                {note}
              </Text>
            </View>
            <Text variant="caption" className="font-bold" style={{ color }}>
              {formatLongDate(m.date)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
