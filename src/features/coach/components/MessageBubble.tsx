import { View } from 'react-native';

import { Text } from '@/components';
import { ACCENTS } from '@/theme';

/** One chat message: the user's on the right in the brand gradient, the coach's on the left. */
export function MessageBubble({
  role,
  content,
  avatar,
  speaker,
}: {
  role: 'user' | 'assistant';
  content: string;
  avatar: string;
  speaker: string;
}) {
  const mine = role === 'user';
  return (
    <View
      accessible
      accessibilityLabel={`${speaker}: ${content}`}
      className={`mb-3 flex-row items-end gap-2 ${mine ? 'justify-end' : ''}`}
    >
      {!mine ? (
        <View className="h-8 w-8 items-center justify-center rounded-full bg-accent">
          <Text className="text-base leading-5">{avatar}</Text>
        </View>
      ) : null}
      <View
        // The user's bubble uses the darker amber (#B45309): white text on brand amber is only
        // ~2:1, below WCAG AA for body text.
        style={mine ? { backgroundColor: ACCENTS.amber.light } : undefined}
        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 ${mine ? 'rounded-br-md' : 'rounded-bl-md border border-border bg-card'}`}
      >
        <Text selectable className={`text-[15px] leading-[22px] ${mine ? 'text-white' : ''}`}>
          {content}
        </Text>
      </View>
    </View>
  );
}
