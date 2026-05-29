import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { buildDefaultValues } from '../src/zod/build-default-values';
import { buildZodSchema } from '../src/zod/build-schema';

const schema = [
  {
    component: 'Input',
    fieldName: 'username',
    label: '用户名',
    rules: z.string().min(1, '请输入用户名'),
  },
  {
    component: 'Select',
    fieldName: 'role',
    label: '角色',
    rules: 'selectRequired',
  },
  {
    component: 'Input',
    defaultValue: 'profile-default',
    fieldName: 'profile.name',
    label: '昵称',
  },
] as any;

describe('custom form zod schema builder', () => {
  it('builds nested default values from schema', () => {
    expect(buildDefaultValues(schema)).toEqual({
      profile: { name: 'profile-default' },
      username: '',
    });
  });

  it('validates required zod and string rules', async () => {
    const formSchema = buildZodSchema(schema);
    const invalid = await formSchema.safeParseAsync({
      profile: { name: 'x' },
      role: null,
      username: '',
    });
    expect(invalid.success).toBe(false);

    const valid = await formSchema.safeParseAsync({
      profile: { name: 'x' },
      role: 'admin',
      username: 'kelei',
    });
    expect(valid.success).toBe(true);
  });
});
