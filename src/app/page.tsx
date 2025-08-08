'use client'

import Hero from "./components/Hero";
import GroupedCellsSlider from "./components/Home Page Slider";
import Pricing from "./components/Pricing";
import Contact from "./components/Contact";
import { useState } from "react";

const heroImages: string[] = [
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/ds/rmg-ds-image-1.jpg',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/videos/13927516_3840_2160_60fps.mp4',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/ds/rmg-ds-image-2.jpg',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/ds/rmg-ds-image-3.jpg',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/ds/rmg-ds-image-4.jpg',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/ds/rmg-ds-image-5.jpg'
  ];

export default function Home() {
  const [showFullscreenSlider, setShowFullscreenSlider] = useState(false);
  
  return (
    <>
      <Hero />
      <div className='sliderContainer'>
        <GroupedCellsSlider urls={heroImages} showFullscreenSlider={showFullscreenSlider} setShowFullscreenSlider={setShowFullscreenSlider} />
      </div>
      <Pricing />
      <Contact />
    </>
  );
}
