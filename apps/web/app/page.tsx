import LandingContent from '../src/components/landing/LandingContent';
import { getSessionUser } from '../src/lib/auth/getSessionUser';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getSessionUser();
  return <LandingContent initialIsLoggedIn={Boolean(user)} />;
}
