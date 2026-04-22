import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/current-user';
import { PlaybackStartSchema } from '@/lib/validation/schemas';
import {
  NotFoundError,
  PaymentRequiredError,
  handleRoute,
  ok,
} from '@/lib/api/errors';
import { canPlayTrack } from '@/lib/entitlements';
import { audit } from '@/lib/audit/log';
import { getClientIp, getUserAgent } from '@/lib/api/request';

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requireUser();
  const body = PlaybackStartSchema.parse(await req.json());

  const track = await prisma.track.findUnique({
    where: { id: body.trackId },
    include: { album: true, artist: true },
  });
  if (!track) throw new NotFoundError('Track not found');

  const gate = canPlayTrack(user, track);
  if (!gate.allowed) {
    await audit({
      action: 'PLAY_DENIED',
      actorId: user.id,
      targetType: 'Track',
      targetId: track.id,
      metadata: { reason: gate.reason },
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });
    throw new PaymentRequiredError(gate.reason ?? 'Premium required');
  }

  const [playEvent] = await prisma.$transaction([
    prisma.playEvent.create({
      data: {
        userId: user.id,
        trackId: track.id,
        deviceId: body.deviceId,
        source: body.source,
      },
    }),
    prisma.track.update({ where: { id: track.id }, data: { plays: { increment: 1 } } }),
  ]);

  await audit({
    action: 'PLAY_START',
    actorId: user.id,
    targetType: 'Track',
    targetId: track.id,
    metadata: { source: body.source },
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  return ok({
    playEventId: playEvent.id,
    track: {
      id: track.id,
      title: track.title,
      durationSeconds: track.durationSeconds,
      album: track.album.title,
      artist: track.artist.name,
      premiumOnly: track.premiumOnly,
    },
  });
});
