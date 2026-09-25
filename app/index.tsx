import { Redirect } from 'expo-router';

import { useAppRoute } from '@/features/account';

const destinations = {
  welcome: '/welcome',
  'new-password': '/new-password',
  onboarding: '/onboarding',
  home: '/home',
} as const;

/** Entry point: sends the user to the right place for their auth and onboarding state. */
export default function Index() {
  const { route } = useAppRoute();
  if (route === 'loading' || route === 'error') return null;
  return <Redirect href={destinations[route]} />;
}
