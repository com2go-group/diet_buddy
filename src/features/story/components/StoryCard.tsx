import type { Ref } from 'react';
import { Platform } from 'react-native';
import Svg, { Defs, G, LinearGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { t } from '@/i18n';
import { formatShortDate, formatWeight } from '@/lib/format';
import type { UnitSystem } from '@/lib/nutrition';
import { fonts } from '@/theme';

import { renderShape } from '../../twin/components/TwinAvatar';
import { twinShapes } from '../../twin/geometry';
import { HAIR_COLOURS, SKIN_TONES, type TwinLook } from '../../twin/twin';
import type { WeekStats } from '../story';

/** Fixed colours: the shared image looks the same in light and dark mode. */
const C = {
  top: '#FEF3C7',
  bottom: '#F9F7F4',
  tile: '#FFFFFF',
  text: '#1F2937',
  muted: '#4B5563',
  brand: '#B45309',
  twinBg: '#FDE68A',
  shirt: '#F59E0B',
};
export const STORY_W = 360;
export const STORY_H = 640;

type Weight = keyof typeof fonts;
const CSS_WEIGHT: Record<Weight, string> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

function Label({
  x,
  y,
  size,
  weight = 'regular',
  color = C.text,
  anchor = 'start',
  children,
}: {
  x: number;
  y: number;
  size: number;
  weight?: Weight;
  color?: string;
  anchor?: 'start' | 'middle';
  children: string;
}) {
  // Native SVG needs the loaded font's name; the web export renders through an <img>, where only
  // system fonts are available.
  const web = Platform.OS === 'web';
  return (
    <SvgText
      x={x}
      y={y}
      fontSize={size}
      fontFamily={web ? 'Inter, system-ui, sans-serif' : fonts[weight]}
      fontWeight={web ? CSS_WEIGHT[weight] : undefined}
      fill={color}
      textAnchor={anchor}
    >
      {children}
    </SvgText>
  );
}

export function storyWeightText(
  stats: WeekStats,
  showWeight: boolean,
  units: UnitSystem,
): string | null {
  const change = stats.weightChangeKg;
  if (!showWeight || change === null) return null;
  const sign = change > 0 ? '+' : change < 0 ? '−' : '±';
  return t('story.weight', { change: `${sign}${formatWeight(Math.abs(change), units)}` });
}

/** Up to two of this week's badges, then "+n". */
export function storyBadgeText(stats: WeekStats): string | null {
  const shown = stats.badges.slice(0, 2).map((b) => `${b.emoji} ${b.title}`);
  if (!shown.length) return null;
  const more = stats.badges.length - shown.length;
  return t('story.badges', { list: shown.join(' · ') + (more > 0 ? ` +${more}` : '') });
}

export interface StoryCardProps {
  stats: WeekStats;
  look: TwinLook;
  /** Twin fullness now; null draws a star instead of the twin. */
  fullness: number | null;
  showWeight: boolean;
  units: UnitSystem;
  width: number;
  ref?: Ref<Svg>;
}

/** The weekly story as one SVG, so the same drawing is shown and exported as the image. */
export function StoryCard({
  stats,
  look,
  fullness,
  showWeight,
  units,
  width,
  ref,
}: StoryCardProps) {
  const range = `${formatShortDate(stats.start)} – ${formatShortDate(stats.end)}`;
  const tiles = [
    { emoji: '🔥', value: String(stats.streakDays), label: t('story.tileStreak') },
    { emoji: '🍽️', value: `${stats.daysLogged}/7`, label: t('story.tileLogged') },
    { emoji: '🎯', value: String(stats.daysOnTarget), label: t('story.tileOnTarget') },
    { emoji: '💧', value: String(stats.waterDays), label: t('story.tileWater') },
    { emoji: '✅', value: String(stats.checkins), label: t('story.tileCheckins') },
    {
      emoji: '⭐',
      value: stats.avgScore === null ? '—' : String(stats.avgScore),
      label: t('story.tileScore'),
    },
  ];
  const weightText = storyWeightText(stats, showWeight, units);
  const badgeText = storyBadgeText(stats);

  return (
    <Svg
      ref={ref}
      width={width}
      height={(width * STORY_H) / STORY_W}
      viewBox={`0 0 ${STORY_W} ${STORY_H}`}
    >
      <Defs>
        <LinearGradient id="storyBg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.top} />
          <Stop offset="1" stopColor={C.bottom} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={STORY_W} height={STORY_H} fill="url(#storyBg)" />
      <Label x={180} y={42} size={12} weight="bold" color={C.brand} anchor="middle">
        {t('story.brand')}
      </Label>
      <Label x={180} y={78} size={30} weight="extrabold" anchor="middle">
        {t('story.heading')}
      </Label>
      <Label x={180} y={102} size={14} color={C.muted} anchor="middle">
        {range}
      </Label>
      {fullness === null ? (
        <Label x={180} y={250} size={96} anchor="middle">
          🌟
        </Label>
      ) : (
        <G transform="translate(115 112) scale(0.65)">
          {twinShapes(look.variant, fullness, {
            background: C.twinBg,
            skin: SKIN_TONES[look.skin] ?? SKIN_TONES[1]!,
            hair: HAIR_COLOURS[look.hair] ?? HAIR_COLOURS[1]!,
            shirt: C.shirt,
          }).map(renderShape)}
        </G>
      )}
      {weightText ? (
        <G>
          <Rect x={90} y={314} width={180} height={30} rx={15} fill={C.tile} />
          <Label x={180} y={334} size={13} weight="semibold" anchor="middle">
            {weightText}
          </Label>
        </G>
      ) : null}
      {tiles.map((tile, i) => {
        const x = i % 2 === 0 ? 24 : 186;
        const y = 360 + Math.floor(i / 2) * 72;
        return (
          <G key={tile.label}>
            <Rect x={x} y={y} width={150} height={62} rx={14} fill={C.tile} />
            <Label x={x + 14} y={y + 39} size={20}>
              {tile.emoji}
            </Label>
            <Label x={x + 48} y={y + 30} size={20} weight="extrabold">
              {tile.value}
            </Label>
            <Label x={x + 48} y={y + 48} size={11} color={C.muted}>
              {tile.label}
            </Label>
          </G>
        );
      })}
      {badgeText ? (
        <Label x={180} y={590} size={12} weight="semibold" anchor="middle">
          {badgeText}
        </Label>
      ) : null}
      <Label x={180} y={622} size={11} color={C.muted} anchor="middle">
        {t('story.footer', { level: stats.level })}
      </Label>
    </Svg>
  );
}
