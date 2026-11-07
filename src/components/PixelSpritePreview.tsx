import { useEffect, useRef } from 'react';
import { loadBearFrames } from '../data/alligatorBear';
import { loadCrabFrames } from '../data/crabacus';
import { loadWyvernFrames } from '../data/emeraldWyvern';
import { loadFaeFrames } from '../data/faePrincess';
import { loadGoblinFrames } from '../data/goblinPriest';
import { loadRagnokFrames } from '../data/ragnokHoarder';
import { loadNecromageFrames } from '../data/necromage';
import { loadGolemFrames } from '../data/golem';
import { loadVictfurFrames } from '../data/victfur';
import { loadIronGiantFrames } from '../data/ironGiant';
import { loadGhostfreakFrames } from '../data/ghostfreak';
import { loadVoidFrames } from '../data/voidWalker';
import { renderSpriteFrame, spriteSize, type CritterSprite } from '../data/pixelCritters';

/** Small looping preview of one pixel companion, used on the Settings page. */
export default function PixelSpritePreview({
  sprite,
  scale = 2,
  /** Fit the sprite into a fixed square (keeps companion cards uniform). */
  displaySize,
  animate = true,
  className = '',
}: {
  sprite: CritterSprite;
  scale?: number;
  displaySize?: number;
  animate?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { w, h } = spriteSize(sprite);
  const box = displaySize ?? Math.max(w, h) * scale;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let cancelled = false;
    let intervalId = 0;

    const contentBounds = (img: HTMLCanvasElement) => {
      const { width, height } = img;
      const data = img.getContext('2d')?.getImageData(0, 0, width, height).data;
      if (!data) return null;
      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (data[(y * width + x) * 4 + 3]! > 8) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < 0) return null;
      return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    };

    /** Fit opaque pixels into the preview box so padded atlases (wyvern) match others. */
    const drawImageFrame = (img: HTMLCanvasElement) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      const b = contentBounds(img);
      if (!b) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return;
      }
      const pad = Math.max(2, Math.floor(canvas.width * 0.06));
      const maxW = canvas.width - pad * 2;
      const maxH = canvas.height - pad * 2;
      const scale = Math.min(maxW / b.w, maxH / b.h);
      const dw = Math.max(1, Math.round(b.w * scale));
      const dh = Math.max(1, Math.round(b.h * scale));
      const dx = Math.floor((canvas.width - dw) / 2);
      const dy = canvas.height - pad - dh;
      ctx.drawImage(img, b.x, b.y, b.w, b.h, dx, dy, dw, dh);
    };

    if (sprite.imageAtlas) {
      void (async () => {
        const frames =
          sprite.id === 'crabacus'
            ? await loadCrabFrames('idle', 'south')
            : sprite.id === 'emerald-wyvern'
              ? await loadWyvernFrames('walk', 'south')
              : sprite.id === 'void-walker'
                ? await loadVoidFrames('idle', 'south')
                : sprite.id === 'goblin-priest'
                  ? await loadGoblinFrames('idle', 'south')
                  : sprite.id === 'fae-princess'
                    ? await loadFaeFrames('walk', 'south')
                    : sprite.id === 'ragnok'
                      ? await loadRagnokFrames('idle', 'south')
                      : sprite.id === 'necromage'
                        ? await loadNecromageFrames('idle', 'south')
                        : sprite.id === 'golem'
                          ? await loadGolemFrames('idle', 'south')
                          : sprite.id === 'victfur'
                            ? await loadVictfurFrames('idle', 'south')
                            : sprite.id === 'iron-giant'
                              ? await loadIronGiantFrames('idle', 'south')
                              : sprite.id === 'ghostfreak'
                                ? await loadGhostfreakFrames('idle', 'south')
                                : await loadBearFrames('idle', 'south');
        if (cancelled || !frames.length) return;
        let index = 0;
        drawImageFrame(frames[0]!);
        if (!animate || frames.length < 2) return;
        intervalId = window.setInterval(() => {
          index = (index + 1) % frames.length;
          drawImageFrame(frames[index]!);
        }, Math.max(90, sprite.frameTime * 1000));
      })();
      return () => {
        cancelled = true;
        if (intervalId) window.clearInterval(intervalId);
      };
    }

    const pixelScale = displaySize
      ? Math.max(1, Math.floor(displaySize / Math.max(w, h, 1)))
      : scale;
    const frames = sprite.frames
      .map((_, i) => renderSpriteFrame({ ...sprite, scale: pixelScale }, i))
      .filter((f): f is HTMLCanvasElement => f !== null);
    if (frames.length === 0) return;
    let index = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      const img = frames[index % frames.length];
      if (!img) return;
      if (displaySize) {
        const dx = Math.floor((canvas.width - img.width) / 2);
        const dy = canvas.height - img.height;
        ctx.drawImage(img, dx, dy);
      } else {
        ctx.drawImage(img, 0, 0);
      }
    };
    draw();
    if (!animate || frames.length < 2) return;
    intervalId = window.setInterval(() => {
      index = (index + 1) % frames.length;
      draw();
    }, Math.max(90, sprite.frameTime * 1000 * 2.5));
    return () => window.clearInterval(intervalId);
  }, [sprite, scale, displaySize, animate, w, h]);

  return (
    <canvas
      ref={ref}
      width={box}
      height={box}
      className={`wz-critters shrink-0 ${className}`}
      style={{ width: box, height: box }}
      role="img"
      aria-label={sprite.name}
    />
  );
}
