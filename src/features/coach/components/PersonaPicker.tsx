import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { accentColor, useTheme, type Accent } from '@/theme';

import type { Persona } from '../api';

export const PERSONAS: { id: Persona; emoji: string; accent: Accent }[] = [
  { id: 'aria', emoji: '🤖', accent: 'amber' },
  { id: 'max', emoji: '💪', accent: 'green' },
  { id: 'luna', emoji: '🧘', accent: 'violet' },
];

export function PersonaPicker({
  value,
  onChange,
}: {
  value: Persona;
  onChange: (p: Persona) => void;
}) {
  const { scheme } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('coach.personas')}
      className="flex-row gap-2"
    >
      {PERSONAS.map((p) => {
        const selected = p.id === value;
        const color = accentColor(p.accent, scheme);
        return (
          <Pressable
            key={p.id}
            accessibilityRole="radio"
            aria-checked={selected}
            accessibilityLabel={`${t(`coach.${p.id}`)}, ${t(`coach.${p.id}_role`)}`}
            onPress={() => onChange(p.id)}
            style={{
              borderColor: selected ? color : undefined,
              backgroundColor: selected ? `${color}1F` : undefined,
            }}
            className="min-h-[56px] flex-1 items-center justify-center rounded-2xl border-[1.5px] border-border bg-card py-2 active:opacity-80"
          >
            <Text className="text-lg leading-6">{p.emoji}</Text>
            <Text
              variant="caption"
              className="font-bold"
              style={{ color: selected ? color : undefined }}
            >
              {t(`coach.${p.id}`)}
            </Text>
            <Text variant="caption" tone="muted" className="text-[10px]">
              {t(`coach.${p.id}_role`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
