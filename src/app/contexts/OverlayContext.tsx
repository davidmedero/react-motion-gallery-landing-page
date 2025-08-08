'use client';

import React, { createContext, useContext, useRef, useState, ReactNode } from 'react';

interface OverlayContextValue {
  registerOverlay: () => string;
  unregisterOverlay: (id: string) => void;
  hasOverlay: boolean;
}

const OverlayContext = createContext<OverlayContextValue | undefined>(undefined);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const ids = useRef(new Set<string>());

  function registerOverlay() {
    const id = crypto.randomUUID();
    if (!ids.current.has(id)) {
      ids.current.add(id);
      setCount(c => c + 1);
    }
    return id;
  }

  function unregisterOverlay(id: string) {
    if (ids.current.has(id)) {
      ids.current.delete(id);
      setCount(c => Math.max(0, c - 1));
    }
  }

  return (
    <OverlayContext.Provider
      value={{
        registerOverlay,
        unregisterOverlay,
        hasOverlay: count > 0,
      }}
    >
      {children}
    </OverlayContext.Provider>
  );
}

export function useOverlay() {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error('useOverlay must be inside OverlayProvider');
  return ctx;
}