import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { cn } from './cn';

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  className?: string;
  contentClassName?: string;
}

/** Page container: safe area, themed background, 20px horizontal padding. */
export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  className,
  contentClassName,
}: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      contentContainerClassName={cn('px-5 pb-10', contentClassName)}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View className={cn('flex-1 px-5', contentClassName)}>{children}</View>
  );
  return (
    <SafeAreaView edges={edges} className={cn('flex-1 bg-background', className)}>
      {content}
    </SafeAreaView>
  );
}
