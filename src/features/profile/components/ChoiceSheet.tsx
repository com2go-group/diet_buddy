import { View } from 'react-native';

import { SelectCard, Sheet } from '@/components';

/** A sheet with a single-choice list (theme, units). */
export function ChoiceSheet<T extends string>({
  title,
  visible,
  value,
  options,
  onChoose,
  onClose,
}: {
  title: string;
  visible: boolean;
  value: T;
  options: { value: T; label: string }[];
  onChoose: (value: T) => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View accessibilityRole="radiogroup" accessibilityLabel={title} className="gap-2 pb-2">
        {options.map((o) => (
          <SelectCard
            key={o.value}
            title={o.label}
            selected={o.value === value}
            selectionRole="radio"
            onPress={() => {
              onChoose(o.value);
              onClose();
            }}
          />
        ))}
      </View>
    </Sheet>
  );
}
