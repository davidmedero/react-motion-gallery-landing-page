import { useState, useEffect } from "react";

type ThumbMap = Record<string, string>;

// helper: append a random param safely
function withCacheBust(u: string) {
  try {
    const url = new URL(u);
    url.searchParams.set('__thumb', `${Date.now()}${Math.random().toString(36).slice(2,8)}`);
    return url.toString();
  } catch {
    // in case it's not a fully-qualified URL
    const sep = u.includes('?') ? '&' : '?';
    return `${u}${sep}__thumb=${Date.now()}${Math.random().toString(36).slice(2,8)}`;
  }
}

export function useVideoThumbnails(urls: string[]): ThumbMap {
  const [thumbs, setThumbs] = useState<ThumbMap>({});

  useEffect(() => {
    const videos: HTMLVideoElement[] = [];
    let cancelled = false;

    urls.forEach((url) => {
      if (!/\.(mp4|webm|ogg)$/i.test(url) || thumbs[url]) {
        return;
      }

      const video = document.createElement("video");
      // Must be on–DOM for iOS to actually load & fire events
      video.style.display = "none";
      video.crossOrigin    = "anonymous";
      video.preload        = "metadata";
      video.playsInline    = true;  
      video.muted          = true;  
      video.src = withCacheBust(url);
      videos.push(video);
      document.body.appendChild(video);

      const drawFrame = () => {
        if (cancelled) return;
        try {
          // === Desired canvas size (2:3 aspect ratio) ===
          const aspectRatio = 2 / 3;
          const maxWidth = video.videoWidth;
          const maxHeight = video.videoHeight;

          let canvasWidth = maxWidth;
          let canvasHeight = maxWidth / aspectRatio;

          if (canvasHeight > maxHeight) {
            canvasHeight = maxHeight;
            canvasWidth = maxHeight * aspectRatio;
          }

          const canvas = document.createElement("canvas");
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          const ctx = canvas.getContext("2d")!;

          // === Crop source video to simulate object-fit: cover ===
          const srcAR = video.videoWidth / video.videoHeight;
          const tgtAR = canvas.width / canvas.height;

          let sx = 0, sy = 0, sWidth = video.videoWidth, sHeight = video.videoHeight;

          if (srcAR > tgtAR) {
            // source is wider than target aspect — crop horizontally
            sWidth = sHeight * tgtAR;
            sx = (video.videoWidth - sWidth) / 2;
          } else {
            // source is taller than target aspect — crop vertically
            sHeight = sWidth / tgtAR;
            sy = (video.videoHeight - sHeight) / 2;
          }

          // draw cropped frame
          ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          setThumbs((prev) => ({ ...prev, [url]: dataUrl }));
        } catch (err) {
          console.error("[thumb] drawImage failed", err);
        }
      };

      // 1) try to seek to 1s in once metadata loads
      video.addEventListener("loadedmetadata", () => {
        try {
          video.currentTime = Math.min(1, video.duration / 2);
        } catch {
          /* some mobiles ignore this */
        }
      });

      // 2) draw on seek (if seeking worked)
      video.addEventListener("seeked", drawFrame);

      // 3) fallback: always draw at first frame as soon as data is ready
      video.addEventListener("loadeddata", drawFrame);

      // 4) force load
      video.load();
    });

    return () => {
      cancelled = true;
      videos.forEach((v) => {
        v.pause();
        v.removeAttribute("src");
        v.load();
        if (v.parentNode) v.parentNode.removeChild(v);
      });
    };
  }, [urls]);

  return thumbs;
}