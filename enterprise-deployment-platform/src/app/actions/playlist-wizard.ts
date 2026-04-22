'use server';

import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath, updateTag } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/current-user';
import { audit } from '@/lib/audit/log';
import { CreatePlaylistSchema } from '@/lib/validation/schemas';
import { actionError, type ActionResult } from './common';

const COOKIE = 'sp_pl_wizard';
const MAX_AGE = 60 * 60; // 1 hour

const WIZARD_STEPS = ['basics', 'appearance', 'tracks'] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const DraftSchema = z.object({
  userId: z.string().min(1),
  step: z.enum(WIZARD_STEPS),
  title: z.string().max(80).optional(),
  description: z.string().max(300).optional(),
  coverFromColor: hexColor.optional(),
  coverToColor: hexColor.optional(),
  isPublic: z.boolean().optional(),
  initialTrackIds: z.array(z.string()).max(50).optional(),
});
export type WizardDraft = z.infer<typeof DraftSchema>;

function signingSecret(): string {
  return process.env.JWT_ACCESS_SECRET ?? 'dev-only-fallback-secret-change-me';
}

function sign(payload: string): string {
  return createHmac('sha256', signingSecret()).update(payload).digest('base64url');
}

function encodeDraft(draft: WizardDraft): string {
  const payload = Buffer.from(JSON.stringify(draft)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function decodeDraft(raw: string | undefined): WizardDraft | null {
  if (!raw) return null;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return DraftSchema.parse(json);
  } catch {
    return null;
  }
}

export async function getWizardDraft(): Promise<WizardDraft | null> {
  const user = await requireUser();
  const jar = await cookies();
  const draft = decodeDraft(jar.get(COOKIE)?.value);
  if (!draft || draft.userId !== user.id) return null;
  return draft;
}

async function writeDraft(draft: WizardDraft): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, encodeDraft(draft), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  });
}

async function eraseDraft(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function saveWizardStepAction(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult<{ step: WizardStep; nextStep: WizardStep | null }>> {
  try {
    const user = await requireUser();
    const step = form.get('step');
    if (typeof step !== 'string' || !WIZARD_STEPS.includes(step as WizardStep)) {
      throw new Error('Invalid step');
    }
    const jar = await cookies();
    const current = decodeDraft(jar.get(COOKIE)?.value);
    const base: WizardDraft =
      current && current.userId === user.id
        ? current
        : { userId: user.id, step: 'basics' };

    const patch: Partial<WizardDraft> = {};
    if (step === 'basics') {
      const title = (form.get('title') ?? '').toString().trim();
      const description = (form.get('description') ?? '').toString();
      if (title.length < 1) throw new Error('Title is required');
      if (title.length > 80) throw new Error('Title too long');
      if (description.length > 300) throw new Error('Description too long');
      patch.title = title;
      patch.description = description;
    } else if (step === 'appearance') {
      const from = (form.get('coverFromColor') ?? '').toString();
      const to = (form.get('coverToColor') ?? '').toString();
      const isPublic = form.get('isPublic') === 'on' || form.get('isPublic') === 'true';
      patch.coverFromColor = hexColor.parse(from);
      patch.coverToColor = hexColor.parse(to);
      patch.isPublic = isPublic;
    } else if (step === 'tracks') {
      const ids = form.getAll('trackIds').map((v) => v.toString()).filter(Boolean);
      patch.initialTrackIds = ids.slice(0, 50);
    }

    const nextIdx = WIZARD_STEPS.indexOf(step as WizardStep) + 1;
    const nextStep = (WIZARD_STEPS[nextIdx] as WizardStep | undefined) ?? null;
    const merged: WizardDraft = { ...base, ...patch, step: nextStep ?? (step as WizardStep) };

    await writeDraft(merged);
    return { ok: true, data: { step: step as WizardStep, nextStep } };
  } catch (err) {
    return actionError(err);
  }
}

export async function cancelWizardAction(): Promise<ActionResult<{ cleared: true }>> {
  try {
    await requireUser();
    await eraseDraft();
    return { ok: true, data: { cleared: true } };
  } catch (err) {
    return actionError(err);
  }
}

export async function finishWizardAction(
  _prev: ActionResult | null,
  _form: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const jar = await cookies();
    const draft = decodeDraft(jar.get(COOKIE)?.value);
    if (!draft || draft.userId !== user.id) {
      throw new Error('No draft in progress');
    }
    const input = CreatePlaylistSchema.parse({
      title: draft.title ?? '',
      description: draft.description ?? '',
      coverFromColor: draft.coverFromColor ?? '#1db954',
      coverToColor: draft.coverToColor ?? '#0d5f28',
      isPublic: draft.isPublic ?? true,
    });

    const playlist = await prisma.playlist.create({
      data: { ...input, ownerId: user.id },
    });

    const trackIds = draft.initialTrackIds ?? [];
    if (trackIds.length > 0) {
      await prisma.playlistTrack.createMany({
        data: trackIds.map((trackId, position) => ({
          playlistId: playlist.id,
          trackId,
          position,
        })),
      });
    }

    await audit({
      action: 'PLAYLIST_CREATE',
      actorId: user.id,
      targetType: 'Playlist',
      targetId: playlist.id,
      metadata: { source: 'wizard', initialTracks: trackIds.length },
    });

    await eraseDraft();
    updateTag('playlists');
    revalidatePath('/library');
    revalidatePath('/dashboard');
    redirect(`/playlists/${playlist.id}`);
  } catch (err) {
    // redirect() throws a special error Next re-throws — let it propagate
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return actionError(err);
  }
}
