import './Menu.scss';

export function Menu() {
  return (
    <nav className='menu'>
      <div className='menu__header'>
        <span className='menu__title'>INVESTIGATE</span>
      </div>

      <div className='menu__content'>
        <ul className='menu__list'>
          <li className='menu__item menu__item--active'>
            <span className='menu__icon'>📁</span>
            <span className='menu__label'>oc01-2025-dp31</span>
          </li>

          <li className='menu__item'>
            <span className='menu__icon'>📄</span>
            <span className='menu__label'>s.docx</span>
          </li>

          <li className='menu__item'>
            <span className='menu__icon'>📁</span>
            <span className='menu__label'>1-protocolo</span>
          </li>

          <li className='menu__item'>
            <span className='menu__icon'>📁</span>
            <span className='menu__label'>2-infoseg</span>
          </li>
        </ul>
      </div>
    </nav>
  );
}
