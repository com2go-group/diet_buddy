import { useState } from 'react';

import { TextField, type TextFieldProps } from './TextField';
import { Text } from './Text';

export interface NumberFieldProps extends Omit<TextFieldProps, 'value' | 'onChangeText'> {
  value: number | null;
  onChangeValue: (value: number | null) => void;
  unit?: string;
  decimals?: number;
}

const format = (value: number | null, decimals: number) =>
  value === null ? '' : String(Number(value.toFixed(decimals)));

/**
 * Numeric input with a unit label. Keeps the typed text while editing (so "72." isn't reformatted)
 * and reports the parsed number, or null when empty or invalid. Accepts "," as the decimal mark.
 */
export function NumberField({
  value,
  onChangeValue,
  unit,
  decimals = 1,
  ...props
}: NumberFieldProps) {
  const [state, setState] = useState({ text: format(value, decimals), value });

  // Follow outside changes (e.g. switching units) without clobbering what is being typed:
  // adjusting state during render is React's recommended alternative to an effect here.
  if (value !== state.value) {
    setState({ text: format(value, decimals), value });
  }

  return (
    <TextField
      {...props}
      value={state.text}
      keyboardType="decimal-pad"
      onChangeText={(input) => {
        const cleaned = input.replace(/[^\d.,]/g, '');
        const parsed = Number(cleaned.replace(',', '.'));
        const next = cleaned === '' || Number.isNaN(parsed) ? null : parsed;
        setState({ text: cleaned, value: next });
        onChangeValue(next);
      }}
      trailing={
        unit ? (
          <Text tone="muted" className="pr-4 font-semibold">
            {unit}
          </Text>
        ) : undefined
      }
    />
  );
}
