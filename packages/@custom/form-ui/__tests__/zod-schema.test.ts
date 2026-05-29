import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { buildDefaultValues } from '../src/zod/build-default-values';
import { buildZodSchema } from '../src/zod/build-schema';
import { getValueByPath, setValueByPath } from '../src/zod/path';

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

  it('builds default values for object array schemas', () => {
    expect(
      buildDefaultValues([
        {
          children: [
            {
              component: 'Input',
              fieldName: 'name',
              label: '姓名',
            },
            {
              component: 'Input',
              fieldName: 'phone',
              label: '手机号',
            },
          ],
          component: 'Array',
          fieldName: 'contacts',
          minRows: 2,
        },
      ] as any),
    ).toEqual({
      contacts: [
        { name: '', phone: '' },
        { name: '', phone: '' },
      ],
    });
  });

  it('validates object array child fields and row limits', async () => {
    const formSchema = buildZodSchema([
      {
        children: [
          {
            component: 'Input',
            fieldName: 'name',
            label: '姓名',
            rules: z.string().min(1, '请输入姓名'),
          },
        ],
        component: 'Array',
        fieldName: 'contacts',
        maxRows: 2,
        minRows: 1,
      },
    ] as any);

    const emptyRows = await formSchema.safeParseAsync({
      contacts: [],
    });
    const emptyName = await formSchema.safeParseAsync({
      contacts: [{ name: '' }],
    });
    const valid = await formSchema.safeParseAsync({
      contacts: [{ name: '张三' }],
    });
    const overflowRows = await formSchema.safeParseAsync({
      contacts: [{ name: '张三' }, { name: '李四' }, { name: '王五' }],
    });

    expect(emptyRows.success).toBe(false);
    expect(emptyName.success).toBe(false);
    expect(valid.success).toBe(true);
    expect(overflowRows.success).toBe(false);
  });

  it('handles array index paths', () => {
    const values = {};
    setValueByPath(values, 'contacts[10].phones[0]', '13800000000');

    expect(getValueByPath(values, 'contacts[10].phones[0]')).toBe(
      '13800000000',
    );
    expect(values).toEqual({
      contacts: [
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { phones: ['13800000000'] },
      ],
    });
  });
});
