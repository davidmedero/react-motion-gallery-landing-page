/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import SimpleBarReact from 'simplebar-react';
import type SimpleBarCore from 'simplebar';
import 'simplebar-react/dist/simplebar.min.css';

type Leaf = { id: string; title: string; summary?: string; content: React.ReactNode; };
type Group = { label: string; items: Leaf[]; };

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-');

// Match your heading offset (scroll-mt-28 ~= 112px @ 16px root)
const HEADER_OFFSET_PX = 142;
const HYSTERESIS_PX = 12;

export default function Guides() {
  const simpleBarRef = useRef<SimpleBarCore | null>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  // Desktop media query state
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsDesktop('matches' in e ? e.matches : (e as MediaQueryList).matches);
    // init + subscribe
    onChange(mq);
    mq.addEventListener ? mq.addEventListener('change', onChange as any) : mq.addListener(onChange as any);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', onChange as any) : mq.removeListener(onChange as any);
    };
  }, []);

  // programmatic scroll guard
  const isProgrammatic = useRef(false);
  const cancelWatchRef = useRef<() => void>(() => {});

  // ---- Content (use yours) ----
  const groups: Group[] = useMemo(() => [
    { label: 'Behavior', items: [
      { id: 'behavior-draggable', title: 'draggable', content: <p>Toggle dragging.</p> },
      { id: 'behavior-freeScroll', title: 'freeScroll', content: <p>Free momentum scrolling.</p> },
      { id: 'behavior-wrapAround', title: 'wrapAround', content: <p>Infinite looping.</p> },
      { id: 'behavior-groupCells', title: 'groupCells', content: <p>Group cells per slide.</p> },
      { id: 'behavior-autoPlay', title: 'autoPlay', content: <p>Autoplay configuration.</p> },
      { id: 'behavior-fullscreen', title: 'fullscreen', content: <p>Enter/exit fullscreen.</p> },
      { id: 'behavior-fade', title: 'fade', content: <p>Cross-fade slides.</p> },
      { id: 'behavior-adaptiveHeight', title: 'adaptiveHeight', content: <p>Match slide height.</p> },
      { id: 'behavior-watchCSS', title: 'watchCSS', content: <p>Enable via CSS media queries.</p> },
      { id: 'behavior-asNavFor', title: 'asNavFor', content: <p>Sync as navigation for another slider.</p> },
      { id: 'behavior-hash', title: 'hash', content: <p>Hash-based navigation.</p> },
      { id: 'behavior-dragThreshold', title: 'dragThreshold', content: <p>Pixels before drag starts.</p> },
      { id: 'behavior-attraction-friction', title: 'selectedAttraction & friction', content: <p>Tweak spring physics.</p> },
      { id: 'behavior-freeScrollFriction', title: 'freeScrollFriction', content: <p>Friction while free scrolling.</p> },
    ]},
    { label: 'Images', items: [
      { id: 'images-imagesLoaded', title: 'imagesLoaded', content: <p>Wait for images before layout.</p> },
      { id: 'images-lazyLoad', title: 'lazyLoad', content: <p>Defer image loading.</p> },
      { id: 'images-bgLazyLoad', title: 'bgLazyLoad', content: <p>Lazy-load CSS background images.</p> },
    ]},
    { label: 'Setup', items: [
      { id: 'setup-cellSelector', title: 'cellSelector', content: <p>Query selector for cells.</p> },
      { id: 'setup-initialIndex', title: 'initialIndex', content: <p>Start at a specific slide.</p> },
      { id: 'setup-accessibility', title: 'accessibility', content: <p>ARIA / keyboard options.</p> },
      { id: 'setup-setGallerySize', title: 'setGallerySize', content: <p>Auto size the gallery.</p> },
      { id: 'setup-resize', title: 'resize', content: <p>Respond to viewport changes.</p> },
    ]},
    { label: 'Cell position', items: [
      { id: 'pos-cellAlign', title: 'cellAlign', content: <p>Left/center/right alignment.</p> },
      { id: 'pos-contain', title: 'contain', content: <p>Contain cells within bounds.</p> },
      { id: 'pos-percentPosition', title: 'percentPosition', content: <p>Percent-based transforms.</p> },
      { id: 'pos-rightToLeft', title: 'rightToLeft', content: <p>RTL layout.</p> },
    ]},
    { label: 'UI', items: [
      { id: 'ui-prevNextButtons', title: 'prevNextButtons', content: <p>Arrow buttons visibility.</p> },
      { id: 'ui-pageDots', title: 'pageDots', content: <p>Pagination dots.</p> },
      { id: 'ui-arrowShape', title: 'arrowShape', content: <p>Custom SVG arrow path.</p> },
    ]},
  ], []);

  const leaves: Leaf[] = useMemo(() => groups.flatMap(g => g.items), [groups]);
  const [activeId, setActiveId] = useState<string>(leaves[0]?.id);

  const baseLink     = 'block rounded-md px-2 py-1 text-sm transition';
  const activeLink   = 'text-gray-600 text-white focus-visible:text-white active:text-white bg-gradient-to-r focus-visible:bg-gradient-to-r active:bg-gradient-to-r from-pink-400/60 focus-visible:from-pink-400/60 active:from-pink-400/60 to-white-500/80 focus-visible:to-white-500/80 active:to-white-500/80';
  const inactiveLink =
  'text-gray-600 hover:text-white focus-visible:text-white active:text-white hover:bg-gradient-to-r focus-visible:bg-gradient-to-r active:bg-gradient-to-r hover:from-blue-400/80 focus-visible:from-blue-400/80 active:from-blue-400/80 hover:to-white-500/80 focus-visible:to-white-500/80 active:to-white-500/80';


  // ---------- Anchor-line active detection (stable) ----------
  const headingsRef = useRef<HTMLElement[]>([]);
  const topsRef = useRef<number[]>([]);
  const lastIdxRef = useRef<number>(0);
  const tickingRef = useRef(false);

  // NEW state
  const [activeGroup, setActiveGroup] = useState<string>(groups[0]?.label);

  // NEW refs for group headers
  const groupElsRef  = useRef<HTMLElement[]>([]);
  const groupTopsRef = useRef<number[]>([]);
  const lastGroupIdxRef = useRef<number>(0);

  // add these refs near your other refs
  const groupFirstIdxRef = useRef<number[]>([]);
  const groupLastIdxRef  = useRef<number[]>([]);

  const groupLinkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  // helper
  const gidFor = (label: string) => `group-${slug(label)}`;

  function measureAll() {
    // leaves
    const leafEls = leaves.map(s => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    headingsRef.current = leafEls;
    topsRef.current = leafEls.map(el => el.getBoundingClientRect().top + window.pageYOffset);

    // groups
    const groupEls = groups.map(g => document.getElementById(gidFor(g.label))).filter(Boolean) as HTMLElement[];
    groupElsRef.current = groupEls;
    groupTopsRef.current = groupEls.map(el => el.getBoundingClientRect().top + window.pageYOffset);

    // leaf index ranges per group
    const first: number[] = [];
    const last:  number[] = [];
    let idx = 0;
    for (const g of groups) {
      first.push(idx);
      last.push(idx + g.items.length - 1);
      idx += g.items.length;
    }
    groupFirstIdxRef.current = first;
    groupLastIdxRef.current  = last;
  }

  function updateActiveFromScroll() {
    tickingRef.current = false;
    if (isProgrammatic.current) return;

    const anchorY = window.pageYOffset + HEADER_OFFSET_PX + 1;

    // ---- GROUP selection (with hysteresis) ----
    const gtops = groupTopsRef.current;
    let gidx = 0;
    if (gtops.length) {
      while (gidx < gtops.length && gtops[gidx] <= anchorY) gidx++;
      gidx = Math.max(0, gidx - 1);

      const gCurrent = lastGroupIdxRef.current;
      let commitGroup = true;
      if (gidx !== gCurrent) {
        if (gidx > gCurrent) {
          const nextTop = gtops[gidx];
          if (anchorY - nextTop < HYSTERESIS_PX) commitGroup = false;
        } else {
          const prevTop = gtops[gidx];
          if (anchorY - prevTop < HYSTERESIS_PX) commitGroup = false;
        }
        if (commitGroup) {
          lastGroupIdxRef.current = gidx;
          setActiveGroup(groups[gidx].label);
        }
      }
    }

    // If we don't have groups measured yet, bail
    if (!gtops.length) return;

    // ---- LEAF selection (clamped to the active group range) ----
    const tops = topsRef.current;
    if (!tops.length) return;

    const start = groupFirstIdxRef.current[gidx] ?? 0;
    const end   = groupLastIdxRef.current[gidx] ?? tops.length - 1;

    // Anchor is above the first leaf of this group → no leaf should be active
    const firstLeafTop = tops[start];
    if (anchorY < firstLeafTop - HYSTERESIS_PX) {
      if (lastIdxRef.current !== -1) lastIdxRef.current = -1;
      if (activeId !== '') setActiveId('');   // clear previous leaf highlight
      return;
    }

    // Pick leaf within [start, end]
    let idx = start;
    while (idx <= end && tops[idx] <= anchorY) idx++;
    idx = Math.min(end, Math.max(start, idx - 1));

    if (idx !== lastIdxRef.current) {
      // small hysteresis on leaf switch
      let ok = true;
      if (idx > lastIdxRef.current) {
        const nextTop = tops[idx];
        if (anchorY - nextTop < HYSTERESIS_PX) ok = false;
      } else if (idx < lastIdxRef.current) {
        const prevTop = tops[idx];
        if (anchorY - prevTop < HYSTERESIS_PX) ok = false;
      }
      if (ok) {
        lastIdxRef.current = idx;
        setActiveId(headingsRef.current[idx].id);
      }
    }
  }

  useEffect(() => {
    measureAll();
    const onResize = () => { measureAll(); updateActiveFromScroll(); };

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(updateActiveFromScroll);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    window.addEventListener('load', onResize);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.removeEventListener('load', onResize);
    };
  }, [leaves, groups]);

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;

    isProgrammatic.current = true;

    if (id.startsWith('group-')) {
      // --- clicking a group label ---
      const label = groups.find(g => gidFor(g.label) === id)?.label;
      if (label) {
        setActiveGroup(label);
        // clear any leaf highlight and reset leaf index
        setActiveId('');
        lastIdxRef.current = -1;

        // also sync the group index so scroll logic doesn't lag
        const gIdx = groups.findIndex(g => g.label === label);
        if (gIdx >= 0) lastGroupIdxRef.current = gIdx;
      }
    } else {
      // --- clicking a leaf ---
      // optimistic leaf + group highlight
      setActiveId(id);
      const gIdx = groups.findIndex(g => g.items.some(it => it.id === id));
      if (gIdx >= 0) {
        setActiveGroup(groups[gIdx].label);
        lastGroupIdxRef.current = gIdx;
      }
      // keep the leaf index coherent for hysteresis
      const lIdx = leaves.findIndex(l => l.id === id);
      if (lIdx >= 0) lastIdxRef.current = lIdx;
    }

    history.replaceState(null, '', `#${id}`);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    measureAll();
    watchScrollSettleFor(el);
  };

  function watchScrollSettleFor(el: HTMLElement) {
    cancelWatchRef.current();
    let raf = 0, lastY = -1, still = 0;

    const cancel = () => cancelAnimationFrame(raf);
    cancelWatchRef.current = cancel;

    const onUser = () => { cancel(); isProgrammatic.current = false; cleanup(); };
    const cleanup = () => {
      window.removeEventListener('wheel', onUser, true);
      window.removeEventListener('touchstart', onUser, true);
      window.removeEventListener('keydown', onUser, true);
    };
    window.addEventListener('wheel', onUser, true);
    window.addEventListener('touchstart', onUser, true);
    window.addEventListener('keydown', onUser, true);

    const tick = () => {
      const top = el.getBoundingClientRect().top - HEADER_OFFSET_PX;
      const y = window.pageYOffset;
      if (Math.abs(top) <= 2) { isProgrammatic.current = false; cleanup(); return; }
      if (y === lastY) { if (++still > 3) { isProgrammatic.current = false; cleanup(); return; } }
      else { still = 0; lastY = y; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  // --- ToC rAF scheduler so fast scrolls don't drop updates ---
  const rafSyncRef = useRef(0);
  const pendingIdRef = useRef<string | null>(null);

  function scrollTocToActive(id: string) {
    const instance = simpleBarRef.current;
    if (!instance) return;

    const scroller = instance.getScrollElement();
    if (!scroller) return;
    const firstId = leaves[0]?.id;
    const secondId = leaves[1]?.id;
    const thirdId = leaves[2]?.id;
    const lastId  = leaves[leaves.length - 1]?.id;

    // First item → scroll ToC to very top
    if (id === firstId || id === secondId || id === thirdId) {
      scroller.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // Last item → scroll ToC to very bottom
    if (id === lastId) {
      const bottom = scroller.scrollHeight - scroller.clientHeight;
      scroller.scrollTo({ top: bottom, behavior: 'smooth' });
      return;
    }

    // Otherwise ensure the active link is fully visible
    const link = linkRefs.current[id];
    if (!link) return;

    const c = scroller.getBoundingClientRect();
    const r = link.getBoundingClientRect();
    const pad = 8; // small padding

    if (r.top < c.top + pad) {
      scroller.scrollBy({ top: r.top - c.top - pad, behavior: 'smooth' });
    } else if (r.bottom > c.bottom - pad) {
      scroller.scrollBy({ top: r.bottom - c.bottom + pad, behavior: 'smooth' });
    }
  }

  function scheduleTocSync(id: string) {
    pendingIdRef.current = id;
    if (rafSyncRef.current) cancelAnimationFrame(rafSyncRef.current);
    // double-rAF to wait for layout after highlight update
    rafSyncRef.current = requestAnimationFrame(() => {
      rafSyncRef.current = requestAnimationFrame(() => {
        const latest = pendingIdRef.current;
        if (latest) scrollTocToActive(latest);
        rafSyncRef.current = 0;
      });
    });
  }

  useEffect(() => {
    return () => { if (rafSyncRef.current) cancelAnimationFrame(rafSyncRef.current); };
  }, []);

  // ---------- Auto-scroll SimpleBar ToC (desktop only, rAF-coalesced) ----------
  useEffect(() => {
    if (!isDesktop) return;
    if (!activeId) return;
    scheduleTocSync(activeId);
  }, [activeId, isDesktop]);

  // Optional: jump to hash on load
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const el = document.getElementById(id);
      if (id.startsWith('group-')) {
        const label = groups.find(g => gidFor(g.label) === id)?.label;
        if (label) setActiveGroup(label);
      } else {
        setActiveId(id);
        const label = groupByLeafId[id];
        if (label) setActiveGroup(label);
      }
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(measureAll, 200);
      }
    } else {
      measureAll();
    }
  }, []);

  const groupByLeafId = useMemo(() => {
    const m: Record<string, string> = {};
    groups.forEach(g => g.items.forEach(item => { m[item.id] = g.label; }));
    return m;
  }, [groups]);

  function scrollTocElementIntoView(el: HTMLElement) {
    const scroller = simpleBarRef.current?.getScrollElement();
    if (!scroller) return;
    const c = scroller.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const pad = 8;
    if (r.top < c.top + pad) scroller.scrollBy({ top: r.top - c.top - pad, behavior: 'smooth' });
    else if (r.bottom > c.bottom - pad) scroller.scrollBy({ top: r.bottom - c.bottom + pad, behavior: 'smooth' });
  }

  const rafGroupRef = useRef(0);
  const pendingGroupElRef = useRef<HTMLElement | null>(null);

  function scheduleGroupTocSync(el: HTMLElement) {
    pendingGroupElRef.current = el;
    if (rafGroupRef.current) cancelAnimationFrame(rafGroupRef.current);
    // double-rAF so layout reflects underline change before measuring
    rafGroupRef.current = requestAnimationFrame(() => {
      rafGroupRef.current = requestAnimationFrame(() => {
        const scroller = simpleBarRef.current?.getScrollElement();
        const first = groups[0]?.label;
        const last  = groups[groups.length - 1]?.label;

        if (scroller) {
          if (activeGroup === first) {
            scroller.scrollTo({ top: 0, behavior: 'smooth' });
          } else if (activeGroup === last) {
            scroller.scrollTo({ top: scroller.scrollHeight - scroller.clientHeight, behavior: 'smooth' });
          } else {
            const latest = pendingGroupElRef.current;
            if (latest) scrollTocElementIntoView(latest);
          }
        }
        rafGroupRef.current = 0;
      });
    });
  }

  useEffect(() => {
    if (!isDesktop) return;
    const el = groupLinkRefs.current[activeGroup];
    if (el) scheduleGroupTocSync(el);
  }, [activeGroup, isDesktop, groups.length]);


  return (
    <div className="mx-auto w-full max-w-6xl px-4 lg:px-6 py-10 lg:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-8">

        {/* ToC — sticky & scrollable only on desktop */}
        <div className="lg:sticky lg:top-24 self-start rounded-[0.5rem] lg:overflow-hidden border border-[rgba(255,255,255,0.8)]">
          {isDesktop ? (
            <SimpleBarReact
              forceVisible="y"
              autoHide={false}
              style={{ maxHeight: '600px' }}
              scrollableNodeProps={{ role: 'navigation', 'aria-label': 'Table of contents' }}
              ref={simpleBarRef}
            >
              <nav className="p-4 toc">
                <ol className="space-y-4">
                  {groups.map(group => {
                    return (
                      <li key={group.label}>
                        <a
                          ref={el => { groupLinkRefs.current[group.label] = el; }}
                          href={`#${gidFor(group.label)}`}
                          onClick={scrollTo(gidFor(group.label))}
                          aria-current={isDesktop && activeGroup === group.label ? 'true' : undefined}
                          className={[
                            "text-sm font-semibold mb-1 inline-block transition w-full",
                            isDesktop && activeGroup === group.label
                              ? "text-pink-400/70"
                              : "text-gray-600 hover:text-blue-400/70"
                          ].join(" ")}
                        >
                          {group.label}
                        </a>
                        <ol className="pl-2">
                          {group.items.map(item => (
                            <li key={item.id}>
                              <a
                                ref={el => { linkRefs.current[item.id] = el; }}
                                href={`#${item.id}`}
                                onClick={scrollTo(item.id)}
                                aria-current={activeId === item.id ? 'true' : undefined}
                                className={`${baseLink} ${activeId === item.id ? activeLink : inactiveLink}`}
                              >
                                {item.title}
                              </a>
                            </li>
                          ))}
                        </ol>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            </SimpleBarReact>
          ) : (
            // MOBILE/TABLET: plain block, no scrolling, no active highlight
            <nav className="p-4" role="navigation" aria-label="Table of contents">
              <ol className="space-y-4">
                {groups.map(group => {
                  const gid = `group-${slug(group.label)}`;
                  return (
                    <li key={group.label}>
                      <a
                        href={`#${gid}`}
                        onClick={scrollTo(gid)}
                        className="text-sm font-semibold text-blue-400 mb-1 inline-block hover:underline underline-offset-4"
                      >
                        {group.label}
                      </a>
                      <ol className="pl-2">
                        {group.items.map(item => (
                          <li key={item.id}>
                            <a
                              href={`#${item.id}`}
                              onClick={scrollTo(item.id)}
                              // No active highlight on non-desktop:
                              className={`${baseLink} text-[#0A0A0A] hover:bg-blue-400/70 hover:text-white`}
                            >
                              {item.title}
                            </a>
                          </li>
                        ))}
                      </ol>
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}
        </div>

        {/* Main content */}
        <article className="min-w-0 mb-[700px]">
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Guides</h1>
            <p className="text-[#0A0A0A] mt-2">
              Customize components: tweak values, use callbacks, toggle features, and theme the UI.
            </p>
          </header>

          <div className="space-y-14">
            {groups.map(group => {
              const gid = `group-${slug(group.label)}`;
              return (
                <section key={group.label} className="space-y-10">
                  <h2 id={gid} className="scroll-mt-28 text-xl font-semibold text-[#0A0A0A]">
                    <a href={`#${gid}`} onClick={scrollTo(gid)} className="hover:underline underline-offset-4">
                      {group.label}
                    </a>
                  </h2>

                  {group.items.map(item => (
                    <section key={item.id} className="space-y-2">
                      <h3 id={item.id} className="scroll-mt-28 text-2xl font-bold tracking-tight">
                        <a href={`#${item.id}`} onClick={scrollTo(item.id)} className="hover:underline underline-offset-4">
                          {item.title}
                        </a>
                      </h3>
                      {item.summary && <p className="text-[#0A0A0A]">{item.summary}</p>}
                      <div className="mt-2 text-[#0A0A0A]">{item.content}</div>
                    </section>
                  ))}
                </section>
              );
            })}
          </div>
        </article>
      </div>
    </div>
  );
}