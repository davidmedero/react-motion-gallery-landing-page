/* eslint-disable @next/next/no-img-element */
'use client'

import { useRef } from "react";
import Slider from "./Slider";
import styles from './index.module.css';

interface Props {
  urls: string[];
}

export default function SliderWrapper({ urls }: Props) {
  const isClick = useRef(false);
  const isWrapping = useRef(false);
  const slides = useRef<{ cells: { element: HTMLElement, index: number }[], target: number }[]>([]);
  const slider = useRef<HTMLDivElement | null>(null);
  const selectedIndex = useRef(0);
  const firstCellInSlide = useRef<HTMLElement | null>(null);
  const sliderX = useRef(0);
  const sliderVelocity = useRef(0);

  return (
    <>
      <div className={styles.container}>
        <Slider imageCount={urls.length} isClick={isClick} isWrapping={isWrapping} slides={slides} slider={slider} selectedIndex={selectedIndex} firstCellInSlide={firstCellInSlide} sliderX={sliderX} sliderVelocity={sliderVelocity}>
          {
            urls.map((url, index) => {

              return (
                <img
                  key={index}
                  src={url}
                  className={styles.image}
                  alt={`${index}`}
                  draggable="false"
                />
              )
            })
          }
        </Slider>
      </div>
    </>
  );
}