/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useRef, useEffect, ReactNode, Children, useState, ReactElement, RefObject, useLayoutEffect, isValidElement, useSyncExternalStore} from "react";
import styles from './Slider.module.css';
import slideStore from './slideStore';

function useSlideIndex() {
  return useSyncExternalStore(
    slideStore.subscribe.bind(slideStore),
    slideStore.getSnapshot.bind(slideStore),
    slideStore.getSnapshot.bind(slideStore)
  );
}

interface SliderProps {
  children: ReactNode;
  imageCount: number;
  isClick: RefObject<boolean>;
  slides: RefObject<{ cells: { element: HTMLElement, index: number }[], target: number }[]>;
  slider: RefObject<HTMLDivElement | null>;
  selectedIndex: RefObject<number>;
  firstCellInSlide: RefObject<HTMLElement | null>;
  sliderX: RefObject<number>;
  sliderVelocity: RefObject<number>;
}

const Slider = ({
  children,
  imageCount,
  isClick,
  slides,
  slider,
  selectedIndex,
  firstCellInSlide,
  sliderX,
  sliderVelocity
}: SliderProps) => {
  const isPointerDown = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const dragX = useRef(0);
  const previousDragX = useRef<number>(0);
  const dragStartPosition = useRef(0);
  const dragMoveTime = useRef<Date | null>(null);
  const dragThreshold = 5;
  const isAnimating = useRef(false);
  const restingFrames = useRef(0);
  const sliderWidth = useRef(0);
  const isScrolling = useRef(false);
  const [visibleImages, setVisibleImages] = useState(1);
  const friction = 0.28;
  const freeScrollFriction = 0.075
  const boundsAttraction = 0.015;
  const attraction = 0.025;
  // const progressFillRef = useRef<HTMLDivElement>(null);
  const isClosing = useRef(false);
  const slideIndexSync = useSlideIndex();
  const sliderContainer = useRef<HTMLDivElement | null>(null);
  const hasPositioned = useRef<boolean>(false);
  const [slidesState, setSlidesState] = useState<{ cells: { element: HTMLElement }[] }[]>([]);
  const prevButtonRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotsContainerRef = useRef<HTMLDivElement | null>(null);
  const [allImagesLoaded, setAllImagesLoaded] = useState(false);
  const prevTimeRef = useRef(0);
  const FPS = 60;
  const MS_PER_FRAME = 1000 / FPS;
  const [isMeasured, setIsMeasured]   = useState(false);   // widths positioned
  const [isReady, setIsReady]         = useState(false);   // fully ready to show
  const [inView, setInView]           = useState(false);   // IO has fired
  const lastForceX = useRef(0);
  const isFreeScrolling = useRef(false);
  const [layoutEpoch, setLayoutEpoch] = useState(0);
  const lastWidthRef = useRef(0);

  useEffect(() => {
    const container = slider.current;
    if (!container) return;

    const imgs = Array.from(container.querySelectorAll<HTMLImageElement>('img'));
    if (imgs.length === 0) {
      return;
    }

    let loadedCount = 0;
    const total = imgs.length;

    function onImgLoad() {
      loadedCount += 1;
      if (loadedCount === total) {
        setAllImagesLoaded(true);
      }
    }

    imgs.forEach(img => {
      if (img.complete && img.naturalWidth > 0) {
        // already cached & loaded
        onImgLoad();
      } else {
        img.addEventListener('load', onImgLoad);
        img.addEventListener('error', onImgLoad); // treat errors as “done” so you don’t hang
      }
    });

    return () => {
      imgs.forEach(img => {
        img.removeEventListener('load', onImgLoad);
        img.removeEventListener('error', onImgLoad);
      });
    };
  }, [children, visibleImages]);

  useLayoutEffect(() => {
    if (!slider.current || hasPositioned.current || sliderWidth.current === 0 || !slides.current || !slides.current[0] || !slides.current[0].cells[0]?.element) return;
    firstCellInSlide.current = slides.current[0].cells[0]?.element;
    const containerWidth = slider.current.clientWidth;
    if (sliderWidth.current <= slider.current.clientWidth) {
      sliderX.current = (containerWidth - sliderWidth.current) / 2;
      positionSlider();
    }
    hasPositioned.current = true;
  }, [slidesState]);

  useEffect(() => {
    const el = slider.current;
    if (!el) return;

    function handleResize() {
      if (!el) return;

      const cw = el.clientWidth;
      if (cw !== lastWidthRef.current) {
        lastWidthRef.current = cw;
        setLayoutEpoch(e => e + 1);     // 🔑 force re-measure/rebuild on any width change
      }

      const raw = Children.toArray(children).filter(isValidElement) as ReactElement<any>[];
      const n = raw.length - 1;
      if (n < 1) return;

      const allEls = Array.from(el.children) as HTMLElement[];
      let sum = 0, count = 0;
      for (const slot of allEls) {
        const w = slot.getBoundingClientRect().width;
        if (sum + w <= cw) { sum += w; count++; }
        else { count++; break; }
      }

      const clamped = Math.max(2, Math.min(n, count));
      setVisibleImages(clamped);
    }

    const observer = new ResizeObserver(handleResize);
    observer.observe(el);
    handleResize();
    return () => observer.disconnect();
  }, [children]);

  useEffect(() => {
    const GAP = 0;
    const container = slider.current;
    if (!container) return;

    const slides = Array.from(container.children) as HTMLElement[];
    let canceled = false;

    function measureAndPosition() {
      if (canceled) return;

      // 0) clear any previously‐locked widths so CSS can take over
      slides.forEach(sl => {
        sl.style.width = "";     // remove old inline width
        sl.style.transform = "";     // remove old transform if you like
      });

      // 1) measure each slide at its new CSS size
      const widths = slides.map(sl =>
        sl.getBoundingClientRect().width
      );

      // 2) if any are still zero, try again next frame
      if (widths.some(w => w === 0)) {
        return requestAnimationFrame(measureAndPosition);
      }

      // 3) now lock in the fresh widths and position
      slides.forEach((sl, i) => {
        sl.style.width = `${widths[i]}px`;
      });

      let runningX = 0; // <-- start at 0 (not -totalWidth)

      slides.forEach((sl, i) => {
        sl.style.transform = `translateX(${runningX}px)`;
        runningX += widths[i] + GAP;
      });

      sliderWidth.current =
        widths.reduce((sum, w) => sum + w, 0) + GAP * Math.max(0, widths.length - 1);

    }

    requestAnimationFrame(measureAndPosition);

    setIsMeasured(true);

    return () => { canceled = true; };

  }, [children, visibleImages, layoutEpoch]);

  useEffect(() => {
    const ready =
      allImagesLoaded &&
      slidesState.length > 0 &&
      isMeasured;

    if (ready) setIsReady(true);
  }, [allImagesLoaded, slidesState.length, isMeasured]);

  useEffect(() => {
    if (!isReady || !sliderContainer.current) return;
    const el = sliderContainer.current;

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        io.disconnect();
        setTimeout(() => {
          sliderX.current = 0;
          setTranslateX(0);
        }, 0)
        
      }
    }, { threshold: 0.2 });

    io.observe(el);
    return () => io.disconnect();
  }, [isReady]);

  useEffect(() => {
    const containerEl = slider.current;
    if (!containerEl) return;

    let canceled = false;

    // how many clones on each side?
    const rawKids = Children.toArray(children).filter(isValidElement);
    const childCount = rawKids.length;

    const cw = containerEl.getBoundingClientRect().width;

    function buildPages() {
      if (canceled) return;
      if (!containerEl) return;

      // slice out just the originals
      const allEls = Array.from(containerEl.children) as HTMLElement[];

      const idxMap = new Map<HTMLElement, number>(
        allEls.map((el, i) => [el, i])
      );

      // map to { el, left, right }
      const data = allEls.map(el => {
        const r = el.getBoundingClientRect();
        return {
          el,
          left:  r.left  - containerEl.getBoundingClientRect().left,
          right: r.right - containerEl.getBoundingClientRect().left
        };
      });

      // now build your pages exactly as before
      const pages: { els: HTMLElement[]; target: number }[] = [];
      let i = 0;
      
      while (i < childCount) {
        const startLeft = data[i]?.left;
        const viewRight = startLeft + cw;
        let j = i;
        // add fully‐visible cells
        while (j < childCount && data[j]?.right <= viewRight) {
          j++;
        }

        if (j === i) j++;

        const slice = allEls.slice(i, j);

        const isLast = j >= childCount;
        let target = startLeft;   
        
        if (isLast) {
          target = sliderWidth.current - cw
        }

        if (i === 0) target = 0;

        pages.push({ els: slice, target });
        i = j;
      }

      const newSlides = pages.map(page => ({
        target: page.target,
        cells: page.els.map(el => ({
          element: el,
          index: idxMap.get(el)!
        }))
      }));

      // trigger RAF‑retry if slides came out broken
      if ((newSlides[1] && newSlides[1].target === 0)) {
        requestAnimationFrame(buildPages);
        return;
      }

      slides.current = newSlides;
      setSlidesState(newSlides);
    }

    // kick off the RAF‑retry
    requestAnimationFrame(buildPages);

    return () => { canceled = true; };

  }, [children, visibleImages, layoutEpoch]);

  interface PointerEvent extends MouseEvent {
    touches?: Array<{
      clientX: number
      clientY: number
    }>
  }

  function setDraggingCursor(on: boolean) {
    sliderContainer.current?.classList.toggle(styles.dragging, on);
  }

  function handlePointerStart(e: PointerEvent) {
    if (!slider.current) return;
    const hit = (e.target as Node);

    if (prevButtonRef.current?.contains(hit)) {
      return;
    }

    if (nextButtonRef.current?.contains(hit)) {
      return;
    }

    const dotIndex = dotRefs.current.findIndex(dot => dot?.contains(hit));
    if (dotIndex >= 0) {
      return;
    }

    isClick.current = true;
    isScrolling.current = false;
    isPointerDown.current = true;

    setDraggingCursor(true);

    const translateX = slider.current ? getCurrentXFromTransform(slider.current) : 0;

    dragStartPosition.current = translateX;
    dragX.current = translateX;

    if (typeof TouchEvent !== "undefined" && e instanceof TouchEvent && "touches" in e && e.touches.length > 0) {
      const touch = e.touches[0];
      startX.current = touch.clientX;
      startY.current = touch.clientY;
    } else if ("clientX" in e) {
      startX.current = e.clientX;
      startY.current = e.clientY;
    }
    
    startAnimation();
  };

  function startAnimation() {
    if (isAnimating.current) return;
    
    isAnimating.current = true;
    restingFrames.current = 0;
    prevTimeRef.current    = performance.now();
    requestAnimationFrame(animate);
  };

  function animate(now: number) {
    const msPassed = now - prevTimeRef.current;
    if (msPassed < MS_PER_FRAME) {
      // not enough time has passed → try again next RAF
      requestAnimationFrame(animate);
      return;
    }
    // carry over any excess (for more stable timing)
    const excessTime = msPassed % MS_PER_FRAME;
    prevTimeRef.current = now - excessTime;

    if (isScrolling.current === true || isClosing.current) {
      isAnimating.current = false;
      restingFrames.current = 0;
      isClosing.current = false;
      return;
    };
    applyDragForce();
    applySelectedAttraction();

    const previousX = sliderX.current;

    integratePhysics();
    positionSlider();
    settle(previousX);

    if (isAnimating.current) requestAnimationFrame(animate);
  };

  function applyDragForce() {
    if (!isPointerDown.current) return;
  
    const dragVelocity = dragX.current - sliderX.current;
    const dragForce = dragVelocity - sliderVelocity.current;
    lastForceX.current = dragForce;
    applyForce(dragForce);
  };

  function applyForce(force: number) {
    sliderVelocity.current += force;
  };

  function integratePhysics() {
    sliderX.current += sliderVelocity.current;
    sliderVelocity.current *= getFrictionFactor();
  };

  function getFrictionFactor() {
    const frictionValue = isFreeScrolling.current === true ? freeScrollFriction : friction
    return 1 - frictionValue;
  }

  function positionSlider() {
    if (!slider.current) return;
    const currentPosition = sliderX.current;
    setTranslateX(currentPosition);
  };

  function settle(previousX: number) {
    const isResting = !isPointerDown.current && Math.abs(sliderX.current - previousX) < 0.01 && Math.abs(sliderVelocity.current) < 0.01;

    if (isResting) {
      restingFrames.current++;
    } else {
      restingFrames.current = 0;
    }

    if (restingFrames.current > 2) {
      isAnimating.current = false;
      restingFrames.current = 0;
      isFreeScrolling.current = false;

      if (!slider.current) return;
      positionSlider();
    }
  };

  function setTranslateX(x: number) {
    if (!slider.current) return;
    const translateX = getPositionValue(x);
    slider.current.style.transform = `translate3d(${translateX},0,0)`;
    // const pct =
    //   sliderWidth.current > 0
    //     ? Math.abs(x) / sliderWidth.current * 100
    //     : 0
    // if (progressFillRef.current) {
    //   progressFillRef.current.style.width = `${pct > 99 ? 0 : pct}%`
    // }
  };

  function getPositionValue(position: number) {
    return Math.round(position) + 'px';
  };

  interface PointerMoveEvent extends MouseEvent {
    touches?: Array<{
      clientX: number
      clientY: number
    }>
  }  

  function handlePointerMove(e: PointerMoveEvent) {
    if (!slider.current) return;
    if (!isPointerDown.current) return;
    e.preventDefault();

    previousDragX.current = dragX.current;

    let currentX: number = 0, currentY: number = 0;

    if (typeof TouchEvent !== "undefined" && e instanceof TouchEvent && "touches" in e && e.touches.length > 0) {
      const touch = (e as TouchEvent).touches[0];
      currentX = touch.clientX;
      currentY = touch.clientY;
    } else if ("clientX" in e) { 
      currentX = e.clientX;
      currentY = e.clientY;
    }

    const moveX = currentX - startX.current;
    const moveY = currentY - startY.current;

    dragX.current = dragStartPosition.current + moveX;

    const originBound = Math.max(0, dragStartPosition.current);

    if (dragX.current > originBound) {
      dragX.current = (dragX.current + originBound) * 0.5;
    }

    const lastSlide = sliderWidth.current <= slider.current.clientWidth ? -(slider.current.clientWidth - sliderWidth.current) / 2 : slides.current[slides.current.length - 1].target;
    const endBound = Math.min(-lastSlide, dragStartPosition.current);

    if (dragX.current < endBound) {
      dragX.current = (dragX.current + endBound) * 0.5;
    }

    if (Math.abs(moveX) > dragThreshold || Math.abs(moveY) > dragThreshold) {
      isClick.current = false;
    }

    dragMoveTime.current = new Date();
  };

  function handlePointerEnd() {
    if (!slider.current) return;
    if (!isPointerDown.current) return;
    isPointerDown.current = false;
    isFreeScrolling.current = true;

    const forceThreshold = 0.1;

    if (
      Math.abs(lastForceX.current) > forceThreshold &&
      Math.abs(sliderVelocity.current) === 0
    ) {
      applyForce(-lastForceX.current);
      startAnimation();
    }
  
    lastForceX.current = 0;

    const index = dragEndRestingSelect();

    select(index);

    setDraggingCursor(false);
  };

  function dragEndRestingSelect() {
    const restingX = getRestingPosition();

    const distance = Math.abs(getSlideDistance(-restingX, selectedIndex.current) ?? Infinity);

    const positiveResting = getClosestResting(restingX, distance, 1);
    const negativeResting = getClosestResting(restingX, distance, -1);
    
    return positiveResting.distance < negativeResting.distance ?
      positiveResting.index : negativeResting.index;
  };

  function getSlideDistance(x: number, index: number) {
    if (!slider.current) return 1;
    const slide = slides.current[index];
    if (!slide) return null;

    return x - slide.target;
  };

  function getClosestResting(restingX: number, distance: number, increment: number) {
    let index = selectedIndex.current;
    let minDistance = Infinity;
  
    while (distance <= minDistance) {
      index += increment;
      minDistance = distance;
      distance = getSlideDistance(-restingX, index) ?? Infinity;
      if (distance === null) break;

      distance = Math.abs(distance);
    };
  
    return {
      distance: minDistance,
      index: index - increment,
    };
  };

  function getRestingPosition() {
    return sliderX.current + sliderVelocity.current / (1 - getFrictionFactor());
  };

  function applySelectedAttraction() {
    if (isPointerDown.current) return;
    if (!slider.current) return;

    if (isFreeScrolling.current) {
      const restingX = getRestingPosition();

      if (-sliderX.current < slides.current[0].target) {
        const distance = -slides.current[0].target - restingX;
        const force = distance * boundsAttraction;
        applyForce(force);
      } else if (-sliderX.current > slides.current[slides.current.length - 1].target) {
        const distance = -slides.current[slides.current.length - 1].target - restingX;
        const force = distance * boundsAttraction;
        applyForce(force);
      }
    } else {
      let distance = -slides.current[selectedIndex.current].target - sliderX.current;

      const containerWidth = slider.current.clientWidth;

      if (sliderWidth.current <= slider.current.clientWidth) {
        distance = (containerWidth - sliderWidth.current) / 2 - sliderX.current;
      }
      const force = distance * attraction;
      applyForce(force);
    }
    
  }

  function previous() {
    isScrolling.current = false;
    isFreeScrolling.current = false;
    select(selectedIndex.current - 1);
  };

  function next() {
    isScrolling.current = false;
    isFreeScrolling.current = false;
    select(selectedIndex.current + 1);
  };

  function select(index: number) {
    if (!slider.current) return;
    const containedIndex = index < 0 ? 0 : index > slides.current.length - 1 ? slides.current.length - 1 : index;
    selectedIndex.current = containedIndex;
    slideStore.setSlideIndex(containedIndex);
    firstCellInSlide.current = slides.current[containedIndex].cells[0]?.element;
    startAnimation();
  };

  useEffect(() => {
    const el = slider.current;
    if (!el) return;

    function handleResize() {
      if (!el || !firstCellInSlide.current) return;

      const containerWidth = el.clientWidth;

      if (sliderWidth.current <= containerWidth) {
        const currentPosition = (containerWidth - sliderWidth.current) / 2;
        setTranslateX(currentPosition);
      }
    }

    const observer = new ResizeObserver(handleResize);
    observer.observe(el);

    handleResize();

    return () => {
      observer.disconnect();
    };
  }, []);

  interface SliderElement extends HTMLDivElement {
    style: CSSStyleDeclaration;
  }

  function getCurrentXFromTransform(slider: SliderElement): number {
    const computedStyle = window.getComputedStyle(slider);
    const transform = computedStyle.transform;
    if (!transform || transform === 'none') return 0;

    const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
    if (!matrixMatch) return 0;

    const matrixValues = matrixMatch[1].split(',').map(parseFloat);
    const tx = matrixValues[4];

    return tx;
  }

  interface WheelEvent extends Event {
    deltaX: number;
    deltaY: number;
  }

  function handleWheel(e: WheelEvent) {
    if (!slider.current) return;

    const sliderEl = slider.current;
    const containerWidth = sliderEl.clientWidth;
    const contentWidth   = sliderWidth.current;

    const canScrollHorizontally = sliderWidth.current > containerWidth;
    const isHorizontalScroll = Math.abs(e.deltaX) > Math.abs(e.deltaY);

    // 🔹 Handle horizontal scrolling
    if (isHorizontalScroll && canScrollHorizontally) {
      isScrolling.current = true;
      e.preventDefault(); // ✅ Only block default if we scroll horizontally

      let translateX = getCurrentXFromTransform(sliderEl);
      translateX -= e.deltaX;

      let currentPosition = translateX;

      const maxTranslateX = 0;
      const minTranslateX = containerWidth - contentWidth;

      currentPosition = Math.max(minTranslateX, Math.min(maxTranslateX, translateX));

      setTranslateX(currentPosition);

      const index = Math.round(
        Math.abs(currentPosition) / (sliderWidth.current / slides.current.length)
      );
      selectedIndex.current = index;
      slideStore.setSlideIndex(index);
      sliderX.current = currentPosition;
      firstCellInSlide.current = slides.current[index].cells[0]?.element;

      return;
    }

    // 🔹 Else, let vertical scroll go through
    isScrolling.current = false;
  }

  useEffect(() => {
    const sliderContainerRef = sliderContainer.current;
  
    if (sliderContainerRef) {
      sliderContainerRef.addEventListener("pointerdown", handlePointerStart);
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerEnd);
      sliderContainerRef.addEventListener("wheel", handleWheel, { passive: false });

      return () => {
        sliderContainerRef.removeEventListener("pointerdown", handlePointerStart);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerEnd);
        sliderContainerRef.removeEventListener("wheel", handleWheel);
      };
    };
  }, []);

  const Arrow = ({ direction, size = 32 }: { direction: "prev" | "next"; size?: number }) => (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="#000"
      xmlns="http://www.w3.org/2000/svg"
    >
      {direction === "prev" ? (
        <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" />
      ) : (
        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
      )}
    </svg>
  );

  function onTouchStart(e: TouchEvent) {
    const t0 = e.touches[0];
    startX.current = t0.clientX;
    startY.current = t0.clientY;
  }

  function onTouchMove(e: TouchEvent) {
    if (e.touches.length !== 1) return;

    const t0 = e.touches[0];
    const dx = t0.clientX - startX.current;
    const dy = t0.clientY - startY.current;

    const angle = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));
    const isMostlyVertical = Math.abs(dy) > Math.abs(dx);
    const isVerticalScroll = (angle >= 60 && angle <= 120) || isMostlyVertical;

    if (!isVerticalScroll) {
      // horizontal gesture → only prevent default to block browser from hijacking it
      e.preventDefault();
    }
  }

  useEffect(() => {
    const sliderContainerRef = sliderContainer.current!;
    sliderContainerRef.addEventListener('touchstart', onTouchStart, { passive: false })
    sliderContainerRef.addEventListener('touchmove',  onTouchMove,  { passive: false })
    return () => {
      sliderContainerRef.removeEventListener('touchstart', onTouchStart)
      sliderContainerRef.removeEventListener('touchmove',  onTouchMove)
    }
  }, []);

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
    span.className = styles['ripple'];
    span.style.width  = `${diameter}px`;
    span.style.height = `${diameter}px`;
    span.style.left   = `${x}px`;
    span.style.top    = `${y}px`;

    container.appendChild(span);
    span.addEventListener('animationend', () => span.remove());
  }
  

  return (
    <div ref={sliderContainer} className={styles.slider_container} style={{ position: 'relative', height: '400px', zIndex: 1 }}>
      {/* Shimmer covers everything until ready */}
      {!isReady && <div className={styles.shimmerOverlay} aria-hidden />}
      <div className={`${styles.fade_container} ${
        isReady && inView ? styles.fadeInActive : styles.fadeInStart
      }`} style={{ position: 'relative',  height: '400px' }}>
        {/* Previous Button */}
        <div
          ref={prevButtonRef}
          onClick={() => {
            const btn = prevButtonRef.current;
            if (btn) createRipple(btn);
            previous();
          }}
          style={{
            position: "absolute",
            overflow: "hidden",
            display:
              imageCount > 1 && slider.current && sliderWidth.current > slider.current.clientWidth
                ? "flex"
                : "none",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "rgba(255, 255, 255, 0.75)",
            boxShadow: "0 0 5px rgba(0, 0, 0, 0.5)",
            borderRadius: "100%",
            zIndex: 2,
            width: 36,
            height: 36,
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <Arrow direction="prev" size={32} />
        </div>

        <div
          ref={nextButtonRef}
          onClick={() => {
            const btn = nextButtonRef.current;
            if (btn) createRipple(btn);
            next();
          }}
          style={{
            position: "absolute",
            overflow: "hidden",
            display:
              imageCount > 1 && slider.current && sliderWidth.current > slider.current.clientWidth
                ? "flex"
                : "none",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "rgba(255, 255, 255, 0.75)",
            boxShadow: "0 0 5px rgba(0, 0, 0, 0.5)",
            borderRadius: "100%",
            zIndex: 2,
            width: 36,
            height: 36,
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <Arrow direction="next" size={32} />
        </div>
        {/* Slider */}
        <div 
          ref={slider}
          style={{ 
            width: '100%',
          }}
        >
          {children}
        </div>
        {/* Pagination Dots */}
        <div
          ref={dotsContainerRef}
          style={{
            display: slider.current && sliderWidth.current <= slider.current.clientWidth ? "none" : "flex",
            justifyContent: "center",
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: 10,
            zIndex: 10,
            background: "rgba(0, 0, 0, 0.5)",
            padding: "4px 8px",
            borderRadius: "9999px",
            cursor: 'auto'
          }}
        >
          {slidesState.map((_, index) => {
            const isActive = slideIndexSync === index;
            return (
              <div
                key={index}
                ref={(el) => {
                  dotRefs.current[index] = el;
                }}
                onClick={() => {
                  const btn = dotRefs.current[index];
                  if (btn) createRipple(btn);
                  isScrolling.current = false;
                  isFreeScrolling.current = false;
                  select(index);
                }}
                className={`${styles.pagination_dot} ${isActive ? styles.active : styles.inactive}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Slider;