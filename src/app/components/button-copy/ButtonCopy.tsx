import { ButtonText } from '@/app/components/button-text/ButtonText';
import './ButtonCopy.scss';

function copy(text: string) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(console.error);
  } else {
    const t = document.createElement('textarea');
    t.value = text;
    t.style.position = 'fixed';
    t.style.opacity = '0';
    document.body.appendChild(t);
    t.select();
    document.execCommand('copy');
    document.body.removeChild(t);
  }
}

export function ButtonCopy() {
  return (
    <div className='button-copy'>
      <ButtonText text='❌' size='sm' variant='filled' onClick={() => copy('[❌]')} />
      <ButtonText text='🕒' size='sm' variant='filled' onClick={() => copy('[🕒]')} />
      <ButtonText text='🔍' size='sm' variant='filled' onClick={() => copy('[🔍]')} />
      <ButtonText text='✔️' size='sm' variant='filled' onClick={() => copy('[✔️]')} />
    </div>
  );
}
