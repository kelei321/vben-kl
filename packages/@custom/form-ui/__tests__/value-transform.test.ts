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
});
