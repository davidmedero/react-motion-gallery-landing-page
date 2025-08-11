/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./MobileMenu.module.css";

type MenuItem =
  | { type: "link"; href: string; label: string }
  | { type: "scroll"; targetId: string; label: string };

export default function MobileMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [present, setPresent] = useState(false);
  const [entered, setEntered] = useState(false);

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | HTMLAnchorElement | null>>([]);

  // when open toggles, coordinate mount + animation
useEffect(() => {
  if (open) {
    // 1) mount
    setPresent(true);
    // 2) next frame -> add 'open' class so transition runs
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
  } else {
    // start closing transition
    setEntered(false);
  }
}, [open]);

// unmount after close transition completes
function onPanelTransitionEnd(e: React.TransitionEvent<HTMLDivElement>) {
  if (e.target !== e.currentTarget) return;
  if (!entered) setPresent(false);
}

  // when opening, ensure it's mounted
  useEffect(() => { if (open) setPresent(true); }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
      btnRef.current?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // Focus management: panel gets focus (not a hash link)
  useEffect(() => {
    if (open) {
      // Give the panel focus so iOS won’t scroll to a hash anchor
      panelRef.current?.focus();
    } else {
      btnRef.current?.focus();
    }
  }, [open]);

  // Keyboard navigation
  function focusItem(idx: number) {
    const el = itemRefs.current[idx];
    if (el) el.focus();
  }

  function onPanelKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusItem(0);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      focusItem(items.length - 1);
    }
  }

  function onItemKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusItem((idx + 1) % items.length);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      focusItem((idx - 1 + items.length) % items.length);
    }
  }

  const router = useRouter();
  const pathname = usePathname();
  // ... (state/refs unchanged)

  function handleItemClick(item: MenuItem) {
    if (item.type === "scroll") {
      // If already on home, just scroll
      if (pathname === "/") {
        setOpen(false);
        // wait a tick so the menu has closed/layout settled
        requestAnimationFrame(() => {
          const el = document.getElementById(item.targetId);
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      } else {
        // Navigate home first, then scroll on the next page load
        sessionStorage.setItem("__scrollTo", item.targetId);
        setOpen(false);
        router.push("/"); // don't auto-jump to top
      }
      return;
    }

    // normal link
    setOpen(false);
  }

  return (
    <div className="relative md:hidden">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="mobile-menu-panel"
        onClick={() => setOpen(v => !v)}
        className="p-2 rounded-md text-[#0A0A0A] hover:bg-white/10 focus:outline-none ring-2 ring-white cursor-pointer"
      >
        <span className="sr-only">Toggle menu</span>
        {!open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
            <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" />
          </svg>
        )}
      </button>

      {(open || present) && (
        <div
          className={`${styles.backdrop} ${entered ? styles.open : styles.closed}`}
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Panel stays mounted while animating out */}
      {(open || present) && (
        <div
          id="mobile-menu-panel"
          role="menu"
          ref={panelRef}
          tabIndex={-1}
          className={`${styles.panel} ${entered ? styles.open : styles.closed}`}
          onTransitionEnd={onPanelTransitionEnd}
        >
          <ul className={styles.list}>
            {items.map((item, i) => {
              const common =
                "block w-full text-left px-4 py-2 text-[#0A0A0A] hover:bg-blue-400/10 focus:bg-blue-400/10 outline-none";
              if (item.type === "scroll") {
                // Use button to avoid focusing a #hash anchor
                return (
                  <li key={item.label}>
                    <button
                      ref={el => {(itemRefs.current[i] = el)}}
                      role="menuitem"
                      tabIndex={0}
                      className={common}
                      style={{ cursor: 'pointer' }}
                      onKeyDown={(e) => onItemKeyDown(e, i)}
                      onClick={() => handleItemClick(item)}
                    >
                      {item.label}
                    </button>
                  </li>
                );
              }
              return (
                <li key={item.label}>
                  <Link
                    ref={el => (itemRefs.current[i] = el as any)}
                    href={item.href}
                    role="menuitem"
                    tabIndex={0}
                    className={common}
                    onKeyDown={(e) => onItemKeyDown(e, i)}
                    onClick={() => handleItemClick(item)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
