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
  // ---- Content (deps + your existing sections) ----
const groups: Group[] = useMemo(() => [
  {
    label: 'Packages & add-ons',
    items: [
      {
        id: 'deps-overview',
        title: 'What do I actually need?',
        content: (
          <div className="space-y-2">
            <p>
              The gallery is plain React. You only <em>must</em> install <code>react</code> and <code>react-dom</code>.
              The rest are optional add-ons used by specific variations (custom scrollbars, video slides) or by this demo app.
            </p>
            <ul className="list-disc pl-5">
              <li><strong>Required:</strong> <code>react</code>, <code>react-dom</code></li>
              <li><strong>Optional:</strong> <code>simplebar</code> + <code>simplebar-react</code> (nice scrollbars), <code>plyr-react</code> (video slides)</li>
              <li><strong>Used in this repo’s demo app:</strong> <code>next</code> (not required to use the components)</li>
              <li><strong>TypeScript/dev:</strong> <code>typescript</code>, <code>@types/*</code>, ESLint (optional)</li>
            </ul>
          </div>
        )
      },
      {
        id: 'deps-core',
        title: 'Core install',
        content: (
          <div className="space-y-2">
            <pre className="rounded-md bg-[#0a0a0a] text-white text-xs p-3 overflow-x-auto">
              <code>{`npm i react react-dom`}</code>
              {"\n"}
              <code>{`# TypeScript projects`}</code>
              {"\n"}
              <code>{`npm i -D typescript @types/react @types/react-dom`}</code>
            </pre>
          </div>
        )
      },
      {
        id: 'deps-simplebar',
        title: 'Optional: SimpleBar (custom scrollbars)',
        content: (
          <div className="space-y-2">
            <p>A lightweight dependency used by the Thumbnails component to ensure consistent scrollbars (in terms of style and functionality) across all devices. It keeps the native overflow: auto scroll and only replaces the scrollbar visual appearance. Skip if you prefer native scroll.</p>
            <pre className="rounded-md bg-[#0a0a0a] text-white text-xs p-3 overflow-x-auto">
              <code>{`npm i simplebar simplebar-react`}</code>
              {"\n"}
              <code>{`# (optional TS types) npm i -D @types/simplebar`}</code>
            </pre>
            <pre className="rounded-md bg-slate-900 text-slate-100 text-xs p-3 overflow-x-auto">
              <code>{`import 'simplebar-react/dist/simplebar.min.css';
import SimpleBar from 'simplebar-react';

export function Thumbs({ children }: { children: React.ReactNode }) {
  return (
    <SimpleBar autoHide={false} forceVisible="y" style={{ maxHeight: 200 }}>
      <div className="flex gap-2">{children}</div>
    </SimpleBar>
  );
}`}</code>
            </pre>
            <p className="text-sm opacity-70">
              If your TS setup complains about <code>simplebar-react</code>, add a tiny shim:
            </p>
            <pre className="rounded-md bg-[#0a0a0a] text-white text-xs p-3 overflow-x-auto">
              <code>{`// types/simplebar-react.d.ts
declare module 'simplebar-react';`}</code>
            </pre>
          </div>
        )
      },
      {
        id: 'deps-plyr',
        title: 'Optional: Video slides (plyr-react)',
        content: (
          <div className="space-y-2">
            <p>Only needed if you want video inside slides.</p>
            <pre className="rounded-md bg-[#0a0a0a] text-white text-xs p-3 overflow-x-auto">
              <code>{`npm i plyr-react`}</code>
            </pre>
            <pre className="rounded-md bg-slate-900 text-slate-100 text-xs p-3 overflow-x-auto">
              <code>{`import 'plyr-react/plyr.css';
import { Plyr } from 'plyr-react';

export function VideoSlide({ src }: { src: string }) {
  return <Plyr source={{ type: 'video', sources: [{ src }] }} />;
}`}</code>
            </pre>
          </div>
        )
      },
      {
        id: 'deps-next',
        title: 'About Next.js in this repo',
        content: (
          <div className="space-y-2">
            <p>
              The repo uses Next.js for the demo/docs site. You don’t need Next.js to use the components—drop them into any React app.
            </p>
            <pre className="rounded-md bg-[#0a0a0a] text-white text-xs p-3 overflow-x-auto">
              <code>{`# only if you’re building a Next app
npm i next`}</code>
            </pre>
          </div>
        )
      }
    ]
  },
  {
  label: 'Data',
  items: [
    {
      id: 'data-shapes',
      title: 'Accepted shapes',
      content: (
        <div className="space-y-2">
          <p>Every slider accepts either a simple array of URLs or a typed array of <code>MediaItem</code>s. The library normalizes both.</p>
          <pre className="rounded-md bg-[#0a0a0a] text-white text-xs p-3 overflow-x-auto">
            <code>{`// Simple
type Urls = string[];

// Rich (recommended when you need thumbs or alts)
export type MediaItem =
  | { kind: 'image'; src: string; alt?: string }
  | { kind: 'video'; src: string; alt?: string; thumb?: string };`}</code>
          </pre>
          <p className="text-sm opacity-80">Use <code>MediaItem</code> when you want custom video posters or alt text.</p>
        </div>
      )
    },
    {
      id: 'data-urls',
      title: 'Passing plain URLs',
      content: (
        <div className="space-y-2">
          <pre className="rounded-md bg-[#0a0a0a] text-white text-xs p-3 overflow-x-auto">
            <code>{`const urls = [
  'https://.../image-1.jpg',
  'https://.../13927516_3840_2160_60fps.mp4',
  'https://.../image-2.jpg'
];

// Works with all sliders — they internally normalize:
<ThumbnailSlider urls={urls} />
<GroupedCellsSlider urls={urls} />
<ResponsiveSlider  urls={urls} />
<HeroSlider        urls={urls} />
<Autoplay          urls={urls} />
<MediaQuerySlider  urls={urls} />`}</code>
          </pre>
          <p className="text-sm opacity-70">Mix images and videos freely; order is preserved.</p>
        </div>
      )
    },
    {
      id: 'data-mediaitem',
      title: 'Passing MediaItem[]',
      content: (
        <div className="space-y-2">
          <pre className="rounded-md bg-slate-900 text-slate-100 text-xs p-3 overflow-x-auto">
            <code>{`const items: MediaItem[] = [
  { kind: 'image', src: 'https://.../image-1.jpg', alt: 'Image 1' },
  { kind: 'video', src: 'https://.../13927516_3840_2160_60fps.mp4',
    thumb: 'https://.../beach-video-thumb-portrait.jpg', alt: 'Beach video' },
  { kind: 'image', src: 'https://.../image-2.jpg', alt: 'Image 2' },
];

<ThumbnailSlider     items={items} />
<GroupedCellsSlider  items={items} />
<ResponsiveSlider    items={items} />
<HeroSlider          items={items} />
<Autoplay            items={items} />
<MediaQuerySlider    items={items} />`}</code>
          </pre>
          <p className="text-sm opacity-80">Prefer this form when you want per-item <code>alt</code> text or a custom video poster.</p>
        </div>
      )
    },
    {
      id: 'data-video-thumbs',
      title: 'Video posters (auto + custom)',
      content: (
        <div className="space-y-2">
          <ul className="list-disc pl-5">
            <li><strong>Automatic:</strong> if a video has no <code>thumb</code>, a poster is generated in-browser via <code>useVideoThumbnails.tsx</code>.</li>
            <li><strong>Custom:</strong> provide <code>thumb</code> on your <code>MediaItem</code> to override.</li>
          </ul>
          <pre className="rounded-md bg-[#0a0a0a] text-white text-xs p-3 overflow-x-auto">
            <code>{`// Auto poster (no thumb provided)
  { kind: 'video', src: 'https://.../clip.mp4' }

  // Custom poster
  { kind: 'video', src: 'https://.../clip.mp4', thumb: 'https://.../poster.jpg' }`}</code>
            </pre>
          </div>
        )
      },
      {
        id: 'data-accessibility',
        title: 'Accessibility (alt text)',
        content: (
          <div className="space-y-2">
            <p>Include <code>alt</code> on images and videos in <code>MediaItem</code> for screen readers.</p>
            <pre className="rounded-md bg-slate-900 text-slate-100 text-xs p-3 overflow-x-auto">
              <code>{`{ kind: 'image', src: 'https://.../hero.jpg', alt: 'Sunset over beach' }`}</code>
            </pre>
          </div>
        )
      },
      {
        id: 'data-performance',
        title: 'Performance tips',
        content: (
          <div className="space-y-2">
            <ul className="list-disc pl-5">
              <li>Use lower-res sources in the inline slider and high-res in fullscreen for best perf.</li>
              <li>Remote <code>https://</code> assets are fine; make sure they’re publicly accessible (CORS).</li>
              <li>Large videos? Consider shorter loops or compressed sources; posters avoid autoplay on load.</li>
            </ul>
          </div>
        )
      },
      {
        id: 'data-mapping',
        title: 'Mapping your own data',
        content: (
          <div className="space-y-2">
            <p>Have a CMS? Map whatever shape you have into <code>MediaItem</code> or a <code>string[]</code> in one place.</p>
            <pre className="rounded-md bg-[#0a0a0a] text-white text-xs p-3 overflow-x-auto">
              <code>{`// Example CMS → MediaItem
  const items: MediaItem[] = cms.records.map(r =>
    r.type === 'video'
      ? { kind: 'video', src: r.url, thumb: r.posterUrl, alt: r.title }
      : { kind: 'image', src: r.url, alt: r.alt }
  );`}</code>
            </pre>
          </div>
        )
      }
    ]
  },
  {
  label: 'Building blocks',
  items: [
    {
  id: 'blocks-overview',
  title: 'Overview',
  content: (
    <div className="space-y-4">
      <p>
        This library gives you three composable primitives for building premium media
        experiences: an inline slider for on-page browsing, a fullscreen modal + slider
        for immersive viewing, and gesture-driven zoom/pan/pinch. Use them standalone,
        mix and match, or wire them together for a seamless gallery flow.
      </p>

      <ul className="list-disc pl-5 text-sm space-y-1">
        <li>
          <strong>Inline Slider:</strong> smooth, physics-based free scroll with optional
          grouping/wrapping, wheel/touch/pointer navigation, and responsive layouts.
        </li>
        <li>
          <strong>Fullscreen Modal + Slider:</strong> fly-out transition from the
          thumbnail, edge-to-edge media, chevrons/counter UI, swipe/drag navigation,
          and smart wrapping that respects current index.
        </li>
        <li>
          <strong>Zoom · Pan · Pinch:</strong> click/tap to zoom, two-finger pinch on touch
          and trackpads, inertial panning, and safe bounds so images never “escape.”
        </li>
      </ul>

      <h4 className="font-semibold">Compose it your way</h4>
      <ul className="list-disc pl-5 text-sm space-y-1">
        <li><em>Inline-only:</em> product carousels, logo rails, editorial strips.</li>
        <li><em>Inline → Fullscreen:</em> tap a slide to enter an immersive viewer,
          preserving the selected index.</li>
        <li><em>Fullscreen-only:</em> open a media viewer from any trigger.</li>
        <li><em>Zoom layer anywhere:</em> attach zoom/pan/pinch to any image element.</li>
      </ul>
    </div>
  )
},
    {
      id: 'blocks-slider',
      title: 'Inline Slider',
      content: (
        <div className="space-y-3">
          <p>Slide index is tracked via <code>slideStore.tsx</code>. If you only want to use the inline slider with no fullscreen capabilities then refer to the Auto Scroll and Free Scroll components. Auto Scroll has wrapping logic while Free Scroll does not.</p>
        </div>
      )
    },

    {
      id: 'blocks-fullscreen',
      title: 'Fullscreen modal + fullscreen slider',
      content: (
        <div className="space-y-3">
          <p>Slide index is tracked via <code>fullscreenSlideStore.tsx</code>. Overlay, close button, chevrons and counter are wired up via the <code>toggleFullscreen</code> function inside <code>Slider.tsx</code>.</p>

          <p>All components have identical <code>FullscreenModal.tsx</code> and <code>FullscreenSlider.tsx</code> files with the exception of the <code>Hero</code> component which sets <code>sliderX</code> inside <code>FullscreenModal.tsx</code> differently due to center cell alignment.</p>
          <pre className="rounded-lg bg-[#0a0a0a] text-white p-3 overflow-auto text-xs">
            <code>
              {`sliderX.current =  totalWidth <= slider.current.clientWidth 
? cellLeft 
: isWrapping.current 
? -matchSlide.target + (containerWidth - cellWidth) / 2    // center alignmnet
: -matchSlide.target;`}
            </code>
          </pre>
          <h4 className="font-semibold mt-6">Preload fullscreen images</h4>
      <p className="text-sm">
        When the wrapped list is ready, refs are created per item and the browser cache gets warmed up:
      </p>
      <pre className="rounded-lg bg-[#0a0a0a] text-white p-3 overflow-auto text-xs">
        <code>{`useEffect(() => {
  if (!wrappedItems.length) return;
  imageRefs.current = wrappedItems.map(() => createRef());
  wrappedItems.forEach(item => {
    const img = new Image();
    img.src = item.src;
  });
}, [wrappedItems]);`}</code>
      </pre>

        </div>
      )
    },
{
  id: 'zoom-pan-pinch',
  title: 'Zoom, pan & pinch',
  content: (
    <div className="space-y-3">
      <p>
        The zoom state (true for zoomed in, false for zoomed out) is tracked via <code>scaleStore.tsx</code>. Panning (translate) transforms are applied to the fullscreen image container while zoom (scale) transforms are applied to the image itself.
      </p>

      <h4 className="font-semibold">Click / tap to zoom</h4>
      <ul className="list-disc pl-5 text-sm">
        <li>Triggered on pointer up inside <code>FullscreenSlider.tsx</code>, which calls your <code>handleZoomToggle(e, imageRef)</code>.</li>
        <li>The zoom amount (scale transform) is set via <code>clickScale</code>. Default value is <code>2.5</code>.</li>
      </ul>

      <h4 className="font-semibold">Pan (when zoomed)</h4>
      <ul className="list-disc pl-5 text-sm">
        <li>Initiated with <code>handlePanPointerStart(e, imageRef)</code> on the fullscreen image container.</li>
      </ul>

      <h4 className="font-semibold">Pinch zoom (touch & trackpad)</h4>
      <ul className="list-disc pl-5 text-sm">
        <li>Both touch and wheel events use the same <code>zoomTo</code> function for zooming in and out.</li>
        <li>Look for <code>const finalZoom = clamp(destZoomLevel, 1, 3)</code> inside the <code>zoomTo</code> function to set your desired clamp for the zoom amount. Default max scale is <code>3</code>.</li>
      </ul>

      <h4 className="font-semibold">Slide changes</h4>
      <ul className="list-disc pl-5 text-sm">
        <li>On <code>slideIndexSync</code> change the zoom state is reset.</li>
      </ul>
      
      
    </div>
  )
}



  ]
},
{
  label: 'Components',
  items: [
    {
      id: 'components-thumbnails',
      title: 'Thumbnails',
      content: (
        <div className="space-y-4">
          <p>
            One cell equals one slide. Works best when all images share the same dimensions.
            A horizontal scrollbar appears at ≤ 535px.
          </p>

          <div className="space-y-2">
            <p className="font-semibold">Usage</p>
            <pre className="rounded-md bg-[#0a0a0a] text-white text-xs p-3 overflow-x-auto">
              <code>{`import ThumbnailSlider from '@/app/components/Thumbnails';

<ThumbnailSlider items={items} />`}</code>
            </pre>
          </div>

          <div className="space-y-5">
            <div>
                <h4 className="font-semibold mt-8">Size and Layout</h4>
      <ul className="list-disc pl-5 text-sm space-y-5 mt-2">
        <li>
          <strong>Overall height (desktop):</strong> set inline in <code>Slider.tsx</code> on both the
          outer container and the fade wrapper:
          <pre className="rounded-md bg-[#0a0a0a] text-white text-[11px] p-3 overflow-x-auto mt-2">
            <code>{`<div ref={sliderContainer} className={styles.slider_container}
     style={{ position:'relative', height: imageCount > 2 ? '606px' : '600px' }} />

<div className={styles.fade_container}
     style={{ position:'relative', height: imageCount > 2 ? '606px' : '600px' }} />`}</code>
          </pre>
        </li>

        <li>
          <strong>Overall height (mobile ≤ 535px):</strong> forced via a media query in <code>Slider.module.css</code>:
          <pre className="rounded-md bg-[#0a0a0a] text-white text-[11px] p-3 overflow-x-auto mt-2">
            <code>{`@media (max-width: 535px) {
  .slider_container,
  .fade_container {
    height: 108.3vw !important;
  }
}`}</code>
          </pre>
        </li>

        <li>
          <strong>Wrapper defaults (desktop):</strong> <code>index.module.css</code> caps the visible area:
          <pre className="rounded-md bg-[#0a0a0a] text-white text-[11px] p-3 overflow-x-auto mt-2">
            <code>{`.container { height: 606px; max-height: 606px; overflow-x: hidden; }`}</code>
          </pre>
        </li>

        <li>
          <strong>Preview (right) column width (desktop):</strong> fixed at 400px:
          <pre className="rounded-md bg-[#0a0a0a] text-white text-[11px] p-3 overflow-x-auto mt-2">
            <code>{`.right_column { width: 400px; position: relative; overflow: hidden; }
.image_container { position: absolute; left: 0; max-width: 400px; }`}</code>
          </pre>
        </li>

        <li>
          <strong>Thumbnails column (desktop):</strong> 100px wide, vertical stack:
          <pre className="rounded-md bg-[#0a0a0a] text-white text-[11px] p-3 overflow-x-auto mt-2">
            <code>{`.thumbnail_container { width: 100px; flex-direction: column; gap: 4px; padding-right: 4px; }
.thumbnails { max-width: 100px; width: 100dvw; object-fit: contain; }`}</code>
          </pre>
        </li>

        <li>
          <strong>Mobile layout (≤ 535px):</strong> columns become a row of thumbnails under the preview,
          and the preview expands to the viewport width:
          <pre className="rounded-md bg-[#0a0a0a] text-white text-[11px] p-3 overflow-x-auto mt-2">
            <code>{`@media (max-width: 535px) {
  .container { height: 100%; max-height: 753px; }
  .columns_container { flex-direction: column-reverse; }
  .right_column_container, .right_column { width: 100dvw; }
  .thumbnail_container { flex-direction: row; width: 100%; }
  .image_container { width: calc(100% / 1.4); }
}`}</code>
          </pre>
          <p className='mt-2'><code> width: calc(100% / 1.4)</code> shows 100% of one image plus 40% of the next one.</p>
        </li>
      </ul>
            </div>
      

<div>
     <h4 className="font-semibold mt-8">What to tweak (quick reference)</h4>
      <ul className="list-disc pl-5 text-sm space-y-1 mt-2">
        <li>
          <strong>Desktop overall height:</strong> change <code>606px / 600px</code> via
          <code> Slider.tsx</code>.
        </li>
        <li>
          <strong>Mobile overall height:</strong> change <code>108.3vw</code> via <code>Slider.module.css</code>.
        </li>
        <li>
          <strong>Preview width (desktop):</strong> change <code>400px</code> in
          <code>.right_column</code>/<code>.image_container</code> via <code>index.module.tsx</code>.
        </li>
        <li>
          <strong>Preview width (mobile):</strong> adjust <code>.right_column</code> (e.g., keep 100dvw) and
          <code> .image_container</code> (e.g., <code>width: calc(100% / 1.2)</code> for larger preview).
        </li>
        <li>
          <strong>Thumb size:</strong> change <code>max-width: 100px</code> in <code> .thumbnails</code> and
          <code> width: 100px</code> in <code> .thumbnail_container</code>.
        </li>
      </ul>
</div>
      
    </div>
    <div className="space-y-5">
      <div>
        <h4 className="font-semibold mt-8">Mouse drag inside Thumbnail Container</h4>
        <p className="text-sm mt-2">
          The thumbnails rail supports physics-based drag scrolling with the mouse. This is
          scoped to the <strong>Thumbnails</strong> component only and doesn’t affect other sliders.
          It works on the actual scrollable element (SimpleBar’s inner scroller), not the wrapper.
        </p>
      </div>
      

<div>
<h4 className="font-semibold mb-2">Usage</h4>
      <pre className="rounded-md bg-[#0a0a0a] text-white text-[11px] p-3 overflow-x-auto">
        <code>{`import { useScrollDrag } from './useScrollDrag';

const { containerRef, handleMouseDown } = useScrollDrag();

// wire the hook to SimpleBar's scrollable element
useEffect(() => {
  if (simpleBarRef.current) {
    containerRef.current = simpleBarRef.current.getScrollElement() as HTMLElement;
  }
}, [simpleBarRef, containerRef]);

<div
  className={styles.thumbnail_container}
  ref={thumbnailContainerRef}
  onMouseDown={(e) => handleMouseDown(e.nativeEvent)}
  onPointerOver={() => setIsHovering(true)}
  onPointerLeave={() => setIsHovering(false)}
  style={{ display: normalizedItems.length > 1 ? 'flex' : 'none' }}
>
  {/* ...thumbnails... */}
</div>`}</code>
      </pre>
</div>
      

<div>
  <h4 className="font-semibold">What it does</h4>
      <ul className="list-disc pl-5 text-sm space-y-1 mt-2">
        <li><strong>Mouse drag → scroll:</strong> converts horizontal mouse movement into <code>scrollLeft</code> changes.</li>
        <li><strong>Inertia:</strong> after mouseup, continues scrolling with velocity decay (friction) via <code>requestAnimationFrame</code>.</li>
        <li><strong>Bounds safety:</strong> clamps at the start/end of the scroll range; stops the loop when velocity is near zero.</li>
        <li><strong>Coexists with SimpleBar:</strong> we target <code>simpleBarRef.current.getScrollElement()</code>, so custom track/scrollbar still work.</li>
      </ul>
</div>  
      

<div>
<h4 className="font-semibold">Why mouse only?</h4>
      <p className="text-sm mt-2">
        Touch and trackpads already provide native inertial scrolling; the hook adds parity for
        desktop mouse users without fighting the browser’s built-in touch behavior.
      </p>
</div>
      
    </div>
        </div>
      )
    },

    {
      id: 'components-grouped',
      title: 'Grouped Cells',
      content: (
        <div className="space-y-4">
          <p>
            Cells are grouped per slide. Accommodates mixed image sizes. In the demo, height is 300px and
            becomes <code>50vw</code> at ≤ 600px. Wrapping is disabled once the second-to-last image is visible
            (you control when/why wrapping happens).
          </p>

          <div className="space-y-2">
            <p className="font-semibold">Usage</p>
            <pre className="rounded-md bg-[#0a0a0a] text-white text-xs p-3 overflow-x-auto">
              <code>{`import GroupedCellsSlider from '@/app/components/Grouped Cells';

<GroupedCellsSlider items={heroItems} />`}</code>
            </pre>
          </div>

          <ul className="list-disc pl-5 text-sm">
            <li>Number of cells per slide adapts to how many fit in the container.</li>
            <li>You can gate wrapping based on any condition (e.g., visibility, index, width).</li>
          </ul>

          <div className="space-y-5">
            <div>
                <h4 className="font-semibold mt-8">Size and Layout</h4>
      <p className="text-sm mt-2">
        The Grouped Cells slider uses a fixed height on desktop (<code>300px</code>) and switches to a responsive height on small screens (<code>50vw</code>).
        Three places must agree on height:
      </p>
            </div>
            

      <ul className="list-disc pl-5 text-sm">
        <li><strong>Container shell:</strong> <code>.slider_container</code> and its inner <code>.fade_container</code> (from <code>Slider.module.css</code>).</li>
        <li><strong>Media itself:</strong> <code>.image</code> (and <code>.videoShell</code> for videos) in <code>index.module.css</code>.</li>
        <li><strong>Inline style on Slider.tsx:</strong> the <code>style={'{{ height: 300px }}'}</code> applied to both shells.</li>
      </ul>

      <pre className="rounded-md bg-[#0a0a0a] text-white text-[11px] p-3 overflow-x-auto">
        <code>{`/* index.module.css */
.container { overflow-x: hidden; }

.image { 
  position: absolute; 
  left: 0; 
  height: 300px; 
  display: block; 
  object-fit: contain; 
  cursor: zoom-in; 
  user-select: none; 
}
.image_container { position: relative; display: flex; }

@media (max-width: 600px) {
  .image, .videoShell { height: 50vw !important; }
}

/* Slider.module.css */
@media (max-width: 600px) {
  .slider_container, .fade_container { height: 50vw !important; }
}

/* Slider.tsx */
<div ref={sliderContainer}
     className={styles.slider_container}
     style={{ position: 'relative', height: '300px', backgroundColor: '#f8f9fa', zIndex: 1 }}>
  {!isReady && <div className={styles.shimmerOverlay} aria-hidden />}
  <div className={\`\${styles.fade_container} \${isReady && inView ? styles.fadeInActive : styles.fadeInStart}\`}
       style={{ position: 'relative', height: '300px' }}>
  </div>
</div>`}</code>
      </pre>
    </div>
        </div>
      )
    },

    {
      id: 'components-responsive',
      title: 'Responsive',
      content: (
        <div className="space-y-4">
          <p>
            Column-based layout that guarantees full image visibility per slide. The count of cells per slide
            is derived from your <code>maxWidth</code> (220 in the demo) with a minimum of 2 visible slides. 
            Best with uniform image sizes. Just look for the <code>calculateImagesPerSlide</code> function at the top of the <code>index.tsx</code> file to change the <code>maxWidth</code> value.
          </p>

          <div className="space-y-2">
            <p className="font-semibold">Usage</p>
            <pre className="rounded-md bg-[#0a0a0a] text-white text-xs p-3 overflow-x-auto">
              <code>{`import ResponsiveSlider from '@/app/components/Responsive';

<ResponsiveSlider items={items} />`}</code>
            </pre>
          </div>

          <ul className="list-disc pl-5 text-sm">
            <li>Tune <code>maxWidth</code> in the component to control columns.</li>
            <li>Great for galleries where every slide should be fully visible.</li>
          </ul>

          <div>
                <h4 className="font-semibold mt-8">Using resize event listener</h4>
      <p className="text-sm mt-2">
        Located at the top of <code>index.tsx</code>
      </p>
            </div>
            <pre className="rounded-md bg-[#0a0a0a] text-white text-[11px] p-3 overflow-x-auto">{`useEffect(() => {
  const handleResize = () => {
    const perSlide = calculateImagesPerSlide();
    imagesPerSlide.current = perSlide;
  };

  window.addEventListener("resize", handleResize);
  handleResize();

  return () => window.removeEventListener("resize", handleResize);
}, []);`}</pre>
        </div>
      )
    },

    {
      id: 'components-hero',
      title: 'Hero',
      content: (
        <div className="space-y-4">
          <p>
            A variation of the Grouped Cells slider with the only differences being centered slides, one cell per slide and height. Supports mixed image sizes.
          </p>

          <div className="space-y-2">
            <p className="font-semibold">Usage</p>
            <pre className="rounded-md bg-[#0a0a0a] text-white text-xs p-3 overflow-x-auto">
              <code>{`import HeroSlider from '@/app/components/Hero';

<HeroSlider items={heroItems} />`}</code>
            </pre>
          </div>

          <ul className="list-disc pl-5 text-sm">
            <li>Ideal for banners and landing “hero” sections with a single focal slide.</li>
          </ul>

          <div className="space-y-5">
            <div>
                <h4 className="font-semibold mt-8">Size and Layout</h4>
      <p className="text-sm mt-2">
        The Grouped Cells slider uses a fixed height on desktop (<code>400px</code>) and switches to a responsive height on small screens (<code>50vw</code>).
        Three places must agree on height:
      </p>
            </div>
            

      <ul className="list-disc pl-5 text-sm">
        <li><strong>Container shell:</strong> <code>.slider_container</code> and its inner <code>.fade_container</code> (from <code>Slider.module.css</code>).</li>
        <li><strong>Media itself:</strong> <code>.image</code> (and <code>.videoShell</code> for videos) in <code>index.module.css</code>.</li>
        <li><strong>Inline style on Slider.tsx:</strong> the <code>style={'{{ height: 400px }}'}</code> applied to both shells.</li>
      </ul>

      <pre className="rounded-md bg-[#0a0a0a] text-white text-[11px] p-3 overflow-x-auto">
        <code>{`/* index.module.css */
.container { overflow-x: hidden; }

.image { 
  position: absolute; 
  left: 0; 
  height: 400px; 
  display: block; 
  object-fit: contain; 
  cursor: zoom-in; 
  user-select: none; 
}
.image_container { position: relative; display: flex; }

@media (max-width: 600px) {
  .image, .videoShell { height: 50vw !important; }
}

/* Slider.module.css */
@media (max-width: 600px) {
  .slider_container, .fade_container { height: 50vw !important; }
}

/* Slider.tsx */
<div ref={sliderContainer}
     className={styles.slider_container}
     style={{ position: 'relative', height: '400px', backgroundColor: '#f8f9fa', zIndex: 1 }}>
  {!isReady && <div className={styles.shimmerOverlay} aria-hidden />}
  <div className={\`\${styles.fade_container} \${isReady && inView ? styles.fadeInActive : styles.fadeInStart}\`}
       style={{ position: 'relative', height: '400px' }}>
  </div>
</div>`}</code>
      </pre>
    </div>

    <div>
                <h4 className="font-semibold mt-8">Center Alignment</h4>
      <p className="text-sm mt-2">
        The code for centering slides is declared 6 times inside the <code>Slider.tsx</code> file and once inside the <code>FullscreenModal.tsx</code> file:
      </p>
            </div>
            <pre className="rounded-md bg-[#0a0a0a] text-white text-[11px] p-3 overflow-x-auto">{`(containerWidth - cellWidth) / 2`}</pre>

            <div>
                <h4 className="font-semibold mt-8">One Cell Per Slide</h4>
      <p className="text-sm mt-2">
        The code for creating one slide per cell is inside the <code>buildPages</code> function which is inside the <code>Slider.tsx</code> file. Active only if wrapping is enabled, else we pack as many cells as we can fit using the greedy packing algorihtm:
      </p>
            </div>
            <pre className="rounded-md bg-[#0a0a0a] text-white text-[11px] p-3 overflow-x-auto">{` if (isWrapping.current) {
    // one‑cell slides
    data.forEach((d, idx) => {
      pages.push({
        els:    [d.el],
        target: idx === 0 ? 0 : d.left
      });
    });
  } else {
    // pack as many as can fit`}</pre>
        </div>
      )
    },

    {
      id: 'components-auto-scroll',
      title: 'Auto Scroll',
      content: (
        <div className="space-y-4">
          <p>
            Constant-speed horizontal scroll powered by a RAF (requestAnimationFrame) loop. You can easily apply auto scrolling to any slider. The Demo component uses grouped cells, wrapping and just the inline slider. Fullscreen mode is intentionally disabled here because I wanted to demonstrate a common yet simple use case which is a logo slider that auto scrolls. The auto-scrolling behavior is inside a tiny <code>useEffect</code> that you can paste anywhere. Go inside <code>Slider.tsx</code> then look for <code>const SPEED = 0.1</code>. The <code>useEffect</code> is right under that variable. You have full control over when to pause the auto scrolling (hover, pointer down, focus, when the fullscreen modal is open, etc.).
          </p>

          <div className="space-y-2">
            <p className="font-semibold">Usage</p>
            <pre className="rounded-md bg-[#0a0a0a] text-white text-xs p-3 overflow-x-auto">
              <code>{`import AutoScroll from '@/app/components/Auto Scroll';

<AutoScroll urls={logoUrls} />`}</code>
            </pre>
          </div>

          <ul className="list-disc pl-5 text-sm">
            <li>Great for logo belts and marquee-style content.</li>
          </ul>

          <div>
                <h4 className="font-semibold mt-8">Wrapping Correction</h4>
      <p className="text-sm mt-2">
        When applying auto scroll to a custom component, make sure to paste this code inside the <code>wrapSelect</code> function directly under the line that checks if <code>isDragSelect.current</code> is <code>false</code>.
      </p>
            </div>
            <pre className="rounded-md bg-[#0a0a0a] text-white text-[11px] p-3 overflow-x-auto">{`const translateX = getCurrentXFromTransform(slider.current);
const wrapBound = translateX < -slider.current.getBoundingClientRect().width;
if (selectedIndex.current === 0 && wrapBound) {
  console.log('do nothing')
} else {
  sliderX.current = translateX;
}`}</pre>

<div>
                <h4 className="font-semibold mt-8">What if Fullscreen Mode is enabled?</h4>
      <p className="text-sm mt-2">
        It&apos;s recommended to include the <code>showFullscreenModal</code> state inside the useEffect dependency array and the early return check when using fullscreen features to optimize animation performance.
      </p>
            </div>
            <pre className="rounded-md bg-[#0a0a0a] text-white text-[11px] p-3 overflow-x-auto">{`if (
    !slider.current
    || !isWrapping.current
    || isPointerDown.current
    || showFullscreenSlider
    || isAnimating.current
  ) return;
    
    ...
    
  }, [showFullscreenSlider]);`}</pre>
        </div>
      )
    },

    {
      id: 'components-autoplay',
      title: 'Autoplay',
      content: (
        <div className="space-y-4">
          <p>
            Automatically advances to the next slide every N seconds (3s in the demo) using the <code>next()</code> function which is inside a <code>setInterval</code>. You can easily apply autoplay to any slider component. The code lives inside a tiny <code>useEffect</code> that you can paste anywhere. Aside from <code>SPEED_DELAY</code>, you can also tweak the value for <code>RESUME_DELAY</code> which is how long you want to wait before resuming autoplay after a pointer up event. You have full control over when to pause the autoplay (hover, pointer down, focus, when the fullscreen modal is open, etc.).
          </p>

          <div className="space-y-2">
            <p className="font-semibold">Usage</p>
            <pre className="rounded-md bg-[#0a0a0a] text-white text-xs p-3 overflow-x-auto">
              <code>{`import Autoplay from '@/app/components/Autoplay';

<Autoplay items={items} />`}</code>
            </pre>
          </div>
        </div>
      )
    },

    {
      id: 'components-media-query',
      title: 'Media Query',
      content: (
        <div className="space-y-4">
          <p>
            Full control over how many cells to show per slide across breakpoints.
          </p>

          <div className="space-y-2">
            <p className="font-semibold">Usage</p>
            <pre className="rounded-md bg-[#0a0a0a] text-white text-xs p-3 overflow-x-auto">
              <code>{`import MediaQuerySlider from '@/app/components/Media Query';

<MediaQuerySlider items={items} />`}</code>
            </pre>
          </div>

          <ul className="list-disc pl-5 text-sm">
            <li>Example: 2 cells on phones, 3 on tablets, 4 on desktop and 5 on large desktop.</li>
          </ul>

          <div>
                <h4 className="font-semibold mt-8">Using resize event listener</h4>
      <p className="text-sm mt-2">
        Located at the top of <code>index.tsx</code>
      </p>
            </div>
            <pre className="rounded-md bg-[#0a0a0a] text-white text-[11px] p-3 overflow-x-auto">{`useEffect(() => {
  const handleResize = () => {
    if (window.innerWidth > 0) {
      imagesPerSlide.current = 2
    }
    if (window.innerWidth >= 767) {
      imagesPerSlide.current = 3
    }
    if (window.innerWidth >= 1024) {
      imagesPerSlide.current = 4
    }
    if (window.innerWidth >= 1500) {
      imagesPerSlide.current = 5
    }
  };

  window.addEventListener("resize", handleResize);
  handleResize();

  return () => window.removeEventListener("resize", handleResize);
}, []);`}</pre>
        </div>
      )
    },
  ]
},


  // — keep the rest for now; we can fill these out next —
  {
    label: 'Behavior',
    items: [
      { id: 'behavior-wrapAround', title: 'wrapAround', content: <p>Infinite looping.</p> },
      { id: 'behavior-dragThreshold', title: 'dragThreshold', content: <p>Pixels before drag starts.</p> },
      { id: 'behavior-attraction-friction', title: 'selectedAttraction & friction', content: <p>Tweak spring physics.</p> },
      { id: 'behavior-freeScrollFriction', title: 'freeScrollFriction', content: <p>Friction while free scrolling.</p> },
    ]
  }
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
          <div className="text-[#0A0A0A] space-y-14">
            {groups.map(group => {
              const gid = `group-${slug(group.label)}`;
              return (
                <section key={group.label} className="space-y-10">
                  <h2 id={gid} className="scroll-mt-28 text-4xl font-semibold text-[#0A0A0A]">
                    <a href={`#${gid}`} onClick={scrollTo(gid)} className="hover:underline underline-offset-4 hover:text-blue-400 transition-color duration-150 ease-in-out">
                      {group.label}
                    </a>
                  </h2>

                  {group.items.map(item => (
                    <section key={item.id} className="space-y-2">
                      <h3 id={item.id} className="scroll-mt-28 text-2xl font-bold tracking-tight">
                        <a href={`#${item.id}`} onClick={scrollTo(item.id)} className="hover:underline underline-offset-4 hover:text-blue-400 transition-color duration-150 ease-in-out">
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