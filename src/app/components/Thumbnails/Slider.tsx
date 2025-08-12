/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useRef, useEffect, ReactNode, cloneElement, Children, useState, createRef, Dispatch, SetStateAction, ReactElement, HTMLAttributes, ClassAttributes, RefObject, useLayoutEffect, useSyncExternalStore, isValidElement } from "react";
import type SimpleBarCore from 'simplebar';
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
  expandableImgRefs: RefObject<RefObject<HTMLImageElement | null>[]>;
  overlayDivRef: RefObject<HTMLDivElement | null>;
  setSlideIndex: (index: number) => void;
  setShowFullscreenModal: (show: boolean) => void;
  thumbnailRefs: RefObject<(HTMLImageElement | null)[]>;
  simpleBarRef: RefObject<SimpleBarCore | null>;
  thumbnailContainerRef: RefObject<HTMLDivElement | null>;
  setShowFullscreenSlider: Dispatch<SetStateAction<boolean>>;
  showFullscreenSlider: boolean;
  isWrapping: RefObject<boolean>;
  closingModal: boolean;
  slides: RefObject<{ cells: { element: HTMLElement, index: number }[], target: number }[]>;
  slider: RefObject<HTMLDivElement | null>;
  visibleImagesRef: RefObject<number>;
  selectedIndex: RefObject<number>;
  firstCellInSlide: RefObject<HTMLElement | null>;
  sliderX: RefObject<number>;
  sliderVelocity: RefObject<number>;
  thumbnails: any;
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
  translateIndex: number,
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
      transform: `translateX(${translateIndex * 100}%)`,
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
  thumbnailRefs,
  simpleBarRef,
  thumbnailContainerRef,
  setShowFullscreenSlider,
  showFullscreenSlider,
  isWrapping,
  closingModal,
  slides,
  slider,
  visibleImagesRef,
  selectedIndex,
  firstCellInSlide,
  sliderX,
  sliderVelocity,
  thumbnails
}: SliderProps) => {
  const [firstChildWidth, setFirstChildWidth] = useState(0);
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
  const [visibleImages, setVisibleImages] = useState(1);
  const friction = 0.28;
  const attraction = 0.025;
  const cells = useRef<{ element: HTMLElement, index: number }[]>([]);
  const isDragSelect = useRef<boolean>(false);
  const lastTranslateX = useRef<number>(0);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const isClosing = useRef(false);
  const slideIndexSync = useSlideIndex();
  const sliderContainer = useRef<HTMLDivElement | null>(null);
  const prevTimeRef = useRef(0);
  const FPS = 60;
  const MS_PER_FRAME = 1000 / FPS;
  const prevButtonRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLDivElement>(null);
  // const dotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isMeasured, setIsMeasured]   = useState(false);   // widths positioned
  const [isReady, setIsReady]         = useState(false);   // fully ready to show
  const [inView, setInView]           = useState(false);   // IO has fired

  useEffect(() => {
    if (!cells.current?.[0]?.element) return;
    
    const updateWidth = () => {
      requestAnimationFrame(() => {
        if (!cells.current) return;
          const width = cells.current[0]?.element.clientWidth;

          if (width > 0 && width !== firstChildWidth) {
            setFirstChildWidth(width);
          }
      });
    };
  
    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(cells.current[0].element);
  
    return () => observer.disconnect();
  
  }, [clonedChildren]);

  const calculateVisibleImages = () => {
    if (firstChildWidth === 0) return 1;
    const containerWidth = slider.current?.clientWidth || window.innerWidth;
    return Math.max(1, Math.ceil(containerWidth / firstChildWidth));
  };

  useEffect(() => {
    const el = slider.current;
    if (!el) return;

    function handleResize() {
      if (!el) return;

      const images       = calculateVisibleImages();
      const childrenArr  = Children.toArray(children).filter(isValidElement) as ReactElement<any>[];
      const childCount   = childrenArr.length;

      setVisibleImages(images);
      visibleImagesRef.current = images;

      const wrap = childCount > images;
      isWrapping.current = wrap;

      if (childCount === 0) return;

      cells.current = [];
      const slides: ReactElement<CarouselChildProps>[] = [];

      if (wrap) {
        // before‑clones
        slides.push(
          ...childrenArr.slice(-images).map((c, i) =>
            cloneSlide(c, `before-${i}`, -images + i, -images + i, cells)
          )
        );
      }

      // originals
      slides.push(
        ...childrenArr.map((c, i) =>
          cloneSlide(c, `original-${i}`, i, i, cells)
        )
      );

      if (wrap) {
        // after‑clones
        slides.push(
          ...childrenArr.slice(0, images).map((c, i) =>
            cloneSlide(c, `after-${i}`, i, childCount + i, cells)
          )
        );
      }

      setClonedChildren(slides);
    }

    const observer = new ResizeObserver(handleResize);
    observer.observe(el);

    handleResize();

    return () => {
      observer.disconnect();
    };
  }, [children, firstChildWidth]);

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

  interface HTMLImageElementWithHandler extends HTMLImageElement {
    _pointerOverHandler?: EventListener;
  }

  useEffect(() => {
    thumbnailRefs.current.forEach((img: HTMLImageElement | null, i: number) => {
      if (img) {
        img.style.border =
          i === 0 ? '2px solid rgb(80, 163, 255)' : '0px solid transparent';
      }
    });
  }, []);
  
  useEffect(() => {
    const handlePointerOver = (index: number) => {
      thumbnailRefs.current.forEach((img: HTMLImageElement | null, i: number) => {
        if (img) {
          img.style.border =
            i === index ? '2px solid rgb(80, 163, 255)' : '0px solid transparent';
        }
      });
      selectedIndex.current = index;
      firstCellInSlide.current = slides.current[index].cells[0]?.element;
      const slideWidth = slider.current?.children[0]?.clientWidth || 0;
      sliderX.current = -slideWidth * index;
      sliderVelocity.current = 0;
      positionSlider();
    };

    thumbnailRefs.current.forEach((img: HTMLImageElement | null, index: number) => {
      if (img) {
        const pointerOverHandler = () => handlePointerOver(index);
        img.addEventListener('pointerover', pointerOverHandler);
        (img as HTMLImageElementWithHandler)._pointerOverHandler = pointerOverHandler;
      }
    });

    return () => {
      thumbnailRefs.current.forEach((img: HTMLImageElement | null) => {
        if (img && (img as HTMLImageElementWithHandler)._pointerOverHandler) {
          img.removeEventListener('pointerover', (img as HTMLImageElementWithHandler)._pointerOverHandler!);
          delete (img as HTMLImageElementWithHandler)._pointerOverHandler;
        }
      });
    };
  }, [thumbnails]);

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

      const idxMap = new Map<HTMLElement, number>(
        originals.map((el, i) => [el, i])
      );

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

      const newSlides = pages.map(page => ({
        target: page.target,
        cells: page.els.map(el => ({
          element: el,
          index: idxMap.get(el)!
        }))
      }));

      // trigger RAF‑retry if slides came out broken
      if (newSlides[1] && newSlides[1].target === 0 || (isWrapping.current && newSlides.length === 1)) {
        requestAnimationFrame(buildPages);
        return;
      }

      slides.current = newSlides;
    }

    // kick off the RAF‑retry
    requestAnimationFrame(buildPages);

    setIsMeasured(true);

    return () => { canceled = true; };

  }, [children, clonedChildren, visibleImages, isWrapping.current]);

  useEffect(() => {
    const ready =
      firstChildWidth &&
      clonedChildren.length > 0 &&
      isMeasured;

    if (ready) setIsReady(true);
  }, [firstChildWidth, clonedChildren.length, isMeasured]);

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
    if (visibleImages === 0 || !slider.current) return;
    let totalWidth = 0;
    const sliderChildren = Array.from(slider.current.children);

    if (isWrapping.current) {
      for (let i = 0; i < sliderChildren.length - (visibleImages * 2); i++) {
        totalWidth += sliderChildren[i].getBoundingClientRect().width;
      }
    } else {
      for (let i = 0; i < sliderChildren.length; i++) {
        totalWidth += sliderChildren[i].getBoundingClientRect().width;
      }
    }
    
    sliderWidth.current = totalWidth;

  }, [clonedChildren, visibleImages, isWrapping.current]);

  interface PointerEvent extends MouseEvent {
    touches?: Array<{
      clientX: number
      clientY: number
    }>
  }

  function setDraggingCursor(on: boolean) {
    document.body.classList.toggle('rmg-dragging', on);
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

    // const dotIndex = dotRefs.current.findIndex(dot => dot?.contains(hit));
    // if (dotIndex >= 0) {
    //   return;
    // }

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
    if (sliderWidth.current >= slider.current.clientWidth && !isClick.current && isWrapping.current === true) {
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

  function setTranslateX(x: number) {
    if (!slider.current) return;
    const translateX = getPositionValue(x);
    slider.current.style.transform = `translate3d(${translateX},0,0)`;
    const pct =
      sliderWidth.current > 0
        ? Math.abs(x) / sliderWidth.current * 100
        : 0
    if (progressFillRef.current) {
      progressFillRef.current.style.width = `${pct > 99 ? 0 : pct}%`
    }
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

    if (sliderWidth.current <= slider.current.clientWidth || !isWrapping.current) {
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
  
  type PointerEndEvent = MouseEvent

  function handlePointerEnd(e: PointerEndEvent) {
    if (!slider.current) return;
    if (!isPointerDown.current) return;
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
          (index === slides.current.length && selectedIndex.current === 0)) {
          index += dragEndBoostSelect();
        }
      }
    }

    isDragSelect.current = true;

    select(index);

    isDragSelect.current = false;

    setDraggingCursor(false);
  };

  useEffect(() => {
    const clear = () => setDraggingCursor(false);
    window.addEventListener('pointercancel', clear);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('pointercancel', clear);
      window.removeEventListener('blur', clear);
    };
  }, []);

  function dragEndBoostSelect() {
    const movedAt = dragMoveTime.current;
    if (
      !movedAt ||
      (new Date().getTime() - movedAt.getTime()) > 100
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
    const cellWidth = cells.current[0].element.clientWidth;

    const childrenArray = Children.toArray(children);
    const childCount = childrenArray.length;

    const slideWidth = cellWidth * childCount;

    if (sliderWidth.current <= slider.current.clientWidth) {
      distance = (containerWidth - slideWidth) / 2 - sliderX.current;
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
    const length = (slides.current[slides.current.length - 1].target === sliderWidth.current) ? slides.current.length - 1 : slides.current.length;
    const slideIndex = ((index % length) + length) % length;
    const finalIndex = isWrapping.current === true ? slideIndex : index;
    const slide = slides.current[finalIndex];
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
    if (sliderWidth.current > slider.current.clientWidth && isWrapping.current === true) {
      wrapSelect(index);
    }
    const containedIndex = index < 0 ? 0 : index > slides.current.length - 1 ? slides.current.length - 1 : index;
    const length = (slides.current[slides.current.length - 1].target === sliderWidth.current) ? slides.current.length - 1 : slides.current.length;
    index = ((index % length) + length) % length;
    const finalIndex = isWrapping.current === true ? index : containedIndex;
    selectedIndex.current = finalIndex;
    slideStore.setSlideIndex(finalIndex);
    firstCellInSlide.current = slides.current[finalIndex].cells[0]?.element;
    startAnimation();
    thumbnailRefs.current.forEach((img: HTMLImageElement | null, i: number) => {
      if (img) {
        img.style.border =
          i === index ? '2px solid rgb(80, 163, 255)' : '0px solid transparent';
      }
    });
    if (!simpleBarRef.current) return;
    const simpleBarScrollElement = simpleBarRef.current.getScrollElement() as HTMLElement;
    if (!simpleBarScrollElement) return;
    const container = thumbnailContainerRef.current;
    const containerHeight = simpleBarScrollElement.offsetHeight;
    if (!container) return;
    const numThumbnails = container.children.length;
    const logicalIndex = ((index % numThumbnails) + numThumbnails) % numThumbnails;
    
    const thumbnail = container.children[logicalIndex] as HTMLElement;
    if (!thumbnail) return;

    const thumbnailTop = thumbnail.offsetTop;
    const thumbnailBottom = thumbnailTop + thumbnail.offsetHeight;

    simpleBarScrollElement.style.scrollBehavior = "smooth";

    const timeout = setTimeout(() => {
      simpleBarScrollElement.style.scrollBehavior = "";
    }, 1000);

    if (window.innerWidth > 535) {
      if (
        thumbnailTop < simpleBarScrollElement.scrollTop ||
        thumbnailBottom > simpleBarScrollElement.scrollTop + containerHeight
      ) {
        simpleBarScrollElement.scrollTop =
          thumbnailTop - containerHeight / 2 + thumbnail.offsetHeight / 2;
      }
    } else {
      // ─── HORIZONTAL CENTERING ─────────────────────────────
      const cw = simpleBarScrollElement.clientWidth;
      const left  = thumbnail.offsetLeft;
      const right = left + thumbnail.offsetWidth;
      const cur   = simpleBarScrollElement.scrollLeft;

      // if out‐of‐view → center it
      if (left < cur || right > cur + cw) {
        const target = left - (cw - thumbnail.offsetWidth) / 2;
        simpleBarScrollElement.scrollLeft = Math.max(0, target);
      }
    }

    return () => clearTimeout(timeout);
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

    const length = slides.current[slides.current.length - 1].target === sliderWidth.current ? slides.current.length - 1 : slides.current.length;
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
    if (sliderWidth.current <= slider.current.clientWidth) {
      return;
    }
    const isHorizontalScroll = Math.abs(e.deltaX) > Math.abs(e.deltaY);

    if (isHorizontalScroll) {
      isScrolling.current = true;
      e.preventDefault();
  
      let translateX = getCurrentXFromTransform(slider.current);
      translateX -= e.deltaX;
  
      let currentPosition = translateX;

      if (isWrapping.current === true) {
        currentPosition = ((translateX % sliderWidth.current) + sliderWidth.current) % sliderWidth.current;
        currentPosition += -sliderWidth.current;
      } else {
        const containerWidth = slider.current.clientWidth;
        const contentWidth   = slider.current.scrollWidth;
      
        const maxTranslateX = 0;

        const minTranslateX = containerWidth - contentWidth;
      
        currentPosition = Math.max(minTranslateX, Math.min(maxTranslateX, translateX));
      }
      
      setTranslateX(currentPosition);
  
      const index = Math.round(Math.abs(currentPosition) / (sliderWidth.current / slides.current.length));
      selectedIndex.current = index;
      
      thumbnailRefs.current.forEach((img: HTMLImageElement | null, i: number) => {
        if (img) {
          img.style.border =
            (i === index) || (i === 0 && index === slides.current.length - 1) || (i === 0 && index === slides.current.length) ? '2px solid rgb(80, 163, 255)' : '0px solid transparent';
        }
      });
      if (!simpleBarRef.current) return;
      const simpleBarScrollElement = simpleBarRef.current.getScrollElement() as HTMLElement;
      if (!simpleBarScrollElement) return;
      const container = thumbnailContainerRef.current;
      const containerHeight = simpleBarScrollElement.offsetHeight;
      if (!container) return;
      const numThumbnails = container.children.length;
      const logicalIndex = ((index % numThumbnails) + numThumbnails) % numThumbnails;
      
      const thumbnail = container.children[logicalIndex] as HTMLElement;
      if (!thumbnail) return;
  
      const thumbnailTop = thumbnail.offsetTop;
      const thumbnailBottom = thumbnailTop + thumbnail.offsetHeight;
  
      simpleBarScrollElement.style.scrollBehavior = "smooth";
  
      const timeout = setTimeout(() => {
        simpleBarScrollElement.style.scrollBehavior = "";
      }, 1000);
  
      if (window.innerWidth > 535) {
        if (
          thumbnailTop < simpleBarScrollElement.scrollTop ||
          thumbnailBottom > simpleBarScrollElement.scrollTop + containerHeight
        ) {
          simpleBarScrollElement.scrollTop =
            thumbnailTop - containerHeight / 2 + thumbnail.offsetHeight / 2;
        }
      } else {
        // ─── HORIZONTAL CENTERING ─────────────────────────────
        const cw = simpleBarScrollElement.clientWidth;
        const left  = thumbnail.offsetLeft;
        const right = left + thumbnail.offsetWidth;
        const cur   = simpleBarScrollElement.scrollLeft;

        // if out‐of‐view → center it
        if (left < cur || right > cur + cw) {
          const target = left - (cw - thumbnail.offsetWidth) / 2;
          simpleBarScrollElement.scrollLeft = Math.max(0, target);
        }
      }
      const wrapIndex = ((index % slides.current.length) + slides.current.length) % slides.current.length;
      slideStore.setSlideIndex(wrapIndex);
      sliderX.current = currentPosition;
      firstCellInSlide.current = slides.current[wrapIndex].cells[0]?.element;
      return () => clearTimeout(timeout);
    } else {
      isScrolling.current = false;
    }
  };

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

  const SHIELD_TIMEOUT = 300;

  function addGestureShield() {
    const shield = document.createElement('div');
    Object.assign(shield.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '10000',
      background: 'transparent',
      touchAction: 'none',
      pointerEvents: 'auto',
    });
    document.body.appendChild(shield);

    const remove = () => { shield.remove(); };
    const timer = window.setTimeout(remove, SHIELD_TIMEOUT);

    return () => { window.clearTimeout(timer); remove(); };
  }

  function toggleFullscreen(
    e: React.PointerEvent<HTMLDivElement>,
    imgRef: RefObject<HTMLImageElement | null>,
    index: number
  ) {
    const origImg   = imgRef.current;
    const container = sliderContainer.current;
    if (!origImg || !container) return;

    addGestureShield()

    // 1) Measure the thumbnail & compute "fullscreen" rect
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
    dup.style.position = 'fixed';
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

  useEffect(() => {
    if (closingModal === true && slider.current) {
      thumbnailRefs.current.forEach((img: HTMLImageElement | null, i: number) => {
        if (img) {
          img.style.border =
            i === slideIndexSync ? '2px solid rgb(80, 163, 255)' : '0px solid transparent';
          }
      });
      if (!simpleBarRef.current) return;
      const simpleBarScrollElement = simpleBarRef.current.getScrollElement() as HTMLElement;
      if (!simpleBarScrollElement) return;
      const container = thumbnailContainerRef.current;
      const containerHeight = simpleBarScrollElement.offsetHeight;
      if (!container) return;
      const numThumbnails = container.children.length;
      const logicalIndex = ((slideIndexSync % numThumbnails) + numThumbnails) % numThumbnails;
      
      const thumbnail = container.children[logicalIndex] as HTMLElement;
      if (!thumbnail) return;

      const thumbnailTop = thumbnail.offsetTop;
      const thumbnailBottom = thumbnailTop + thumbnail.offsetHeight;

      if (window.innerWidth > 535) {
        if (
          thumbnailTop < simpleBarScrollElement.scrollTop ||
          thumbnailBottom > simpleBarScrollElement.scrollTop + containerHeight
        ) {
          simpleBarScrollElement.scrollTop =
            thumbnailTop - containerHeight / 2 + thumbnail.offsetHeight / 2;
        }
      } else {
        // ─── HORIZONTAL CENTERING ─────────────────────────────
        const cw = simpleBarScrollElement.clientWidth;
        const left  = thumbnail.offsetLeft;
        const right = left + thumbnail.offsetWidth;
        const cur   = simpleBarScrollElement.scrollLeft;

        // if out‐of‐view → center it
        if (left < cur || right > cur + cw) {
          const target = left - (cw - thumbnail.offsetWidth) / 2;
          simpleBarScrollElement.scrollLeft = Math.max(0, target);
        }
      }
    }
  }, [closingModal]);

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
    <div ref={sliderContainer} className={styles.slider_container} style={{ position: 'relative', height: imageCount > 2 ? '606px' : '600px', backgroundColor: '#f8f9fa', zIndex: 1 }}>
      {/* Shimmer covers everything until ready */}
      {!isReady && <div className={styles.shimmerOverlay} aria-hidden />}
      <div className={`${styles.fade_container} ${
        isReady && inView ? styles.fadeInActive : styles.fadeInStart
      }`}
      style={{ position: 'relative', height: imageCount > 2 ? '606px' : '600px' }}>
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
          {clonedChildren}
        </div>
        {/* progress track */}
        <div
          style={{
            position: 'absolute',
            display: imageCount > 2 ? 'block' : 'none',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '6px',
            backgroundColor: 'rgba(230, 230, 230, 1)',
          }}
        >
          {/* progress fill */}
          <span
            ref={progressFillRef}
            style={{
              display: 'block',
              height: '100%',
              width: '0%',
              backgroundColor: 'rgb(80, 163, 255)',
              boxShadow: '0 0 8px rgba(80, 163, 255, 0.6)',
              transition: 'width 0.2s ease-out',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Slider;