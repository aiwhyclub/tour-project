export function HeroScrollCue() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center"
      style={{ zIndex: 'var(--z-hero-cue)' }}
      data-hero-cue
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-2 text-white/90">
        <span className="text-xs font-medium tracking-widest">SCROLL</span>
        <span className="block h-10 w-[1.5px] bg-gradient-to-b from-white/80 to-transparent" />
      </div>
    </div>
  );
}
