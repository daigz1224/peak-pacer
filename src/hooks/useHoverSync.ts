import { useRef } from 'react';

export interface HoverStore {
  getDistance(): number | null;
  setDistance(d: number | null): void;
  subscribe(listener: () => void): () => void;
}

function createHoverStore(): HoverStore {
  let distance: number | null = null;
  const listeners = new Set<() => void>();

  return {
    getDistance: () => distance,
    setDistance: (d) => {
      if (d === distance) return;
      distance = d;
      listeners.forEach((fn) => fn());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useHoverStore(): HoverStore {
  const ref = useRef<HoverStore | null>(null);
  if (!ref.current) ref.current = createHoverStore();
  return ref.current;
}
