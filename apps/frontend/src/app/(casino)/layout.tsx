/**
 * Immersive casino layout: full-bleed, no dashboard chrome. The themed animated
 * background is supplied per-route by RouteBackground (casino chips, crash
 * rockets, dice cubes, stadium…), so this shell stays transparent and simply
 * provides a scrollable full-height stage. The lobby and tables render their
 * own headers.
 */
export default function CasinoLayout({ children }: { children: React.ReactNode }) {
  return <div className="relative h-screen overflow-y-auto overflow-x-hidden">{children}</div>;
}
