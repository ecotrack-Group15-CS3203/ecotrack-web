'use client';

import { useEffect, useRef } from 'react';
import { formatStatValue } from '@/lib/public-stats';

const DURATION_MS = 1200;

/**
 * Counts a stat up from zero once, when it first comes into view.
 *
 * The server renders the final value, so crawlers, no-JS visitors and the first paint
 * all see the real number. Under `html.js` the visible copy stays hidden until the
 * animation starts (see .kg-count in public.css), so it doesn't flash the final value
 * and then drop to zero. Frames are written straight to the DOM rather than through
 * state, so a count-up doesn't re-render the page 70 times. Screen readers only ever
 * get the final value.
 */
export function CountUp({ value, decimals, suffix }: { value: number; decimals: 0 | 1; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const final = formatStatValue(value, decimals, suffix);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.dataset.pending = 'false';
      return;
    }

    let frame = 0;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      const start = performance.now();
      node.textContent = formatStatValue(0, decimals, suffix);
      node.dataset.pending = 'false';
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / DURATION_MS);
        const eased = 1 - Math.pow(1 - progress, 3);
        node.textContent = formatStatValue(value * eased, decimals, suffix);
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, decimals, suffix]);

  return (
    <>
      <span ref={ref} className="kg-count" data-pending="true" aria-hidden="true">
        {final}
      </span>
      <span className="sr-only">{final}</span>
    </>
  );
}
