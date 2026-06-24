import type { ZodError } from 'zod';

import { describe, expect, it, vi } from 'vitest';
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

function createMountedFormApi(
  schema: any[],
  values: Record<string, any>,
  formOverrides: Record<string, any> = {},
  apiOptions: Record<string, any> = {},
) {
  const formApi = new FormApi({ schema, ...apiOptions });
  const fieldMeta: Record<string, any> = {};
  const form = {
    state: { values },
    setFieldMeta(fieldName: string, updater: (prev: any) => any) {
      fieldMeta[fieldName] = updater(fieldMeta[fieldName] ?? {});
    },
    ...formOverrides,
  };

  formApi.mount(form as any);

  return { fieldMeta, formApi, values };
}

function flushPromises() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

function createArrayLinkageSchema() {
  return [
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
  ] as any;
}

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

  it('deep clones object array default values', () => {
    const defaults = buildDefaultValues([
      {
        children: [
          {
            component: 'Input',
            fieldName: 'profile.name',
            label: 'Name',
          },
        ],
        component: 'Array',
        defaultItem: { profile: { name: 'default' } },
        fieldName: 'contacts',
        minRows: 2,
      },
    ] as any);

    defaults.contacts[0].profile.name = 'changed';

    expect(defaults.contacts[1].profile.name).toBe('default');
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
    const formSchema = buildZodSchema(createArrayLinkageSchema(), {
      controller: {} as any,
      formApi: {} as any,
    });

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

  it('syncs dynamic array child errors during form validate', async () => {
    const { fieldMeta, formApi } = createMountedFormApi(
      createArrayLinkageSchema(),
      {
        contacts: [{ email: '', taxNo: '', type: 'business' }],
        mode: 'strict',
      },
    );

    const result = await formApi.validate();

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({
      'contacts[0].email': ['Email is invalid'],
    });
    expect(fieldMeta['contacts[0].email']).toMatchObject({
      errorMap: { onSubmit: ['Email is invalid'] },
      errors: ['Email is invalid'],
      isValid: false,
    });
  });

  it('validates array child field by parent array schema', async () => {
    const { fieldMeta, formApi } = createMountedFormApi(
      createArrayLinkageSchema(),
      {
        contacts: [{ email: '', taxNo: '', type: 'business' }],
        mode: 'strict',
      },
    );

    const result = await formApi.validateField('contacts[0].email');

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({
      'contacts[0].email': ['Email is invalid'],
    });
    expect(fieldMeta['contacts[0].email']).toMatchObject({
      errorMap: { onSubmit: ['Email is invalid'] },
      errors: ['Email is invalid'],
      isValid: false,
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

  it('syncs validate errors to field meta on submit validation', async () => {
    const { fieldMeta, formApi } = createMountedFormApi(
      [
        {
          component: 'Input',
          fieldName: 'username',
          label: 'Username',
          rules: z.string().min(1, 'Username is required'),
        },
      ],
      { username: '' },
    );

    const result = await formApi.validate();

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({
      username: ['Username is required'],
    });
    expect(fieldMeta.username).toMatchObject({
      errorMap: { onSubmit: ['Username is required'] },
      errors: ['Username is required'],
      isValid: false,
    });
  });

  it('does not call tanstack submit validators during manual validate', async () => {
    const validate = vi.fn();
    const asyncRule = vi.fn();
    const { formApi } = createMountedFormApi(
      [
        {
          component: 'Input',
          fieldName: 'username',
          label: 'Username',
          rules: z.string().superRefine(async () => {
            asyncRule();
          }),
        },
      ],
      { username: 'kelei' },
      { validate },
    );

    await formApi.validate();

    expect(validate).not.toHaveBeenCalled();
    expect(asyncRule).toHaveBeenCalledTimes(1);
  });

  it('skips hidden fields during submit validation', async () => {
    const { formApi } = createMountedFormApi(
      [
        {
          component: 'Input',
          fieldName: 'hiddenName',
          hide: true,
          label: 'Hidden name',
          rules: z.string().min(1, 'Hidden name is required'),
        },
        {
          component: 'Input',
          dependencies: {
            show: false,
            triggerFields: ['visibleName'],
          },
          fieldName: 'dependencyHiddenName',
          label: 'Dependency hidden name',
          rules: z.string().min(1, 'Dependency hidden name is required'),
        },
      ],
      { dependencyHiddenName: '', hiddenName: '' },
    );

    const result = await formApi.validate();

    expect(result).toEqual({ errors: {}, valid: true });
  });

  it('clears previous validate errors from field meta after success', async () => {
    const { fieldMeta, formApi, values } = createMountedFormApi(
      [
        {
          component: 'Input',
          fieldName: 'username',
          label: 'Username',
          rules: z.string().min(1, 'Username is required'),
        },
      ],
      { username: '' },
    );

    await formApi.validate();
    values.username = 'kelei';
    const result = await formApi.validate();

    expect(result.valid).toBe(true);
    expect(fieldMeta.username).toMatchObject({
      errorMap: {},
      errors: [],
      isValid: true,
    });
  });

  it('syncs array child validate errors to bracket field meta paths', async () => {
    const { fieldMeta, formApi } = createMountedFormApi(
      [
        {
          children: [
            {
              component: 'Input',
              fieldName: 'taxNo',
              label: 'Tax no',
              rules: z.string().min(1, 'Tax no is required'),
            },
          ],
          component: 'Array',
          fieldName: 'contacts',
          minRows: 1,
        },
      ],
      { contacts: [{ taxNo: '' }] },
    );

    const result = await formApi.validate();

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({
      'contacts[0].taxNo': ['Tax no is required'],
    });
    expect(fieldMeta['contacts[0].taxNo']).toMatchObject({
      errorMap: { onSubmit: ['Tax no is required'] },
      errors: ['Tax no is required'],
      isValid: false,
    });
    expect(fieldMeta['contacts.0.taxNo']).toBeUndefined();
  });

  it('prevents duplicate submit by default and releases submitting state', async () => {
    let resolveSubmit: (() => void) | undefined;
    const handleSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    const { formApi } = createMountedFormApi(
      [
        {
          component: 'Input',
          fieldName: 'username',
          rules: z.string().min(1),
        },
      ],
      { username: 'kelei' },
      {},
      { handleSubmit },
    );

    const firstSubmit = formApi.submitForm();
    const secondSubmit = formApi.submitForm();
    await flushPromises();

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(formApi.getState().submitting).toBe(true);

    resolveSubmit?.();
    await firstSubmit;
    await secondSubmit;

    expect(formApi.getState().submitting).toBe(false);
  });

  it('allows concurrent submit when duplicate protection is disabled', async () => {
    const pendingSubmits: Array<() => void> = [];
    const handleSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          pendingSubmits.push(resolve);
        }),
    );
    const { formApi } = createMountedFormApi(
      [
        {
          component: 'Input',
          fieldName: 'username',
          rules: z.string().min(1),
        },
      ],
      { username: 'kelei' },
      {},
      { handleSubmit, preventDuplicateSubmit: false },
    );

    const firstSubmit = formApi.submitForm();
    const secondSubmit = formApi.submitForm();
    await flushPromises();

    expect(handleSubmit).toHaveBeenCalledTimes(2);
    expect(formApi.getState().submitting).toBe(true);

    pendingSubmits.forEach((resolve) => resolve());
    await Promise.all([firstSubmit, secondSubmit]);

    expect(formApi.getState().submitting).toBe(false);
  });

  it('releases submitting state when submit handler throws', async () => {
    const { formApi } = createMountedFormApi(
      [
        {
          component: 'Input',
          fieldName: 'username',
          rules: z.string().min(1),
        },
      ],
      { username: 'kelei' },
      {},
      {
        handleSubmit: vi.fn(async () => {
          throw new Error('submit failed');
        }),
      },
    );

    await expect(formApi.submitForm()).rejects.toThrow('submit failed');

    expect(formApi.getState().submitting).toBe(false);
  });

  it('trims and removes empty submit values without mutating form state', async () => {
    const handleSubmit = vi.fn();
    const values = {
      contacts: [
        {
          email: '   ',
          name: '  张三  ',
          nested: { empty: ' ', keep: ' value ' },
          phone: ' 13800000000 ',
        },
      ],
      emptyArray: [],
      emptyObject: {},
      enabled: false,
      keyword: '  hello  ',
      nullable: null,
      tags: [' a ', ' ', 'b'],
      total: 0,
    };
    const { formApi } = createMountedFormApi(
      [
        { component: 'Input', fieldName: 'keyword' },
        { component: 'Input', fieldName: 'tags' },
        {
          children: [
            { component: 'Input', fieldName: 'name' },
            { component: 'Input', fieldName: 'phone' },
            { component: 'Input', fieldName: 'email' },
          ],
          component: 'Array',
          fieldName: 'contacts',
        },
      ],
      values,
      {},
      {
        handleSubmit,
        submitValueTransform: {
          removeEmpty: { emptyString: true },
          trim: true,
        },
      },
    );

    const result = await formApi.submitForm();

    expect(result).toEqual({
      contacts: [
        {
          name: '张三',
          nested: { keep: 'value' },
          phone: '13800000000',
        },
      ],
      emptyArray: [],
      emptyObject: {},
      enabled: false,
      keyword: 'hello',
      nullable: null,
      tags: ['a', 'b'],
      total: 0,
    });
    expect(handleSubmit).toHaveBeenCalledWith(result);
    expect(values.keyword).toBe('  hello  ');
    expect(values.contacts[0]?.name).toBe('  张三  ');
  });
});
