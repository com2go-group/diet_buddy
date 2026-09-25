import { DateField, type DateParts } from '@/components';
import { t } from '@/i18n';

export type BirthDateValue = DateParts;

export interface BirthDateFieldProps {
  value: DateParts;
  onChange: (value: DateParts) => void;
  onBlur?: () => void;
  error?: string;
}

export function BirthDateField(props: BirthDateFieldProps) {
  return <DateField label={t('auth.birthDate')} hint={t('auth.birthDateHint')} {...props} />;
}
