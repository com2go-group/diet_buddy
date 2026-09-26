import Svg, { Circle, Ellipse, Line, Path } from 'react-native-svg';

import { useTheme } from '@/theme';

import { twinShapes, type Shape } from '../geometry';
import { HAIR_COLOURS, SKIN_TONES, type TwinLook } from '../twin';

export interface TwinAvatarProps {
  look: TwinLook;
  /** 0 (slimmest drawn) to 1 (fullest drawn); see `fullness()`. */
  fullness: number;
  height: number;
  /** Omit when a labelled parent describes the twin. */
  accessibilityLabel?: string;
  /** Faded, for locked or projected frames. */
  muted?: boolean;
}

function render(shape: Shape, key: number) {
  switch (shape.kind) {
    case 'circle':
      return <Circle key={key} {...shape} />;
    case 'ellipse':
      return <Ellipse key={key} {...shape} />;
    case 'line':
      return (
        <Line
          key={key}
          x1={shape.x1}
          y1={shape.y1}
          x2={shape.x2}
          y2={shape.y2}
          stroke={shape.stroke}
          strokeWidth={shape.width}
          strokeLinecap="round"
        />
      );
    case 'path':
      return (
        <Path
          key={key}
          d={shape.d}
          fill={shape.fill ?? 'none'}
          stroke={shape.stroke}
          strokeWidth={shape.width}
          strokeLinecap="round"
        />
      );
  }
}

/** A friendly cartoon figure whose build follows the user's body-fat estimate. */
export function TwinAvatar({ look, fullness, height, accessibilityLabel, muted }: TwinAvatarProps) {
  const { colors } = useTheme();
  const shapes = twinShapes(look.variant, fullness, {
    background: colors.accent,
    skin: SKIN_TONES[look.skin] ?? SKIN_TONES[1]!,
    hair: HAIR_COLOURS[look.hair] ?? HAIR_COLOURS[1]!,
    shirt: colors.primary,
  });
  return (
    <Svg
      width={(height * 200) / 300}
      height={height}
      viewBox="0 0 200 300"
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      accessibilityLabel={accessibilityLabel}
      opacity={muted ? 0.55 : 1}
    >
      {shapes.map(render)}
    </Svg>
  );
}
