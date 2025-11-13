import { IconProps } from './types';

export function ExpandIcon({ size = 32, color = 'white' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 32 32'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M16 21.6934C15.3733 21.6934 14.2933 21.6934 13.6667 21.0667L6.74667 14.1467C6.12 13.52 6.12 12.44 6.74667 11.8134C7.37334 11.1867 8.45334 11.1867 9.08001 11.8134L16 18.7334L22.92 11.8134C23.5467 11.1867 24.6267 11.1867 25.2533 11.8134C25.88 12.44 25.88 13.52 25.2533 14.1467L18.3333 21.0667C17.7067 21.6934 16.6267 21.6934 16 21.6934Z'
        fill={color}
      />
    </svg>
  );
}
