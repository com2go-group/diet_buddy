import { optional, supabase, type Tables } from '@/lib/supabase';

export type Ticket = Pick<
  Tables<'support_tickets'>,
  'id' | 'subject' | 'message' | 'status' | 'reply' | 'created_at'
>;

export async function loadFaq(): Promise<{ question: string; answer: string }[]> {
  return (
    optional(
      await supabase
        .from('faq_entries')
        .select('question, answer')
        .order('sort')
        .order('created_at'),
    ) ?? []
  );
}

export async function loadTickets(userId: string): Promise<Ticket[]> {
  return (
    optional(
      await supabase
        .from('support_tickets')
        .select('id, subject, message, status, reply, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
    ) ?? []
  );
}

export async function sendTicket(subject: string, message: string): Promise<void> {
  optional(await supabase.from('support_tickets').insert({ subject, message }));
}
