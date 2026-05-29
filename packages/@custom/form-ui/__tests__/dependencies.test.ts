import { describe, expect, it } from 'vitest';

import { isEmptyValue, isSelectedValue } from '../src/zod/rules';

describe('custom form rule helpers', () => {
  it('detects empty values for required validation', () => {
    expect(isEmptyValue('')).toBe(true);
    expect(isEmptyValue([])).toBe(true);
    expect(isEmptyValue('ok')).toBe(false);
  });

  it('detects selected values for select validation', () => {
    expect(isSelectedValue(null)).toBe(false);
    expect(isSelectedValue([])).toBe(false);
    expect(isSelectedValue('admin')).toBe(true);
  });
});
