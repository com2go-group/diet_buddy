import { View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { accentColor, useTheme, type Accent } from '@/theme';

interface Macro {
  label: string;
  current: number;
  target: number;
  unit: string;
  accent: Accent;
}

export function MacroGrid({ macros }: { macros: Macro[] }) {
  const { scheme } = useTheme();
  const rows = [macros.slice(0, 2), macros.slice(2, 4)];
  return (
    <View className="mb-4 gap-2.5">
      {rows.map((row, i) => (
        <View key={i} className="flex-row gap-2.5">
          {row.map((m) => {
            const pct = m.target > 0 ? Math.min(1, m.current / m.target) : 0;
            const color = accentColor(m.accent, scheme);
            return (
              <View
                key={m.label}
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={`${m.label}: ${formatNumber(m.current)} ${t('homeScreen.ofTarget', { target: formatNumber(m.target), unit: m.unit })}`}
                accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
                className="flex-1 rounded-2xl border border-border bg-card p-3.5"
              >
                <View className="mb-2 flex-row items-center justify-between">
                  <Text variant="caption" tone="muted" className="font-semibold">
                    {m.label}
                  </Text>
                  <Text variant="caption" className="font-bold" style={{ color }}>
                    {Math.round(pct * 100)}%
                  </Text>
                </View>
                <Text className="font-bold text-lg leading-6">
                  {formatNumber(m.current)}
                  <Text variant="caption" tone="muted">
                    {m.unit}
                  </Text>
                </Text>
                <Text variant="caption" tone="muted" className="mb-2">
                  {t('homeScreen.ofTarget', { target: formatNumber(m.target), unit: m.unit })}
                </Text>
                <View className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <View
                    className="h-full rounded-full"
                    style={{ width: `${pct * 100}%`, backgroundColor: color }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
