import './ButtonText.scss';

interface ButtonTextProps {
  text: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'filled' | 'outline';
  disabled?: boolean;
}

export function ButtonText({
  text,
  onClick,
  size = 'md',
  variant = 'filled',
  disabled = false,
}: ButtonTextProps) {
  return (
    <button
      className={`button-text button-text--${size} button-text--${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {text}
    </button>
  );
}
