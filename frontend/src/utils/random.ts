/** Devuelve dos elementos distintos al azar, o null si la lista tiene menos de dos. */
export function randomPair<T>(items: readonly T[], random: () => number = Math.random): [T, T] | null {
  if (items.length < 2) return null;
  const first = Math.floor(random() * items.length);
  let second = Math.floor(random() * (items.length - 1));
  if (second >= first) second++;
  return [items[first], items[second]];
}
