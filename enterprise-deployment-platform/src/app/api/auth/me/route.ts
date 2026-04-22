import { requireUser } from '@/lib/auth/current-user';
import { handleRoute, ok } from '@/lib/api/errors';

export const GET = handleRoute(async () => {
  const user = await requireUser();
  return ok({ user });
});
