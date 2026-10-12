import { captureException } from '@sentry/react-native';
import { MutationObserver } from '@tanstack/react-query';

import { queryClient } from '../queryClient';

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
  queryClient.clear();
});

it('reports failed queries to Sentry with their query key', async () => {
  const error = new Error('fetch failed');
  await expect(
    queryClient.fetchQuery({
      queryKey: ['sharePayload', 'abc'],
      queryFn: () => Promise.reject(error),
    }),
  ).rejects.toBe(error);
  expect(captureException).toHaveBeenCalledWith(error, {
    tags: { area: 'react-query' },
    extra: { queryKey: ['sharePayload', 'abc'] },
  });
});

it('reports failed mutations to Sentry with their mutation key', async () => {
  const error = new Error('save failed');
  const observer = new MutationObserver(queryClient, {
    mutationKey: ['importShare'],
    mutationFn: () => Promise.reject(error),
  });
  await expect(observer.mutate()).rejects.toBe(error);
  expect(captureException).toHaveBeenCalledWith(error, {
    tags: { area: 'react-query-mutation' },
    extra: { mutationKey: ['importShare'] },
  });
});

it('skips failures the query marks as expected', async () => {
  const error = new Error('link expired');
  await expect(
    queryClient.fetchQuery({
      queryKey: ['sharePayload', 'gone'],
      queryFn: () => Promise.reject(error),
      meta: { isExpectedError: (candidate) => candidate === error },
    }),
  ).rejects.toBe(error);
  expect(captureException).not.toHaveBeenCalled();
});
