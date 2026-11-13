import { describe, expect, it } from 'vitest';
import { normalize, pct } from './format';

describe('format', () => {
  it('normaliza tildes y mayusculas para la busqueda', () => {
    expect(normalize('  España ')).toBe('espana');
    expect(normalize('TURQUÍA')).toBe('turquia');
  });
  it('limita la longitud de la busqueda', () => {
    expect(normalize('a'.repeat(100))).toHaveLength(40);
  });
  it('formatea porcentajes', () => {
    expect(pct(0.4999)).toBe('50%');
    expect(pct(0.4999, 1)).toBe('50.0%');
  });
});
