import { Resource } from '../src';

export const wait = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

export const assertLoadingStats = (resource: Resource<unknown>) => {
  const [value, { loading, error }] = resource;

  expect(value).toBe(undefined);
  expect(loading).toBe(true);
  expect(error).toBe(undefined);
};
