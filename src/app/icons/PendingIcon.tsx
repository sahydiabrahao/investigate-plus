import { IconProps } from './types';

export function PendingIcon({ size = 32 }: IconProps) {
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
        d='M11.2 11.2L20.8 20.8M20.8 11.2L11.2 20.8'
        stroke='#ffffff'
        strokeWidth='2.5'
        strokeLinecap='round'
      />
    </svg>
  );
}
