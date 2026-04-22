import { AlbumCover } from './AlbumCover';

type PlaylistHeaderProps = {
  kind: string;
  title: string;
  description?: string;
  owner: string;
  trackCount: number;
  totalSeconds: number;
  fromColor: string;
  toColor: string;
};

function formatTotal(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h) return `${h} hr ${m} min`;
  return `${m} min`;
}

export function PlaylistHeader({
  kind,
  title,
  description,
  owner,
  trackCount,
  totalSeconds,
  fromColor,
  toColor,
}: PlaylistHeaderProps) {
  return (
    <header
      className="flex flex-col md:flex-row items-end gap-6 p-6 md:p-8 pb-10"
      style={{
        background: `linear-gradient(180deg, ${fromColor} 0%, ${toColor} 100%)`,
      }}
    >
      <AlbumCover from={fromColor} to={toColor} title={title} size="xl" rounded="md" />
      <div className="flex flex-col gap-3 min-w-0">
        <p className="text-xs font-bold uppercase tracking-widest">{kind}</p>
        <h1 className="text-display-lg font-black leading-none break-words">{title}</h1>
        {description && <p className="text-sm text-white/80 max-w-2xl">{description}</p>}
        <p className="text-sm text-white/80">
          <span className="font-semibold">{owner}</span>
          <span className="mx-1">•</span>
          <span>{trackCount} songs</span>
          <span className="mx-1">•</span>
          <span>about {formatTotal(totalSeconds)}</span>
        </p>
      </div>
    </header>
  );
}
