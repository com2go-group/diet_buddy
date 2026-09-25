import { Redirect } from 'expo-router';

import { useSessionStore } from '@/features/auth';

/** Entry point: sends the user to the right place for their auth state. */
export default function Index() {
  const { session, recovering } = useSessionStore();
  if (!session) return <Redirect href="/welcome" />;
  if (recovering) return <Redirect href="/new-password" />;
  return <Redirect href="/home" />;
}
