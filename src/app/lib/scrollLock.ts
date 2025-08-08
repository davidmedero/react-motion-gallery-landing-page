// lib/scrollLock.ts
let locks = 0;
let savedY = 0;

function apply() {
  savedY = window.scrollY || window.pageYOffset;
  const sbw = window.innerWidth - document.documentElement.clientWidth;
  const b = document.body;
  b.style.position = 'fixed';
  b.style.top = `-${savedY}px`;
  b.style.left = '0';
  b.style.right = '0';
  b.style.width = '100%';
  b.style.overflow = 'hidden';
  if (sbw > 0) b.style.paddingRight = `${sbw}px`;
  b.style.touchAction = 'none';
}

function remove() {
  const b = document.body;
  b.style.position = '';
  b.style.top = '';
  b.style.left = '';
  b.style.right = '';
  b.style.width = '';
  b.style.overflow = '';
  b.style.paddingRight = '';
  b.style.touchAction = '';
  window.scrollTo(0, savedY);
}

export function lockBody() {
  if (++locks === 1) apply();
}
export function unlockBody() {
  if (locks > 0 && --locks === 0) remove();
}