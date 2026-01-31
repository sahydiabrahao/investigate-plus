import { IconProps } from './types';

export function UrgentIcon({ size = 32, color = 'white' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 32 32'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <circle cx='16' cy='16' r='12' fill='currentColor' />

      <rect x='15' y='8' width='2' height='10' rx='1' fill={color} />
      <rect x='15' y='20' width='2' height='2' rx='1' fill={color} />
    </svg>
  );
}
