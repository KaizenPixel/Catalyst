import type { SVGProps } from 'react';

/** An open orbit and ignition spark: Catalyst's flat, scalable brand mark. */
export function CatalystMark(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" {...props}>
    <path d="M49 9C37 1 21 4 11 15C0 27 3 45 15 54C27 63 43 59 52 49L43 41C37 49 27 50 20 44C12 38 12 26 20 20C27 14 36 14 42 19L49 9Z" fill="currentColor"/>
    <path d="M51 19C52.5 26 55 28.5 62 30C55 31.5 52.5 34 51 41C49.5 34 47 31.5 40 30C47 28.5 49.5 26 51 19Z" fill="currentColor"/>
  </svg>;
}
