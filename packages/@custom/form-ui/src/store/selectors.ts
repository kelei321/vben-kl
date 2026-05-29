import type { VbenFormProps } from '../core/types';

export const selectSchema = (state: VbenFormProps) => state.schema ?? [];
export const selectCollapsed = (state: VbenFormProps) => !!state.collapsed;
export const selectLoading = (state: VbenFormProps) => !!(state as any).loading;
