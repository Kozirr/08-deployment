/**
 * Seeds Tempo with a realistic music catalog + demo accounts.
 *
 * Demo users: passwords are generated at seed time.
 *   user@demo.test   → USER, PREMIUM (active)
 *   artist@demo.test → ARTIST, FREE
 *   admin@demo.test  → ADMIN, FAMILY
 *
 * Development (NODE_ENV=development): a fixed developer password is used for
 * repeatable local QA. Any other environment: random per-user passwords are
 * printed to stdout once — capture them on first seed or re-seed.
 *
 * The seeder refuses to run in non-development environments unless
 * ALLOW_SEED=true is set, to prevent accidental wipes of staging/production.
 *
 * Catalog: 6 artists, 12 albums, 60+ tracks (10 marked premiumOnly), 4 curated playlists,
 * 25 play events over the last 14 days, 8 likes, 3 follows, ~5 seed audit log entries.
 */

import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Catalog seed (mirrors React/05/05-styling/src/lib/mock-data.ts, expanded) ──

type SeedTrack = { title: string; duration: number; plays?: number; explicit?: boolean; premiumOnly?: boolean };
type SeedAlbum = { key: string; title: string; year: number; coverColor: string; coverAccent: string; tracks: SeedTrack[] };
type SeedArtist = {
  key: string;
  name: string;
  imageColor: string;
  monthlyListeners: number;
  bio: string;
  verified?: boolean;
  albums: SeedAlbum[];
};

const ARTISTS: SeedArtist[] = [
  {
    key: 'nova-waves',
    name: 'Nova Waves',
    imageColor: '#1e3a8a',
    monthlyListeners: 6_214_902,
    verified: true,
    bio: 'Synth-drenched four-piece exploring the hours between midnight and sunrise.',
    albums: [
      {
        key: 'midnight-frequencies',
        title: 'Midnight Frequencies',
        year: 2024,
        coverColor: '#1e3a8a',
        coverAccent: '#60a5fa',
        tracks: [
          { title: 'Signal', duration: 214, plays: 14_900_123 },
          { title: 'Harbor Lights', duration: 198, plays: 8_102_500 },
          { title: 'Static Skies', duration: 247, plays: 3_551_000, premiumOnly: true },
          { title: 'Night Window', duration: 231, plays: 2_210_900 },
          { title: 'Transmission', duration: 201, plays: 1_840_000 },
        ],
      },
      {
        key: 'low-orbit',
        title: 'Low Orbit',
        year: 2024,
        coverColor: '#0f172a',
        coverAccent: '#38bdf8',
        tracks: [
          { title: 'Apogee', duration: 245, plays: 4_102_900, premiumOnly: true },
          { title: 'Perigee', duration: 198, plays: 2_912_400 },
          { title: 'Vector', duration: 228, plays: 1_200_000 },
          { title: 'Uplink', duration: 209, plays: 980_000 },
        ],
      },
    ],
  },
  {
    key: 'kite-canyon',
    name: 'Kite Canyon',
    imageColor: '#c2410c',
    monthlyListeners: 2_008_441,
    verified: true,
    bio: 'Sun-baked folk-rock with a knack for road-trip choruses.',
    albums: [
      {
        key: 'analog-summer',
        title: 'Analog Summer',
        year: 2023,
        coverColor: '#c2410c',
        coverAccent: '#fde68a',
        tracks: [
          { title: 'Polaroid Road', duration: 192, plays: 8_210_000 },
          { title: 'Tangerine', duration: 205, plays: 5_610_000 },
          { title: 'Burnt Sugar', duration: 231, plays: 3_104_000 },
          { title: 'Canyon Run', duration: 218, plays: 1_823_000 },
          { title: 'Mile Marker', duration: 201, plays: 1_402_000, premiumOnly: true },
        ],
      },
      {
        key: 'wildflower',
        title: 'Wildflower',
        year: 2021,
        coverColor: '#9a3412',
        coverAccent: '#fed7aa',
        tracks: [
          { title: 'Hawthorn', duration: 239, plays: 612_000 },
          { title: 'Blue Gum', duration: 184, plays: 401_000 },
          { title: 'Foxglove', duration: 267, plays: 342_000 },
        ],
      },
    ],
  },
  {
    key: 'hana-lin',
    name: 'Hana Lin',
    imageColor: '#065f46',
    monthlyListeners: 812_334,
    bio: 'Minimalist composer building cathedrals out of negative space.',
    albums: [
      {
        key: 'quiet-architecture',
        title: 'Quiet Architecture',
        year: 2025,
        coverColor: '#065f46',
        coverAccent: '#a7f3d0',
        tracks: [
          { title: 'Atrium', duration: 267, plays: 1_210_000 },
          { title: 'Threshold', duration: 184, plays: 890_000 },
          { title: 'Cantilever', duration: 311, plays: 562_000, premiumOnly: true },
          { title: 'Lattice', duration: 228, plays: 401_000 },
          { title: 'Clerestory', duration: 298, plays: 312_000, premiumOnly: true },
        ],
      },
      {
        key: 'snowfield',
        title: 'Snowfield',
        year: 2022,
        coverColor: '#0369a1',
        coverAccent: '#bae6fd',
        tracks: [
          { title: 'Drift', duration: 256, plays: 203_000 },
          { title: 'Cornice', duration: 202, plays: 151_000 },
        ],
      },
    ],
  },
  {
    key: 'gulf-static',
    name: 'Gulf Static',
    imageColor: '#4c1d95',
    monthlyListeners: 1_405_222,
    bio: 'Shoegaze haze crossed with dub basslines, recorded entirely in a Galveston garage.',
    albums: [
      {
        key: 'heavy-weather',
        title: 'Heavy Weather',
        year: 2022,
        coverColor: '#4c1d95',
        coverAccent: '#f0abfc',
        tracks: [
          { title: 'Downpour', duration: 223, plays: 912_000 },
          { title: 'Sea Change', duration: 256, plays: 781_000, premiumOnly: true },
          { title: 'Squall Line', duration: 189, plays: 602_000, explicit: true },
          { title: 'Barometer', duration: 240, plays: 450_000 },
        ],
      },
    ],
  },
  {
    key: 'astra-cruz',
    name: 'Astra Cruz',
    imageColor: '#0f172a',
    monthlyListeners: 1_812_009,
    bio: 'Mexico City producer turning analog synths into outer-space choirs.',
    albums: [
      {
        key: 'noctilucent',
        title: 'Noctilucent',
        year: 2025,
        coverColor: '#312e81',
        coverAccent: '#c4b5fd',
        tracks: [
          { title: 'Mesosphere', duration: 218, plays: 1_012_000 },
          { title: 'Halo', duration: 196, plays: 802_000, premiumOnly: true },
          { title: 'Drift Net', duration: 245, plays: 560_000 },
          { title: 'Aurora', duration: 280, plays: 445_000 },
        ],
      },
    ],
  },
  {
    key: 'lumen-bay',
    name: 'Lumen Bay',
    imageColor: '#be185d',
    monthlyListeners: 644_118,
    bio: 'Coastal dream-pop siblings with a library of tape loops and saltwater amps.',
    albums: [
      {
        key: 'warm-current',
        title: 'Warm Current',
        year: 2023,
        coverColor: '#be185d',
        coverAccent: '#fda4af',
        tracks: [
          { title: 'Sandbar', duration: 186, plays: 380_000 },
          { title: 'Tidewater', duration: 219, plays: 299_000 },
          { title: 'Estuary', duration: 234, plays: 241_000 },
          { title: 'Floodmark', duration: 201, plays: 201_000, premiumOnly: true },
          { title: 'Jetty', duration: 188, plays: 178_000 },
        ],
      },
      {
        key: 'lowlight',
        title: 'Lowlight',
        year: 2020,
        coverColor: '#831843',
        coverAccent: '#fbcfe8',
        tracks: [
          { title: 'Gloaming', duration: 241, plays: 120_000 },
          { title: 'Veil', duration: 212, plays: 98_000 },
        ],
      },
    ],
  },
];

const DEV_FIXED_PASSWORD = 'Password123!';
const IS_DEV = process.env.NODE_ENV === 'development';
const SEED_ALLOWED = IS_DEV || process.env.ALLOW_SEED === 'true';

function generatePassword(): string {
  return randomBytes(18).toString('base64url');
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function main() {
  if (!SEED_ALLOWED) {
    console.error(
      '✗ Seed refused: non-development environment without ALLOW_SEED=true. ' +
        `Detected NODE_ENV="${process.env.NODE_ENV ?? 'undefined'}". ` +
        'Set ALLOW_SEED=true to confirm a wipe-and-seed.',
    );
    process.exit(1);
  }

  console.log('🌱 Seeding…');

  // Wipe existing data (idempotent re-seeds)
  await prisma.auditLog.deleteMany();
  await prisma.playEvent.deleteMany();
  await prisma.playlistTrack.deleteMany();
  await prisma.playlist.deleteMany();
  await prisma.like.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.session.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.track.deleteMany();
  await prisma.album.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.user.deleteMany();

  // ─── Users ──────────────────────────────────────────────────────────────────
  const userPassword = IS_DEV ? DEV_FIXED_PASSWORD : generatePassword();
  const artistPassword = IS_DEV ? DEV_FIXED_PASSWORD : generatePassword();
  const adminPassword = IS_DEV ? DEV_FIXED_PASSWORD : generatePassword();

  const [userHash, artistHash, adminHash] = await Promise.all([
    hash(userPassword, 12),
    hash(artistPassword, 12),
    hash(adminPassword, 12),
  ]);

  const userUser = await prisma.user.create({
    data: {
      email: 'user@demo.test',
      passwordHash: userHash,
      displayName: 'Riley',
      role: 'USER',
      avatarColor: '#1db954',
      subscription: {
        create: {
          tier: 'PREMIUM',
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });
  const artistUser = await prisma.user.create({
    data: {
      email: 'artist@demo.test',
      passwordHash: artistHash,
      displayName: 'Nova Waves',
      role: 'ARTIST',
      avatarColor: '#1e3a8a',
      subscription: { create: { tier: 'FREE', status: 'ACTIVE', currentPeriodEnd: null } },
    },
  });
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@demo.test',
      passwordHash: adminHash,
      displayName: 'Admin',
      role: 'ADMIN',
      avatarColor: '#ef4444',
      subscription: {
        create: {
          tier: 'FAMILY',
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  // ─── Artists + Albums + Tracks ──────────────────────────────────────────────
  const artistIdByKey: Record<string, string> = {};
  const trackIds: string[] = [];

  for (const a of ARTISTS) {
    const artist = await prisma.artist.create({
      data: {
        name: a.name,
        bio: a.bio,
        imageColor: a.imageColor,
        monthlyListeners: a.monthlyListeners,
        verified: a.verified ?? false,
        ownerUserId: a.key === 'nova-waves' ? artistUser.id : null,
      },
    });
    artistIdByKey[a.key] = artist.id;

    for (const al of a.albums) {
      const album = await prisma.album.create({
        data: {
          title: al.title,
          year: al.year,
          coverColor: al.coverColor,
          coverAccent: al.coverAccent,
          artistId: artist.id,
        },
      });
      for (const t of al.tracks) {
        const track = await prisma.track.create({
          data: {
            title: t.title,
            durationSeconds: t.duration,
            plays: t.plays ?? 0,
            explicit: t.explicit ?? false,
            premiumOnly: t.premiumOnly ?? false,
            albumId: album.id,
            artistId: artist.id,
          },
        });
        trackIds.push(track.id);
      }
    }
  }

  console.log(`  ✓ ${trackIds.length} tracks across ${Object.keys(artistIdByKey).length} artists`);

  // ─── Playlists ──────────────────────────────────────────────────────────────
  const playlistSpecs = [
    {
      title: 'Daily Mix 1',
      description: 'Nova Waves, Hana Lin, Kite Canyon and more — curated for you.',
      coverFrom: '#1db954',
      coverTo: '#0d5f28',
      trackIds: trackIds.slice(0, 8),
    },
    {
      title: 'Deep Focus',
      description: 'Keep calm and carry on shipping. Ambient selections to lock you in.',
      coverFrom: '#0f172a',
      coverTo: '#38bdf8',
      trackIds: shuffle(trackIds).slice(0, 10),
    },
    {
      title: 'Indie Gold',
      description: 'The week in independent music. Refreshed every Friday.',
      coverFrom: '#be185d',
      coverTo: '#fda4af',
      trackIds: shuffle(trackIds).slice(0, 12),
    },
    {
      title: 'Long Drive',
      description: 'Miles-wide choruses for the open road.',
      coverFrom: '#c2410c',
      coverTo: '#fde68a',
      trackIds: shuffle(trackIds).slice(0, 9),
    },
  ];

  for (const p of playlistSpecs) {
    const playlist = await prisma.playlist.create({
      data: {
        ownerId: userUser.id,
        title: p.title,
        description: p.description,
        coverFromColor: p.coverFrom,
        coverToColor: p.coverTo,
        isPublic: true,
      },
    });
    await prisma.playlistTrack.createMany({
      data: p.trackIds.map((trackId, position) => ({
        playlistId: playlist.id,
        trackId,
        position,
      })),
    });
  }

  // ─── Likes (8) ──────────────────────────────────────────────────────────────
  const likedIds = shuffle(trackIds).slice(0, 8);
  await prisma.like.createMany({
    data: likedIds.map((trackId) => ({ userId: userUser.id, trackId })),
  });

  // ─── Follows (3) ────────────────────────────────────────────────────────────
  const followKeys = ['nova-waves', 'hana-lin', 'astra-cruz'];
  await prisma.follow.createMany({
    data: followKeys.map((k) => ({ userId: userUser.id, artistId: artistIdByKey[k] })),
  });

  // ─── PlayEvents (25 over last 14 days) ──────────────────────────────────────
  const now = Date.now();
  for (let i = 0; i < 25; i++) {
    const daysAgo = Math.random() * 14;
    const startedAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
    const trackId = trackIds[Math.floor(Math.random() * trackIds.length)];
    await prisma.playEvent.create({
      data: {
        userId: userUser.id,
        trackId,
        startedAt,
        completedMs: Math.floor(Math.random() * 200_000),
        source: Math.random() < 0.5 ? 'playlist' : 'artist',
      },
    });
  }

  // ─── Audit log (5 samples) ──────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      { actorId: userUser.id, action: 'LOGIN', targetType: 'User', targetId: userUser.id, ip: '203.0.113.0' },
      { actorId: userUser.id, action: 'PLAYLIST_CREATE', targetType: 'Playlist', targetId: 'seed', ip: '203.0.113.0' },
      { actorId: userUser.id, action: 'SUBSCRIPTION_CHANGE', targetType: 'Subscription', targetId: userUser.id, metadataJson: JSON.stringify({ tier: 'PREMIUM' }) },
      { actorId: adminUser.id, action: 'ADMIN_ACTION', targetType: 'User', targetId: artistUser.id, metadataJson: JSON.stringify({ note: 'role verified' }) },
      { actorId: artistUser.id, action: 'LOGIN', targetType: 'User', targetId: artistUser.id, ip: '198.51.100.0' },
    ],
  });

  console.log('✅ Seed complete.');
  if (IS_DEV) {
    console.log(`   • user@demo.test   / ${userPassword}  (USER · PREMIUM)`);
    console.log(`   • artist@demo.test / ${artistPassword}  (ARTIST · FREE)`);
    console.log(`   • admin@demo.test  / ${adminPassword}  (ADMIN · FAMILY)`);
  } else {
    console.log('   Demo credentials (capture these — they will NOT be shown again):');
    console.log(`   • user@demo.test   / ${userPassword}`);
    console.log(`   • artist@demo.test / ${artistPassword}`);
    console.log(`   • admin@demo.test  / ${adminPassword}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
