import { useEffect, useRef } from 'react';
import { loadBearFrames } from '../data/alligatorBear';
import { loadCrabFrames } from '../data/crabacus';
import { loadWyvernFrames } from '../data/emeraldWyvern';
import { loadVoidFrames } from '../data/voidWalker';
import { renderSpriteFrame, spriteSize, type CritterSprite } from '../data/pixelCritters';

/** Small looping preview of one pixel companion, used on the Settings page. */
export default function PixelSpritePreview({
  sprite,
  scale = 2,
  animate = true,
  className = '',
}: {
  sprite: CritterSprite;
  scale?: number;
  animate?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { w, h } = spriteSize(sprite);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let cancelled = false;
    let intervalId = 0;

    const drawImageFrame = (img: HTMLCanvasElement) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };

    if (sprite.imageAtlas) {
      void (async () => {
        const frames =
          sprite.id === 'crabacus'
            ? await loadCrabFrames('idle', 'south')
            : sprite.id === 'emerald-wyvern'
              ? await loadWyvernFrames('walk', 'south')
              : sprite.id === 'void-walker'
                ? await loadVoidFrames('walk', 'south')
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

    const frames = sprite.frames
      .map((_, i) => renderSpriteFrame({ ...sprite, scale }, i))
      .filter((f): f is HTMLCanvasElement => f !== null);
    if (frames.length === 0) return;
    let index = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      const img = frames[index % frames.length];
      if (img) ctx.drawImage(img, 0, 0);
    };
    draw();
    if (!animate || frames.length < 2) return;
    intervalId = window.setInterval(() => {
      index = (index + 1) % frames.length;
      draw();
    }, Math.max(90, sprite.frameTime * 1000 * 2.5));
    return () => window.clearInterval(intervalId);
  }, [sprite, scale, animate]);

  return (
    <canvas
      ref={ref}
      width={w * scale}
      height={h * scale}
      className={`wz-critters shrink-0 ${className}`}
      style={{ width: w * scale, height: h * scale }}
      role="img"
      aria-label={sprite.name}
    />
  );
}
