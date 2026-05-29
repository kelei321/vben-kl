export { setupVbenForm } from './config';

export type {
  BaseFormComponentType,
  ExtendedFormApi,
  FormLayout,
  VbenFormProps,
  FormSchema as VbenFormSchema,
} from './core/types';

export * from './use-vben-form';
export { default as VbenForm } from './vben-form.vue';
export * as z from 'zod';
