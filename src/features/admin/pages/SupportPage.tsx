import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, EmptyState, SegmentedControl, Text, TextField } from '@/components';
import { t } from '@/i18n';

import { FormMessage } from '../../auth/components/FormMessage';
import { listTickets, replyTicket, type TicketRow } from '../api';
import { PageTitle, QueryState, errorText, formatDateTime } from './common';

function Ticket({ ticket }: { ticket: TicketRow }) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState(ticket.reply ?? '');
  const send = useMutation({
    mutationFn: (status: 'answered' | 'closed') => replyTicket(ticket.id, reply, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });
  return (
    <Card className="gap-2">
      <Text className="font-bold">{ticket.subject}</Text>
      <Text variant="caption" tone="muted">
        {t('admin.supportFrom', {
          email: ticket.email ?? '—',
          date: formatDateTime(ticket.created_at),
        })}
      </Text>
      <Text selectable>{ticket.message}</Text>
      <TextField
        label={t('admin.supportReply')}
        value={reply}
        onChangeText={setReply}
        multiline
        maxLength={4000}
        style={{ minHeight: 90, textAlignVertical: 'top' }}
      />
      <FormMessage message={send.isError ? errorText(send.error) : undefined} />
      <View className="flex-row flex-wrap gap-2">
        <Button
          label={t('admin.supportSendReply')}
          size="md"
          disabled={!reply.trim()}
          loading={send.isPending && send.variables === 'answered'}
          onPress={() => send.mutate('answered')}
        />
        <Button
          label={t('admin.supportClose')}
          size="md"
          variant="outline"
          loading={send.isPending && send.variables === 'closed'}
          onPress={() => send.mutate('closed')}
        />
      </View>
    </Card>
  );
}

export function SupportPage() {
  const [status, setStatus] = useState<'open' | 'answered' | 'closed'>('open');
  const tickets = useQuery({
    queryKey: ['admin', 'tickets', status],
    queryFn: () => listTickets(status),
  });
  return (
    <>
      <PageTitle>{t('admin.nav_support')}</PageTitle>
      <SegmentedControl
        accessibilityLabel={t('admin.nav_support')}
        options={[
          { value: 'open', label: t('admin.supportOpen') },
          { value: 'answered', label: t('admin.supportAnswered') },
          { value: 'closed', label: t('admin.supportClosed') },
        ]}
        value={status}
        onChange={setStatus}
      />
      <QueryState query={tickets}>
        {(rows) =>
          rows.length ? (
            rows.map((r) => <Ticket key={r.id} ticket={r} />)
          ) : (
            <EmptyState emoji="📭" title={t('admin.supportEmpty')} />
          )
        }
      </QueryState>
    </>
  );
}
