import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { ErrorState, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';

import { AdminError } from '../api';

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <Text variant="title" accessibilityRole="header" className="text-2xl">
      {children}
    </Text>
  );
}

/** Loading and error states shared by every admin page. */
export function QueryState<T>({
  query,
  children,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <SkeletonCard lines={4} />;
  if (query.isError) {
    return <ErrorState message={t('admin.loadFailed')} onRetry={() => query.refetch()} />;
  }
  return <>{children(query.data)}</>;
}

export const errorText = (e: unknown) =>
  t('admin.actionFailed', { reason: e instanceof AdminError ? e.message : 'error' });

export const formatDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : t('admin.userNever');
