import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { Text } from '@/components';
import { ACCENTS, useTheme } from '@/theme';

import type { WeightPoint } from '../stats';

const H = 140;
const PAD = 8;

/** Area line of weight over time with min/max labels; points are spaced by date. */
export function WeightChart({
  points,
  label,
  format,
}: {
  points: WeightPoint[];
  label: string;
  format: (kg: number) => string;
}) {
  const { colors } = useTheme();
  const amber = ACCENTS.amber.dark;
  const t0 = points[0]!.date.getTime();
  const t1 = Math.max(points[points.length - 1]!.date.getTime(), t0 + 1);
  const kgs = points.map((p) => p.kg);
  const lo = Math.min(...kgs) - 0.5;
  const hi = Math.max(...kgs) + 0.5;
  const x = (p: WeightPoint) => ((p.date.getTime() - t0) / (t1 - t0)) * 100;
  const y = (kg: number) => PAD + ((hi - kg) / (hi - lo)) * (H - PAD * 2);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p)},${y(p.kg)}`).join(' ');
  const area = `${line} L100,${H} L0,${H} Z`;
  const last = points[points.length - 1]!;

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
            <Circle cx={x(last)} cy={y(last.kg)} r={2.5} fill={amber} />
          </Svg>
        </View>
      </View>
    </View>
  );
}
