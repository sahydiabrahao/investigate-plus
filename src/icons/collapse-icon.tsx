import { IconProps } from './types';

export function CollapseIcon({ size = 32, color = 'white' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 32 32'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M22.6667 20.0001C22.28 20.0001 21.8934 19.8667 21.5867 19.5601L16 13.9734L10.4134 19.5601C9.78672 20.1867 8.70672 20.1867 8.08005 19.5601C7.45338 18.9334 7.45338 17.8534 8.08005 17.2267L15 10.3067C15.6267 9.68005 16.7067 9.68005 17.3334 10.3067L24.2534 17.2267C24.88 17.8534 24.88 18.9334 24.2534 19.5601C23.9467 19.8667 23.56 20.0001 23.1734 20.0001H22.6667Z'
        fill={color}
      />
    </svg>
  );
}
