import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { Text } from '@/components';
import { ACCENTS, useTheme } from '@/theme';

import type { WeightPoint } from '../stats';

const H = 140;
const PAD = 8;

/**
 * Weight over time with min/max labels, spaced by date: the smoothed trend (`trend`) as the line
 * and the weigh-ins as dots; without a trend the weigh-ins are the line.
 */
export function WeightChart({
  points,
  trend,
  label,
  format,
}: {
  points: WeightPoint[];
  trend?: WeightPoint[];
  label: string;
  format: (kg: number) => string;
}) {
  const { colors } = useTheme();
  const amber = ACCENTS.amber.dark;
  const t0 = points[0]!.date.getTime();
  const t1 = Math.max(points[points.length - 1]!.date.getTime(), t0 + 1);
  const shown = trend && trend.length === points.length ? trend : points;
  const kgs = [...points, ...shown].map((p) => p.kg);
  const lo = Math.min(...kgs) - 0.5;
  const hi = Math.max(...kgs) + 0.5;
  const x = (p: WeightPoint) => ((p.date.getTime() - t0) / (t1 - t0)) * 100;
  const y = (kg: number) => PAD + ((hi - kg) / (hi - lo)) * (H - PAD * 2);
  const line = shown.map((p, i) => `${i ? 'L' : 'M'}${x(p)},${y(p.kg)}`).join(' ');
  const area = `${line} L100,${H} L0,${H} Z`;
  const last = shown[shown.length - 1]!;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <View className="flex-row">
        <View className="justify-between py-1 pr-1" style={{ height: H }}>
          <Text variant="caption" tone="muted" className="text-[10px]">
            {format(hi - 0.5)}
          </Text>
          <Text variant="caption" tone="muted" className="text-[10px]">
            {format(lo + 0.5)}
          </Text>
        </View>
        <View className="flex-1" style={{ height: H }}>
          <Svg width="100%" height={H} viewBox={`-2 0 104 ${H}`} preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={amber} stopOpacity={0.25} />
                <Stop offset="1" stopColor={amber} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {[0.25, 0.5, 0.75].map((f) => (
              <Line
                key={f}
                x1={0}
                x2={100}
                y1={H * f}
                y2={H * f}
                stroke={colors.border}
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <Path d={area} fill="url(#weightFill)" />
            <Path
              d={line}
              fill="none"
              stroke={amber}
              strokeWidth={2.5}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {shown !== points
              ? points.map((p) => (
                  <Circle
                    key={p.date.getTime()}
                    cx={x(p)}
                    cy={y(p.kg)}
                    r={1.6}
                    fill={colors.mutedForeground}
                    opacity={0.6}
                  />
                ))
              : null}
            <Circle cx={x(last)} cy={y(last.kg)} r={2.5} fill={amber} />
          </Svg>
        </View>
      </View>
    </View>
  );
}
