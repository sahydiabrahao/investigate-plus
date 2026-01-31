import './BottomMenu.scss';

type Props = {
  onImport: () => void;
  onRefresh: () => void;
  canRefresh?: boolean;
};

export function BottomMenu({ onImport, onRefresh, canRefresh = true }: Props) {
  return (
    <nav className='bottom-menu'>
      <button
        className='bottom-menu__item'
        type='button'
        onClick={onImport}
        aria-label='Import folder'
        title='Import folder'
      >
        ⬆
      </button>

      <button
        className='bottom-menu__item'
        type='button'
        onClick={onRefresh}
        aria-label='Refresh'
        title='Refresh'
        disabled={!canRefresh}
      >
        ⟳
      </button>
    </nav>
  );
}
