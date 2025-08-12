let locks = 0;

function apply() {
  const b = document.body;
  b.style.overflow = 'hidden';
  b.style.touchAction = 'none';
}

function remove() {
  const b = document.body;
  b.style.overflow = '';
  b.style.touchAction = '';
}

export function lockBody() {
  if (++locks === 1) apply();
}
export function unlockBody() {
  if (locks > 0 && --locks === 0) remove();
}