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
        aria-label='Import workspace folder'
        title='Import workspace folder'
      >
        ⬆
      </button>

      <button
        className='bottom-menu__item'
        type='button'
        onClick={onRefresh}
        aria-label='Reload workspace'
        title='Reload workspace'
        disabled={!canRefresh}
      >
        ⟳
      </button>
    </nav>
  );
}
