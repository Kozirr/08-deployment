'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/current-user';
import {
  AddPlaylistTrackSchema,
  CreatePlaylistSchema,
  ReorderPlaylistSchema,
  UpdatePlaylistSchema,
} from '@/lib/validation/schemas';
import { audit } from '@/lib/audit/log';
import { actionError, type ActionResult } from './common';

function str(form: FormData, key: string): string | undefined {
  const val = form.get(key);
  return typeof val === 'string' && val.length > 0 ? val : undefined;
}

function bool(form: FormData, key: string): boolean | undefined {
  if (!form.has(key)) return undefined;
  const val = form.get(key);
  return val === 'on' || val === 'true';
}

export async function createPlaylistAction(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const input = CreatePlaylistSchema.parse({
      title: str(form, 'title') ?? '',
      description: str(form, 'description') ?? '',
      coverFromColor: str(form, 'coverFromColor') ?? '#1db954',
      coverToColor: str(form, 'coverToColor') ?? '#0d5f28',
      isPublic: bool(form, 'isPublic') ?? true,
    });
    const playlist = await prisma.playlist.create({
      data: { ...input, ownerId: user.id },
    });
    await audit({
      action: 'PLAYLIST_CREATE',
      actorId: user.id,
      targetType: 'Playlist',
      targetId: playlist.id,
    });
    updateTag('playlists');
    revalidatePath('/library');
    revalidatePath('/dashboard');

    const redirectNow = form.get('_redirect');
    if (typeof redirectNow === 'string' && redirectNow) {
      redirect(redirectNow.replace(':id', playlist.id));
    }
    return { ok: true, data: { id: playlist.id } };
  } catch (err) {
    return actionError(err);
  }
}

export async function updatePlaylistAction(
  playlistId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const input = UpdatePlaylistSchema.parse({
      title: str(form, 'title'),
      description: str(form, 'description'),
      coverFromColor: str(form, 'coverFromColor'),
      coverToColor: str(form, 'coverToColor'),
      isPublic: bool(form, 'isPublic'),
    });
    const existing = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!existing) throw new Error('Playlist not found');
    if (existing.ownerId !== user.id && user.role !== 'ADMIN') {
      throw new Error('Not authorized to edit this playlist');
    }
    await prisma.playlist.update({ where: { id: playlistId }, data: input });
    await audit({
      action: 'PLAYLIST_UPDATE',
      actorId: user.id,
      targetType: 'Playlist',
      targetId: playlistId,
      metadata: { changedFields: Object.keys(input) },
    });
    updateTag('playlists');
    revalidatePath(`/playlists/${playlistId}`);
    revalidatePath('/library');
    return { ok: true, data: { id: playlistId } };
  } catch (err) {
    return actionError(err);
  }
}

export async function deletePlaylistAction(
  playlistId: string,
): Promise<ActionResult<{ deleted: true }>> {
  try {
    const user = await requireUser();
    const existing = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!existing) throw new Error('Playlist not found');
    if (existing.ownerId !== user.id && user.role !== 'ADMIN') {
      throw new Error('Not authorized to delete this playlist');
    }
    await prisma.playlist.delete({ where: { id: playlistId } });
    await audit({
      action: 'PLAYLIST_DELETE',
      actorId: user.id,
      targetType: 'Playlist',
      targetId: playlistId,
    });
    updateTag('playlists');
    revalidatePath('/library');
    revalidatePath('/dashboard');
    return { ok: true, data: { deleted: true } };
  } catch (err) {
    return actionError(err);
  }
}

export async function addTrackToPlaylistAction(
  playlistId: string,
  trackId: string,
): Promise<ActionResult<{ added: true }>> {
  try {
    const user = await requireUser();
    const input = AddPlaylistTrackSchema.parse({ trackId });
    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) throw new Error('Playlist not found');
    if (playlist.ownerId !== user.id && user.role !== 'ADMIN') {
      throw new Error('Not authorized');
    }
    const position = await prisma.playlistTrack.count({ where: { playlistId } });
    await prisma.playlistTrack.create({
      data: { playlistId, trackId: input.trackId, position },
    });
    await prisma.playlist.update({ where: { id: playlistId }, data: { updatedAt: new Date() } });
    await audit({
      action: 'PLAYLIST_ADD_TRACK',
      actorId: user.id,
      targetType: 'Playlist',
      targetId: playlistId,
      metadata: { trackId: input.trackId },
    });
    revalidatePath(`/playlists/${playlistId}`);
    return { ok: true, data: { added: true } };
  } catch (err) {
    return actionError(err);
  }
}

export async function reorderPlaylistTracksAction(
  playlistId: string,
  trackIds: string[],
): Promise<ActionResult<{ reordered: true }>> {
  try {
    const user = await requireUser();
    const input = ReorderPlaylistSchema.parse({ trackIds });
    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) throw new Error('Playlist not found');
    if (playlist.ownerId !== user.id && user.role !== 'ADMIN') {
      throw new Error('Not authorized');
    }
    await prisma.$transaction(
      input.trackIds.map((trackId, position) =>
        prisma.playlistTrack.update({
          where: { playlistId_trackId: { playlistId, trackId } },
          data: { position },
        }),
      ),
    );
    await prisma.playlist.update({ where: { id: playlistId }, data: { updatedAt: new Date() } });
    revalidatePath(`/playlists/${playlistId}`);
    return { ok: true, data: { reordered: true } };
  } catch (err) {
    return actionError(err);
  }
}
