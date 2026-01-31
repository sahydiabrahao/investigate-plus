import { IconProps } from './types';

export function ReviewIcon({ size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 32 32'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <circle cx='16' cy='16' r='12' fill='currentColor' />

      <path
        fill='#ffffff'
        d='M16 10c-3.3 0-6 2.7-6 6s2.7 6 6 6c1.3 0 2.6-.4 3.6-1.2l2.1 2.1a1 1 0 0 0 1.4-1.4l-2.1-2.1A5.97 5.97 0 0 0 22 16c0-3.3-2.7-6-6-6zm0 2c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4 1.8-4 4-4z'
      />
    </svg>
  );
}
