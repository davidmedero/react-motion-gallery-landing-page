/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect, useRef, createRef, useLayoutEffect, useCallback, useMemo } from "react";
import SimpleBarReact from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import type SimpleBarCore from 'simplebar';
import FullscreenSlider, { FullscreenSliderHandle } from "./FullscreenSlider";
import FullscreenModal from "./FullscreenModal";
import Slider from "./Slider";
import { useSyncExternalStore } from 'react';
import fullscreenSlideStore from './fullscreenSlideStore';
import styles from './index.module.css';
import { useScrollDrag } from "./useScrollDrag";
import scaleStore from './scaleStore';
import { useVideoThumbnails } from "./useVideoThumbnails";
import "plyr-react/plyr.css";
import type { APITypes } from "plyr-react";
import dynamic from "next/dynamic";
const Plyr = dynamic(() => import("plyr-react"), { ssr: false });

function useSlideIndex() {
  return useSyncExternalStore(
    fullscreenSlideStore.subscribe.bind(fullscreenSlideStore),
    fullscreenSlideStore.getSnapshot.bind(fullscreenSlideStore),
    fullscreenSlideStore.getSnapshot.bind(fullscreenSlideStore)
  );
}

interface Props {
  urls: string[];
}

export default function SliderWrapper({ urls }: Props) {
  const [slideIndex, setSlideIndex] = useState(0);
  const isClick = useRef(false);
  const isZoomClick = useRef(false);
  const thumbnailRefs = useRef<(HTMLImageElement | null)[]>([]);
  const thumbnailContainerRef = useRef<HTMLDivElement | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const simpleBarRef = useRef<SimpleBarCore | null>(null);
  const imageRefs = useRef<React.RefObject<HTMLImageElement | null>[]>([]);
  const [showFullscreenSlider, setShowFullscreenSlider] = useState(false);
  const isWrapping = useRef(true);
  const zoomedDuringWrap = useRef(false);
  const sliderApi = useRef<FullscreenSliderHandle>(null);
  const prevTimeRef = useRef(0);
  const FPS = 60;
  const MS_PER_FRAME = 1000 / FPS;
  const isZooming = useRef(false);
  const expandableImgRefs = useRef([]);
  const overlayDivRef = useRef<HTMLDivElement | null>(null);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [wrappedImages, setWrappedImages] = useState<string[]>([]);
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0,
  });
  const isZoomed = useSyncExternalStore(
    scaleStore.subscribe,
    scaleStore.getSnapshot,
    scaleStore.getServerSnapshot
  );
  const zoomLevel = isZoomed ? 2 : 1;
  const scaleRef = useRef(1);
  const panRef   = useRef({ x: 0, y: 0 });
  const previousZoom = useRef({ x: 0, y: 0 });
  const slideIndexSync = useSlideIndex();
  const changingSlides = useRef(false);
  const clickScale = 2.5;
  const friction = 0.15;
  const attraction = 0.015;
  const isPointerDown = useRef(false);
  const currentImage = useRef<HTMLElement | null>(null);
  const dragStartPositionX = useRef(0);
  const dragStartPositionY = useRef(0);
  const x = useRef(0);
  const y = useRef(0);
  const dragX = useRef(0);
  const dragY = useRef(0);
  const dragThreshold = 5;
  const startX = useRef(0);
  const startY = useRef(0);
  const velocityX = useRef(0);
  const velocityY = useRef(0);
  const isAnimating = useRef(false);
  const restingFrames = useRef(0);
  const lastForceX = useRef(0);
  const lastForceY = useRef(0);
  const zoomX = useRef(0);
  const zoomY = useRef(0);
  const zoomOffset = useRef(0);
  const zoomIncreaseDiff = useRef(0);
  const [closingModal, setClosingModal] = useState(false);
  const slides = useRef<{ cells: { element: HTMLElement, index: number }[], target: number }[]>([]);
  const slider = useRef<HTMLDivElement | null>(null);
  const visibleImagesRef = useRef(0);
  const selectedIndex = useRef(0);
  const firstCellInSlide = useRef<HTMLElement | null>(null);
  const sliderX = useRef(0);
  const sliderVelocity = useRef(0);
  const aspectRatioRef = useRef(1);
  const isScrolling = useRef(false);
  const isPinching = useRef(false);
  const startDist = useRef(0);
  const startScale = useRef(1);
  const isTouchPinching = useRef(false);
  const cells = useRef<{ element: HTMLElement, index: number }[]>([]);
  const thumbnails = useVideoThumbnails(urls);
  const plyrRefs = useRef<(APITypes | null)[]>(wrappedImages.map(() => null));
  const plyrRef = useRef<(APITypes | null)[]>(urls.map(() => null));

  function isVideoUrl(url: string) {
    return /\.(mp4|webm|ogg)$/i.test(url);
  };

  const plyrPropsList = useMemo(() => {
    return wrappedImages.map((url) => {
      if (!isVideoUrl(url)) {
        return null;
      }
      return {
        source: {
          type: "video",
          sources: [{ src: url, type: "video/mp4" }],
        } as Plyr.SourceInfo,
        options: {
          controls: [
            "play-large",
            "play",
            "progress",
            "current-time",
            "volume",
            "fullscreen",
          ],
          ratio: "16:9",
        } as Plyr.Options,
      };
    });
  }, [wrappedImages]);

  const wrappedFullscreenImages = wrappedImages.map((url, index) => {
    const imageRef = imageRefs.current[index];

    const length = wrappedImages.length;
    const originalCount = length - 2;
    let transformStyle = '';

    if (index === 0) {
      transformStyle = `translateX(-100%)`;
    } else if (index === length - 1) {
      transformStyle = `translateX(${originalCount * 100}%)`;
    } else {
      transformStyle = `translateX(${(index - 1) * 100}%)`;
    }

    const plyrProps = plyrPropsList[index];
    const isVideo   = plyrProps !== null;

    return (
      <div 
        key={index}
        ref={(el: HTMLImageElement | null) => {
          if (el && !cells.current.some(c => c.element === el)) {
            cells.current.push({ element: el, index });
          }
        }}
        style={{
          transform: transformStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute',
          left: 0,
          minWidth: '100%',
          margin: 'auto',
          touchAction: 'none',
        }}
        className={styles.imgMargin}
      >
        <div 
          ref={imageRef}
          onPointerDown={(e) => handlePanPointerStart(e, imageRef)}
          style={{ 
            overflow: 'visible',
            touchAction: "none",
            height: '100dvh',
            display: 'flex',
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {
            isVideo ? (
              <div data-index={index} className="myPlayer">
                <Plyr
                  source={plyrProps!.source}
                  options={plyrProps!.options}
                  ref={(player: APITypes | null) => {
                    plyrRefs.current[index] = player;
                  }}
                />
              </div>
          ) : (
              <img
                data-index={index}
                className={styles.fullscreenImages}
                src={`${url}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: "contain",
                  touchAction: 'manipulation',
                  transformOrigin: '0 0',
                  transform: `translate(0, 0) scale(1)`,
                  cursor: isZoomed ? 'grab' : 'zoom-in',
                  userSelect: 'none'
                }}
                alt={`cell-${index}`}
                draggable='false'
              />
            )
          }
        </div>
      </div>
    )
  });

  const plyrProp = useMemo(() => {
    return urls.map((url) => {
      if (!isVideoUrl(url)) {
        return null;
      }
      return {
        source: {
          type: "video",
          sources: [{ src: url, type: "video/mp4" }],
        } as Plyr.SourceInfo,
        options: {
          controls: [
            "play-large",
            "play",
            "progress",
            "current-time",
            "volume",
            "fullscreen",
          ],
          ratio: "16:9",
        } as Plyr.Options,
      };
    });
  }, [urls]);

  const oneFullscreenImage = urls.map((url, index) => {
    const imageRef = imageRefs.current[index];

    let transformStyle = '';

    transformStyle = `translateX(0%)`;

    const plyr = plyrProp[index];
    const isVideo = plyr !== null;

    return (
      <div 
        key={index}
        ref={(el: HTMLImageElement | null) => {
          if (el && !cells.current.some(c => c.element === el)) {
            cells.current.push({ element: el, index });
          }
        }}
        style={{
          transform: transformStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute',
          left: 0,
          minWidth: '100%',
          margin: 'auto',
          touchAction: 'none',
        }}
        className={styles.imgMargin}
      >
        <div 
          ref={imageRef}
          onPointerDown={(e) => handlePanPointerStart(e, imageRef)}
          style={{ 
            overflow: 'visible',
            touchAction: "none",
            height: '100dvh',
            display: 'flex',
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {
            isVideo ? (
              <div data-index={index} className="myPlayer">
                <Plyr
                  source={plyr!.source}
                  options={plyr!.options}
                  ref={(player: APITypes | null) => {
                    plyrRef.current[index] = player;
                  }}
                />
              </div>
          ) : (
              <img
                data-index={index}
                className={styles.fullscreenImages}
                src={`${url}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: "contain",
                  touchAction: 'manipulation',
                  transformOrigin: '0 0',
                  transform: `translate(0, 0) scale(1)`,
                  cursor: isZoomed ? 'grab' : 'zoom-in',
                  userSelect: 'none'
                }}
                alt={`cell-${index}`}
                draggable='false'
              />
            )
          }
        </div>
      </div>
    )
  });

  useEffect(() => {
    if (scaleRef.current === 1) return;
    changingSlides.current = true;
    scaleStore.setScale(1);
    zoomX.current = 0;
    zoomY.current = 0;
    scaleRef.current = 1;
    previousZoom.current.x = 0;
    previousZoom.current.y = 0;
    panRef.current = { x: 0, y: 0 }

    const commonStyles = {
      transform: 'translate(0, 0) scale(1)',
      transition: 'transform 0.2s cubic-bezier(.4,0,.22,1)',
    };

    imageRefs.current.forEach(ref => {
      const element = ref.current!;
      const child = element.children[0] as HTMLElement | undefined;
    
      // 1) Read your transition string and extract the duration
      const match = commonStyles.transition.match(/([\d.]+)s/);
      const durationMs = match ? parseFloat(match[1]) * 1000 : 300;
    
      // 2) Apply the transition to both element & child up front
      element.style.transition = commonStyles.transition;
      if (child) {
        child.style.transition = commonStyles.transition;
      }
    
      // 3) Force a reflow so the browser knows we're *starting* from the old state
      //    (necessary if you’re re-using the same element repeatedly)
      // tslint:disable-next-line:no-unused-expression
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      element.offsetWidth;
    
      // 4) Kick off the transforms
      element.style.transform = commonStyles.transform;
      if (child) {
        child.style.transform = commonStyles.transform;
      }
    
      // 5) Schedule the clean-up on a timer rather than waiting for transitionend
      setTimeout(() => {
        element.style.transition = '';
        if (child) {
          child.style.transition = '';
        }
      }, durationMs + 50);  // a tiny buffer to ensure it’s finished
    });

    x.current = 0;
    y.current = 0;

    setTimeout(() => {
      changingSlides.current = false;
    }, 200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideIndexSync]);

  useEffect(() => {
    if (!urls.length) return;
  
    const firstSlide = urls[0];
    const lastSlide = urls[urls.length - 1];
  
    const newSlides = [lastSlide, ...urls, firstSlide];
  
    setWrappedImages((prev) => 
      JSON.stringify(prev) !== JSON.stringify(newSlides) ? newSlides : prev
    );
  }, [urls]);
  
  useEffect(() => {
    if (!wrappedImages.length) return;
  
    imageRefs.current = wrappedImages.map(() => createRef());
  
    wrappedImages.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  
  }, [wrappedImages]);

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function getImageAspectRatio(image: HTMLDivElement | null) {
    if (!image) return;
  
    const imgElement = image.children[0] as HTMLImageElement | undefined;
  
    if (imgElement && imgElement.naturalWidth && imgElement.naturalHeight) {
      const ratio = imgElement.naturalWidth / imgElement.naturalHeight;
      aspectRatioRef.current = ratio;
    }
  }
  
  function handleZoomToggle(
    e: React.PointerEvent<HTMLImageElement> | React.TouchEvent<HTMLImageElement>,
    imageRef: React.RefObject<HTMLImageElement | null>
  ) {

    if (!imageRef.current) return;
    
    const newZoom = zoomLevel === 1 ? 2 : 1;

    const target = e.target as HTMLImageElement;
    const computedStyle = window.getComputedStyle(target);

    const matrix = new DOMMatrix(computedStyle.transform);

    const translateX = matrix.m41;
    const translateY = matrix.m42;

    x.current = translateX;
    y.current = translateY;

    isAnimating.current = false;
    
    const index = Number(imageRef.current.querySelector('img')?.dataset.index);

    if (index === imageRefs.current.length - 1) {
      zoomedDuringWrap.current = true;
    }

    getImageAspectRatio(imageRef.current);

    let currentX: number = 0, currentY: number = 0;

    if (typeof TouchEvent !== "undefined" && e instanceof TouchEvent && e.touches.length > 0) {
      const touch = e.touches[0];
      currentX = touch.clientX;
      currentY = touch.clientY;
    } else if ("clientX" in e) { 
      currentX = e.clientX;
      currentY = e.clientY;
    }

    const boundingBox = imageRef.current.getBoundingClientRect();
    const xCoord = currentX - boundingBox.left;
    let yCoord = currentY - boundingBox.top;

    let boundedX, boundedY;

    const imgTarget = e.target as HTMLImageElement;
    const { naturalWidth, naturalHeight } = imgTarget;

    const ratio = naturalWidth / naturalHeight;
    const imageWidth = boundingBox.width;
    const imageHeight = boundingBox.width / ratio;

    const scaledWidth = imageWidth * clickScale;
    const scaledHeight = scaledWidth / ratio;

    const zoomDenominator = clickScale / (clickScale - 1);
    zoomOffset.current = clickScale - 1;
    zoomIncreaseDiff.current = clickScale - 2;

    const minX = (boundingBox.left * zoomDenominator) - (windowSize.width - imageWidth) / 2;
    const maxX = (boundingBox.left) - (windowSize.width - imageWidth) / 2 + (boundingBox.right - (boundingBox.left * zoomDenominator));

    const leftGapAmount = xCoord - minX;
    const rightGapAmount = maxX - xCoord;

    let minY; let maxY; let topGapAmount; let bottomGapAmount;

    if (windowSize.height > imageHeight) {
      yCoord = yCoord - ((windowSize.height - imageHeight) / 2)
      minY = ((windowSize.height - imageHeight) / 2) * zoomDenominator - ((windowSize.height - imageHeight) / 2);
      maxY = boundingBox.bottom - ((windowSize.height - imageHeight) / 2) * zoomDenominator - ((windowSize.height - imageHeight) / 2);

      topGapAmount = yCoord - minY;
      bottomGapAmount = maxY - yCoord;
    } else {
      minY = ((windowSize.height - imageHeight) / 2) * zoomDenominator;
      maxY = boundingBox.bottom - ((windowSize.height - imageHeight) / 2) * zoomDenominator;

      topGapAmount = yCoord - minY;
      bottomGapAmount = maxY - yCoord;
    }
    
    if (windowSize.width > scaledWidth) {
      boundedX = imageWidth / 2;
    } else if (windowSize.width > imageWidth) {
      if (leftGapAmount < 0) {
        boundedX = minX;
      } else if (rightGapAmount < 0) {
        boundedX = maxX;
      } else {
        boundedX = xCoord;
      }
    } else {
      boundedX = xCoord;
    };

    if (windowSize.height > scaledHeight) {
      boundedY = imageHeight / 2;
    } else if (windowSize.height > imageHeight) {
      if (topGapAmount < 0) {
        boundedY = minY;
      } else if (bottomGapAmount < 0) {
        boundedY = maxY;
      } else {
        boundedY = yCoord;
      }
    } else {
      boundedY = yCoord;
    };

    requestAnimationFrame(() => {
      if (newZoom === 2) {
        if (!imageRef.current) return;
        zoomX.current = boundedX;
        zoomY.current = boundedY;
        scaleRef.current = clickScale
        scaleStore.setScale(clickScale);
  
        const panX = (-zoomX.current) * (clickScale - 1);
        const panY = (-zoomY.current) * (clickScale - 1);
        
        previousZoom.current.x = zoomX.current;
        previousZoom.current.y = zoomY.current;
  
        panRef.current = { x: panX, y: panY }
  
        const firstImageRef = imageRefs.current[0].current;
        const secondImageRef = imageRefs.current[1].current;
        const lastImageRef = imageRefs.current[imageRefs.current.length - 1].current;
        
        const imgChild = imageRef.current.children[0] as HTMLImageElement | undefined;
  
        const firstImageRefChild = firstImageRef?.children[0] as HTMLImageElement | undefined;
        const secondImageRefChild = secondImageRef?.children[0] as HTMLImageElement | undefined;
        const lastImageRefChild = lastImageRef?.children[0] as HTMLImageElement | undefined;

        const index = Number(imageRef.current.querySelector('img')?.dataset.index);

        if (imgChild && index !== imageRefs.current.length - 1) {
          imgChild.style.transition = 'transform 0.3s cubic-bezier(.4,0,.22,1)';
          imgChild.style.transform = `scale(${clickScale}) translate(${-boundedX / zoomDenominator}px,${-boundedY / zoomDenominator}px)`;
        }

        if (index === imageRefs.current.length - 2 && firstImageRefChild) {
          firstImageRefChild.style.transition = 'transform 0.3s cubic-bezier(.4,0,.22,1)';
          firstImageRefChild.style.transform = `scale(${clickScale}) translate(${-boundedX / zoomDenominator}px,${-boundedY / zoomDenominator}px)`;
        }

        if (index === imageRefs.current.length - 1 && secondImageRefChild) {
          secondImageRefChild.style.transition = 'transform 0.3s cubic-bezier(.4,0,.22,1)';
          secondImageRefChild.style.transform = `scale(${clickScale}) translate(${-boundedX / zoomDenominator}px,${-boundedY / zoomDenominator}px)`;
        }

        if (index !== imageRefs.current.length - 2 && index !== imageRefs.current.length - 3 && lastImageRefChild) {
          lastImageRefChild.style.transition = 'transform 0.3s cubic-bezier(.4,0,.22,1)';
          lastImageRefChild.style.transform = `scale(${clickScale}) translate(${-boundedX / zoomDenominator}px,${-boundedY / zoomDenominator}px)`;
        }
        
        if (imgChild && index !== imageRefs.current.length - 1) {
            imgChild.addEventListener('transitionend', function handler() {
            imgChild.style.transition = '';
            isZooming.current = false;
            imgChild.removeEventListener('transitionend', handler);
          });
        }

        if (index === imageRefs.current.length - 2 && firstImageRefChild) {
          firstImageRefChild.addEventListener('transitionend', function handler() {
            firstImageRefChild.style.transition = '';
            isZooming.current = false;
            firstImageRefChild.removeEventListener('transitionend', handler);
          });
        }

        if (index === imageRefs.current.length - 1 && secondImageRefChild) {
          secondImageRefChild.addEventListener('transitionend', function handler() {
            secondImageRefChild.style.transition = '';
            isZooming.current = false;
            secondImageRefChild.removeEventListener('transitionend', handler);
          });
        }

        if (index !== imageRefs.current.length - 2 && index !== imageRefs.current.length - 3 && lastImageRefChild) {
          lastImageRefChild.addEventListener('transitionend', function handler() {
            lastImageRefChild.style.transition = '';
            isZooming.current = false;
            lastImageRefChild.removeEventListener('transitionend', handler);
          });
        }
      } else {
        if (!imageRef.current) return;
        zoomX.current = 0;
        zoomY.current = 0;
        scaleRef.current = 1;
        scaleStore.setScale(1);
        previousZoom.current.x = 0;
        previousZoom.current.y = 0;
        panRef.current = { x: 0, y: 0 }

        if (zoomedDuringWrap.current === true) {
          zoomedDuringWrap.current = false;
        }
  
        const firstImageRef = imageRefs.current[0].current;
        const secondImageRef = imageRefs.current[1].current;
        const lastImageRef = imageRefs.current[imageRefs.current.length - 1].current;

        const index = Number(imageRef.current?.querySelector('img')?.dataset.index)
        
        if (imageRef.current && index !== imageRefs.current.length - 1) {
          imageRef.current.style.transition = 'transform 0.3s cubic-bezier(.4,0,.22,1)';
        }

        if (index !== 1 && index !== imageRefs.current.length - 1 && firstImageRef) {
          firstImageRef.style.transition = 'transform 0.3s cubic-bezier(.4,0,.22,1)';
        }

        if (index === imageRefs.current.length - 1 && secondImageRef) {
          secondImageRef.style.transition = 'transform 0.3s cubic-bezier(.4,0,.22,1)';
        }

        if (lastImageRef) {
          lastImageRef.style.transition = 'transform 0.3s cubic-bezier(.4,0,.22,1)';
        }
      
        const imgChild = imageRef.current?.children[0] as HTMLImageElement | undefined;
        const firstImageRefChild = firstImageRef?.children[0] as HTMLImageElement | undefined;
        const secondImageRefChild = secondImageRef?.children[0] as HTMLImageElement | undefined;
        const lastImageRefChild = lastImageRef?.children[0] as HTMLImageElement | undefined;

        if (imgChild && index !== imageRefs.current.length - 1) {
          imgChild.style.transition = 'transform 0.3s cubic-bezier(.4,0,.22,1)';
          imgChild.style.transform = `translate(0, 0) scale(1)`;
        }

        if (index !== 1 && index !== imageRefs.current.length - 1 && firstImageRefChild) {
          firstImageRefChild.style.transition = 'transform 0.3s cubic-bezier(.4,0,.22,1)';
          firstImageRefChild.style.transform = `translate(0, 0) scale(1)`;
        }

        if (index === imageRefs.current.length - 1 && secondImageRefChild) {
          secondImageRefChild.style.transition = 'transform 0.3s cubic-bezier(.4,0,.22,1)';
          secondImageRefChild.style.transform = `translate(0, 0) scale(1)`;
        }

        if (lastImageRefChild) {
          lastImageRefChild.style.transition = 'transform 0.3s cubic-bezier(.4,0,.22,1)';
          lastImageRefChild.style.transform = `translate(0, 0) scale(1)`;
        }

        if (imgChild && index !== imageRefs.current.length - 1) {
            imgChild.addEventListener('transitionend', function handler() {
            imgChild.style.transition = '';
            imgChild.removeEventListener('transitionend', handler);
          });
        }

        if (index !== 1 && index !== imageRefs.current.length - 1 && firstImageRefChild) {
          firstImageRefChild.addEventListener('transitionend', function handler() {
            firstImageRefChild.style.transition = '';
            firstImageRefChild.removeEventListener('transitionend', handler);
          });
        }

        if (index === imageRefs.current.length - 1 && secondImageRefChild) {
          secondImageRefChild.addEventListener('transitionend', function handler() {
            secondImageRefChild.style.transition = '';
            secondImageRefChild.removeEventListener('transitionend', handler);
          });
        }

        if (lastImageRefChild) {
          lastImageRefChild.addEventListener('transitionend', function handler() {
            lastImageRefChild.style.transition = '';
            lastImageRefChild.removeEventListener('transitionend', handler);
          });
        }
        
        if (imageRef.current && index !== imageRefs.current.length - 1) {
          imageRef.current.style.transform = `translate(0, 0) scale(1)`;
        }
  
        if (index !== 1 && index !== imageRefs.current.length - 1 && firstImageRef) {
          firstImageRef.style.transform = `translate(0, 0) scale(1)`;
        }

        if (index === imageRefs.current.length - 1 && secondImageRef) {
          secondImageRef.style.transform = `translate(0, 0) scale(1)`;
        }

        if (lastImageRef) {
          lastImageRef.style.transform = `translate(0, 0) scale(1)`;
        }
        
        if (imageRef.current && index !== imageRefs.current.length - 1) {
          imageRef.current.addEventListener('transitionend', function handler() {
            if (!imageRef.current) return;
            imageRef.current.style.transition = '';
            imageRef.current.removeEventListener('transitionend', handler);
          });
        }
  
        if (index !== 1 && index !== imageRefs.current.length - 1 && firstImageRef) {
          firstImageRef.addEventListener('transitionend', function handler() {
            if (!firstImageRef) return;
            firstImageRef.style.transition = '';
            firstImageRef.removeEventListener('transitionend', handler);
          });
        }

        if (index === imageRefs.current.length - 1 && secondImageRef) {
          secondImageRef.addEventListener('transitionend', function handler() {
            if (!secondImageRef) return;
            secondImageRef.style.transition = '';
            secondImageRef.removeEventListener('transitionend', handler);
          });
        }

        if (lastImageRef) {
          lastImageRef.addEventListener('transitionend', function handler() {
            if (!lastImageRef) return;
            lastImageRef.style.transition = '';
            lastImageRef.removeEventListener('transitionend', handler);
          });
        }
  
        x.current = 0;
        y.current = 0;
      }
    })
  };

  function handlePanPointerStart(e: React.PointerEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    imageRef: React.RefObject<HTMLImageElement | null>) {
    isScrolling.current = false;
    isPinching.current = false;
    isTouchPinching.current = false;
    pinchJustEnded.current = false;
    isZoomClick.current = true;
    isPointerDown.current = true;

    currentImage.current = imageRef.current;

    const transformValues = getCurrentTransform(imageRef.current);
    const translateX = transformValues.x;
    const translateY = transformValues.y;

    dragStartPositionX.current = translateX;
    dragStartPositionY.current = translateY;

    dragX.current = translateX;
    dragY.current = translateY;

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
    if (isAnimating.current === false) return;

    const msPassed = now - prevTimeRef.current;
    if (msPassed < MS_PER_FRAME) {
      // not enough time has passed → try again next RAF
      requestAnimationFrame(animate);
      return;
    }
    // carry over any excess (for more stable timing)
    const excessTime = msPassed % MS_PER_FRAME;
    prevTimeRef.current = now - excessTime;

    if (isScrolling.current === true || isPinching.current === true || changingSlides.current || isTouchPinching.current === true) {
      isAnimating.current = false;
      restingFrames.current = 0;
      return;
    };
    applyDragForce();
    applySelectedAttraction();

    const previousX = x.current;
    const previousY = y.current;

    integratePhysics();
    positionSlider();
    settle(previousX, previousY);

    if (isAnimating.current) requestAnimationFrame(animate);
  };

  function applyDragForce() {
    if (!isPointerDown.current) return;
  
    const dragVelocityX = dragX.current - x.current;
    const dragVelocityY = dragY.current - y.current;
    const dragForceX = dragVelocityX - velocityX.current;
    const dragForceY = dragVelocityY - velocityY.current;

    lastForceX.current = dragForceX;
    lastForceY.current = dragForceY;

    applyForce(dragForceX, dragForceY);
  };

  function applyForce(forceX: number, forceY: number) {
    velocityX.current += forceX;
    velocityY.current += forceY;
  };

  function integratePhysics() {
    x.current += velocityX.current;
    y.current += velocityY.current;

    velocityX.current *= getFrictionFactor();
    velocityY.current *= getFrictionFactor();
  };

  function getFrictionFactor() {
    return 1 - friction;
  };

  function positionSlider() {
    const currentPositionX = x.current;
    const currentPositionY = y.current;
    setTranslateX(currentPositionX, currentPositionY);
  };

  function settle(previousX: number, previousY: number) {
    const isRestingX = !isPointerDown.current && Math.round(x.current * 100) === Math.round(previousX * 100);
    const isRestingY = !isPointerDown.current && Math.round(y.current * 100) === Math.round(previousY * 100);
    if (isRestingX && isRestingY) {
      restingFrames.current++;
    };

    if (restingFrames.current > 2) {
      isAnimating.current = false;
      positionSlider();
    };
  };

  function setTranslateX(x: number, y: number) {
    if (!currentImage.current) return;
    const translateX = getPositionValue(x);
    const translateY = getPositionValue(y);
    currentImage.current.style.transform = `translate3d(${translateX},${translateY},0)`;
  };

  function getPositionValue(position: number) {
    return Math.round(position) + 'px';
  };

  function handlePanPointerMove(e: PointerEvent | TouchEvent | React.PointerEvent<HTMLImageElement> | React.TouchEvent<HTMLImageElement>,
    imageRef: React.RefObject<HTMLImageElement | null>) {
    e.preventDefault();
    if (!isZoomed) return;
    if (!isPointerDown.current) return;
    
    let currentX: number = 0, currentY: number = 0;

    if ("touches" in e && e.touches.length > 0) {
      const touch = (e as TouchEvent).touches[0];
      currentX = touch.clientX;
      currentY = touch.clientY;
    } else if ("clientX" in e) { 
      currentX = e.clientX;
      currentY = e.clientY;
    }

    const moveX = currentX - startX.current;
    const moveY = currentY - startY.current;
    
    if (Math.abs(moveX) > dragThreshold || Math.abs(moveY) > dragThreshold) {
      isZoomClick.current = false;
    }
    
    dragX.current = dragStartPositionX.current + moveX;
    dragY.current = dragStartPositionY.current + moveY;

    if (!imageRef.current) return;

    const imageWidth = imageRef.current.children[0].clientWidth;
    const imageHeight = imageRef.current.children[0].clientWidth / aspectRatioRef.current;

    const distanceFromLeftBound = Math.max(0, dragStartPositionX.current - (zoomX.current * zoomOffset.current) + (windowSize.width - imageWidth) / 2);

    const distanceFromRightBound = Math.min(-imageWidth + (windowSize.width - imageWidth), dragStartPositionX.current - (zoomX.current * zoomOffset.current) + (imageWidth * zoomIncreaseDiff.current) + (windowSize.width - imageWidth) / 2);

    let distanceFromTopBound; let distanceFromBottomBound;

    if (windowSize.height > imageHeight) {
      distanceFromTopBound = Math.max(0, dragStartPositionY.current - (zoomY.current * zoomOffset.current) + (windowSize.height - imageHeight) / 2);
    
      distanceFromBottomBound = Math.min(-imageHeight + (windowSize.height - imageHeight), dragStartPositionY.current - (zoomY.current * zoomOffset.current) + (imageHeight * zoomIncreaseDiff.current) + (windowSize.height - imageHeight) / 2);
    } else {
      distanceFromTopBound = Math.max(0, dragStartPositionY.current - (zoomY.current * zoomOffset.current) + (((windowSize.height - imageHeight) / 2) * zoomIncreaseDiff.current) + (windowSize.height - imageHeight));
    
      distanceFromBottomBound = Math.min(-imageHeight + (windowSize.height - imageHeight), dragStartPositionY.current - (zoomY.current * zoomOffset.current) + (((windowSize.height - imageHeight) / 2) * zoomIncreaseDiff.current) + (imageHeight * zoomIncreaseDiff.current) + (windowSize.height - imageHeight));
    }

    if (dragX.current - (zoomX.current * zoomOffset.current) + (windowSize.width - imageWidth) / 2 > distanceFromLeftBound) {
      const overshoot = dragX.current - (zoomX.current * zoomOffset.current) + (windowSize.width - imageWidth) / 2 - distanceFromLeftBound;
      dragX.current -= overshoot * 0.5;
    };

    if ((dragX.current - (zoomX.current * zoomOffset.current) + (imageWidth * zoomIncreaseDiff.current) + (windowSize.width - imageWidth) / 2) < distanceFromRightBound) {
      const overshoot = dragX.current - (zoomX.current * zoomOffset.current) + (imageWidth * zoomIncreaseDiff.current) + (windowSize.width - imageWidth) / 2 - distanceFromRightBound;
      dragX.current -= overshoot * 0.5;
    };

    if (windowSize.height > imageHeight) {
      if (dragY.current - (zoomY.current * zoomOffset.current) + ((windowSize.height - imageHeight) / 2) > distanceFromTopBound) {
        const overshoot = dragY.current - (zoomY.current * zoomOffset.current) + ((windowSize.height - imageHeight) / 2) - distanceFromTopBound;
        dragY.current -= overshoot * 0.5;
      };
  
      if (dragY.current - (zoomY.current * zoomOffset.current) + (imageHeight * zoomIncreaseDiff.current) + ((windowSize.height - imageHeight) / 2) < distanceFromBottomBound) {
        const overshoot = dragY.current - (zoomY.current * zoomOffset.current) + (imageHeight * zoomIncreaseDiff.current) + ((windowSize.height - imageHeight) / 2) - distanceFromBottomBound;
        dragY.current -= overshoot * 0.5;
      };
    } else {
      if (dragY.current - (zoomY.current * zoomOffset.current) + (((windowSize.height - imageHeight) / 2) * zoomIncreaseDiff.current) + (windowSize.height - imageHeight) > distanceFromTopBound) {
        const overshoot = dragY.current - (zoomY.current * zoomOffset.current) + (((windowSize.height - imageHeight) / 2) * zoomIncreaseDiff.current) + (windowSize.height - imageHeight) - distanceFromTopBound;
        dragY.current -= overshoot * 0.5;
      };
  
      if (dragY.current - (zoomY.current * zoomOffset.current) + (((windowSize.height - imageHeight) / 2) * zoomIncreaseDiff.current) + (imageHeight * zoomIncreaseDiff.current) + (windowSize.height - imageHeight) < distanceFromBottomBound) {
        const overshoot = dragY.current - (zoomY.current * zoomOffset.current) + (((windowSize.height - imageHeight) / 2) * zoomIncreaseDiff.current) + (imageHeight * zoomIncreaseDiff.current) + (windowSize.height - imageHeight) - distanceFromBottomBound;
        dragY.current -= overshoot * 0.5;
      };
    }
  };

  const pinchJustEnded = useRef(false);

  function handlePanPointerUp(e: React.PointerEvent<HTMLImageElement>) {
    if (pinchJustEnded.current) {
      // swallow this pointerup—it was right after a pinch
      pinchJustEnded.current = false;
      return;
    }
    if (!isZoomed || isTouchPinching.current === true) {
      return;
    }
    isPointerDown.current = false;
    if (isZoomClick.current && isZoomed) {
      const targetImg = (e.target as HTMLElement).closest("img") as HTMLImageElement | null;
      if (!targetImg) return;

      const imgIndex = targetImg.dataset.index;
      if (imgIndex === undefined) return;

      const matchedRef = imageRefs.current[parseInt(imgIndex)];

      handleZoomToggle(e, matchedRef);
      scaleStore.setScale(1);
      return;
    }

    const forceThreshold = 0.1;

    if (
      (Math.abs(lastForceX.current) > forceThreshold ||
        Math.abs(lastForceY.current) > forceThreshold) &&
      Math.abs(velocityX.current) === 0 &&
      Math.abs(velocityY.current) === 0
    ) {
      applyForce(-lastForceX.current, -lastForceY.current);
      startAnimation();
    }
  
    lastForceX.current = 0;
    lastForceY.current = 0;
  };

  function applySelectedAttraction() {
    if (isPointerDown.current) return;

    const restingX = getRestingPositionX();
    const restingY = getRestingPositionY();
  
    if (!currentImage.current) return;
  
    const imageWidth = currentImage.current.children[0].clientWidth;
    const imageHeight = currentImage.current.children[0].clientWidth / aspectRatioRef.current;
  
    const leftBound = restingX - (zoomX.current * zoomOffset.current) + (windowSize.width - imageWidth) / 2;
    const rightBound = restingX - (zoomX.current * zoomOffset.current) + (imageWidth * zoomIncreaseDiff.current) + (windowSize.width - imageWidth) / 2;

    let topBound; let bottomBound;

    if (windowSize.height > imageHeight) {
      topBound = restingY - (zoomY.current * zoomOffset.current) + (windowSize.height - imageHeight) / 2;
      bottomBound = restingY - (zoomY.current * zoomOffset.current) + (imageHeight * zoomIncreaseDiff.current) + (windowSize.height - imageHeight) / 2;
    } else {
      topBound = restingY - (zoomY.current * zoomOffset.current) + (((windowSize.height - imageHeight) / 2) * zoomIncreaseDiff.current) + (windowSize.height - imageHeight);
      bottomBound = restingY - (zoomY.current * zoomOffset.current) + (((windowSize.height - imageHeight) / 2) * zoomIncreaseDiff.current) + (imageHeight * zoomIncreaseDiff.current) + (windowSize.height - imageHeight);
    }
  
    if (windowSize.width >= imageWidth * scaleRef.current) {
        const distance = -restingX + (zoomX.current * zoomOffset.current) - (imageWidth / 2) * zoomOffset.current;
        const force = distance * attraction;
        velocityX.current += force;
    } else {
      if (leftBound > 0) {
        const distance = -restingX + (zoomX.current * zoomOffset.current) - (windowSize.width - imageWidth) / 2;
        const force = distance * attraction;
        velocityX.current += force;
      }
  
      if (rightBound < -imageWidth + (windowSize.width - imageWidth)) {
        const distance = -imageWidth + (windowSize.width - imageWidth) - restingX + (zoomX.current * zoomOffset.current) - (imageWidth * zoomIncreaseDiff.current) - (windowSize.width - imageWidth) / 2;
        const force = distance * attraction;
        velocityX.current += force;
      }
    }
  
    if (windowSize.height > imageHeight) {
      if (topBound > 0) {
        const distance = -restingY + (zoomY.current * zoomOffset.current) - (windowSize.height - imageHeight) / 2;
        const force = distance * attraction;
        velocityY.current += force;
      }

      if (bottomBound < -imageHeight + (windowSize.height - imageHeight)) {
        const distance = -imageHeight + (windowSize.height - imageHeight) - restingY + (zoomY.current * zoomOffset.current) - (imageHeight * zoomIncreaseDiff.current) - (windowSize.height - imageHeight) / 2;
        const force = distance * attraction;
        velocityY.current += force;
      }
    } else {
      if (topBound > 0) {
        const distance = -restingY + (zoomY.current * zoomOffset.current) - (((windowSize.height - imageHeight) / 2) * zoomIncreaseDiff.current) - (windowSize.height - imageHeight);
        const force = distance * attraction;
        velocityY.current += force;
      }
  
      if (bottomBound < -imageHeight + (windowSize.height - imageHeight)) {
        const distance = -imageHeight + (windowSize.height - imageHeight) - restingY + (zoomY.current * zoomOffset.current) - (((windowSize.height - imageHeight) / 2) * zoomIncreaseDiff.current) - (imageHeight * zoomIncreaseDiff.current) - (windowSize.height - imageHeight);
        const force = distance * attraction;
        velocityY.current += force;
      }
    } 
  };  

  function getRestingPositionX() {
    return x.current + (velocityX.current / (1 - getFrictionFactor()));
  };

  function getRestingPositionY() {
    return y.current + (velocityY.current / (1 - getFrictionFactor()));
  };

  function getCurrentTransform(slide: HTMLElement | null) {
    if (!slide) return { x: 0, y: 0 };
    const computedStyle = window.getComputedStyle(slide);
    const transform = computedStyle.transform;
    if (!transform || transform === 'none') return { x: 0, y: 0 };

    const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
    if (!matrixMatch) return { x: 0, y: 0 };

    const matrixValues = matrixMatch[1].split(',').map(parseFloat);
    const tx = matrixValues[4] || 0;
    const ty = matrixValues[5] || 0;

    return { x: tx, y: ty };
  }

  interface WheelEventWithDelta extends WheelEvent {
    deltaX: number;
    deltaY: number;
  }

  function isPinchGesture(e: WheelEvent): boolean {
    if (e.ctrlKey) return true;
  
    const absDeltaX = Math.abs(e.deltaX);
    const absDeltaY = Math.abs(e.deltaY);
  
    if (absDeltaX < 1 && absDeltaY < 1) return false;
  
    const ratio = absDeltaX / absDeltaY;
    if (ratio >= 0.8 && ratio <= 1.2) {
      return true;
    }
  
    return false;
  }

  function handleWheel(e: WheelEventWithDelta) {
    e.preventDefault();
    if (!isZoomed) return;
    if (isPinchGesture(e)) return;
    if (e.ctrlKey) return;
    
    isScrolling.current = true;

    const transformValues = getCurrentTransform(currentImage.current);
    let translateX = transformValues.x;
    let translateY = transformValues.y;

    translateX -= e.deltaX;
    translateY -= e.deltaY;

    if (!currentImage.current) return;

    const imageWidth = currentImage.current.children[0].clientWidth;
    const imageHeight = currentImage.current.children[0].clientWidth / aspectRatioRef.current;

    const leftBound = (translateX - (zoomX.current * zoomOffset.current) + (windowSize.width - imageWidth) / 2);

    const rightBound = (translateX - (zoomX.current * zoomOffset.current) + (imageWidth * zoomIncreaseDiff.current) + (windowSize.width - imageWidth) / 2);

    const topBound = (translateY - (zoomY.current * zoomOffset.current) + (windowSize.height - imageHeight) / 2);

    const bottomBound = (translateY - (zoomY.current * zoomOffset.current) + (imageHeight * zoomIncreaseDiff.current) + (windowSize.height - imageHeight) / 2);

    if (windowSize.width >= imageWidth * scaleRef.current) {
      const distance = -translateX + (zoomX.current * zoomOffset.current) - (imageWidth / 2) * zoomOffset.current;
      const force = distance * 1;
      translateX += force;
    } else {
      if (leftBound > 0) {
        const distance = -translateX + (zoomX.current * zoomOffset.current) - (windowSize.width - imageWidth) / 2;
        const force = distance * 1;
        translateX += force;
      };
  
      if (rightBound < -imageWidth + (windowSize.width - imageWidth)) {
        const distance = -imageWidth + (windowSize.width - imageWidth) - translateX + (zoomX.current * zoomOffset.current) - (imageWidth * zoomIncreaseDiff.current) - (windowSize.width - imageWidth) / 2;
        const force = distance * 1;
        translateX += force;
      };
    }

    if (windowSize.height > imageHeight * scaleRef.current) {
      translateY = 0;
    } else if (windowSize.height > imageHeight) {
      if (topBound > 0) {
        const distance = -translateY + (zoomY.current * zoomOffset.current) - (windowSize.height - imageHeight) / 2;
        const force = distance * 1;
        translateY += force;
      }

      if (bottomBound < -imageHeight + (windowSize.height - imageHeight)) {
        const distance = -imageHeight + (windowSize.height - imageHeight) - translateY + (zoomY.current * zoomOffset.current) - (imageHeight * zoomIncreaseDiff.current) - (windowSize.height - imageHeight) / 2;
        const force = distance * 1;
        translateY += force;
      };
    } else {
      if (topBound > 0) {
        const distance = -translateY + (zoomY.current * zoomOffset.current) - (((windowSize.height - imageHeight) / 2) * zoomIncreaseDiff.current) - (windowSize.height - imageHeight);
        const force = distance * 1;
        translateY += force;
      };
  
      if (bottomBound < -imageHeight + (windowSize.height - imageHeight)) {
        const distance = -imageHeight + (windowSize.height - imageHeight) - translateY + (zoomY.current * zoomOffset.current) - (((windowSize.height - imageHeight) / 2) * zoomIncreaseDiff.current) - (imageHeight * zoomIncreaseDiff.current) - (windowSize.height - imageHeight);
        const force = distance * 1;
        translateY += force;
      };
    }

    setTranslateX(translateX, translateY);

    x.current = translateX;
    y.current = translateY;
  };

  useEffect(() => {
    const sliderElement = imageRefs.current[slideIndex]?.current;
    if (!sliderElement) return;
  
    const pointerMoveHandler = (e: PointerEvent | TouchEvent) => handlePanPointerMove(e, imageRefs.current[slideIndex]);
    const pointerUpHandler = (e: PointerEvent) => handlePanPointerUp(e as unknown as React.PointerEvent<HTMLImageElement>);

    window.addEventListener('pointermove', pointerMoveHandler);
    window.addEventListener('pointerup', pointerUpHandler);
    window.addEventListener('wheel', handleWheel, { passive: false });
  
    return () => {
      window.removeEventListener('pointermove', pointerMoveHandler);
      window.removeEventListener('pointerup', pointerUpHandler);
      window.removeEventListener('wheel', handleWheel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideIndex, handleWheel]);

  type Point = { x: number; y: number };

  function clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
  }

  const handlePinchWheel = useCallback((
    e: WheelEvent,
    imageRef: React.RefObject<HTMLDivElement | null>
  ) => {
    e.preventDefault();
    if (!imageRef.current) return;
    if (!e.ctrlKey) return;

    sliderApi.current?.centerSlider();

    if (scaleRef.current > 1.01) {
      isPinching.current = true;
    }

    const { ctrlKey, deltaMode } = e;
    let { deltaY } = e;

    if (deltaMode === 1) {
      deltaY *= 15;
    }

    const divisor = ctrlKey ? 100 : 300;
    const scaleDiff = 1 - deltaY / divisor;
    const destZoomLevel = scaleRef.current * scaleDiff;

    zoomTo({
      destZoomLevel,
      centerPoint: { x: e.clientX, y: e.clientY },
      imageRef
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scaleRef.current]);

  const rafId = useRef<number|null>(null);

  function zoomTo({
    destZoomLevel,
    centerPoint,
    imageRef
  }: {
    destZoomLevel: number;
    centerPoint: Point;
    imageRef: React.RefObject<HTMLDivElement | null>;
  }) {
    if (!imageRef.current) return;

    getImageAspectRatio(imageRef.current);

    const finalZoom = clamp(destZoomLevel, 1, 3);

    if (finalZoom === scaleRef.current) return;

    scaleStore.setScale(finalZoom);

    zoomedDuringWrap.current = false;

    const image = imageRef.current;
    const imageEl = image.children[0] as HTMLImageElement;
    const rect = image.getBoundingClientRect();
    const scaledWidth = rect.width * finalZoom;
    const scaledHeight = imageEl.clientHeight * finalZoom;

    const offsetX = windowSize.width > scaledWidth ? (rect.width / 2) : centerPoint.x - rect.left;
    let offsetY = windowSize.height > scaledHeight ? (imageEl.clientHeight / 2) : centerPoint.y - rect.top;

    if (windowSize.height > imageEl.clientHeight) {
      offsetY = centerPoint.y - rect.top - (windowSize.height - imageEl.clientHeight) / 2;
    }

    zoomOffset.current = finalZoom - 1;
    zoomIncreaseDiff.current = finalZoom - 2;

    zoomX.current = (offsetX - panRef.current.x) / scaleRef.current;
    const panX = (-zoomX.current) * (finalZoom - 1);

    zoomY.current = (offsetY - panRef.current.y) / scaleRef.current;
    const panY = (-zoomY.current) * (finalZoom - 1);

    if (scaleRef.current !== 1 && zoomY.current !== previousZoom.current.y) {
      y.current += ((zoomY.current - previousZoom.current.y) * (finalZoom - 1));
      positionSlider();
    }

    if (scaleRef.current !== 1 && zoomX.current !== previousZoom.current.x) {
      x.current += ((zoomX.current - previousZoom.current.x) * (finalZoom - 1));
      positionSlider();
    }
    
    previousZoom.current.x = zoomX.current;
    previousZoom.current.y = zoomY.current;

    scaleRef.current = finalZoom
    panRef.current = { x: panX, y: panY }

    let topBound = 0;
    let bottomBound = 0;

    if (windowSize.height > imageEl.clientHeight) {
      topBound = y.current - (zoomY.current * (finalZoom - 1)) + (windowSize.height - imageEl.clientHeight) / 2;
      bottomBound = y.current - (zoomY.current * (finalZoom - 1)) + (imageEl.clientHeight * (finalZoom - 2)) + (windowSize.height - imageEl.clientHeight) / 2;
    } else {
      topBound = y.current - (zoomY.current * (finalZoom - 1)) + (((windowSize.height - imageEl.clientHeight) / 2) * (finalZoom - 2)) + (windowSize.height - imageEl.clientHeight);
      bottomBound = y.current - (zoomY.current * (finalZoom - 1)) + (((windowSize.height - imageEl.clientHeight) / 2) * (finalZoom - 2)) + (imageEl.clientHeight * (finalZoom - 2)) + (windowSize.height - imageEl.clientHeight);
    }

    const leftBound = (x.current - (zoomX.current * (finalZoom - 1)) + (windowSize.width - rect.width) / 2);

    const rightBound = (x.current - (zoomX.current * (finalZoom - 1)) + (rect.width * (finalZoom - 2)) + (windowSize.width - rect.width) / 2);

    if (windowSize.height > scaledHeight) {
      const distance = -y.current + (zoomY.current * (finalZoom - 1)) - (imageEl.clientHeight / 2) * (finalZoom - 1);
      y.current += distance;
      positionSlider();
    } else if (windowSize.height > imageEl.clientHeight) {
      if (topBound > 0) {
        const distance = -y.current + (zoomY.current * (finalZoom - 1)) - (windowSize.height - imageEl.clientHeight) / 2;
        y.current += distance;
        positionSlider();
      }

      if (bottomBound < -imageEl.clientHeight + (windowSize.height - imageEl.clientHeight)) {
        const distance = -imageEl.clientHeight + (windowSize.height - imageEl.clientHeight) - y.current + (zoomY.current * (finalZoom - 1)) - (imageEl.clientHeight * (finalZoom - 2)) - (windowSize.height - imageEl.clientHeight) / 2;
        y.current += distance;
        positionSlider();
      };
    } else {
      if (topBound > 0) {
        const distance = -y.current + (zoomY.current * (finalZoom - 1)) - (((windowSize.height - imageEl.clientHeight) / 2) * (finalZoom - 2)) - (windowSize.height - imageEl.clientHeight);
        y.current += distance;
        positionSlider();
      };
  
      if (bottomBound < -imageEl.clientHeight + (windowSize.height - imageEl.clientHeight)) {
        const distance = -imageEl.clientHeight + (windowSize.height - imageEl.clientHeight) - y.current + (zoomY.current * (finalZoom - 1)) - (((windowSize.height - imageEl.clientHeight) / 2) * (finalZoom - 2)) - (imageEl.clientHeight * (finalZoom - 2)) - (windowSize.height - imageEl.clientHeight);
        y.current += distance;
        positionSlider();
      };
    }

    if (windowSize.width > scaledWidth) {
      const distance = -x.current + (zoomX.current * (finalZoom - 1)) - (rect.width / 2) * (finalZoom - 1);
      x.current += distance;
      positionSlider();
    } else {
      if (leftBound > 0) {
        const distance = -x.current + (zoomX.current * (finalZoom - 1)) - (windowSize.width - rect.width) / 2;
        x.current += distance;
        positionSlider();
      } 
  
      if (rightBound < -rect.width + (windowSize.width - rect.width)) {
        const distance = -rect.width + (windowSize.width - rect.width) - x.current + (zoomX.current * (finalZoom - 1)) - (rect.width * (finalZoom - 2)) - (windowSize.width - rect.width) / 2;
        x.current += distance;
        positionSlider();
      } 
    }
    
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(() => {
        // primary image
        imageEl.style.transform = `translate3d(${panX}px, ${panY}px,0) scale(${finalZoom})`;

        // the cloned/wrap-around images
        const lastImageEl   = imageRefs.current.at(-1)?.current?.children[0] as HTMLElement;
        const firstImageEl  = imageRefs.current[0]?.current?.children[0] as HTMLElement;
        const secondImageEl = imageRefs.current[1]?.current?.children[0] as HTMLElement;

        const idx = Number(imageEl.dataset.index);
        const len = imageRefs.current.length;

        // only transform the ones that need it
        if (idx !== len - 2 && idx !== len - 3 && lastImageEl) {
          lastImageEl.style.transform = `translate3d(${panX}px, ${panY}px,0) scale(${finalZoom})`;
        }
        if (idx === len - 2 && firstImageEl) {
          firstImageEl.style.transform = `translate3d(${panX}px, ${panY}px,0) scale(${finalZoom})`;
        }
        if (idx === len - 1 && secondImageEl) {
          secondImageEl.style.transform = `translate3d(${panX}px, ${panY}px,0) scale(${finalZoom})`;
        }

        // clear for the next frame
        rafId.current = null;
      });
    }
  }

  useLayoutEffect(() => {
    function pinchWheelHandler(e: WheelEvent) {
      let targetImg: HTMLImageElement | null = null;

      const x = e.clientX;
      const y = e.clientY;

      const underlyingElement = document.elementFromPoint(x, y);

      if (underlyingElement) {
        if (underlyingElement.tagName.toLowerCase() === "img") {
          targetImg = underlyingElement as HTMLImageElement;
        } else {
          targetImg = underlyingElement.querySelector("img");
        }
      }

      if (!targetImg) return;

      const imgIndex = targetImg.dataset.index;

      if (imgIndex === undefined) return;

      const matchedRef = imageRefs.current[parseInt(imgIndex)];

      if (!matchedRef) return;

      currentImage.current = imageRefs.current[parseInt(imgIndex)].current;

      handlePinchWheel(e, matchedRef);
    }

    window.addEventListener('wheel', pinchWheelHandler, { passive: false });

    return () => {
      window.removeEventListener('wheel', pinchWheelHandler);
    };
  }, [handlePinchWheel]);

  function midpoint(a: Touch, b: Touch): Point {
    if (!b) return { x: a.clientX, y: a.clientY };
    return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }
  }
  
  function distance(a: Touch, b: Touch): number {
    const dx = a.clientX - b.clientX
    const dy = a.clientY - b.clientY
    return Math.hypot(dx, dy)
  }

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 2) return;
    e.preventDefault();

    sliderApi.current?.centerSlider();

    isTouchPinching.current = true;
    const [t0, t1] = [e.touches[0], e.touches[1]];
    startDist.current = distance(t0, t1);
    startScale.current = scaleRef.current;
  }

  const onTouchMove = (e: TouchEvent, imageRef: React.RefObject<HTMLDivElement | null>) => {
    if (!isTouchPinching.current || e.touches.length !== 2) return;
    e.preventDefault();

    const [t0, t1] = [e.touches[0], e.touches[1]];
    const currDist = distance(t0, t1);
    const factor = currDist / startDist.current;
    const destZoom = startScale.current * factor;

    const center = midpoint(t0, t1);
    zoomTo({ destZoomLevel: destZoom, centerPoint: center, imageRef })
  }

  const endPinch = () => {
    if (!isTouchPinching.current) return;
    isTouchPinching.current = false;
    pinchJustEnded.current  = true;
  }

  useLayoutEffect(() => {
    function touchPinchMoveHandler(e: TouchEvent) {
      let targetImg: HTMLImageElement | null = null;

      const { x, y } = midpoint(e.touches[0], e.touches[1])

      const underlyingElement = document.elementFromPoint(x, y);

      if (underlyingElement) {
        if (underlyingElement.tagName.toLowerCase() === "img") {
          targetImg = underlyingElement as HTMLImageElement;
        } else {
          targetImg = underlyingElement.querySelector("img");
        }
      }

      if (!targetImg) return;

      const imgIndex = targetImg.dataset.index;

      if (imgIndex === undefined) return;

      const matchedRef = imageRefs.current[parseInt(imgIndex)];

      if (!matchedRef) return;

      currentImage.current = imageRefs.current[parseInt(imgIndex)].current;

      onTouchMove(e, matchedRef);
    }

    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', touchPinchMoveHandler, { passive: false });
    window.addEventListener('touchend', endPinch);
    window.addEventListener('touchcancel', endPinch);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', touchPinchMoveHandler);
      window.removeEventListener('touchend', endPinch);
      window.removeEventListener('touchcancel', endPinch);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomTo, onTouchStart, onTouchMove, endPinch]);

  const highlightThumbs = useCallback((index: number) => {
    thumbnailRefs.current.forEach((img: HTMLImageElement | null, i: number) => {
      if (img) {
        img.style.border =
          i === index ? '2px solid rgb(115, 171, 245)' : '0px solid transparent';
      }
    });
  }, []);

  useEffect(() => {
    if (!simpleBarRef.current || !isHovering) return;
    const scrollEl = simpleBarRef.current.getScrollElement() as HTMLElement;
    if (!scrollEl) return;
  
    let lastX = 0;
    let lastY = 0;
  
    // 1) Update lastX/lastY whenever the pointer moves anywhere over the scroll div
    const onPointerMove = (e: PointerEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
    };
    scrollEl.addEventListener('pointermove', onPointerMove, { passive: true });
  
    // 2) On scroll, hit‑test exactly under that saved pointer coordinate
    const onScroll = () => {
      const elUnder = document.elementFromPoint(lastX, lastY);
      if (!elUnder) return;
  
      // find the nearest <img> ancestor
      const img = (elUnder as HTMLElement).closest('img');
      if (!img) return;
  
      // look up its index in the refs array
      const idx = thumbnailRefs.current.findIndex((thumb) => thumb === img);
      if (idx >= 0) {
        highlightThumbs(idx);
      }
    };
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
  
    return () => {
      scrollEl.removeEventListener('pointermove', onPointerMove);
      scrollEl.removeEventListener('scroll', onScroll);
    };
  }, [highlightThumbs, isHovering]);

  const { containerRef, handleMouseDown } = useScrollDrag();

  useEffect(() => {
    if (simpleBarRef.current) {
      containerRef.current = simpleBarRef.current.getScrollElement() as HTMLElement;
    }
  }, [simpleBarRef, containerRef]);

  return (
    <>
      <div className={styles.container}>
        <div className={styles.columns_container}>
          {/* Left Column — Thumbnails */}
          <SimpleBarReact forceVisible="y" autoHide={false} style={{ height: '600px', width: '110px' }} ref={simpleBarRef} className={styles.scrollContainer}>
            <div
              className={styles.thumbnail_container}
              ref={thumbnailContainerRef}
              onMouseDown={(e) => handleMouseDown(e.nativeEvent)}
              onPointerOver={() => setIsHovering(true)}
              onPointerLeave={() => setIsHovering(false)}
              style={{ display: urls.length > 1 ? 'flex' : 'none' }}
            >
              {urls.map((url, i) => {
                const isVideo = /\.(mp4|webm|ogg)$/i.test(url);
                if (isVideo) {
                  const thumb = thumbnails[url];
                  return thumb ? (
                    <img
                      key={i}
                      src={thumb}
                      ref={(el) => { thumbnailRefs.current[i] = el; }}
                      className={styles.thumbnails}
                      onPointerOver={() => console.log("static hovered")}
                      alt={`video thumb ${i}`}
                      draggable={false}
                    />   
                  ) : (
                    <div key={i} className={styles.thumbPlaceholder}>
                      Loading…
                    </div>
                  );
                } else {
                  return (
                    <img
                      key={i}
                      ref={(el) => { thumbnailRefs.current[i] = el; }}
                      className={styles.thumbnails}
                      src={url}
                      alt={`Thumbnail ${i + 1}`}
                    />
                  );
                }
              })}
            </div>
          </SimpleBarReact>

          {/* Right Column — Main Image Display */}
          <div className={styles.right_column_container}>
            <div className={styles.right_column}>
              <Slider imageCount={urls.length} isClick={isClick} expandableImgRefs={expandableImgRefs} overlayDivRef={overlayDivRef} setSlideIndex={setSlideIndex} setShowFullscreenModal={setShowFullscreenModal} thumbnailRefs={thumbnailRefs} simpleBarRef={simpleBarRef} thumbnailContainerRef={thumbnailContainerRef} setShowFullscreenSlider={setShowFullscreenSlider} showFullscreenSlider={showFullscreenSlider} isWrapping={isWrapping} closingModal={closingModal} slides={slides} slider={slider} visibleImagesRef={visibleImagesRef} selectedIndex={selectedIndex} firstCellInSlide={firstCellInSlide} sliderX={sliderX} sliderVelocity={sliderVelocity} thumbnails={thumbnails}>
                {urls.map((url, i) => {
                  const isVideo = /\.(mp4|webm|ogg)$/i.test(url);
                  if (isVideo) {
                    const thumb = thumbnails[url];
                    return thumb ? (
                      <div
                        key={i}
                        className={styles.image_container}
                      >
                        <img
                          key={i}
                          src={thumb}
                          className={styles.image}
                          alt={`video thumb ${i}`}
                          draggable={false}
                        />   
                      </div>
                    ) : (
                      <div key={i} className={styles.thumbPlaceholder}>
                        Loading…
                      </div>
                    );
                  } else {
                    return (
                      <div
                        key={i}
                        className={styles.image_container}
                      >
                        <img
                          src={url}
                          className={styles.image}
                          alt={`cell-${i}`}
                          draggable="false"
                        />
                      </div>
                    );
                  }
                })}
              </Slider>
            </div>
          </div>
        </div>
      </div>
      <FullscreenModal
        open={showFullscreenModal}
        onClose={() => setShowFullscreenModal(false)}
        isZoomClick={isZoomClick}
        isClick={isClick}
        isAnimating={isAnimating}
        overlayDivRef={overlayDivRef}
        zoomLevel={zoomLevel}
        cells={cells}
        setShowFullscreenSlider={setShowFullscreenSlider}
        imageCount={urls.length}
        setClosingModal={setClosingModal}
        slides={slides}
        slider={slider}
        visibleImagesRef={visibleImagesRef}
        selectedIndex={selectedIndex} 
        firstCellInSlide={firstCellInSlide} 
        sliderX={sliderX} 
        sliderVelocity={sliderVelocity}
        isWrapping={isWrapping}
        wrappedImages={wrappedImages}
      >
        <FullscreenSlider 
          ref={sliderApi}
          imageCount={urls.length} 
          slideIndex={slideIndex} 
          isClick={isZoomClick} 
          isZoomed={isZoomed} 
          windowSize={windowSize} 
          show={showFullscreenModal} 
          handleZoomToggle={handleZoomToggle} 
          imageRefs={imageRefs.current} 
          cells={cells} 
          isPinching={isPinching} 
          scale={scaleRef.current} 
          isTouchPinching={isTouchPinching}
          showFullscreenSlider={showFullscreenSlider}
          isWrapping={isWrapping}
          zoomedDuringWrap={zoomedDuringWrap}
          isZooming={isZooming}
          plyrRefs={plyrRefs}
          plyrRef={plyrRef}
        >
          {urls.length > 1 ? wrappedFullscreenImages : oneFullscreenImage}
        </FullscreenSlider>
      </FullscreenModal>
    </>
  );
}