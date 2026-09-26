import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { parseDayKey } from '@/lib/dates';
import { formatShortDate, formatShortMonth } from '@/lib/format';

import { fullness, type TwinFrame, type TwinLook } from '../twin';
import { TwinAvatar } from './TwinAvatar';

export function frameName(frame: TwinFrame): string {
  if (frame.kind === 'start') return t('twin.frameStart');
  if (frame.kind === 'now') return t('twin.frameNow');
  if (frame.kind === 'goal') return t('twin.frameGoal');
  const date = parseDayKey(frame.date);
  return date ? formatShortMonth(date) : '';
}

export function frameDate(frame: TwinFrame): string {
  const date = parseDayKey(frame.date);
  return date ? formatShortDate(date) : '—';
}

/** Small twins along the timeline; locked ones (free tier) are faded and open the paywall note. */
export function TimelineStrip({
  frames,
  look,
  selected,
  isLocked,
  onSelect,
}: {
  frames: TwinFrame[];
  look: TwinLook;
  selected: number;
  isLocked: (frame: TwinFrame) => boolean;
  onSelect: (index: number) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2"
      accessibilityRole="radiogroup"
      accessibilityLabel={t('twin.timeline')}
    >
      {frames.map((frame, i) => {
        const locked = isLocked(frame);
        const active = i === selected;
        return (
          <Pressable
            key={`${frame.kind}-${frame.date ?? i}`}
            accessibilityRole="radio"
            accessibilityLabel={`${t('twin.frameA11y', { frame: frameName(frame), date: frameDate(frame) })}${locked ? ' 🔒' : ''}`}
            aria-checked={active}
            onPress={() => onSelect(i)}
            style={{ minWidth: 64, minHeight: 44 }}
            className={
              active
                ? 'items-center rounded-2xl border-2 border-primary bg-card px-2 py-2'
                : 'items-center rounded-2xl border-2 border-transparent bg-muted px-2 py-2 active:opacity-70'
            }
          >
            <TwinAvatar
              look={look}
              fullness={fullness(frame.bodyFatPct, look.variant)}
              height={72}
              muted={locked || frame.kind === 'goal'}
            />
            <View className="mt-1 flex-row items-center gap-0.5">
              {locked ? <Text className="text-[11px]">🔒</Text> : null}
              <Text variant="caption" className={active ? 'font-bold' : 'font-medium'}>
                {frameName(frame)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
