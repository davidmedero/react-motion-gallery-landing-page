/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { Dispatch, RefObject, SetStateAction, useEffect, useSyncExternalStore } from "react";
import scaleStore from './scaleStore';
import fullscreenSlideStore from './fullscreenSlideStore';
import { unlockBody } from './scrollLock';
import { MediaItem } from "./";

function useSlideIndex() {
  return useSyncExternalStore(
    fullscreenSlideStore.subscribe.bind(fullscreenSlideStore),
    fullscreenSlideStore.getSnapshot.bind(fullscreenSlideStore),
    fullscreenSlideStore.getSnapshot.bind(fullscreenSlideStore)
  );
}

interface FullscreenModalProps {
  open: boolean;
  onClose: () => void;
  isZoomClick: RefObject<boolean>;
  isClick: RefObject<boolean>;
  isAnimating: RefObject<boolean>;
  overlayDivRef: RefObject<HTMLDivElement | null>;
  zoomLevel: number;
  children: React.ReactNode;
  cells: RefObject<{ element: HTMLElement; index: number }[]>;
  setShowFullscreenSlider: Dispatch<SetStateAction<boolean>>;
  imageCount: number;
  setClosingModal: Dispatch<SetStateAction<boolean>>;
  slides: RefObject<{ cells: { element: HTMLElement, index: number }[], target: number }[]>;
  slider: RefObject<HTMLDivElement | null>;
  visibleImagesRef: RefObject<number>;
  selectedIndex: RefObject<number>;
  firstCellInSlide: RefObject<HTMLElement | null>;
  sliderX: RefObject<number>;
  sliderVelocity: RefObject<number>;
  isWrapping: RefObject<boolean>;
  wrappedItems: MediaItem[];
}

const FullscreenModal: React.FC<FullscreenModalProps> = ({
  open,
  onClose,
  isZoomClick,
  isClick,
  isAnimating,
  overlayDivRef,
  zoomLevel,
  cells,
  setShowFullscreenSlider,
  imageCount,
  setClosingModal,
  slides,
  slider,
  visibleImagesRef,
  selectedIndex,
  firstCellInSlide,
  sliderX,
  sliderVelocity,
  isWrapping,
  wrappedItems,
  children,
}) => {  

  const pointerDownX = React.useRef<number>(0);
  const pointerDownY = React.useRef<number>(0);
  const slideIndexSync = useSlideIndex();

  useEffect(() => {
    const closeButton = document.querySelector(".close-button");
    closeButton?.addEventListener("click", handleClose);
  
    return () => {
      closeButton?.removeEventListener("click", handleClose);
    };
  }, [open, zoomLevel, isZoomClick, children]);

  if (!open) return null;

  function handleClose(e: any) {
    if ((e.target as HTMLElement).closest(".close-button")) {
      // Close button clicked; closing modal immediately.
      unlockBody();
      proceedToClose(e);
      return;
    }
  
    const THRESHOLD = 1;
    if (
      Math.abs(e.clientX - pointerDownX.current) > THRESHOLD ||
      Math.abs(e.clientY - pointerDownY.current) > THRESHOLD
    ) {
      // Drag detected; not closing modal.
      return;
    }

    const clickedImg = (e.target as HTMLElement).closest("img");
    if (clickedImg) {
      // Clicked directly on an image; not closing modal.
      return;
    }

    proceedToClose(e);
  }

  function getPositionValue(position: number) {
    return Math.round(position) + 'px';
  };

  function getTotalCellsWidth(): number {
    let totalWidth = 0;

    slides.current.forEach(slide => {
      slide.cells.forEach(cell => {
        totalWidth += cell.element.offsetWidth;
      });
    });

    return totalWidth;
  }
  
  function proceedToClose(e: MouseEvent) {
    if (!open) return null;
    isAnimating.current = false;
    isClick.current = false;
    cells.current = [];
    setClosingModal(true);

    const slideArr = slides.current;
    // find the slide whose cells include the fullscreen image index
    if (!slider.current) return;
    let wrapIndex;
    if (isWrapping.current) {
      if (slideIndexSync >= slider.current.children.length - visibleImagesRef.current * 2) {
        wrapIndex = 0;
      } else {
        wrapIndex = slideIndexSync;
      }
    } else {
      if (slideIndexSync >= slider.current.children.length) {
        wrapIndex = 0;
      } else {
        wrapIndex = slideIndexSync
      }
    }
    const matchSlide = slideArr.find(s =>
      s.cells.some(cell => cell.index === wrapIndex)
    );
    if (!matchSlide) return;

    // now pull its position out
    const newIndex = slideArr.indexOf(matchSlide);

    const totalWidth = getTotalCellsWidth()

    if (!slider.current) return;

    const cellWidth = slides.current[0].cells[0].element.getBoundingClientRect().left;

    selectedIndex.current = newIndex;
    firstCellInSlide.current = matchSlide.cells[0]?.element ?? null;
    sliderX.current = totalWidth <= slider.current.clientWidth ? cellWidth : -matchSlide.target;
    sliderVelocity.current = 0;

    const translateSliderX = getPositionValue(sliderX.current);
    
    slider.current.style.transform = `translate3d(${translateSliderX},0,0)`;

    if (!slider.current || slider.current.children.length === 0) return;

    let idx;
    if (isWrapping.current) {
      idx = wrapIndex + visibleImagesRef.current;
    } else {
      idx = wrapIndex;
    }

    // grab the first child of that slide (your image element)
    const slideEl = slider.current.children[idx] as HTMLElement | undefined;
    if (!slideEl) return;

    // snapshot its viewport rect
    const rect = slideEl.getBoundingClientRect();
  
    const x = e.clientX;
    const y = e.clientY;
  
    const overlay = e.currentTarget as HTMLElement;
    overlay.style.pointerEvents = "none";
    const underlyingElement = document.elementFromPoint(x, y);
    overlay.style.pointerEvents = "";
  
    let targetImg: HTMLImageElement | null = null;
    if (underlyingElement) {
      if (underlyingElement.tagName.toLowerCase() === "img") {
        targetImg = underlyingElement as HTMLImageElement;
      } else {
        targetImg = underlyingElement.querySelector("img");
      }
    }

    const originals = wrappedItems.slice(1, wrappedItems.length - 1);
    const url = originals[wrapIndex];
    const isVideoSlide = /\.(mp4|webm|ogg)$/i.test(url.src);

    if (isVideoSlide) {
      let newIndex = wrapIndex + 1;

      if (imageCount === 1) {
        newIndex = 0;
      }

      const selector = `.myPlayer[data-index="${newIndex}"]`;
      const plyrEl = document.querySelector(selector) as HTMLImageElement | null;

      if (plyrEl) {
        targetImg = plyrEl;
      }
    }

    if (imageCount > 1) {
      const counter = document.querySelector('.counter');
      const currentIndex = parseInt(targetImg?.getAttribute("data-index") || "-1", 10);
      const nextImg = document.querySelector(`.fullscreen_slider img[data-index="${Number(counter?.textContent?.split('/')[0])}"]`) as HTMLImageElement | null;
      const lastImg = document.querySelector(`.fullscreen_slider [data-index="${imageCount + 1}"]`) as HTMLImageElement | null;

      const slider = document.querySelector('.fullscreen_slider') as HTMLElement;
      let currentTranslateX = 0;
      if (!slider) throw new Error('no .fullscreen_slider found')

      // 2. read the computed transform
      const cs = getComputedStyle(slider)
      const transform = cs.transform  // e.g. "matrix(a, b, c, d, tx, ty)"

      // 3. bail if there's no transform
      if (transform === 'none') {
      } else {
        // 4. parse with DOMMatrix
        const matrix = new DOMMatrixReadOnly(transform)
        const translateX = matrix.m41   // the X offset
        currentTranslateX = translateX;
      }

      if (currentIndex !== Number(counter?.textContent?.split('/')[0]) ) {
        if (currentIndex === 0 && (Math.abs(currentTranslateX) >= slider.scrollWidth - slider.getBoundingClientRect().width * 1.5 && Math.abs(currentTranslateX) <= slider.scrollWidth - slider.getBoundingClientRect().width) && React.isValidElement<{ imageCount: number }>(children)) {
          const { imageCount } = children.props
          targetImg = document.querySelector(`.fullscreen_slider img[data-index="${imageCount + 1}"]`) as HTMLImageElement | null;
        } else {
          targetImg = nextImg;
        }
      }

      if (React.isValidElement<{ imageCount: number }>(children)) {
        const { imageCount } = children.props
    
        if (currentIndex === imageCount && Number(counter!.textContent!.split('/')[0]) === 1) {
          const actualImg = document.querySelector(
            `.fullscreen_slider img[data-index="${imageCount + 1}"]`
          ) as HTMLImageElement | null
          targetImg = actualImg
        }
    
        if (currentIndex === imageCount + 1) {
          const actualImg = document.querySelector(
            `.fullscreen_slider img[data-index="${imageCount + 1}"]`
          ) as HTMLImageElement | null
          targetImg = actualImg
        }
      }

      if (currentIndex === -1) {
        const correctedImg = document.querySelector(`.fullscreen_slider [data-index="${wrapIndex + 1}"]`) as HTMLImageElement | null;
        targetImg = correctedImg;
      }

      if (currentIndex === -1 && !isVideoSlide && wrapIndex === 0) {
        const correctedImg = document.querySelector(`.fullscreen_slider [data-index="${imageCount + 1}"]`) as HTMLImageElement | null;
        targetImg = correctedImg;
      }

      if (isVideoSlide && currentIndex === 1 && (Math.abs(currentTranslateX) >= slider.scrollWidth - slider.getBoundingClientRect().width * 1.5 && Math.abs(currentTranslateX) <= slider.scrollWidth - slider.getBoundingClientRect().width)) {
        targetImg = lastImg;
      }

      if (isVideoSlide) {
        let newIndex = wrapIndex + 1;
        if (imageCount === 1) {
          newIndex = 0;
        }
        if (isVideoSlide && currentIndex === 1 && (Math.abs(currentTranslateX) >= slider.scrollWidth - slider.getBoundingClientRect().width * 1.5 && Math.abs(currentTranslateX) <= slider.scrollWidth - slider.getBoundingClientRect().width)) {
          newIndex = imageCount + 1;
        }
        const wrapIndexStr = String(newIndex);

        const els = slider.querySelectorAll<HTMLElement>("[data-index]");

        els.forEach(el => {

          if (el.dataset.index === wrapIndexStr) {
            return;
          }
          Object.assign(el.style, {
            transition: "opacity 0.3s cubic-bezier(.4,0,.22,1)",
            opacity:    "0",
          });
        });
      } else {
        // Get all div elements inside the slider
        const divs = slider.querySelectorAll('div');

        // Loop through each div
        divs.forEach(div => {
          // If this div contains the target image, skip it
          if (targetImg && div.contains(targetImg)) return;

          // Otherwise, apply a 0.3s opacity transition and set the opacity to 0
          Object.assign(div.style, {
            transition: 'opacity 0.3s cubic-bezier(.4,0,.22,1)',
            opacity: '0'
          });
        });
      }
    }

    if (!targetImg || !overlayDivRef.current || !rect) return;
  
    const zoomedImg = targetImg;
    const zoomedRect = targetImg.getBoundingClientRect();

    const computedStyle = window.getComputedStyle(zoomedImg);
    const transformMatrix = new DOMMatrix(computedStyle.transform);
    const currentScale = transformMatrix.a;
    const translateX = transformMatrix.e;
    const translateY = transformMatrix.f;
  
    let deltaX: number = 0;
    let deltaY: number = 0;
  
    deltaX =
      currentScale !== 1
        ? rect.left - (Math.abs(translateX) + zoomedRect.left)
        : rect.left - zoomedRect.left;
  
    deltaY =
      currentScale !== 1
        ? rect.top - (Math.abs(translateY) + zoomedRect.top)
        : rect.top - zoomedRect.top;
  
    const scaleX = rect.width / (zoomedRect.width / currentScale);

     const elementsToFade = [".left-chevron", ".right-chevron", ".counter", ".close-button"];
  
    zoomedImg.style.transformOrigin = "0 0";
    zoomedImg.style.transition = "transform 0.3s cubic-bezier(.4,0,.22,1)";
  
    zoomedImg.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleX})`;

    if (overlayDivRef.current) {
      overlayDivRef.current.style.backgroundColor = "transparent";
    }

    elementsToFade.forEach((selector) => {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) element.style.opacity = "0";
    });

    setTimeout(() => {
      zoomedImg.style.transition = "";
      zoomedImg.style.transform = "";
  
      elementsToFade.forEach((selector) => {
        const element = document.querySelector(selector);
        if (element) element.remove();
      });

      const slider = document.querySelector('.fullscreen_slider') as HTMLElement;
      if (slider) {
        slider.style.opacity = '0';
      };
  
      if (overlayDivRef.current) overlayDivRef.current.remove();
      onClose();
      setShowFullscreenSlider(false);
      setClosingModal(false);
      scaleStore.setScale(1);
      zoomedImg.style.height = "100%";
    }, 300);
  }  

  return (
    <div
      onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => {
        pointerDownX.current = e.clientX;
        pointerDownY.current = e.clientY;
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        contain: 'layout style size',
      }}
    >
      {children}
    </div>
  );
};

export default FullscreenModal;