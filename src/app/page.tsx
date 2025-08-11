'use client';

import Hero from "./components/Hero";
import GroupedCellsSlider from "./components/Home Page Slider";
import Pricing from "./components/Pricing";
import Contact from "./components/Contact";
import { useEffect } from "react";

export type MediaItem =
  | { kind: 'image'; src: string; alt?: string }
  | { kind: 'video'; src: string; alt?: string; thumb?: string };

const heroItems: MediaItem[] = [
    { kind: "image", src: "https://react-motion-gallery.s3.us-east-1.amazonaws.com/ds/rmg-ds-image-1.jpg", alt: "Hero image 1" },
    { kind: "video", src: "https://react-motion-gallery.s3.us-east-1.amazonaws.com/videos/13927516_3840_2160_60fps.mp4", thumb: "https://react-motion-gallery.s3.us-east-1.amazonaws.com/videos/beach-video-thumb-landscape.jpg", alt: "Video 1" },
    { kind: "image", src: "https://react-motion-gallery.s3.us-east-1.amazonaws.com/ds/rmg-ds-image-2.jpg", alt: "Hero image 2" },
    { kind: "image", src: "https://react-motion-gallery.s3.us-east-1.amazonaws.com/ds/rmg-ds-image-3.jpg", alt: "Hero image 3" },
    { kind: "image", src: "https://react-motion-gallery.s3.us-east-1.amazonaws.com/ds/rmg-ds-image-4.jpg", alt: "Hero image 4" },
    { kind: "image", src: "https://react-motion-gallery.s3.us-east-1.amazonaws.com/ds/rmg-ds-image-5.jpg", alt: "Hero image 5" }
  ];

export default function Home() {
  useEffect(() => {
    const id = sessionStorage.getItem("__scrollTo");
    if (!id) return;

    sessionStorage.removeItem("__scrollTo");
    const tryScroll = () => {
      const el = document.getElementById(id);
      setTimeout(() => {
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        else requestAnimationFrame(tryScroll);
      }, 300)
      
    };
    requestAnimationFrame(tryScroll);
  }, []);
  
  return (
    <>
      <Hero />
      <div className='sliderContainer'>
        <GroupedCellsSlider items={heroItems} />
      </div>
      <Pricing />
      <Contact />
    </>
  );
}
