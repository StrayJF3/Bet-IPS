import { describe, expect, it } from 'vitest';
import { randomPair } from './random';

describe('randomPair', () => {
  it('nunca devuelve el mismo elemento dos veces', () => {
    const items = ['a', 'b', 'c'];
    for (const r of [0, 0.34, 0.5, 0.67, 0.99]) {
      const pair = randomPair(items, () => r)!;
      expect(pair[0]).not.toBe(pair[1]);
    }
  });
  it('devuelve null si no hay dos elementos', () => {
    expect(randomPair(['a'])).toBeNull();
  });
});
