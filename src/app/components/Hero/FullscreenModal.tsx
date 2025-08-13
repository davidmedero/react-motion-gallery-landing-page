/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, {
  Dispatch,
  RefObject,
  SetStateAction,
  useEffect,
  useSyncExternalStore,
} from 'react'
import scaleStore from './scaleStore'
import slideStore from './slideStore';
import fullscreenSlideStore from './fullscreenSlideStore'
import { MediaItem } from './'

function useSlideIndex() {
  return useSyncExternalStore(
    fullscreenSlideStore.subscribe.bind(fullscreenSlideStore),
    fullscreenSlideStore.getSnapshot.bind(fullscreenSlideStore),
    fullscreenSlideStore.getSnapshot.bind(fullscreenSlideStore)
  )
}

interface FullscreenModalProps {
  open: boolean
  onClose: () => void
  isZoomClick: RefObject<boolean>
  isClick: RefObject<boolean>
  isAnimating: RefObject<boolean>
  overlayDivRef: RefObject<HTMLDivElement | null>
  closeButtonRef: RefObject<HTMLElement | null>
  counterRef: RefObject<HTMLElement | null>
  leftChevronRef: RefObject<HTMLElement | null>
  rightChevronRef: RefObject<HTMLElement | null>
  zoomLevel: number
  children: React.ReactNode
  cells: RefObject<{ element: HTMLElement; index: number }[]>
  setShowFullscreenSlider: Dispatch<SetStateAction<boolean>>
  imageCount: number
  setClosingModal: Dispatch<SetStateAction<boolean>>
  slides: RefObject<{ cells: { element: HTMLElement; index: number }[]; target: number }[]>
  slider: RefObject<HTMLDivElement | null>
  visibleImagesRef: RefObject<number>
  selectedIndex: RefObject<number>
  firstCellInSlide: RefObject<HTMLElement | null>
  sliderX: RefObject<number>
  sliderVelocity: RefObject<number>
  isWrapping: RefObject<boolean>
  wrappedItems: MediaItem[]
}

const FullscreenModal: React.FC<FullscreenModalProps> = ({
  open,
  onClose,
  isZoomClick,
  isClick,
  isAnimating,
  overlayDivRef,
  closeButtonRef,
  counterRef,
  leftChevronRef,
  rightChevronRef,
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
  const pointerDownX = React.useRef<number>(0)
  const pointerDownY = React.useRef<number>(0)
  const slideIndexSync = useSlideIndex()

  useEffect(() => {
    const btn = closeButtonRef.current
    if (!btn) return
    const handler = (ev: Event) => handleClose(ev as MouseEvent)
    btn.addEventListener('click', handler)
    return () => btn.removeEventListener('click', handler)
  }, [open, zoomLevel, isZoomClick, children, closeButtonRef])

  if (!open) return null

  function handleClose(e: MouseEvent) {
    const clickedImg = (e.target as HTMLElement)?.closest('img')
    if (clickedImg) return // clicking image shouldn't close

    proceedToClose(e)
  }

  function getPositionValue(position: number) {
    return Math.round(position) + 'px'
  }

  function getTotalCellsWidth(): number {
    let totalWidth = 0
    slides.current.forEach(slide => {
      slide.cells.forEach(cell => {
        totalWidth += cell.element.offsetWidth
      })
    })
    return totalWidth
  }

  function proceedToClose(e: MouseEvent) {
    if (!open) return
    isAnimating.current = false
    isClick.current = false
    cells.current = []
    setClosingModal(true)

    const slideArr = slides.current
    if (!slider.current) return

    let wrapIndex: number
    if (isWrapping.current) {
      if (slideIndexSync >= slider.current.children.length - visibleImagesRef.current * 2) {
        wrapIndex = 0
      } else {
        wrapIndex = slideIndexSync
      }
    } else {
      wrapIndex = slideIndexSync >= slider.current.children.length ? 0 : slideIndexSync
    }

    const matchSlide = slideArr.find(s => s.cells.some(cell => cell.index === wrapIndex))
    if (!matchSlide) return

    const newIndex = slideArr.indexOf(matchSlide)
    const totalWidth = getTotalCellsWidth()
    const cellLeft = slides.current[0].cells[0].element.getBoundingClientRect().left

    const containerWidth = slider.current.clientWidth;
    const cellWidth = slides.current[newIndex].cells[0].element.clientWidth;

    if (!slider.current) return;

    selectedIndex.current = newIndex;
    slideStore.setSlideIndex(newIndex);
    firstCellInSlide.current = matchSlide.cells[0]?.element ?? null;
    sliderX.current =  totalWidth <= slider.current.clientWidth ? cellLeft : isWrapping.current ? -matchSlide.target + (containerWidth - cellWidth) / 2 : -matchSlide.target;
    sliderVelocity.current = 0;

    const translateSliderX = getPositionValue(sliderX.current)
    slider.current.style.transform = `translate3d(${translateSliderX},0,0)`

    if (!slider.current || slider.current.children.length === 0) return

    const idx = isWrapping.current ? wrapIndex + visibleImagesRef.current : wrapIndex
    const slideEl = slider.current.children[idx] as HTMLElement | undefined
    if (!slideEl) return

    const rect = slideEl.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY

    // Figure out element below the modal root (if this handler is also attached there)
    const overlayElem = e.currentTarget as HTMLElement
    overlayElem.style.pointerEvents = 'none'
    const underlyingElement = document.elementFromPoint(x, y)
    overlayElem.style.pointerEvents = ''

    // Try to resolve the "target" display element in the fullscreen slider
    let targetImg: HTMLImageElement | null = null
    if (underlyingElement) {
      if ((underlyingElement as HTMLElement).tagName.toLowerCase() === 'img') {
        targetImg = underlyingElement as HTMLImageElement
      } else {
        targetImg = (underlyingElement as HTMLElement).querySelector('img')
      }
    }

    // Resolve slider & counter via refs
    const fsSlider = document.querySelector('.fullscreen_slider') as HTMLElement;
    const counterEl = counterRef.current

    const originals = wrappedItems.slice(1, wrappedItems.length - 1)
    const url = originals[wrapIndex]
    const isVideoSlide = /\.(mp4|webm|ogg)$/i.test(url.src)

    if (isVideoSlide) {
      let newIdx = wrapIndex + 1
      if (imageCount === 1) newIdx = 0
      const plyrEl = fsSlider?.querySelector(
        `.myPlayer[data-index="${newIdx}"]`
      ) as HTMLImageElement | null
      if (plyrEl) targetImg = plyrEl
    }

    if (imageCount > 1 && fsSlider) {
      const currentFromCounter = Number(counterEl?.textContent?.split('/')[0] ?? '0')
      const currentIndex = parseInt(targetImg?.getAttribute('data-index') || '-1', 10)
      const nextImg = fsSlider.querySelector(
        `img[data-index="${currentFromCounter}"]`
      ) as HTMLImageElement | null
      const lastImg = fsSlider.querySelector(
        `[data-index="${imageCount + 1}"]`
      ) as HTMLImageElement | null

      // current translateX of fullscreen slider
      let currentTranslateX = 0
      const cs = getComputedStyle(fsSlider)
      const transform = cs.transform
      if (transform !== 'none') {
        const matrix = new DOMMatrixReadOnly(transform)
        currentTranslateX = matrix.m41
      }

      if (currentIndex !== currentFromCounter) {
        if (
          currentIndex === 0 &&
          Math.abs(currentTranslateX) >= fsSlider.scrollWidth - fsSlider.getBoundingClientRect().width * 1.5 &&
          Math.abs(currentTranslateX) <= fsSlider.scrollWidth - fsSlider.getBoundingClientRect().width &&
          React.isValidElement<{ imageCount: number }>(children)
        ) {
          const { imageCount } = children.props
          targetImg = fsSlider.querySelector(
            `img[data-index="${imageCount + 1}"]`
          ) as HTMLImageElement | null
        } else {
          targetImg = nextImg
        }
      }

      if (React.isValidElement<{ imageCount: number }>(children)) {
        const { imageCount } = children.props

        if (currentIndex === imageCount && currentFromCounter === 1) {
          targetImg = fsSlider.querySelector(
            `img[data-index="${imageCount + 1}"]`
          ) as HTMLImageElement | null
        }

        if (currentIndex === imageCount + 1) {
          targetImg = fsSlider.querySelector(
            `img[data-index="${imageCount + 1}"]`
          ) as HTMLImageElement | null
        }
      }

      if (currentIndex === -1) {
        targetImg = fsSlider.querySelector(
          `[data-index="${wrapIndex + 1}"]`
        ) as HTMLImageElement | null
      }

      if (currentIndex === -1 && !isVideoSlide && wrapIndex === 0) {
        targetImg = fsSlider.querySelector(
          `[data-index="${imageCount + 1}"]`
        ) as HTMLImageElement | null
      }

      if (
        isVideoSlide &&
        currentIndex === 1 &&
        Math.abs(currentTranslateX) >= fsSlider.scrollWidth - fsSlider.getBoundingClientRect().width * 1.5 &&
        Math.abs(currentTranslateX) <= fsSlider.scrollWidth - fsSlider.getBoundingClientRect().width
      ) {
        targetImg = lastImg
      }

      if (isVideoSlide) {
        let newIdx = wrapIndex + 1
        if (imageCount === 1) newIdx = 0
        if (
          currentIndex === 1 &&
          Math.abs(currentTranslateX) >= fsSlider.scrollWidth - fsSlider.getBoundingClientRect().width * 1.5 &&
          Math.abs(currentTranslateX) <= fsSlider.scrollWidth - fsSlider.getBoundingClientRect().width
        ) {
          newIdx = imageCount + 1
        }
        const wrapIndexStr = String(newIdx)

        const els = fsSlider.querySelectorAll<HTMLElement>('[data-index]')
        els.forEach(el => {
          if (el.dataset.index === wrapIndexStr) return
          Object.assign(el.style, {
            transition: 'opacity 0.3s cubic-bezier(.4,0,.22,1)',
            opacity: '0',
          })
        })
      } else {
        // fade out all non-target wrappers
        const divs = fsSlider.querySelectorAll('div')
        divs.forEach(div => {
          if (targetImg && div.contains(targetImg)) return
          Object.assign(div.style, {
            transition: 'opacity 0.3s cubic-bezier(.4,0,.22,1)',
            opacity: '0',
          })
        })
      }
    }

    if (!targetImg || !overlayDivRef.current || !rect) return

    const zoomedImg = targetImg
    const zoomedRect = targetImg.getBoundingClientRect()

    const computedStyle = window.getComputedStyle(zoomedImg)
    const transformMatrix = new DOMMatrix(computedStyle.transform)
    const currentScale = transformMatrix.a
    const translateX = transformMatrix.e
    const translateY = transformMatrix.f

    let deltaX = 0
    let deltaY = 0

    deltaX =
      currentScale !== 1
        ? rect.left - (Math.abs(translateX) + zoomedRect.left)
        : rect.left - zoomedRect.left

    deltaY =
      currentScale !== 1
        ? rect.top - (Math.abs(translateY) + zoomedRect.top)
        : rect.top - zoomedRect.top

    const scaleX = rect.width / (zoomedRect.width / currentScale)

    // fade UI via refs
    const fadeEls: (HTMLElement | null | undefined)[] = [
      leftChevronRef.current,
      rightChevronRef.current,
      counterRef.current,
      closeButtonRef.current,
    ]

    zoomedImg.style.transformOrigin = '0 0'
    zoomedImg.style.transition = 'transform 0.3s cubic-bezier(.4,0,.22,1)'
    zoomedImg.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleX})`

    overlayDivRef.current.style.backgroundColor = 'transparent'
    fadeEls.forEach(el => {
      if (el) el.style.opacity = '0'
    })

    window.setTimeout(() => {
      // reset the zoomed slide image
      zoomedImg.style.transition = ''
      zoomedImg.style.transform = ''

      // remove UI nodes via refs
      fadeEls.forEach(el => el?.remove())
      leftChevronRef.current = null
      rightChevronRef.current = null
      counterRef.current = null
      closeButtonRef.current = null

      // fade/cleanup slider and overlay
      const slider = document.querySelector('.fullscreen_slider') as HTMLElement;
      if (slider) {
        slider.style.opacity = '0';
      };
      overlayDivRef.current?.remove()
      overlayDivRef.current = null

      onClose()
      setShowFullscreenSlider(false)
      setClosingModal(false)
      scaleStore.setScale(1)
      zoomedImg.style.height = '100%'
    }, 300)
  }

  return (
    <div
      onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => {
        pointerDownX.current = e.clientX
        pointerDownY.current = e.clientY
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        touchAction: 'none',
        contain: 'layout style size',
      }}
    >
      {children}
    </div>
  )
}

export default FullscreenModal