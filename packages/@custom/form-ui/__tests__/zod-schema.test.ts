import type { ZodError } from 'zod';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { FormApi } from '../src/core/form-api';
import { buildDefaultValues } from '../src/zod/build-default-values';
import { buildZodSchema } from '../src/zod/build-schema';
import { zodErrorToFieldErrors } from '../src/zod/errors';
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

  it('validates dynamic array child dependencies', async () => {
    const formSchema = buildZodSchema(
      [
        {
          component: 'Select',
          fieldName: 'mode',
          label: 'Mode',
        },
        {
          children: [
            {
              component: 'Select',
              fieldName: 'type',
              label: 'Type',
              rules: 'selectRequired',
            },
            {
              component: 'Input',
              dependencies: {
                required: (values: any) => values.$row?.type === 'finance',
                rules: (values: any) =>
                  values.$row?.type === 'finance'
                    ? z.string().min(1, 'Tax no is required')
                    : z.string().optional(),
                triggerFields: ['type'],
              },
              fieldName: 'taxNo',
              label: 'Tax no',
            },
            {
              component: 'Input',
              dependencies: {
                required: (values: any) =>
                  values.$row?.type === 'tech' || values.mode === 'strict',
                rules: (values: any) =>
                  values.$row?.type === 'tech' || values.mode === 'strict'
                    ? z.string().email('Email is invalid')
                    : z.union([
                        z.string().email('Email is invalid'),
                        z.literal(''),
                      ]),
                triggerFields: ['type', '$root.mode'],
              },
              fieldName: 'email',
              label: 'Email',
            },
          ],
          component: 'Array',
          fieldName: 'contacts',
          minRows: 1,
        },
      ] as any,
      {
        controller: {} as any,
        formApi: {} as any,
      },
    );

    const businessWithoutTaxNo = await formSchema.safeParseAsync({
      contacts: [{ email: '', taxNo: '', type: 'business' }],
      mode: 'normal',
    });
    const financeWithoutTaxNo = await formSchema.safeParseAsync({
      contacts: [{ email: 'finance@example.com', taxNo: '', type: 'finance' }],
      mode: 'normal',
    });
    const techWithoutEmail = await formSchema.safeParseAsync({
      contacts: [{ email: '', taxNo: '', type: 'tech' }],
      mode: 'normal',
    });
    const strictWithoutEmail = await formSchema.safeParseAsync({
      contacts: [{ email: '', taxNo: '', type: 'business' }],
      mode: 'strict',
    });
    const strictWithEmail = await formSchema.safeParseAsync({
      contacts: [
        { email: 'business@example.com', taxNo: '', type: 'business' },
      ],
      mode: 'strict',
    });

    expect(businessWithoutTaxNo.success).toBe(true);
    expect(financeWithoutTaxNo.success).toBe(false);
    expect(techWithoutEmail.success).toBe(false);
    expect(strictWithoutEmail.success).toBe(false);
    expect(strictWithEmail.success).toBe(true);

    expect(financeWithoutTaxNo.success).toBe(false);

    const errors = zodErrorToFieldErrors(<ZodError>financeWithoutTaxNo.error);
    expect(errors).toEqual({
      'contacts[0].taxNo': ['Tax no is required'],
    });
  });

  it('formats zod array issue paths as form field names', async () => {
    const formSchema = buildZodSchema([
      {
        children: [
          {
            component: 'Input',
            fieldName: 'name',
            label: 'Name',
            rules: z.string().min(1, 'Name is required'),
          },
        ],
        component: 'Array',
        fieldName: 'contacts',
      },
    ] as any);

    const result = await formSchema.safeParseAsync({
      contacts: [{ name: '' }],
    });

    expect(result.success).toBe(false);
    const errors = zodErrorToFieldErrors(result.error as ZodError);
    expect(errors['contacts[0].name']).toEqual(['Name is required']);
    expect(errors['contacts.0.name']).toBeUndefined();
  });

  it('skips updateSchema state updates when no top-level schema matches', () => {
    const formApi = new FormApi({
      schema: [
        {
          component: 'Array',
          fieldName: 'contacts',
          children: [
            {
              component: 'Input',
              fieldName: 'name',
              label: 'Name',
            },
          ],
        },
      ] as any,
    });
    const previousState = formApi.state;
    const previousSchema = formApi.state.schema;

    formApi.updateSchema([
      {
        fieldName: 'contacts[0].name',
        required: true,
      } as any,
    ]);

    expect(formApi.state).toBe(previousState);
    expect(formApi.state.schema).toBe(previousSchema);
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
