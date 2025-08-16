/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import {
  useRef,
  useEffect,
  ReactNode,
  Children,
  RefObject,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react'
import fullscreenSlideStore from './fullscreenSlideStore'
import type { APITypes } from 'plyr-react'
import styles from './FullscreenSlider.module.css'
import { useOverlay } from '@/app/contexts/OverlayContext'

interface FullscreenSliderProps {
  children: ReactNode
  imageCount: number
  slideIndex: number
  isClick: React.RefObject<boolean>
  isZoomed: boolean
  windowSize: { width: number; height: number }
  show: boolean
  handleZoomToggle: (
    e:
      | React.PointerEvent<HTMLImageElement>
      | React.TouchEvent<HTMLImageElement>,
    imageRef: React.RefObject<HTMLImageElement | null>
  ) => void
  imageRefs: React.RefObject<HTMLImageElement | null>[]
  cells: RefObject<{ element: HTMLElement; index: number }[]>
  isPinching: React.RefObject<boolean>
  scale: number
  isTouchPinching: React.RefObject<boolean>
  showFullscreenSlider: boolean
  isWrapping: RefObject<boolean>
  zoomedDuringWrap: RefObject<boolean>
  isZooming: RefObject<boolean>
  plyrRefs: RefObject<(APITypes | null)[]>
  plyrRef: RefObject<(APITypes | null)[]>
  closingModal: boolean
  counterRef: RefObject<HTMLElement | null>
  leftChevronRef: RefObject<HTMLElement | null>
  rightChevronRef: RefObject<HTMLElement | null>
  closeButtonRef: RefObject<HTMLElement | null>
}

export interface FullscreenSliderHandle {
  centerSlider(): void
}

const FullscreenSlider = forwardRef<FullscreenSliderHandle, FullscreenSliderProps>(
  (
    {
      children,
      imageCount,
      slideIndex,
      isClick,
      isZoomed,
      windowSize,
      show,
      handleZoomToggle,
      imageRefs,
      cells,
      isPinching,
      isTouchPinching,
      showFullscreenSlider,
      isWrapping,
      zoomedDuringWrap,
      isZooming,
      plyrRefs,
      plyrRef,
      closingModal,
      counterRef,
      leftChevronRef,
      rightChevronRef,
      closeButtonRef,
    },
    ref
  ) => {
    const friction = 0.36
    const attraction = 0.045
    const slider = useRef<HTMLDivElement | null>(null)
    const isPointerDown = useRef(false)
    const startX = useRef(0)
    const startY = useRef(0)
    const x = useRef(0)
    const y = useRef(0)
    const dragX = useRef(0)
    const dragY = useRef(0)
    const previousDragX = useRef<number>(0)
    const previousDragY = useRef<number>(0)
    const dragStartPositionX = useRef(0)
    const dragStartPositionY = useRef(0)
    const dragMoveTime = useRef<Date | null>(null)
    const dragThreshold = 5
    const velocityX = useRef(0)
    const velocityY = useRef(0)
    const lastForceX = useRef(0)
    const lastForceY = useRef(0)
    const isAnimating = useRef(false)
    const restingFrames = useRef(0)
    const selectedIndex = useRef(0)
    const isScrolling = useRef(false)
    const isDragSelect = useRef<boolean>(false)
    const slides = useRef<{ cells: { element: HTMLElement }[] }[]>([])
    const firstCellInSlide = useRef<HTMLElement | null>(null)
    const lastTranslateX = useRef<number>(0)
    const hasPositioned = useRef<boolean>(false)
    const clickedImgMargin = useRef(false)
    const VERT_ANGLE_MIN = 60
    const VERT_ANGLE_MAX = 120
    const isVerticalScroll = useRef(false)
    const isClosing = useRef(false)
    const prevTimeRef = useRef(0)
    const FPS = 60
    const MS_PER_FRAME = 1000 / FPS
    const perSlideRef = useRef(0);
    type DragMode = 'none' | 'x' | 'y';
    const dragMode = useRef<DragMode>('none');

    const { registerOverlay, unregisterOverlay } = useOverlay();
    useEffect(() => {
      const id = registerOverlay();
      return () => unregisterOverlay(id);
    }, [registerOverlay, unregisterOverlay]);

    useEffect(() => {
      const el = slider.current;
      if (!el) return;

      const update = () => {
        perSlideRef.current = el.clientWidth || 0;
      };

      update();
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }, [show]);

    function getStripWidth() {
      return perSlideRef.current * slides.current.length;
    }

    useEffect(() => {
      const childrenArray = Children.toArray(children)
      slides.current = []

      if (imageCount > 1) {
        for (let i = 1; i < childrenArray.length - 1; i++) {
          slides.current.push({ cells: [cells.current[i]] })
        }
      } else {
        for (let i = 0; i < childrenArray.length; i++) {
          slides.current.push({ cells: [cells.current[i]] })
        }
      }
    }, [children])

    useEffect(() => {
      if (!slider.current || hasPositioned.current) return;

      zoomedDuringWrap.current = false

      if (counterRef.current) {
        counterRef.current.textContent = `${
          !isWrapping.current ? slideIndex + 1 : slideIndex
        } / ${imageCount}`
      }

      if (slideIndex === 1 && isWrapping.current === true) {
        selectedIndex.current = 0
        fullscreenSlideStore.setSlideIndex(0)
        firstCellInSlide.current = slides.current[0].cells[0]?.element
        hasPositioned.current = true
        return
      }
      if (slideIndex === 0 && !isWrapping.current) {
        selectedIndex.current = 0
        fullscreenSlideStore.setSlideIndex(0)
        firstCellInSlide.current = slides.current[0].cells[0]?.element
        hasPositioned.current = true
        return
      }
      let actualIndex = slideIndex - 1
      actualIndex = ((actualIndex % imageCount) + imageCount) % imageCount
      if (actualIndex === 0) actualIndex = imageCount
      const finalIndex = isWrapping.current === true ? actualIndex : slideIndex

      selectedIndex.current = finalIndex
      fullscreenSlideStore.setSlideIndex(finalIndex)

      const slide = slider.current.clientWidth * finalIndex
      setTimeout(() => {
        if (!slider.current) return
        x.current = -slide
        velocityX.current = 0
        positionSlider()
      }, 0)

      firstCellInSlide.current = slides.current[finalIndex].cells[0]?.element
      hasPositioned.current = true
    }, [show, slides.current])

    function getCurrentTransform(slide: HTMLElement | null) {
      if (!slide) return { x: 0, y: 0 }
      const computedStyle = window.getComputedStyle(slide)
      const transform = computedStyle.transform
      if (!transform || transform === 'none') return { x: 0, y: 0 }

      const matrixMatch = transform.match(/matrix\(([^)]+)\)/)
      if (!matrixMatch) return { x: 0, y: 0 }

      const matrixValues = matrixMatch[1].split(',').map(parseFloat)
      const tx = matrixValues[4] || 0
      const ty = matrixValues[5] || 0

      return { x: tx, y: ty }
    }

    interface PointerEventExtended extends PointerEvent {
      touches?: TouchList
    }

    function setDraggingCursor(on: boolean) {
      slider.current?.classList.toggle(styles.dragging, on);
    }

    function handlePointerStart(e: PointerEventExtended) {
      if (isZoomed) return
      const target = e.target as HTMLElement
      if (target.closest('.plyr__controls')) return
      if (closingModal) return

      dragMode.current = 'none';  

      isScrolling.current = false
      isPinching.current = false
      isTouchPinching.current = false
      isPointerDown.current = true
      isClick.current = true

      setDraggingCursor(true);

      const transformValues = getCurrentTransform(slider.current)
      const translateX = transformValues.x
      const translateY = transformValues.y

      dragStartPositionX.current = translateX
      dragStartPositionY.current = translateY

      dragX.current = translateX
      dragY.current = translateY

      if (e.touches && e.touches.length > 0) {
        startX.current = e.touches[0].clientX
        startY.current = e.touches[0].clientY
      } else {
        startX.current = e.clientX
        startY.current = e.clientY
      }

      startAnimation()
    }

    function startAnimation() {
      if (isAnimating.current) return
      isAnimating.current = true
      restingFrames.current = 0
      prevTimeRef.current = performance.now()
      requestAnimationFrame(animate)
    }

    function animate(now: number) {
      const msPassed = now - prevTimeRef.current
      if (msPassed < MS_PER_FRAME) {
        requestAnimationFrame(animate)
        return
      }
      const excessTime = msPassed % MS_PER_FRAME
      prevTimeRef.current = now - excessTime

      if (isZooming.current === true && selectedIndex.current === 0) {
        isZooming.current = false
        x.current = 0
        setTranslateX(x.current, 0)
        isAnimating.current = false
        restingFrames.current = 0
        return
      }

      if (
        isScrolling.current === true ||
        (isClick.current && clickedImgMargin.current) ||
        isTouchPinching.current === true ||
        isClosing.current ||
        isPinching.current === true ||
        isZoomed
      ) {
        isAnimating.current = false
        restingFrames.current = 0
        isClosing.current = false
        return
      }

      applyDragForce()
      applySelectedAttraction()

      const previousX = x.current
      const previousY = y.current

      integratePhysics()
      positionSlider()
      settle(previousX, previousY)

      if (isAnimating.current) requestAnimationFrame(animate)
    }

    function applyDragForce() {
      if (!isPointerDown.current) return

      const dragVelocityX = dragX.current - x.current
      const dragVelocityY = dragY.current - y.current
      const dragForceX = dragVelocityX - velocityX.current
      const dragForceY = dragVelocityY - velocityY.current

      lastForceX.current = dragForceX
      lastForceY.current = dragForceY

      applyForce(dragForceX, dragForceY)
    }

    function applyForce(forceX: number, forceY: number) {
      velocityX.current += forceX
      velocityY.current += forceY
    }

    function integratePhysics() {
      x.current += velocityX.current
      y.current += velocityY.current

      velocityX.current *= getFrictionFactor()
      velocityY.current *= getFrictionFactor()
    }

    function getFrictionFactor() {
      return 1 - friction
    }

    function positionSlider() {
      let currentPositionX = x.current;
      const currentPositionY = y.current;

      if (!isClick.current && imageCount > 1 && zoomedDuringWrap.current !== true) {
        const W = getStripWidth();
        if (W > 0) {
          currentPositionX = ((currentPositionX % W) + W) % W;
          currentPositionX -= W;
        }
      }
      setTranslateX(currentPositionX, currentPositionY);
    }

    function settle(previousX: number, previousY: number) {
      const isRestingX =
        !isPointerDown.current &&
        Math.round(x.current * 100) === Math.round(previousX * 100)
      const isRestingY =
        !isPointerDown.current &&
        Math.round(y.current * 100) === Math.round(previousY * 100)

      if (isRestingX && isRestingY) {
        restingFrames.current++
      }

      if (restingFrames.current > 2) {
        isAnimating.current = false
        positionSlider()
      }
    }

    function setTranslateX(tx: number, ty: number) {
      if (!slider.current) return
      let translateX
      let translateY
      const transformValues = getCurrentTransform(slider.current)
      const currentX = transformValues.x
      const currentY = transformValues.y
      if (isVerticalScroll.current) {
        translateX = currentX + 'px'
        translateY = getPositionValue(ty)
      } else {
        translateX = getPositionValue(tx)
        const easeFactor = 0.2
        const nextY = currentY + (0 - currentY) * easeFactor
        translateY = `${nextY}px`
      }
      slider.current.style.transform = `translate3d(${translateX},${translateY},0)`
    }

    function getPositionValue(position: number) {
      return Math.round(position) + 'px'
    }

    interface PointerMoveEvent extends PointerEvent {
      touches?: TouchList
    }

    function handlePointerMove(e: PointerMoveEvent) {
      e.preventDefault();
      if (isZoomed) return;
      if (!isPointerDown.current) return;

      let actualIndex = selectedIndex.current + 1;
      const length = slides.current.length;
      actualIndex = ((actualIndex % length) + length) % length;
      if (actualIndex === 0) actualIndex = imageCount;

      setTimeout(() => { plyrRefs.current[actualIndex]?.plyr.pause(); }, 0);
      if (imageCount === 1) {
        setTimeout(() => { plyrRef.current[0]?.plyr.pause(); }, 0);
      }

      previousDragX.current = dragX.current;
      previousDragY.current = dragY.current;

      let currentX: number, currentY: number;
      if (e.touches && e.touches.length > 0) {
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
      } else {
        currentX = e.clientX;
        currentY = e.clientY;
      }

      const dx = currentX - startX.current;
      const dy = currentY - startY.current;

      if (dragMode.current === 'none') {
        if (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold) {
          dragMode.current = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
          isClick.current = false;

          isVerticalScroll.current = dragMode.current === 'y';
        }
      }

      if (dragMode.current === 'x') {
        dragX.current = dragStartPositionX.current + dx;
        dragY.current = dragStartPositionY.current;
      } else if (dragMode.current === 'y') {
        dragX.current = dragStartPositionX.current;
        dragY.current = dragStartPositionY.current + dy;
      } else {
        dragX.current = dragStartPositionX.current + dx;
        dragY.current = dragStartPositionY.current + dy;

        const angle = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
        const isVertical = angle >= VERT_ANGLE_MIN && angle <= VERT_ANGLE_MAX;
        isVerticalScroll.current = isVertical;
      }

      if (imageCount === 1) {
        const originBound = Math.max(0, dragStartPositionX.current);
        if (dragX.current > originBound) {
          dragX.current = (dragX.current + originBound) * 0.5;
        }
        const lastSlide = (slides.current.length - 1) * cells.current[0].element.offsetWidth;
        const endBound = Math.min(-lastSlide, dragStartPositionX.current);
        if (dragX.current < endBound) {
          dragX.current = (dragX.current + endBound) * 0.5;
        }
      }

      dragMoveTime.current = new Date();
    }

    function handlePointerEnd(e: React.PointerEvent<HTMLImageElement>) {
      if (isZoomed) return
      if (!isPointerDown.current) return
      isPointerDown.current = false

      if (isVerticalScroll.current) {
        const deltaY = Math.abs(previousDragY.current)
        const speedThreshold = 0.1
        const distanceThreshold = windowSize.height * 0.3
        if (
          Math.abs(lastForceY.current) > speedThreshold ||
          deltaY > distanceThreshold
        ) {
          if (!slider.current) return
          isClosing.current = true
          closeButtonRef.current?.click()
          return
        }
      }

      let index = dragEndRestingSelect()

      if (isClick.current) {
        const target = e.target as HTMLElement
        if (target.closest("[class*='plyr__']")) return

        const clickedImg = (e.target as HTMLElement).closest('img')
        if (!clickedImg) {
          clickedImgMargin.current = true
          closeButtonRef.current?.click()
        }

        if (e.target instanceof HTMLImageElement) {
          const targetImg = (e.target as HTMLElement).closest(
            'img'
          ) as HTMLImageElement | null
          if (!targetImg) return

          const imgIndex = targetImg.dataset.index
          if (imgIndex === undefined) return

          const matchedRef = imageRefs[parseInt(imgIndex)]

          if (index !== Number(imgIndex) && Number(imgIndex) !== index + 2) {
            isZooming.current = true
            handleZoomToggle(e, matchedRef)
          }
          if (index === imageCount - 1 && Number(imgIndex) === imageCount + 1) {
            isZooming.current = true
            handleZoomToggle(e, matchedRef)
          }
          if (slider.current && slider.current.children.length === 1) {
            isZooming.current = true
            handleZoomToggle(e, matchedRef)
          }
        }
      } else {
        const el = e.target as HTMLElement
        const playerDiv = el.closest('.myPlayer[data-index]') as HTMLElement | null
        if (playerDiv) {
          const idx = playerDiv.dataset.index
          if (!idx) return
          setTimeout(() => {
            plyrRefs.current[parseInt(idx)]?.plyr.pause()
          }, 0)
          if (imageCount === 1) {
            setTimeout(() => {
              plyrRef.current[0]?.plyr.pause()
            }, 0)
          }
        }
        if (
          index === selectedIndex.current ||
          (index === slides.current.length &&
            selectedIndex.current !== slides.current.length - 1)
        ) {
          index += dragEndBoostSelect()
        }
      }

      isDragSelect.current = true
      select(index)
      isDragSelect.current = false
      setDraggingCursor(false);
    }

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
      const movedAt = dragMoveTime.current
      if (!movedAt || new Date().getTime() - movedAt.getTime() > 100) return 0
      const delta = previousDragX.current - dragX.current
      if (delta > 0) return 1
      if (delta < 0) return -1
      return 0
    }

    function applySelectedAttraction() {
      if (isPointerDown.current) return
      if (!slider.current) return
      const slide = slider.current.clientWidth * selectedIndex.current

      if (isVerticalScroll.current) {
        const distance = -y.current
        const force = distance * attraction
        velocityY.current += force
      } else {
        const distance = -slide - x.current
        const force = distance * attraction
        velocityX.current += force
      }
    }

    function dragEndRestingSelect() {
      const restingX = getRestingPosition()
      const distance = Math.abs(getSlideDistance(-restingX, selectedIndex.current))
      const positiveResting = getClosestResting(restingX, distance, 1)
      const negativeResting = getClosestResting(restingX, distance, -1)
      return positiveResting.distance < negativeResting.distance
        ? positiveResting.index
        : negativeResting.index
    }

    function getRestingPosition() {
      return x.current + velocityX.current / (1 - getFrictionFactor())
    }

    function getSlideDistance(xPos: number, index: number) {
      if (!slider.current) return 1;
      const length = slides.current.length;
      const cellWidth = perSlideRef.current || slider.current.clientWidth;
      const cellIndex = ((index % length) + length) % length;
      const cell = cellWidth * cellIndex;
      const stripWidth = cellWidth * length;
      const wrap = stripWidth * Math.floor(index / length);
      return xPos - (cell + wrap);
    }

    function getClosestResting(restingX: number, dist: number, inc: number) {
      let index = selectedIndex.current
      let minDistance = Infinity
      let distance = dist

      while (distance < minDistance) {
        index += inc
        minDistance = distance
        distance = getSlideDistance(-restingX, index)
        if (distance === null as any) break
        distance = Math.abs(distance as number)
      }
      return { distance: minDistance, index: index - inc }
    }

    function previous() {
      isVerticalScroll.current = false
      isScrolling.current = false
      isPinching.current = false
      isTouchPinching.current = false
      zoomedDuringWrap.current = false

      let actualIndex = selectedIndex.current + 1
      const length = slides.current.length
      actualIndex = ((actualIndex % length) + length) % length
      if (actualIndex === 0) actualIndex = imageCount

      setTimeout(() => {
        plyrRefs.current[actualIndex]?.plyr.pause()
      }, 0)
      if (imageCount === 1) {
        setTimeout(() => {
          plyrRef.current[0]?.plyr.pause()
        }, 0)
      }
      select(selectedIndex.current - 1)
    }

    function next() {
      isVerticalScroll.current = false
      isScrolling.current = false
      isPinching.current = false
      isTouchPinching.current = false
      zoomedDuringWrap.current = false

      let actualIndex = selectedIndex.current + 1
      const length = slides.current.length
      actualIndex = ((actualIndex % length) + length) % length
      if (actualIndex === 0) actualIndex = imageCount

      setTimeout(() => {
        plyrRefs.current[actualIndex]?.plyr.pause()
      }, 0)
      if (imageCount === 1) {
        setTimeout(() => {
          plyrRef.current[0]?.plyr.pause()
        }, 0)
      }
      select(selectedIndex.current + 1)
    }

    function select(index: number) {
      if (isVerticalScroll.current) return
      if (imageCount > 1) {
        wrapSelect(index)
      }
      const length = slides.current.length
      index = ((index % length) + length) % length
      if (zoomedDuringWrap.current === true) {
        index = slides.current.length
      }
      selectedIndex.current = index
      fullscreenSlideStore.setSlideIndex(index)
      if (zoomedDuringWrap.current !== true) {
        firstCellInSlide.current = slides.current[index].cells[0]?.element
      }
      let actualIndex = index + 1
      actualIndex = ((actualIndex % length) + length) % length
      if (actualIndex === 0) actualIndex = imageCount

      if (counterRef.current) {
        counterRef.current.textContent = `${actualIndex} / ${imageCount}`
      }

      startAnimation()
    }

    function getTranslateX(element: HTMLElement): number {
      const style = window.getComputedStyle(element)
      const matrix = new DOMMatrix(style.transform)
      return matrix.m41 || 0
    }

    useEffect(() => {
      if (!slider.current || !firstCellInSlide.current) return
      lastTranslateX.current = getTranslateX(firstCellInSlide.current)
      if (selectedIndex.current === 0) {
        x.current = 0
        setTranslateX(x.current, 0)
      } else {
        x.current = -(slider.current.clientWidth * selectedIndex.current)
        setTranslateX(x.current, 0)
      }
    }, [windowSize])

    const centerSlider = useCallback(() => {
      if (!slider.current || !firstCellInSlide.current) return
      lastTranslateX.current = getTranslateX(firstCellInSlide.current)
      const idx = selectedIndex.current
      const newX = idx === 0 ? 0 : -slider.current.clientWidth * idx
      x.current = newX
      setTranslateX(newX, 0)
    }, [selectedIndex.current])

    useImperativeHandle(ref, () => ({ centerSlider }), [centerSlider])

    function wrapSelect(index: number) {
      if (!slider.current || zoomedDuringWrap.current === true) return;

      const length = slides.current.length;
      const slideableWidth = (perSlideRef.current || slider.current.clientWidth) * length;
      const selectedIdx = selectedIndex.current;

      if (!isDragSelect.current) {
        const wrapIndex = ((index % length) + length) % length;
        const delta = Math.abs(wrapIndex - selectedIdx);
        const backWrapDelta = Math.abs(wrapIndex + length - selectedIdx);
        const fwdWrapDelta = Math.abs(wrapIndex - length - selectedIdx);
        if (backWrapDelta < delta) index += length;
        else if (fwdWrapDelta < delta) index -= length;
      }

      if (index < 0) {
        x.current -= slideableWidth;
      } else if (index >= length) {
        x.current += slideableWidth;
      }
    }

    function getCurrentXFromTransform(sliderEl: HTMLDivElement): number {
      const computedStyle = window.getComputedStyle(sliderEl)
      const transform = computedStyle.transform
      if (!transform || transform === 'none') return 0
      const matrixMatch = transform.match(/matrix\(([^)]+)\)/)
      if (!matrixMatch) return 0
      const matrixValues = matrixMatch[1].split(',').map(parseFloat)
      return matrixValues[4]
    }

    interface WheelEventExtended extends WheelEvent {
      deltaX: number
    }

    function isPinchGesture(e: WheelEvent): boolean {
      if (e.ctrlKey) return true
      const absDeltaX = Math.abs(e.deltaX)
      const absDeltaY = Math.abs(e.deltaY)
      if (absDeltaX < 1 && absDeltaY < 1) return false
      const ratio = absDeltaX / absDeltaY
      return ratio >= 0.8 && ratio <= 1.2
    }

    const handleWheel = (e: WheelEventExtended) => {
      e.preventDefault();
      if (isZoomed) return;
      if (!slider.current) return;
      if (isPinchGesture(e)) return;
      if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) return;
      if (imageCount === 1) return;

      isScrolling.current = true;
      isPinching.current = false;
      isTouchPinching.current = false;

      let translateX = getCurrentXFromTransform(slider.current);
      translateX -= e.deltaX;

      const W = getStripWidth();
      let currentPosition = translateX;
      if (imageCount > 1 && W > 0) {
        currentPosition = ((translateX % W) + W) % W;
        currentPosition -= W;
      }
      setTranslateX(currentPosition, 0);

      const per = perSlideRef.current || slider.current.clientWidth || 1;
      const index = Math.round(Math.abs(currentPosition) / per);
      selectedIndex.current = index;
      fullscreenSlideStore.setSlideIndex(index);

      let actualIndex = ((index + 1) % imageCount + imageCount) % imageCount;
      if (actualIndex === 0) actualIndex = imageCount;

      if (counterRef.current) {
        counterRef.current.textContent = `${actualIndex} / ${imageCount}`;
      }

      x.current = currentPosition;
      const wrapIndex = ((index % imageCount) + imageCount) % imageCount;

      setTimeout(() => { plyrRefs.current[actualIndex]?.plyr.pause(); }, 0);
      if (imageCount === 1) {
        setTimeout(() => { plyrRef.current[0]?.plyr.pause(); }, 0);
      }
      firstCellInSlide.current = slides.current[wrapIndex].cells[0]?.element;
    };

    useEffect(() => {
      const sliderEl = slider.current
      if (!sliderEl) return

      const activePointers = new Set<number>()
      const onDownCap = (e: PointerEvent) => {
        activePointers.add(e.pointerId)
      }
      const onUpCap = (e: PointerEvent) => {
        activePointers.delete(e.pointerId)
      }
      window.addEventListener('pointerdown', onDownCap, { capture: true })
      window.addEventListener('pointerup', onUpCap, { capture: true })
      window.addEventListener('pointercancel', onUpCap, { capture: true })

      const interceptSecondFinger = (e: PointerEvent) => {
        if (activePointers.size > 1) {
          e.stopImmediatePropagation()
          isPointerDown.current = false
          isAnimating.current = false
          restingFrames.current = 0
          e.preventDefault()
          e.stopPropagation()
        }
      }
      sliderEl.addEventListener('pointerdown', interceptSecondFinger, { capture: true })

      sliderEl.addEventListener('pointerdown', handlePointerStart)
      window.addEventListener('pointermove', handlePointerMove as any)
      window.addEventListener('pointerup', (e) => handlePointerEnd(e as any))
      window.addEventListener('wheel', handleWheel as any, { passive: false })

      return () => {
        window.removeEventListener('pointerdown', onDownCap, { capture: true } as any)
        window.removeEventListener('pointerup', onUpCap, { capture: true } as any)
        window.removeEventListener('pointercancel', onUpCap, { capture: true } as any)

        sliderEl.removeEventListener('pointerdown', interceptSecondFinger, { capture: true } as any)

        sliderEl.removeEventListener('pointerdown', handlePointerStart)
        window.removeEventListener('pointermove', handlePointerMove as any)
        window.removeEventListener('pointerup', (e) => handlePointerEnd(e as any))
        window.removeEventListener('wheel', handleWheel as any)
      }
    }, [handlePointerStart, handlePointerMove, handlePointerEnd, handleWheel, slider.current])

    useEffect(() => {
      const left = leftChevronRef.current
      const right = rightChevronRef.current
      if (left) left.addEventListener('pointerdown', previous)
      if (right) right.addEventListener('pointerdown', next)
      return () => {
        if (left) left.removeEventListener('pointerdown', previous)
        if (right) right.removeEventListener('pointerdown', next)
      }
    }, [leftChevronRef.current, rightChevronRef.current, showFullscreenSlider])

    return (
      <div style={{ position: 'relative' }}>
        <div
          ref={slider}
          className={'fullscreen_slider'}
          style={{
            overflow: 'visible',
            touchAction: 'none',
            position: 'absolute',
            left: 0,
            width: '100%',
            height: '100%',
            cursor: 'grab',
            willChange: 'opacity',
            opacity: showFullscreenSlider ? '1' : '0',
          }}
        >
          {children}
        </div>
      </div>
    )
  }
)

FullscreenSlider.displayName = 'FullscreenSlider'
export default FullscreenSlider