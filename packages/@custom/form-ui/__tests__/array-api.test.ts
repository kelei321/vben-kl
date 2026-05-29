import { describe, expect, it } from 'vitest';

import { FormApi } from '../src/core/form-api';
import { getValueByPath, setValueByPath } from '../src/zod/path';

function createArrayFormApi() {
  const api = new FormApi({
    schema: [
      {
        children: [
          {
            component: 'Input',
            fieldName: 'name',
            label: '姓名',
          },
        ],
        component: 'Array',
        defaultItem: { name: '默认联系人' },
        fieldName: 'contacts',
      },
    ] as any,
  });
  const values = { contacts: [{ name: '张三' }] };
  const form = {
    state: { values },
    clearFieldValues(field: string) {
      setValueByPath(values, field, []);
    },
    getFieldValue(field: string) {
      return getValueByPath(values, field);
    },
    insertFieldValue(field: string, index: number, value: any) {
      const list = getValueByPath(values, field);
      list.splice(index, 0, value);
    },
    moveFieldValues(field: string, from: number, to: number) {
      const list = getValueByPath(values, field);
      list.splice(to, 0, list.splice(from, 1)[0]);
    },
    pushFieldValue(field: string, value: any) {
      getValueByPath(values, field).push(value);
    },
    removeFieldValue(field: string, index: number) {
      getValueByPath(values, field).splice(index, 1);
    },
    swapFieldValues(field: string, aIndex: number, bIndex: number) {
      const list = getValueByPath(values, field);
      [list[aIndex], list[bIndex]] = [list[bIndex], list[aIndex]];
    },
  };
  api.mount(form as any);
  return { api, values };
}

describe('custom form array api', () => {
  it('updates array values through FormApi helpers', async () => {
    const { api, values } = createArrayFormApi();

    await api.appendArrayItem('contacts');
    await api.insertArrayItem('contacts', 1, { name: '李四' });
    await api.swapArrayItems('contacts', 0, 1);
    await api.moveArrayItem('contacts', 2, 0);
    await api.removeArrayItem('contacts', 1);

    expect(values.contacts).toEqual([{ name: '默认联系人' }, { name: '张三' }]);

    await api.clearArrayItems('contacts');
    expect(values.contacts).toEqual([]);
  });
});
