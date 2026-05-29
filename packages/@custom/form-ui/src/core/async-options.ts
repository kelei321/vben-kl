import type { QueryClient } from '@tanstack/vue-query';

import type { Recordable } from './types';

import { get } from '@vben-core/shared/utils';

import { QueryClient as TanStackQueryClient } from '@tanstack/vue-query';

import { resolveFieldNamePath } from './field-name';

export const DEFAULT_ASYNC_OPTIONS_QUERY_KEY_PREFIX = 'vben-form-options';

let asyncOptionsQueryClient: QueryClient | undefined;
let asyncOptionsQueryKeyPrefix = DEFAULT_ASYNC_OPTIONS_QUERY_KEY_PREFIX;

export interface AsyncOptionsGlobalConfig {
  queryClient?: QueryClient;
  queryKeyPrefix?: string;
}

function getValueByFieldName(values: Recordable, fieldName: string) {
  const { rawKey } = resolveFieldNamePath(fieldName);
  if (rawKey) {
    return values?.[rawKey];
  }
  if (Object.prototype.hasOwnProperty.call(values ?? {}, fieldName)) {
    return values[fieldName];
  }
  return get(values ?? {}, fieldName);
}

export function configureAsyncOptions(config: AsyncOptionsGlobalConfig = {}) {
  if (config.queryClient) {
    asyncOptionsQueryClient = config.queryClient;
  }
  if (config.queryKeyPrefix) {
    asyncOptionsQueryKeyPrefix = config.queryKeyPrefix;
  }
}

export function getAsyncOptionsQueryClient() {
  asyncOptionsQueryClient ??= new TanStackQueryClient();
  return asyncOptionsQueryClient;
}

export function getAsyncOptionsQueryKeyPrefix() {
  return asyncOptionsQueryKeyPrefix;
}

export function normalizeAsyncOptions(
  options: any[] | undefined,
  labelField = 'label',
  valueField = 'value',
) {
  return (options ?? []).map((item) => ({
    ...item,
    label: item?.[labelField] ?? item?.label,
    value: item?.[valueField] ?? item?.value,
  }));
}

export function resolveAsyncOptionsDependsOnValues(
  values: Recordable,
  dependsOn: string[] = [],
) {
  return dependsOn.map((field) => getValueByFieldName(values, field));
}

export function buildAsyncOptionsQueryKey(
  fieldName: string,
  values: Recordable,
  options: {
    dependsOn?: string[];
    queryKey?: ((values: Recordable) => unknown[]) | string | unknown[];
  } = {},
) {
  const prefix = getAsyncOptionsQueryKeyPrefix();
  const { queryKey } = options;

  if (typeof queryKey === 'function') {
    return [prefix, ...queryKey(values)];
  }
  if (Array.isArray(queryKey)) {
    return [prefix, ...queryKey];
  }
  if (queryKey) {
    return [prefix, queryKey];
  }

  return [
    prefix,
    fieldName,
    ...resolveAsyncOptionsDependsOnValues(values, options.dependsOn),
  ];
}
