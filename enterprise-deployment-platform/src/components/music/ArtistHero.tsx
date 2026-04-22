import { Badge } from '@/components/ui/Badge';

type ArtistHeroProps = {
  name: string;
  monthlyListeners: number;
  imageColor: string;
  verified?: boolean;
};

export function ArtistHero({ name, monthlyListeners, imageColor, verified = true }: ArtistHeroProps) {
  return (
    <header
      className="relative flex flex-col justify-end p-6 md:p-10 pb-10 min-h-[24rem] md:min-h-[28rem]"
      style={{
        background: `linear-gradient(180deg, ${imageColor} 0%, transparent 100%), linear-gradient(180deg, ${imageColor}aa 0%, #121212 100%)`,
      }}
    >
      {verified && (
        <Badge tone="blue" className="mb-3 w-fit">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2l2.39 4.84 5.34.78-3.86 3.76.91 5.32L12 14.27l-4.78 2.51.91-5.32-3.86-3.76 5.34-.78z" />
          </svg>
          Verified artist
        </Badge>
      )}
      <h1 className="text-display-xl font-black leading-none">{name}</h1>
      <p className="mt-4 text-sm text-white/80">
        {monthlyListeners.toLocaleString()} monthly listeners
      </p>
    </header>
  );
}
