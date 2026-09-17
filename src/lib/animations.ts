import { AnimationType, Caption, Word } from '../types';

export interface AnimationDefinition {
  id: AnimationType;
  name: string;
  description: string;
  badge: string;
}

export const ANIMATIONS: AnimationDefinition[] = [
  { id: 'pop', name: 'Pop', description: 'Scale bounce from 0.7x to 1.05x settling at 1.0x', badge: 'High Energy' },
  { id: 'fade', name: 'Fade In', description: 'Smooth progressive alpha opacity transition', badge: 'Classic' },
  { id: 'slide-up', name: 'Slide Up', description: 'Fluid upward motion from lower offset', badge: 'Dynamic' },
  { id: 'slide-down', name: 'Slide Down', description: 'Downward entrance from upper offset', badge: 'Clean' },
  { id: 'slide-left', name: 'Slide Left', description: 'Glides in smoothly from the right edge', badge: 'Horizontal' },
  { id: 'slide-right', name: 'Slide Right', description: 'Glides in smoothly from the left edge', badge: 'Horizontal' },
  { id: 'bounce', name: 'Bounce', description: 'Playful multi-stage spring overshoot bounce', badge: 'Playful' },
  { id: 'typewriter', name: 'Typewriter', description: 'Reveals characters sequentially based on timing', badge: 'Sequential' },
  { id: 'word-stagger', name: 'Word Stagger', description: 'Each word cascades in with an 80ms stagger delay', badge: 'Trending' },
  { id: 'character-stagger', name: 'Character Stagger', description: 'Each character drops into place sequentially', badge: 'Micro-motion' },
  { id: 'scale-punch', name: 'Scale Punch', description: 'Impact punch starting at 1.4x zooming to 1.0x', badge: 'Impact' },
  { id: 'blur-reveal', name: 'Blur Reveal', description: 'Blurs from 15px down to 0px with opacity fade', badge: 'Cinematic' },
  { id: 'elastic', name: 'Elastic Spring', description: 'Snappy spring with overshoot and wobble settling', badge: 'Physics' },
  { id: 'rotate', name: 'Rotate Twist', description: 'Subtle tilt rotation entrance with scale up', badge: 'Twist' },
  { id: 'tracking-reveal', name: 'Tracking Reveal', description: 'Letter spacing expands smoothly from tight to wide', badge: 'Sleek' },
  { id: 'karaoke', name: 'Karaoke Follower', description: 'Words highlight in real-time as spoken in audio', badge: 'Viral' },
];

/**
 * Unicode-safe character splitter that never breaks emojis, Hindi matras, or surrogate pairs
 */
export function getSafeCharacters(str: string): string[] {
  if (!str) return [];
  // Use Intl.Segmenter if available for grapheme clusters
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' });
      return Array.from(segmenter.segment(str), (s: any) => s.segment);
    } catch {
      // fallback to Array.from
    }
  }
  return Array.from(str);
}

/**
 * Calculate visual transform and filter for DOM and Canvas rendering based on current progress
 */
export function getAnimationTransform(
  type: AnimationType,
  progress: number // 0 to 1 (progress of the caption entrance, e.g. first 0.3s-0.5s)
): {
  opacity: number;
  transform: string;
  filter: string;
  letterSpacingExtra?: number;
} {
  // Clamp progress
  const p = Math.max(0, Math.min(1, progress));

  switch (type) {
    case 'fade': {
      return {
        opacity: p,
        transform: 'none',
        filter: 'none',
      };
    }
    case 'pop': {
      // Ease out back: overshoot then settle
      const c1 = 1.70158;
      const c3 = c1 + 1;
      const t = p - 1;
      const eased = 1 + c3 * Math.pow(t, 3) + c1 * Math.pow(t, 2);
      const scale = Math.max(0.2, Math.min(1.2, 0.4 + 0.6 * eased));
      return {
        opacity: Math.min(1, p * 2),
        transform: `scale(${scale.toFixed(3)})`,
        filter: 'none',
      };
    }
    case 'slide-up': {
      const ease = 1 - Math.pow(1 - p, 3);
      const offsetY = (1 - ease) * 35;
      return {
        opacity: Math.min(1, p * 2),
        transform: `translateY(${offsetY.toFixed(1)}px)`,
        filter: 'none',
      };
    }
    case 'slide-down': {
      const ease = 1 - Math.pow(1 - p, 3);
      const offsetY = -(1 - ease) * 35;
      return {
        opacity: Math.min(1, p * 2),
        transform: `translateY(${offsetY.toFixed(1)}px)`,
        filter: 'none',
      };
    }
    case 'slide-left': {
      const ease = 1 - Math.pow(1 - p, 3);
      const offsetX = (1 - ease) * 50;
      return {
        opacity: Math.min(1, p * 2),
        transform: `translateX(${offsetX.toFixed(1)}px)`,
        filter: 'none',
      };
    }
    case 'slide-right': {
      const ease = 1 - Math.pow(1 - p, 3);
      const offsetX = -(1 - ease) * 50;
      return {
        opacity: Math.min(1, p * 2),
        transform: `translateX(${offsetX.toFixed(1)}px)`,
        filter: 'none',
      };
    }
    case 'bounce': {
      let bounceScale = 1;
      if (p < 0.36) {
        bounceScale = (p / 0.36) * 1.2;
      } else if (p < 0.74) {
        bounceScale = 1.2 - ((p - 0.36) / 0.38) * 0.3;
      } else {
        bounceScale = 0.9 + ((p - 0.74) / 0.26) * 0.1;
      }
      return {
        opacity: Math.min(1, p * 3),
        transform: `scale(${bounceScale.toFixed(3)})`,
        filter: 'none',
      };
    }
    case 'scale-punch': {
      // Start big at 1.4x, punch down to 1.0x
      const ease = 1 - Math.pow(1 - p, 4);
      const scale = 1.35 - ease * 0.35;
      return {
        opacity: Math.min(1, p * 2.5),
        transform: `scale(${scale.toFixed(3)})`,
        filter: 'none',
      };
    }
    case 'blur-reveal': {
      // blur(15px) opacity: 0 -> blur(0) opacity: 1
      const blurAmount = (1 - p) * 15;
      return {
        opacity: p,
        transform: 'none',
        filter: `blur(${blurAmount.toFixed(1)}px)`,
      };
    }
    case 'elastic': {
      // Elastic spring effect
      const period = 0.4;
      const s = period / 4;
      const elasticVal = p === 1 ? 1 : Math.pow(2, -10 * p) * Math.sin(((p - s) * (2 * Math.PI)) / period) + 1;
      return {
        opacity: Math.min(1, p * 2),
        transform: `scale(${Math.max(0.1, elasticVal).toFixed(3)})`,
        filter: 'none',
      };
    }
    case 'rotate': {
      const ease = 1 - Math.pow(1 - p, 3);
      const deg = (1 - ease) * -12;
      const scale = 0.8 + ease * 0.2;
      return {
        opacity: Math.min(1, p * 2),
        transform: `rotate(${deg.toFixed(1)}deg) scale(${scale.toFixed(2)})`,
        filter: 'none',
      };
    }
    case 'tracking-reveal': {
      // Expand letter spacing
      const ease = 1 - Math.pow(1 - p, 2);
      const extraSpacing = (1 - ease) * 12;
      return {
        opacity: Math.min(1, p * 2),
        transform: 'none',
        filter: 'none',
        letterSpacingExtra: extraSpacing,
      };
    }
    default:
      return {
        opacity: 1,
        transform: 'none',
        filter: 'none',
      };
  }
}
