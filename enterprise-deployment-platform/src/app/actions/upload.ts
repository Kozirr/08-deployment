'use server';

import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/current-user';
import { audit } from '@/lib/audit/log';
import { actionError, type ActionResult } from './common';

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MIME_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

/**
 * Sniffs the magic bytes of a file buffer to confirm it's actually an image,
 * not a text file with an image extension. Mitigates MIME-spoofing attacks.
 */
function sniffImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif';
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'image/webp';
  return null;
}

async function persistUpload(
  buf: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    // Production path: Vercel Blob. Imported lazily so dev/CI builds without
    // the token don't pull the SDK into the edge bundle.
    const { put } = await import('@vercel/blob');
    const blob = await put(`playlist-covers/${filename}`, buf, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
    });
    return blob.url;
  }
  // Dev fallback: filesystem. Ephemeral on serverless — do not enable in production.
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buf);
  return `/uploads/${filename}`;
}

export async function uploadPlaylistCoverAction(
  playlistId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult<{ url: string }>> {
  try {
    const user = await requireUser();
    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) throw new Error('Playlist not found');
    if (playlist.ownerId !== user.id && user.role !== 'ADMIN') {
      throw new Error('Not authorized');
    }

    const file = form.get('file');
    if (!(file instanceof File)) throw new Error('No file uploaded');
    if (file.size === 0) throw new Error('Empty file');
    if (file.size > MAX_BYTES) throw new Error('File exceeds 2 MB limit');
    if (!ALLOWED_MIME.has(file.type)) throw new Error('Only PNG, JPEG, WebP, or GIF allowed');

    const buf = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffImageMime(buf);
    if (!sniffed || sniffed !== file.type) {
      throw new Error('File content does not match declared type');
    }

    const ext = MIME_EXT[sniffed] ?? '.bin';
    const filename = `${randomUUID()}${ext}`;
    const url = await persistUpload(buf, filename, sniffed);

    await audit({
      action: 'PLAYLIST_UPDATE',
      actorId: user.id,
      targetType: 'Playlist',
      targetId: playlistId,
      metadata: { kind: 'cover-upload', size: file.size, mime: sniffed },
    });

    revalidatePath(`/playlists/${playlistId}`);
    return { ok: true, data: { url } };
  } catch (err) {
    return actionError(err);
  }
}
