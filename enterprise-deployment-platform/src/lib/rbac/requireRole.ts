import type { CurrentUser } from '@/types/music';
import { ForbiddenError } from '@/lib/api/errors';
import type { UserRole } from '@/lib/validation/enums';

export function requireRole(user: CurrentUser, roles: UserRole[]): void {
  if (!roles.includes(user.role)) {
    throw new ForbiddenError(`Requires role: ${roles.join(', ')}`);
  }
}

export function hasRole(user: CurrentUser | null, roles: UserRole[]): boolean {
  return !!user && roles.includes(user.role);
}
