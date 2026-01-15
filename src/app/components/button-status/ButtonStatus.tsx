import { FC } from 'react';
import { CaseStatus } from '@/types/json-default';
import {
  WaitingIcon,
  CompletedIcon,
  UrgentIcon,
  NullIcon,
  ReviewIcon,
  IncompleteIcon,
} from '@/icons';
import './ButtonStatus.scss';

interface ButtonSatatusProps {
  status: CaseStatus;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const sizeMap = {
  sm: 20,
  md: 24,
  lg: 28,
} as const;

const iconMap: Record<CaseStatus, FC<{ size: number; color?: string }>> = {
  null: NullIcon,
  incomplete: IncompleteIcon,
  waiting: WaitingIcon,
  completed: CompletedIcon,
  urgent: UrgentIcon,
  review: ReviewIcon,
};

const symbolColorMap: Record<CaseStatus, string> = {
  null: '#111827',
  incomplete: 'white',
  waiting: 'white',
  completed: 'white',
  urgent: 'white',
  review: 'white',
};

export function ButtonStatus({
  status,
  onClick,
  size = 'md',
  disabled = false,
}: ButtonSatatusProps) {
  const Icon = iconMap[status];

  return (
    <button
      className={`button-status button-status--${size} button-status--${status}`}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={sizeMap[size]} color={symbolColorMap[status]} />
    </button>
  );
}
