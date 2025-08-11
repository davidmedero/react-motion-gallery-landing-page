'use client';

// import { useCallback, useRef } from "react";

export default function Hero() {
  // const accessButtonRef = useRef<HTMLButtonElement | null>(null);
  // const accessMaskRef = useRef<HTMLButtonElement | null>(null);

  // const scrollToPricing = useCallback(() => {
  //   document
  //     .getElementById('pricing')
  //     ?.scrollIntoView({ behavior: 'smooth' });
  // }, []);

  // function createRipple(container: HTMLButtonElement, e: React.MouseEvent) {
  //   // clean up old ripple if still around
  //   const old = container.querySelector<HTMLElement>('.ripple_button');
  //   if (old) old.remove();

  //   const rect = container.getBoundingClientRect();
  //   // diameter should cover the whole circle
  //   const diameter = Math.max(rect.width, rect.height);
  //   const radius = diameter / 2;

  //   // where in the element was the click?
  //   const x = e.clientX - rect.left - radius;
  //   const y = e.clientY - rect.top - radius;

  //   const span = document.createElement('span');
  //   span.className = 'ripple_button';
  //   span.style.width = span.style.height = `${diameter}px`;
  //   span.style.left = `${x}px`;
  //   span.style.top = `${y}px`;

  //   container.appendChild(span);
  //   // remove when done
  //   span.addEventListener('animationend', () => span.remove());
  // }


  return (
    <section className="flex items-center justify-center p-4 sm:p-6 lg:px-8 text-center bg-[#fff] mb-3">
      <div className="max-w-3xl space-y-6">
        
        <p className={
        "glass text-lg sm:text-xl text-[rgba(0,0,0,0.8)] px-8 py-4"
      }>
          The most powerful and fluid image + video slider gallery built for Next.js — 
          fusing a physics-based slider with a fullscreen gallery that features buttery smooth zoom, pan, pinch and drag gestures and beautiful modal&nbsp;transitions.
        </p>
        <p className="text-md text-[rgba(0,0,0,0.8)]">
          Support for mouse, touch, pointer, trackpad and wheel events. Unlimited options, layouts, variations and possibilities with full customization using familiar React patterns — this library replaces dozens of bloated npm packages with simple, clean, scalable components you can actually understand and control.
        </p>
        <p className="text-md text-[rgba(0,0,0,0.8)]">Whether you&#39;re a dev, founder, or creator - this is the last carousel/gallery you&#39;ll ever need.</p>
      </div>
    </section>
  );
}
