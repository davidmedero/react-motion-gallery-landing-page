'use client';

import Link from 'next/link';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { Menu, MenuItems, MenuItem, MenuButton, Transition } from '@headlessui/react';
import { Fragment, useId, useRef } from 'react';
import { useOverlay } from '../contexts/OverlayContext';
import MobileMenu from './MobileMenu';
import { usePathname, useRouter } from 'next/navigation';

function LogoSVG({
  className = '',
  idPrefix,
}: {
  className?: string;
  idPrefix?: string;
}) {
  const rid = useId();
  const id = (name: string) => `${idPrefix ?? rid}-${name}`;

  return (
    <svg viewBox="0 0 800 800" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={id('sphereGrad')} cx="0.3" cy="0.3">
          <stop offset="0%" stopColor="#d0e7ff" stopOpacity="1" />
          <stop offset="70%" stopColor="#d0e7ff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#a0d1ff" stopOpacity="0.6" />
        </radialGradient>

        <linearGradient id={id('halo1')} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id={id('halo2')} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id={id('halo3')} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f472b6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f472b6" stopOpacity="0.3" />
        </linearGradient>

        <filter id={id('glow')}>
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* transparent background to keep exports clean */}
      <rect width="800" height="800" fill="transparent" />

      {/* three evenly spaced tilted halos */}
      <ellipse
        cx="400"
        cy="400"
        rx="100"
        ry="20"
        fill="none"
        stroke={`url(#${id('halo1')})`}
        strokeWidth="12"
        filter={`url(#${id('glow')})`}
        transform="rotate(180 400 400)"
      />
      <ellipse
        cx="400"
        cy="400"
        rx="100"
        ry="20"
        fill="none"
        stroke={`url(#${id('halo2')})`}
        strokeWidth="12"
        filter={`url(#${id('glow')})`}
        transform="rotate(60 400 400)"
      />
      <ellipse
        cx="400"
        cy="400"
        rx="100"
        ry="20"
        fill="none"
        stroke={`url(#${id('halo3')})`}
        strokeWidth="12"
        filter={`url(#${id('glow')})`}
        transform="rotate(120 400 400)"
      />

      {/* center sphere */}
      <circle
        cx="400"
        cy="400"
        r="40"
        fill={`url(#${id('sphereGrad')})`}
        filter={`url(#${id('glow')})`}
      />
    </svg>
  );
}

export default function Nav() {
  const { hasOverlay } = useOverlay();
  const router = useRouter();
  const pathname = usePathname();
  const getAccessRef = useRef<HTMLButtonElement | null>(null);
  const demosRef = useRef(null);
  const guidesRef = useRef(null);

  function scrollToPricing() {
    if (pathname === "/") {
      // wait a tick so the menu has closed/layout settled
      requestAnimationFrame(() => {
        const el = document.getElementById("pricing");
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      // Navigate home first, then scroll on the next page load
      sessionStorage.setItem("__scrollTo", "pricing");
      router.push("/"); // don't auto-jump to top
    }
  };

  function createRipple(container: HTMLElement) {
    // remove old ripple
    const old = container.querySelector<HTMLElement>('.ripple');
    if (old) old.remove();

    const rect = container.getBoundingClientRect();
    // diameter that covers the circle
    const diameter = Math.max(rect.width, rect.height);
    const radius   = diameter / 2;

    // center of the container
    const x = (rect.width  / 2) - radius;
    const y = (rect.height / 2) - radius;

    const span = document.createElement('span');
    span.className = 'ripple';
    span.style.width  = `${diameter}px`;
    span.style.height = `${diameter}px`;
    span.style.left   = `${x}px`;
    span.style.top    = `${y}px`;

    container.appendChild(span);
    span.addEventListener('animationend', () => span.remove());
  };

  
  return (
    <>
      {/* Mobile-only logo ABOVE the sticky nav (not sticky) */}
      <div className="hidden max-[389px]:block relative h-20">
        <Link href="/" className="block h-full">
          <LogoSVG
            idPrefix="mobile"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px]"
          />
        </Link>
      </div>

      {/* Sticky navbar */}
      <nav
        className={`sticky top-0 z-50 bg-transparent ${
          hasOverlay ? '' : 'bg-white/10 backdrop-blur-md border-b border-white/20'
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center">
              {/* Desktop/tablet logo INSIDE the sticky nav (hidden on ≤379px) */}
              <div className="max-[389px]:hidden flex items-center relative left-[-41px] lg:left-[-50px]">
                <LogoSVG className="w-[120px]" idPrefix="desktop" />
                <h1 className="ml-2 text-[calc(1vw+1rem)] md:text-[1.6rem] font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-text-gradient leading-tight min-[389px]:left-[-36px] relative">
                  React Motion Gallery
                </h1>
              </div>
              <h1 className="hidden ml-2 text-[calc(1vw+1rem)] md:text-[2rem] font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-text-gradient leading-tight max-[389px]:flex relative">
                  React Motion Gallery
                </h1>
            </Link>

            <div className="flex items-center">
              {/* Desktop links */}
              <div className="hidden md:flex">
                <button 
                  ref={getAccessRef}
                  onClick={() => {
                    const btn = getAccessRef.current;
                    if (btn) createRipple(btn);
                    scrollToPricing();
                  }} 
                  className="text-[#0A0A0A] hover:text-blue-400 transition cursor-pointer relative p-5 overflow-hidden">
                  Get Access
                </button>
                <Link 
                  ref={demosRef}
                  onClick={() => {
                    const btn = demosRef.current;
                    if (btn) createRipple(btn);
                  }}
                  href="/demos"
                  className="text-[#0A0A0A] hover:text-blue-400 transition relative p-5 overflow-hidden">
                  Demos
                </Link>
                <Link 
                  ref={guidesRef}
                  onClick={() => {
                    const btn = guidesRef.current;
                    if (btn) createRipple(btn);
                  }}
                  href="/guides"
                  className="text-[#0A0A0A] hover:text-blue-400 transition relative p-5 overflow-hidden">
                  Guides
                </Link>
              </div>

              <MobileMenu
                items={[
                  { type: "scroll", targetId: "pricing", label: "Get Access" },
                  { type: "link", href: "/demos",  label: "Demos" },
                  { type: "link", href: "/guides", label: "Guides" },
                ]}
              />
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
