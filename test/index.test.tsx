import { renderHook, act } from '@testing-library/react-hooks';
import { wait, assertLoadingStats } from './util';
import { createResourceHook } from '../src';

const EMPTY_ERROR_MSG = 'The input text is empty';

const echo = async (input: string) => {
  await wait(20);
  if (input === '') throw new Error(EMPTY_ERROR_MSG);
  return input;
};

const useSimpleEcho = createResourceHook(echo);

test('Basic load and reload', async () => {
  const { result, waitForNextUpdate } = renderHook(() => useSimpleEcho(['1']));

  (() => {
    assertLoadingStats(result.current);
    const [, { reload, abort }] = result.current;
    expect(reload).toBeInstanceOf(Function);
    expect(abort).toBeInstanceOf(Function);
  })();

  await waitForNextUpdate();

  (() => {
    const [value, { loading, error }] = result.current;
    expect(value).toBe('1');
    expect(loading).toBe(false);
    expect(error).toBe(undefined);
  })();

  act(result.current[1].reload);

  assertLoadingStats(result.current);

  await waitForNextUpdate();

  (() => {
    const [value, { loading, error }] = result.current;
    expect(value).toBe('1');
    expect(loading).toBe(false);
    expect(error).toBe(undefined);
  })();
});

test('Error', async () => {
  const { result, waitForNextUpdate } = renderHook(() => useSimpleEcho(['']));

  assertLoadingStats(result.current);

  await waitForNextUpdate();

  (() => {
    const [value, { loading, error }] = result.current;
    expect(value).toBe(undefined);
    expect(loading).toBe(false);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(EMPTY_ERROR_MSG);
  })();
});

const useEcho = (input: string) =>
  useSimpleEcho([input], {
    deps: [input],
  });

test('Deps', async () => {
  const { result, waitForNextUpdate, rerender } = renderHook(
    (input: string) => useEcho(input),
    {
      initialProps: '1',
    }
  );

  await waitForNextUpdate();
  rerender('2');

  assertLoadingStats(result.current);

  await waitForNextUpdate();

  (() => {
    const [value, { loading, error }] = result.current;
    expect(value).toBe('2');
    expect(loading).toBe(false);
    expect(error).toBe(undefined);
  })();
});

test('Conditional', async () => {
  const { result, waitForNextUpdate, rerender } = renderHook(
    (condition: boolean) => useSimpleEcho(['1'], { condition }),
    {
      initialProps: false,
    }
  );

  (() => {
    const [value, { loading, error }] = result.current;
    expect(value).toBe(undefined);
    expect(loading).toBe(false);
    expect(error).toBe(undefined);
  })();

  rerender(true);

  assertLoadingStats(result.current);

  await waitForNextUpdate();

  (() => {
    const [value, { loading, error }] = result.current;
    expect(value).toBe('1');
    expect(loading).toBe(false);
    expect(error).toBe(undefined);
  })();
});
