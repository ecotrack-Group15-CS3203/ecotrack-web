'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * The hero's decorative card stack. Each card drifts a few pixels toward the pointer,
 * scaled by its own `--depth`, which reads as depth without any 3D. It writes two CSS
 * variables per animation frame and never re-renders.
 *
 * Off for touch (no hover pointer to follow) and for reduced motion.
 */
export function KineticStack({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reducedMotion) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;
        node.style.setProperty('--mx', x.toFixed(3));
        node.style.setProperty('--my', y.toFixed(3));
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className="kg-stack" aria-hidden="true">
      {children}
    </div>
  );
}
