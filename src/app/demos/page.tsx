export const dynamic    = 'force-static';
export const fetchCache = 'force-cache';

import GroupedCellsSlider from "../components/Grouped Cells";
import styles from "../page.module.css";
import ThumbnailSlider from "../components/Thumbnails";
import ResponsiveSlider from "../components/Responsive";
import HeroSlider from "../components/Hero/index";
import AutoScroll from "../components/Auto Scroll";
import Autoplay from "../components/Autoplay";
import MediaQuerySlider from "../components/Media Query";

export default function Demos() {

  const images: string[] = [
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/standard/thumbnail-slider-image-1.jpg',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/videos/13927516_3840_2160_60fps.mp4',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/standard/thumbnail-slider-image-2.jpg',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/standard/thumbnail-slider-image-3.jpg',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/standard/thumbnail-slider-image-4.jpg',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/standard/thumbnail-slider-image-5.jpg',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/standard/thumbnail-slider-image-6.jpg',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/standard/thumbnail-slider-image-7.jpg',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/standard/thumbnail-slider-image-8.jpg'
  ];

  const heroImages: string[] = [
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/ds/rmg-ds-image-1.jpg',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/videos/13927516_3840_2160_60fps.mp4',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/ds/rmg-ds-image-2.jpg',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/ds/rmg-ds-image-3.jpg',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/ds/rmg-ds-image-4.jpg',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/ds/rmg-ds-image-5.jpg'
  ];

  const logoImages = [
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/seamless/google.webp',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/seamless/canva.png',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/seamless/github.png',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/seamless/adobe.png',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/seamless/hubspot.png',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/seamless/instagram.svg',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/seamless/microsoft.webp',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/seamless/slack.png',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/seamless/spotify.png',
    'https://react-motion-gallery.s3.us-east-1.amazonaws.com/seamless/stripe.png',
  ];

  return (
    <>
      <p className={styles.subtitle}>
        On desktop, resize the browser to toggle wrapping (infinite looping). Tap or click on the image to toggle fullscreen mode. Tap, click or pinch-zoom on the fullscreen image to zoom in and out. On laptops, you can zoom in by 1: holding ctrl and scrolling on the touchpad vertically and 2: pinch-zooming on the touchpad. You can pan an image via mouse, touch, pointer and wheel gestures (use 2 fingers on laptops to scroll with the wheel event). Sliders can be dragged via mouse, touch, pointer and wheel gestures (which are wrapped). In fullscreen mode, you can close the fullscreen modal by swiping the image vertically (if the image is completely zoomed out). Im using the same high res images for both the original and fullscreen sliders in the examples below but it&apos;s recommended to use optimized/low res for the original and high res for fullscreen for best performance. 
      </p>

      {/** Thumbnails Section **/}
      
      <h2 className={styles.headers}>Thumbnails</h2>
      <p className={styles.description}>
        Resize the browser to 500px to see the horizontal thumbnail scrollbar. One cell is equal to one slide. Every image has to be the same size for best results.
      </p>
      <div className={styles.sliderContainer}>
        <ThumbnailSlider urls={images} />
      </div>
    
      {/** Grouped Cells Section **/}
    
      <h2 className={styles.headers}>Grouped Cells</h2>
      <p className={styles.description}>
        I gave this slider a height of 300px then change it to 50vw when the viewport is 600px and below. Cells are grouped. Accomodates images of any size. I disable wrapping once the second to last image is visible (you have complete control over when and why wrapping happens). Resize the browser on desktop to see how the number of cells per slide change based on how many cells are visible inside the slider container.
      </p>
      <div className={styles.sliderContainer}>
        <GroupedCellsSlider urls={heroImages} />
      </div>
    
      {/** Responsive Section **/}
    
      <h2 className={styles.headers}>Responsive</h2>
      <p className={styles.description}>
        Column-based layout guaranteeing full image visibility per slide. The number of cells per slide is derived from the maxWidth value you assign it which is 220 in the example below. The minimum number of visible slides is set to 2. Every image has to be the same size for best results.
      </p>
      <div className={styles.sliderContainer}>
        <ResponsiveSlider urls={images} />
      </div>
    
      {/** Hero Section **/}
    
      <h2 className={styles.headers}>Hero</h2>
      <p className={styles.description}>
        Slides are centered. One cell is equal to one slide. Accomodates images of any size.
      </p>
      <div className={styles.sliderContainer}>
        <HeroSlider urls={heroImages} />
      </div>

      {/** AUto Scroll Section **/}
    
      <h2 className={styles.headers}>Auto Scroll</h2>
      <p className={styles.description}>
        Constant-speed horizontal scroll. Grouped cells. Accomodates images of any size. I removed the fullscreen feature since it doesn&apos;t make sense here. All of the code for the autoplay feature is inside a small useEffect hook which can be copied and pasted inside any custom slider.
      </p>
      <div className={styles.sliderContainer}>
        <AutoScroll urls={logoImages} />
      </div>

      {/** Autoplay Section **/}
    
      <h2 className={styles.headers}>Autoplay</h2>
      <p className={styles.description}>
        Automatically advance to the next slide every 3 seconds.
      </p>
      <div className={styles.sliderContainer}>
        <Autoplay urls={images} />
      </div>

      {/** Media Query Section **/}
    
      <h2 className={styles.headers}>Media Query</h2>
      <p className={styles.description}>
        Full control over how many cells to show per slide.
      </p>
      <div className={styles.sliderContainer}>
        <MediaQuerySlider urls={images} />
      </div>
      
    </>
  );
}