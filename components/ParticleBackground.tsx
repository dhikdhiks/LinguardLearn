'use client';

import { useMemo } from 'react';
import Particles, { ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Engine, ISourceOptions, RecursivePartial } from '@tsparticles/engine';

/**
 * Registers the slim plugin bundle (star shape, links, repulse, etc.).
 *
 * Must be a stable, module-level reference: the ParticlesProvider caches the
 * first init callback for the whole app lifecycle and throws if a different
 * one is supplied later.
 */
const initEngine = async (engine: Engine): Promise<void> => {
  await loadSlim(engine);
};

/**
 * Interactive starfield / constellation background.
 *
 * - Renders on a single fixed canvas behind all content (`-z-10`,
 *   `pointer-events-none`) so it never intercepts clicks and never
 *   triggers React re-renders — tsparticles animates inside the canvas.
 * - Pointer tracking uses `detectsOn: 'window'`, so hover-repulse still
 *   works even though the canvas itself ignores pointer events.
 * - Uses a single palette that stays legible on both light and dark
 *   backgrounds, so it never has to reload when the theme changes.
 * - Options are memoized once per mount and respect reduced-motion.
 */
export default function ParticleBackground() {
  const options = useMemo<ISourceOptions>(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

    const opts: RecursivePartial<ISourceOptions> = {
      fpsLimit: 60,
      detectRetina: true,
      background: { color: { value: 'transparent' } },
      particles: {
        number: {
          value: 70,
          density: { enable: true, width: 1920, height: 1080 },
        },
        color: { value: '#5b7cfa' },
        shape: { type: 'star' },
        opacity: {
          value: { min: 0.2, max: 0.6 },
          animation: { enable: !reduceMotion, speed: 0.6, sync: false },
        },
        size: { value: { min: 1.2, max: 3.2 } },
        links: {
          enable: true,
          distance: 130,
          color: '#7c9cff',
          opacity: 0.3,
          width: 1,
        },
        move: {
          enable: !reduceMotion,
          speed: 0.35,
          direction: 'none',
          outModes: { default: 'out' },
        },
      },
      interactivity: {
        detectsOn: 'window',
        events: {
          onHover: { enable: !reduceMotion, mode: 'repulse' },
          onClick: { enable: false },
          resize: { enable: true },
        },
        modes: {
          repulse: { distance: 90, duration: 0.4 },
        },
      },
    };

    return opts as ISourceOptions;
  }, []);

  return (
    <ParticlesProvider init={initEngine}>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <Particles
          id="linguaglearn-particles"
          options={options}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      </div>
    </ParticlesProvider>
  );
}
