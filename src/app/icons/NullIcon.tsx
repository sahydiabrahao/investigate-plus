import { IconProps } from './types';

export function NullIcon({ size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 32 32'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <circle cx='16' cy='16' r='12' fill='currentColor' />

      <text
        x='16'
        y='17'
        textAnchor='middle'
        dominantBaseline='middle'
        fontSize='14'
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fill='#ffffff'
      >
        ?
      </text>
    </svg>
  );
}
