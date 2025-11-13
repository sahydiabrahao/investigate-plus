import type { IconProps } from './types';

export function FolderOpenedIcon({ size = 16, color = 'white' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 16 16'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M2 5C2 4.17157 2.67157 3.5 3.5 3.5H6.4L7.7 4.8H12.5C13.3284 4.8 14 5.47157 14 6.3V7.5H2V5Z'
        fill={color}
      />
      <path
        d='M2 7.5H14V11.8C14 12.6284 13.3284 13.3 12.5 13.3H3.5C2.67157 13.3 2 12.6284 2 11.8V7.5Z'
        fill={color}
      />
    </svg>
  );
}
