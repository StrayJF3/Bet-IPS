import { useEffect, useState } from 'react';

/**
 * Navegacion con teclado en una lista desplegable: flechas para moverse, Enter para elegir
 * y Escape para cerrar. La opcion activa se mantiene visible haciendo scroll.
 */
export function useListNavigation<T>(items: T[], listId: string, onPick: (item: T) => void, onClose: () => void) {
  const [active, setActive] = useState(0);

  useEffect(() => setActive(0), [items]);

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, listId]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const actions: Record<string, () => void> = {
      ArrowDown: () => setActive((i) => Math.min(items.length - 1, i + 1)),
      ArrowUp: () => setActive((i) => Math.max(0, i - 1)),
      Enter: () => items[active] !== undefined && onPick(items[active]),
      Escape: onClose,
    };
    if (!actions[e.key]) return;
    e.preventDefault();
    actions[e.key]();
  };

  return { active, setActive, onKeyDown };
}
