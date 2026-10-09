import type { JSX } from 'react';
export interface ParticlesProps {
  particleCount?: number; particleSpread?: number; speed?: number; particleColors?: string[];
  moveParticlesOnHover?: boolean; particleHoverFactor?: number; alphaParticles?: boolean;
  particleBaseSize?: number; sizeRandomness?: number; cameraDistance?: number;
  disableRotation?: boolean; pixelRatio?: number; paused?: boolean; interactionTarget?: 'container' | 'window'; className?: string;
}
export default function Particles(props: ParticlesProps): JSX.Element;
