/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useRef, useEffect, ReactNode, cloneElement, Children, useState, createRef, Dispatch, SetStateAction, ReactElement, HTMLAttributes, ClassAttributes, RefObject, useLayoutEffect, useSyncExternalStore, isValidElement } from "react";
import slideStore from './slideStore';
import styles from './Slider.module.css';

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
  expandableImgRefs: RefObject<RefObject<HTMLImageElement | null>[]>;
  overlayDivRef: RefObject<HTMLDivElement | null>;
  setSlideIndex: (index: number) => void;
  setShowFullscreenModal: (show: boolean) => void;
  setShowFullscreenSlider: Dispatch<SetStateAction<boolean>>;
  showFullscreenSlider: boolean;
  isWrapping: RefObject<boolean>;
  slides: RefObject<{ cells: { element: HTMLElement, index: number }[], target: number }[]>;
  slider: RefObject<HTMLDivElement | null>;
  visibleImagesRef: RefObject<number>;
  selectedIndex: RefObject<number>;
  firstCellInSlide: RefObject<HTMLElement | null>;
  sliderX: RefObject<number>;
  sliderVelocity: RefObject<number>;
}

type CarouselChildProps =
  HTMLAttributes<HTMLElement> &
  ClassAttributes<HTMLElement> & {
    style?: React.CSSProperties
  }

function cloneSlide(
  child: ReactElement<any>,
  key: string,
  elementIndex: number,
  cells: React.RefObject<
    { element: HTMLElement; index: number }[]
  >
): ReactElement<CarouselChildProps> {
  return cloneElement<CarouselChildProps>(child, {
    key,
    ref: (el: HTMLElement | null) => {
      if (el && !cells.current.some(c => c.element === el)) {
        cells.current.push({ element: el, index: elementIndex })
      }
    },
    style: {
      ...child.props.style,
    },
  })
}

const Slider = ({
  children,
  imageCount,
  isClick,
  expandableImgRefs,
  overlayDivRef,
  setSlideIndex,
  setShowFullscreenModal,
  setShowFullscreenSlider,
  showFullscreenSlider,
  isWrapping,
  slides,
  slider,
  visibleImagesRef,
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
  const [clonedChildren, setClonedChildren] = useState<React.ReactElement[]>([]);
  const clonesCountRef = useRef(0);
  const [visibleImages, setVisibleImages] = useState(1);
  const friction = 0.28;
  const attraction = 0.025;
  const cells = useRef<{ element: HTMLElement, index: number }[]>([]);
  const isDragSelect = useRef<boolean>(false);
  const lastTranslateX = useRef<number>(0);
  // const progressFillRef = useRef<HTMLDivElement>(null);
  const isClosing = useRef(false);
  const slideIndexSync = useSlideIndex();
  const sliderContainer = useRef<HTMLDivElement | null>(null);
  const hasPositioned = useRef<boolean>(false);
  const [slidesState, setSlidesState] = useState<{ cells: { element: HTMLElement }[] }[]>([]);
  const [allImagesLoaded, setAllImagesLoaded] = useState(false);
  const prevTimeRef = useRef(0);
  const FPS = 60;
  const MS_PER_FRAME = 1000 / FPS;
  const prevButtonRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);

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
  }, [children, clonedChildren, visibleImages]);

  useLayoutEffect(() => {
    if (!slider.current || cells.current.length === 0 || hasPositioned.current || sliderWidth.current === 0 || !slides.current || !slides.current[0] || !slides.current[0].cells[0]?.element) return;
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
      const raw = Children
        .toArray(children)
        .filter(isValidElement) as ReactElement<any>[];
      const n = raw.length - 1;

      const per  = visibleImages;
      const wrap = n > per;

      isWrapping.current     = wrap;
      clonesCountRef.current = wrap ? per : 0;

      cells.current = [];
      const slides: ReactElement<any>[] = [];

      if (wrap) {
        slides.push(
          ...raw.slice(-per).map((c, i) =>
            cloneSlide(c, `before-${i}`, -per + i, cells)
          )
        );
      }

      slides.push(
        ...raw.map((c, i) =>
          cloneSlide(c, `original-${i}`, i, cells)
        )
      );

      if (wrap) {
        slides.push(
          ...raw.slice(0, per).map((c, i) =>
            cloneSlide(c, `after-${i}`, i, cells)
          )
        );
      }

      setClonedChildren(slides);
    }

    const observer = new ResizeObserver(() => {
      handleResize();
    });

    observer.observe(el);

    handleResize();

    return () => {
      observer.disconnect();
    };
  }, [children, visibleImages, allImagesLoaded]);

  useEffect(() => {
    const el = slider.current;
    if (!el) return;

    function handleResize() {
      if (!el || cells.current.length === 0) return;

      const raw = Children
        .toArray(children)
        .filter(isValidElement) as ReactElement<any>[];
      const n = raw.length - 1;
      if (n < 1) return;

      const allEls    = Array.from(el.children) as HTMLElement[];
      const cCount    = clonesCountRef.current;
      const originals = allEls.slice(cCount, allEls.length - cCount);

      const cw    = el.clientWidth;
      let sum = 0, count = 0;
      for (const slot of originals) {
        const w = slot.getBoundingClientRect().width;
        if (sum + w <= cw) {
          sum += w;
          count++;
        } else {
          count++;
          break;
        }
      }

      const clamped = Math.max(2, Math.min(n, count));
      setVisibleImages(clamped);
      visibleImagesRef.current = clamped;
    }

    const observer = new ResizeObserver(() => {
      handleResize();
    });

    observer.observe(el);

    handleResize();

    return () => {
      observer.disconnect();
    };
  }, [children, clonedChildren]);

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

      const clonesBefore = clonesCountRef.current;
      const beforeWidths = widths.slice(0, clonesBefore);
      let runningX = -(
        beforeWidths.reduce((sum, w) => sum + w, 0)
        + GAP * clonesBefore
      );

      slides.forEach((sl, i) => {
        sl.style.transform = `translateX(${runningX}px)`;
        runningX += widths[i] + GAP;
      });

      // recompute total width for wrap logic
      const origWidths = widths.slice(
        clonesBefore,
        widths.length - clonesBefore
      );
      sliderWidth.current = origWidths.reduce((sum, w) => sum + w, 0) 
      + GAP * origWidths.length;
    }

    requestAnimationFrame(measureAndPosition);

    return () => { canceled = true; };

  }, [clonedChildren, visibleImages]);

  useEffect(() => {
    const containerEl = slider.current;
    if (!containerEl) return;

    let canceled = false;

    // how many clones on each side?
    const rawKids = Children.toArray(children).filter(isValidElement);
    const childCount = rawKids.length;
    const clonesBefore = isWrapping.current ? visibleImages : 0;
    const clonesAfter = clonesBefore;

    const cw = containerEl.getBoundingClientRect().width;

    function buildPages() {
      if (canceled) return;
      if (!containerEl) return;

      // slice out just the originals
      const allEls = Array.from(containerEl.children) as HTMLElement[];
      const originals = allEls.slice(clonesBefore, allEls.length - clonesAfter);

      // map to { el, left, right }
      const data = originals.map(el => {
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

        const slice = originals.slice(i, j);

        const isLast = j >= childCount;
        let target = startLeft;   
        
        if (isLast && !isWrapping.current) {
          target = sliderWidth.current - cw
        }

        if (i === 0) target = 0;

        pages.push({ els: slice, target });
        i = j;
      }

      // commit
      const newSlides = pages.map(page => ({
        target: page.target,
        cells:  page.els.map(el => {
          const c = cells.current.find(c => c.element === el)!;
          return { element: el, index: c?.index };
        })
      }));

      // trigger RAF‑retry if slides came out broken
      if (newSlides[1] && newSlides[1].target === 0 || (isWrapping.current && newSlides.length === 1)) {
        requestAnimationFrame(buildPages);
        return;
      }

      slides.current = newSlides;
      setSlidesState(newSlides);
    }

    // kick off the RAF‑retry
    requestAnimationFrame(buildPages);

    return () => { canceled = true; };

  }, [children, clonedChildren, visibleImages, isWrapping.current]);

  useEffect(() => {
    if (!slider.current) return;
  
    const childrenArray = Children.toArray(children);

    const imgOffset = !isWrapping.current ? 0 : visibleImages * 2;
    if (clonedChildren.length !== Children.toArray(children).length + imgOffset) return;
  
    // 🔹 Step 2: Clear existing refs before creating new ones
    expandableImgRefs.current = [];
  
    // 🔹 Step 3: Create new refs
    expandableImgRefs.current = Array(childrenArray.length + imgOffset)
      .fill(null)
      .map(() => createRef<HTMLImageElement>());
  
    const images = slider.current.querySelectorAll("img");
  
    images.forEach((img, index) => {
      if (expandableImgRefs.current[index]) {
        expandableImgRefs.current[index].current = img;
      }
    });
  
    // 🔹 Step 4: Cleanup function to remove event listeners & reset refs
    return () => {
      expandableImgRefs.current = [];
    };
  
  }, [children, clonedChildren, visibleImages, isWrapping.current]);

  interface PointerEvent extends MouseEvent {
    touches?: Array<{
      clientX: number
      clientY: number
    }>
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
    prevTimeRef.current = performance.now();
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
    return 1 - friction;
  }

  function positionSlider() {
    if (!slider.current) return;
    let currentPosition = sliderX.current;
    if (!isClick.current && isWrapping.current === true) {
      currentPosition = ((currentPosition % sliderWidth.current) + sliderWidth.current) % sliderWidth.current;
      currentPosition += -sliderWidth.current;
    }
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

      if (!slider.current) return;
      positionSlider();
    }
  };

  const SPEED_DELAY = 3000; // 3s between slides
  const RESUME_DELAY = 1000; // 1s after pointer up
  const lastPointerUpTime = useRef<number>(performance.now() - 1000);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = performance.now();
      if (
        isPointerDown.current ||
        showFullscreenSlider ||
        !isWrapping.current
      ) {
        return;
      }
      if (now - lastPointerUpTime.current < RESUME_DELAY) return;
      next();
    }, SPEED_DELAY);

    return () => {
      window.clearInterval(id);
    };
  }, [showFullscreenSlider, slidesState, slideIndexSync, allImagesLoaded, clonedChildren, isWrapping.current]);

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

    if (!isWrapping.current) {
      const originBound = Math.max(0, dragStartPosition.current);

      if (dragX.current > originBound) {
        dragX.current = (dragX.current + originBound) * 0.5;
      }

      const lastSlide = sliderWidth.current <= slider.current.clientWidth ? -(slider.current.clientWidth - sliderWidth.current) / 2 : slides.current[slides.current.length - 1].target;
      const endBound = Math.min(-lastSlide, dragStartPosition.current);

      if (dragX.current < endBound) {
        dragX.current = (dragX.current + endBound) * 0.5;
      }
    }

    if (Math.abs(moveX) > dragThreshold || Math.abs(moveY) > dragThreshold) {
      isClick.current = false;
    }

    dragMoveTime.current = new Date();
  };
  
  type PointerEndEvent = MouseEvent;

  function handlePointerEnd(e: PointerEndEvent) {
    if (!slider.current || !isPointerDown.current) return;
    isPointerDown.current = false;

    if (sliderWidth.current <= slider.current.clientWidth) {
      select(0);
    }

    let index = dragEndRestingSelect();

    if (isClick.current) {
      isClosing.current = true;

      const targetImg = (e.target as HTMLElement)
        .closest("img") as HTMLImageElement | null;
      if (!targetImg) return;

      const parsedImgIndex = expandableImgRefs.current.findIndex(
        (ref) => ref.current === targetImg
      );
      if (parsedImgIndex < 0) return;

      const originalIndex =
        ((parsedImgIndex - visibleImagesRef.current) % imageCount + imageCount) %
        imageCount;
      const fullscreenIndex = originalIndex + 1;
      const finalIndex = !isWrapping.current
        ? parsedImgIndex
        : fullscreenIndex;

      setShowFullscreenModal(true);
      toggleFullscreen(
        e as unknown as React.PointerEvent<HTMLDivElement>,
        expandableImgRefs.current[parsedImgIndex],
        finalIndex
      );
      setSlideIndex(finalIndex);
    } else {
      if (!isWrapping.current) {
        if (index === selectedIndex.current) {
          index += dragEndBoostSelect();
        }
      } else {
        if (
          index === selectedIndex.current ||
          (index === slides.current.length && selectedIndex.current === 0)
        ) {
          index += dragEndBoostSelect();
        }
      }
    }

    isDragSelect.current = true;
    select(index);
    isDragSelect.current = false;
  }

  function dragEndBoostSelect() {
    const movedAt = dragMoveTime.current;
    if (
      (!movedAt ||
      (new Date().getTime() - movedAt.getTime()) > 100) && isWrapping.current === true
    ) {
      return 0;
    }
  
    const delta = previousDragX.current - dragX.current;

    if (delta > 0) {
      return 1;
    } else if (delta < 0) {
      return -1;
    };
    return 0;
  };

  function applySelectedAttraction() {
    if (isPointerDown.current) return;
    if (!slider.current) return;

    const index = selectedIndex.current >= slides.current.length - 1 && slides.current[slides.current.length - 1].target === sliderWidth.current ? 0 : selectedIndex.current;

    let distance = -slides.current[index].target - sliderX.current;

    const containerWidth = slider.current.clientWidth;

    if (sliderWidth.current <= slider.current.clientWidth) {
      distance = (containerWidth - sliderWidth.current) / 2 - sliderX.current;
    }
    const force = distance * attraction;
    applyForce(force);
  }

  function dragEndRestingSelect() {
    const restingX = getRestingPosition();

    const distance = Math.abs(getSlideDistance(-restingX, selectedIndex.current) ?? Infinity);

    const positiveResting = getClosestResting(restingX, distance, 1);
    const negativeResting = getClosestResting(restingX, distance, -1);
    
    return positiveResting.distance < negativeResting.distance ?
      positiveResting.index : negativeResting.index;
  };

  function getRestingPosition() {
    return sliderX.current + sliderVelocity.current / (1 - getFrictionFactor());
  };

  function getSlideDistance(x: number, index: number) {
    if (!slider.current) return 1;
    const length = slides.current[slides.current.length - 1].target === sliderWidth.current || !isWrapping.current ? slides.current.length - 1 : slides.current.length;
    const slideIndex = ((index % length) + length) % length;
    const slide = slides.current[slideIndex];
    if (!slide) return null;
    let wrap = sliderWidth.current * Math.floor(index/length);
    if (sliderWidth.current <= slider.current.clientWidth || !isWrapping.current) {
      wrap = 0;
    }

    return x - (slide.target + wrap);
  };

  function getClosestResting(restingX: number, distance: number, increment: number) {
    let index = selectedIndex.current;
    let minDistance = Infinity;
  
    while (distance < minDistance) {
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

  function previous() {
    isScrolling.current = false;
    select(selectedIndex.current - 1);
  };

  function next() {
    isScrolling.current = false;
    select(selectedIndex.current + 1);
  };

  function select(index: number) {
    if (!slider.current) return;
    if (isWrapping.current === true) {
      wrapSelect(index);
    }
    const containedIndex = index < 0 ? 0 : index > slides.current.length - 1 ? slides.current.length - 1 : index;
    const length = slides.current[slides.current.length - 1].target === sliderWidth.current || !isWrapping.current ? slides.current.length - 1 : slides.current.length;
    index = ((index % length) + length) % length;
    const finalIndex = isWrapping.current === true ? index : containedIndex;
    selectedIndex.current = finalIndex;
    slideStore.setSlideIndex(finalIndex);
    firstCellInSlide.current = slides.current[finalIndex].cells[0]?.element;
    startAnimation();
  };

  function getTranslateX(element: HTMLElement): number {
    const style = window.getComputedStyle(element);
    const matrix = new DOMMatrix(style.transform);
    return matrix.m41 || 0;
  }

  useEffect(() => {
    const el = slider.current;
    if (!el) return;

    function handleResize() {
      if (!el || !firstCellInSlide.current || showFullscreenSlider) return;
      lastTranslateX.current = getTranslateX(firstCellInSlide.current);
      const diff = lastTranslateX.current - Math.abs(sliderX.current);
      const containerWidth = el.clientWidth;

      if (!isWrapping.current) {
        sliderX.current = 0;
        selectedIndex.current = 0;

        const currentPosition =
          sliderWidth.current <= containerWidth
            ? (containerWidth - sliderWidth.current) / 2
            : sliderX.current;

        setTranslateX(currentPosition);
      } else {
        sliderX.current -= diff;
        const currentPosition = Math.min(sliderX.current, 0);
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

  function wrapSelect(index: number) {
    if (!slider.current) return;

    const length = slides.current[slides.current.length - 1].target === sliderWidth.current || !isWrapping.current ? slides.current.length - 1 : slides.current.length;
    const slideableWidth = sliderWidth.current;
    const selectedIdx = selectedIndex.current;

    if (!isDragSelect.current) {
      const wrapIndex = ((index % length) + length) % length;

      const delta = Math.abs(wrapIndex - selectedIdx);
      const backWrapDelta = Math.abs((wrapIndex + length) - selectedIdx);
      const forwardWrapDelta = Math.abs((wrapIndex - length) - selectedIdx);

      if (backWrapDelta < delta) {
        index += length;
      } else if (forwardWrapDelta < delta) {
        index -= length;
      }
    }

    if (index < 0) {
      sliderX.current -= slideableWidth;
    } else if (index >= length) {
      sliderX.current += slideableWidth;
    }
  }

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
    const contentWidth = sliderEl.scrollWidth;

    const canScrollHorizontally = sliderWidth.current > containerWidth;
    const isHorizontalScroll = Math.abs(e.deltaX) > Math.abs(e.deltaY);

    // 🔹 Handle horizontal scrolling
    if (isHorizontalScroll && canScrollHorizontally) {
      isScrolling.current = true;
      e.preventDefault(); // ✅ Only block default if we scroll horizontally

      let translateX = getCurrentXFromTransform(sliderEl);
      translateX -= e.deltaX;

      let currentPosition = translateX;

      if (isWrapping.current) {
        currentPosition =
          ((translateX % sliderWidth.current) + sliderWidth.current) %
          sliderWidth.current;
        currentPosition += -sliderWidth.current;
      } else {
        const maxTranslateX = 0;
        const minTranslateX = containerWidth - contentWidth;

        currentPosition = Math.max(minTranslateX, Math.min(maxTranslateX, translateX));
      }

      setTranslateX(currentPosition);

      const index = Math.round(
        Math.abs(currentPosition) / (sliderWidth.current / slides.current.length)
      );
      selectedIndex.current = index;
      const wrapIndex =
        ((index % slides.current.length) + slides.current.length) % slides.current.length;
      slideStore.setSlideIndex(wrapIndex);
      sliderX.current = currentPosition;
      firstCellInSlide.current = slides.current[wrapIndex].cells[0]?.element;

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
      window.addEventListener("pointerup", (e) => handlePointerEnd(e));
      sliderContainerRef.addEventListener("wheel", handleWheel, { passive: false });

      return () => {
        sliderContainerRef.removeEventListener("pointerdown", handlePointerStart);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerEnd);
        sliderContainerRef.removeEventListener("wheel", handleWheel);
      };
    };
  }, []);

  function toggleFullscreen(e: React.PointerEvent<HTMLDivElement>, imgRef: RefObject<HTMLImageElement | null>, index: number) {
    const origImg   = imgRef.current;
    const container = sliderContainer.current;
    if (!origImg || !container) return;

    const imgRect = origImg.getBoundingClientRect();

    // 2) Create all the nodes
    const overlay  = document.createElement('div');
    overlay.className   = 'fullscreen-overlay';
    overlay.style.display = 'none';
    overlayDivRef.current = overlay;

    const dup = document.createElement('img');
    dup.className        = 'duplicate-img';
    dup.style.display    = 'none';
    dup.style.transformOrigin = '0 0';

    const closeBtn = document.createElement('button');
    closeBtn.type        = 'button';
    closeBtn.className   = 'close-button';
    closeBtn.style.display = 'none';
    // build the “×” SVG
    {
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('width','35');
      svg.setAttribute('height','35');
      svg.setAttribute('viewBox','0 0 16 16');
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('fill','white');
      path.setAttribute('stroke','#4f4f4f');
      path.setAttribute('stroke-width','0.5');
      path.setAttribute('d','M12.96 4.46l-1.42-1.42-3.54 3.55-3.54-3.55-1.42 1.42 3.55 3.54-3.55 3.54 1.42 1.42 3.54-3.55 3.54 3.55 1.42-1.42-3.55-3.54 3.55-3.54z');
      svg.appendChild(path);
      closeBtn.appendChild(svg);
    }

    const leftCh = document.createElement('div');
    leftCh.className    = 'left-chevron';
    leftCh.style.display = 'none';
    // build left arrow SVG
    {
      const svg  = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('width','50');
      svg.setAttribute('height','50');
      svg.setAttribute('viewBox','0 0 16 16');
      svg.setAttribute('fill','white');
      const poly = document.createElementNS('http://www.w3.org/2000/svg','polygon');
      poly.setAttribute('stroke','#4f4f4f');
      poly.setAttribute('stroke-width','0.5');
      poly.setAttribute('points','4.586,3.414 9.172,8 4.586,12.586 6,14 12,8 6,2');
      svg.appendChild(poly);
      leftCh.appendChild(svg);
    }

    const rightCh = document.createElement('div');
    rightCh.className    = 'right-chevron';
    rightCh.style.display = 'none';
    // build right arrow SVG
    {
      const svg  = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('width','50');
      svg.setAttribute('height','50');
      svg.setAttribute('viewBox','0 0 16 16');
      svg.setAttribute('fill','white');
      const poly = document.createElementNS('http://www.w3.org/2000/svg','polygon');
      poly.setAttribute('stroke','#4f4f4f');
      poly.setAttribute('stroke-width','0.5');
      poly.setAttribute('points','4.586,3.414 9.172,8 4.586,12.586 6,14 12,8 6,2');
      svg.appendChild(poly);
      rightCh.appendChild(svg);
    }

    const ctr = document.createElement('div');
    ctr.className       = 'counter';
    ctr.style.display   = 'none';
    ctr.textContent     = `${index + 1} / ${imageCount}`;

    // 3) Batch-append in one go
    const frag = document.createDocumentFragment();
    frag.append(overlay, dup, closeBtn, leftCh, rightCh, ctr);
    document.body.appendChild(frag);

    // 4) Prepare the “before” state
    overlay.style.display = 'block';
    overlay.classList.remove('open');

    dup.src           = origImg.src;
    dup.style.display = 'block';
    dup.style.left    = `${imgRect.left}px`;
    dup.style.top     = `${imgRect.top}px`;
    dup.style.width   = `${imgRect.width}px`;
    dup.style.height  = `${imgRect.height}px`;
    dup.style.transition = 'none';

    // force reflow
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    dup.offsetWidth;
    // restore transition
    dup.style.transition = 'transform 0.3s cubic-bezier(.4,0,.22,1)';

    closeBtn.style.display = 'block';
    closeBtn.classList.remove('open');

    leftCh.style.display = imageCount > 1 ? 'block' : 'none';
    leftCh.classList.remove('open');

    rightCh.style.display = imageCount > 1 ? 'block' : 'none';
    rightCh.classList.remove('open');

    ctr.style.display = imageCount > 1 ? 'block' : 'none';
    ctr.classList.remove('open');

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    overlay.offsetWidth;

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    dup.offsetWidth;

    const scaleX = window.innerWidth  / imgRect.width;
    const scaleY = window.innerHeight / imgRect.height;
    const s = Math.min(scaleX, scaleY);

    const finalW = imgRect.width  * s;
    const finalH = imgRect.height * s;

    const targetLeft = (window.innerWidth  - finalW) / 2;
    const targetTop  = (window.innerHeight - finalH) / 2;

    const dx = targetLeft - imgRect.left;
    const dy = targetTop  - imgRect.top ;

    requestAnimationFrame(() => {
      dup.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
      overlay.style.backgroundColor = "rgba(0,0,0,0.8)";
      overlay.classList.add('open');
      closeBtn.classList.add('open');
      leftCh.classList.add('open');
      rightCh.classList.add('open');
      ctr.classList.add('open');
    });

    // 7) Cleanup when the fly-out finishes
    dup.addEventListener('transitionend', function handler(e) {
      if (e.propertyName !== 'transform') return;
      dup.removeEventListener('transitionend', handler);
      setShowFullscreenSlider(true);
    }, { once: true });
  }

  useLayoutEffect(() => {
    if (!showFullscreenSlider) return;
    const duplicateImg = document.querySelector('.duplicate-img') as HTMLElement;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!duplicateImg) return;
        duplicateImg.remove();
      })
    })
  }, [showFullscreenSlider]);

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
  

  return (
    <div ref={sliderContainer} className={styles.slider_container} style={{ position: 'relative', height: '300px', backgroundColor: '#f8f9fa', zIndex: 1 }}>
    {/* Previous Button */}
    <div
      onClick={() => previous()}
      ref={prevButtonRef}
      style={{
        position: "absolute",
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
      onClick={() => next()}
      ref={nextButtonRef}
      style={{
        position: "absolute",
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
        {clonedChildren}
      </div>
      {/* Pagination Dots */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          position: "absolute",
          left: '50%',
          transform: "translateX(-50%)",
          bottom: 5,
          zIndex: 10
        }}
      >
        {Array.from({ length: slidesState.length }).map(
          (_, index) => (
            <div
              key={index}
              ref={el => {
                dotRefs.current[index] = el;
              }}
              onClick={() => {
                isScrolling.current = false;
                select(index)
              }}
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor:
                  slideIndexSync === index ? "rgb(80, 163, 255)" : "lightgray",
                margin: "10px 5px 5px 5px",
                cursor: "pointer",
                transition: "background-color 0.3s ease",
              }}
            />
          )
        )}
      </div>
    </div>
  );
};

export default Slider;