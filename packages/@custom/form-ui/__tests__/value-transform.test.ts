import { describe, expect, it } from 'vitest';

import { applySchemaValueTransforms } from '../src/zod/transform';

describe('custom form value transform', () => {
  it('applies output transforms by schema field', () => {
    const result = applySchemaValueTransforms(
      [
        {
          component: 'Input',
          fieldName: 'price',
          transform: {
            out: Number,
          },
        },
      ] as any,
      { price: '18' },
    );

    expect(result).toEqual({ price: 18 });
  });

  it('does not mutate source values when applying transforms', () => {
    const source = { user: { name: 'kelei', profile: { age: '18' } } };
    const result = applySchemaValueTransforms(
      [
        {
          component: 'Input',
          fieldName: 'user.profile.age',
          transform: {
            out: Number,
          },
        },
      ] as any,
      source,
    );

    expect(result).toEqual({ user: { name: 'kelei', profile: { age: 18 } } });
    expect(source).toEqual({
      user: { name: 'kelei', profile: { age: '18' } },
    });
  });
});
