import { IconProps } from './types';

export function FolderClosedIcon({ size = 32, color = 'white' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 16 16'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M3.2 12.8H12.8C13.6825 12.8 14.4 12.0825 14.4 11.2V5.6C14.4 4.7175 13.6825 4 12.8 4H7.605L6.005 2.4H3.2C2.3175 2.4 1.6 3.1175 1.6 4V11.2C1.6 12.0825 2.3175 12.8 3.2 12.8Z'
        fill={color}
      />
    </svg>
  );
}
