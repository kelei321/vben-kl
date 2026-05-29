import type { VbenFormProps } from '../core/types';

import { createStore } from '@tanstack/vue-store';

export function getDefaultState(): VbenFormProps {
  return {
    actionWrapperClass: '',
    collapsed: false,
    collapsedRows: 1,
    collapseTriggerResize: false,
    commonConfig: {},
    handleReset: undefined,
    handleSubmit: undefined,
    handleValuesChange: undefined,
    handleCollapsedChange: undefined,
    layout: 'horizontal',
    resetButtonOptions: {},
    schema: [],
    scrollToFirstError: false,
    showCollapseButton: false,
    showDefaultActions: true,
    submitButtonOptions: {},
    submitOnChange: false,
    submitOnEnter: false,
    validateTrigger: 'submit',
    wrapperClass: 'grid-cols-1',
  };
}

export function createFormStore(initialState: VbenFormProps = {}) {
  return createStore({
    ...getDefaultState(),
    ...initialState,
  });
}
