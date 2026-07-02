/**
 * Fixed, GPU-cheap ambient background shared by every page. Pure CSS (no JS
 * animation loop) so it never blocks the main thread or hurts Lighthouse.
 * Bright pastel orbs drift over an off-white wash — alive, never flat.
 */
export function AppBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base wash */}
      <div className="absolute inset-0 bg-background" />
      {/* Soft HUD grid fading toward the edges */}
      <div className="bg-grid absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
      {/* Floating pastel orbs */}
      <div className="absolute -left-24 top-[-6rem] h-[34rem] w-[34rem] animate-float-slow rounded-full bg-primary/20 blur-[130px]" />
      <div className="absolute right-[-8rem] top-[14%] h-[28rem] w-[28rem] animate-float rounded-full bg-accent/20 blur-[130px]" />
      <div className="absolute bottom-[-10rem] left-1/3 h-[32rem] w-[32rem] animate-float-slow rounded-full bg-pink/15 blur-[140px]" />
      <div className="absolute right-[18%] bottom-[8%] h-[22rem] w-[22rem] animate-float rounded-full bg-violet/15 blur-[130px]" />
      {/* Gentle top sheen so the very top stays bright */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/70 to-transparent" />
    </div>
  );
}
