'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/current-user';
import { ChangePasswordSchema, UpdateProfileSchema } from '@/lib/validation/schemas';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { audit } from '@/lib/audit/log';
import { actionError, type ActionResult } from './common';

function str(form: FormData, key: string): string | undefined {
  const val = form.get(key);
  return typeof val === 'string' && val.length > 0 ? val : undefined;
}

export async function updateProfileAction(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult<{ updated: true }>> {
  try {
    const user = await requireUser();
    const input = UpdateProfileSchema.parse({
      displayName: str(form, 'displayName'),
      avatarColor: str(form, 'avatarColor'),
    });
    await prisma.user.update({ where: { id: user.id }, data: input });
    await audit({
      action: 'PROFILE_UPDATE',
      actorId: user.id,
      targetType: 'User',
      targetId: user.id,
      metadata: { changedFields: Object.keys(input) },
    });
    revalidatePath('/account');
    return { ok: true, data: { updated: true } };
  } catch (err) {
    return actionError(err);
  }
}

export async function changePasswordAction(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult<{ updated: true }>> {
  try {
    const user = await requireUser();
    const input = ChangePasswordSchema.parse({
      currentPassword: form.get('currentPassword'),
      newPassword: form.get('newPassword'),
    });
    const record = await prisma.user.findUnique({ where: { id: user.id } });
    if (!record) throw new Error('User not found');
    const valid = await verifyPassword(input.currentPassword, record.passwordHash);
    if (!valid) return { ok: false, error: 'Current password is incorrect' };

    const newHash = await hashPassword(input.newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });

    // Revoke all other sessions on password change
    await prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await audit({
      action: 'PASSWORD_CHANGE',
      actorId: user.id,
      targetType: 'User',
      targetId: user.id,
    });
    return { ok: true, data: { updated: true } };
  } catch (err) {
    return actionError(err);
  }
}
