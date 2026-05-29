import { QueryClient } from '@tanstack/vue-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildAsyncOptionsQueryKey,
  configureAsyncOptions,
  getAsyncOptionsQueryClient,
  normalizeAsyncOptions,
} from '../src/core/async-options';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe('custom form asyncOptions query helpers', () => {
  beforeEach(() => {
    configureAsyncOptions({
      queryClient: createTestQueryClient(),
      queryKeyPrefix: 'test-form-options',
    });
  });

  it('builds default query keys from field and dependency values', () => {
    expect(
      buildAsyncOptionsQueryKey(
        'profile.city',
        { profile: { region: 'east' } },
        { dependsOn: ['profile.region'] },
      ),
    ).toEqual(['test-form-options', 'profile.city', 'east']);
  });

  it('builds custom string, array and function query keys', () => {
    expect(
      buildAsyncOptionsQueryKey('owner', {}, { queryKey: 'owners' }),
    ).toEqual(['test-form-options', 'owners']);

    expect(
      buildAsyncOptionsQueryKey(
        'owner',
        {},
        { queryKey: ['owners', 'active'] },
      ),
    ).toEqual(['test-form-options', 'owners', 'active']);

    expect(
      buildAsyncOptionsQueryKey(
        'owner',
        { bizLine: 'finance' },
        { queryKey: (values) => ['owners', values.bizLine] },
      ),
    ).toEqual(['test-form-options', 'owners', 'finance']);
  });

  it('normalizes option label and value fields', () => {
    expect(
      normalizeAsyncOptions([{ id: '1', name: 'Admin' }], 'name', 'id'),
    ).toEqual([{ id: '1', label: 'Admin', name: 'Admin', value: '1' }]);
  });

  it('reuses cached results for the same query key while fresh', async () => {
    const queryClient = getAsyncOptionsQueryClient();
    const request = vi.fn(async () => [{ label: 'A', value: 'a' }]);
    const queryKey = buildAsyncOptionsQueryKey(
      'owner',
      {},
      { queryKey: ['owners'] },
    );

    await queryClient.fetchQuery({
      queryFn: request,
      queryKey,
      staleTime: 60_000,
    });
    await queryClient.fetchQuery({
      queryFn: request,
      queryKey,
      staleTime: 60_000,
    });

    expect(request).toHaveBeenCalledTimes(1);
  });

  it('refreshes an invalidated query key', async () => {
    const queryClient = getAsyncOptionsQueryClient();
    const request = vi.fn(async () => [{ label: 'A', value: 'a' }]);
    const queryKey = buildAsyncOptionsQueryKey(
      'owner',
      {},
      { queryKey: ['owners'] },
    );

    await queryClient.fetchQuery({
      queryFn: request,
      queryKey,
      staleTime: 60_000,
    });
    await queryClient.invalidateQueries({ queryKey });
    await queryClient.fetchQuery({
      queryFn: request,
      queryKey,
      staleTime: 60_000,
    });

    expect(request).toHaveBeenCalledTimes(2);
  });

  it('keeps dependency query keys isolated', async () => {
    const queryClient = getAsyncOptionsQueryClient();
    const request = vi.fn(async ({ queryKey }: { queryKey: unknown[] }) => [
      { label: String(queryKey.at(-1)), value: String(queryKey.at(-1)) },
    ]);
    const eastKey = buildAsyncOptionsQueryKey(
      'profile.city',
      { profile: { region: 'east' } },
      { dependsOn: ['profile.region'] },
    );
    const southKey = buildAsyncOptionsQueryKey(
      'profile.city',
      { profile: { region: 'south' } },
      { dependsOn: ['profile.region'] },
    );

    const eastOptions = await queryClient.fetchQuery({
      queryFn: () => request({ queryKey: eastKey }),
      queryKey: eastKey,
      staleTime: 60_000,
    });
    const southOptions = await queryClient.fetchQuery({
      queryFn: () => request({ queryKey: southKey }),
      queryKey: southKey,
      staleTime: 60_000,
    });

    expect(eastOptions).toEqual([{ label: 'east', value: 'east' }]);
    expect(southOptions).toEqual([{ label: 'south', value: 'south' }]);
  });
});
