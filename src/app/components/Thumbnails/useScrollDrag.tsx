'use client'

import { useRef, useCallback } from 'react';

type Axis = 'x' | 'y';

export function useScrollDrag() {
  const containerRef    = useRef<HTMLElement | null>(null);
  const isDragging      = useRef(false);
  const dragAxis        = useRef<Axis>('y');

  // start positions
  const startY          = useRef(0);
  const startX          = useRef(0);
  const startScrollTop  = useRef(0);
  const startScrollLeft = useRef(0);

  // for velocity
  const lastY           = useRef(0);
  const lastX           = useRef(0);
  const lastTime        = useRef(0);
  const velocityRef     = useRef(0);

  // for our inertial animation
  const frameRef        = useRef<number | null>(null);

  // ——— tweak this to whatever feels right ———
  const MAX_VELOCITY = 1.5; // px per ms

  const clamp = (v: number, min: number, max: number) =>
    v < min ? min : v > max ? max : v;

  // ——— MOUSE DOWN ———
  const handleMouseDown = useCallback((e: MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;

    e.preventDefault();
    isDragging.current = true;
    dragAxis.current = window.innerWidth < 535 ? 'x' : 'y';

    if (dragAxis.current === 'y') {
      startY.current         = e.clientY;
      lastY.current          = e.clientY;
      startScrollTop.current = el.scrollTop;
    } else {
      startX.current           = e.clientX;
      lastX.current            = e.clientX;
      startScrollLeft.current  = el.scrollLeft;
    }

    lastTime.current    = performance.now();
    velocityRef.current = 0;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup',   handleMouseUp);

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  // ——— MOUSE MOVE ———
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    e.preventDefault();

    const now = performance.now();
    const dt  = now - lastTime.current;
    lastTime.current = now;

    if (dragAxis.current === 'y') {
      const dy = e.clientY - lastY.current;
      lastY.current = e.clientY;
      // raw px/ms
      let v = dy / dt;
      // clamp it
      v = clamp(v, -MAX_VELOCITY, MAX_VELOCITY);
      velocityRef.current = v;

      const moveY = e.clientY - startY.current;
      containerRef.current.scrollTop = startScrollTop.current - moveY;
    } else {
      const dx = e.clientX - lastX.current;
      lastX.current = e.clientX;
      let v = dx / dt;
      v = clamp(v, -MAX_VELOCITY, MAX_VELOCITY);
      velocityRef.current = v;

      const moveX = e.clientX - startX.current;
      containerRef.current.scrollLeft = startScrollLeft.current - moveX;
    }
  }, []);

  // ——— INERTIAL STEP ———
  const stepInertia = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const FRAME_TIME = 16;              // ms/frame
    let vFrame = velocityRef.current * FRAME_TIME;
    // optional: also clamp per-frame displacement
    vFrame = clamp(vFrame, -MAX_VELOCITY * FRAME_TIME, MAX_VELOCITY * FRAME_TIME);

    if (Math.abs(vFrame) < 0.5) {
      frameRef.current = null;
      return;
    }

    if (dragAxis.current === 'y') {
      el.scrollTop -= vFrame;
    } else {
      el.scrollLeft -= vFrame;
    }

    // apply friction
    velocityRef.current *= 0.9;
    frameRef.current = requestAnimationFrame(stepInertia);
  }, []);

  // ——— MOUSE UP ———
  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup',   handleMouseUp);

    frameRef.current = requestAnimationFrame(stepInertia);
  }, []);

  return {
    containerRef,
    handleMouseDown,
  };
}