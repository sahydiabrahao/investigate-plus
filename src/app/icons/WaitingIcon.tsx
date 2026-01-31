import { IconProps } from './types';

export function WaitingIcon({ size = 32, color = 'white' }: IconProps) {
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
        d='M16 10V16L20 18'
        stroke={color}
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}
