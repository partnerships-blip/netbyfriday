// NETBYFRIDAY wordmark and app icon, built from type (no raster logo files exist yet). Spec: design-reference/README.md §Brand.
export function Wordmark({ size = 23, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={className} style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: size, letterSpacing: '-.055em', lineHeight: 1, paddingBottom: 5,
      backgroundImage: 'linear-gradient(#DFFF43,#DFFF43)', backgroundRepeat: 'no-repeat', backgroundSize: '58% 6px', backgroundPosition: '100% 100%', color: '#32152F', display: 'inline-block' }}>
      netbyfriday
    </span>
  );
}
export function AppIcon({ size = 22, inverted = false }: { size?: number; inverted?: boolean }) {
  const bg = inverted ? '#FAF7F3' : '#32152F', fg = inverted ? '#32152F' : '#FAF7F3';
  return (
    <span aria-hidden className="relative inline-grid flex-none place-items-center" style={{ width: size, height: size, borderRadius: size * 0.28, background: bg }}>
      <span style={{ color: fg, fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: size * 0.62, lineHeight: 1, marginTop: -size * 0.08 }}>n</span>
      <span className="absolute" style={{ left: size * 0.27, right: size * 0.27, bottom: size * 0.2, height: size * 0.09, background: '#DFFF43', borderRadius: 1 }} />
    </span>
  );
}
