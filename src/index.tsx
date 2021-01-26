import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  DependencyList,
  useCallback,
  useMemo,
  useRef,
} from 'react';

type Noop = (...args: any[]) => void;
const noop: Noop = () => undefined;
type Abort = Noop;
export type Reload = Noop;
type RequestState<T> = readonly [T, any, boolean];
export type ResourceExtra = {
  error: any;
  loading: boolean;
  reload: Reload;
  abort: Abort;
};
export type Resource<T, E extends ResourceExtra = ResourceExtra> = readonly [
  T,
  E
];
export const initialResource: Resource<undefined> = [
  undefined,
  {
    error: undefined,
    loading: true,
    reload: noop,
    abort: noop,
  },
];

function transformData<T, R, E extends ResourceExtra>(
  resource: Resource<T, E>,
  transform: (data: T) => R
) {
  const [data, extra] = resource;
  return [transform(data), extra] as const;
}
export function useTransform<T, R, E extends ResourceExtra>(
  resource: Resource<T, E>,
  transform: (data: T) => R
) {
  const [data, extra] = resource;
  const newData = useMemo(() => transform(data), [data, transform]);
  return [newData, extra] as const;
}

export function useLocalState<T, E extends ResourceExtra>(
  resource: Resource<T, E>
) {
  const [value, setValue] = useState<T>(resource[0]);
  const dataRef = useRef<T>();
  const [data, extra] = resource;
  if (dataRef.current !== data) {
    dataRef.current = data;
    setValue(data);
  }
  return [value, { ...extra, setData: setValue }] as const;
}

export function useDefault<T, E extends ResourceExtra>(
  resource: Resource<T | undefined, E>,
  defaultData: T
) {
  const ref = useRef(defaultData);
  return transformData(resource, (data: T | undefined) => data ?? ref.current);
}

export function useSmoothReload<T, E extends ResourceExtra>(
  resource: Resource<T | undefined, E>
) {
  const [data, extra] = resource;
  const dataRef = useRef(data);
  useEffect(() => {
    if (data !== undefined) {
      dataRef.current = data;
    }
  }, [data]);
  return extra.loading ? ([dataRef.current, extra] as const) : resource;
}

export interface ResourceHookOptions {
  deps?: DependencyList;
  condition?: boolean;
}
export type ResourceHook<Args, T, E extends ResourceExtra = ResourceExtra> = (
  requestArgs: Args,
  options?: ResourceHookOptions
) => Resource<T | undefined, E>;

export function createResourceHook<Args extends unknown[], T>(
  request: (...args: Args) => { promise: Promise<T>; abort: Abort }
): ResourceHook<Args, T>;
export function createResourceHook<Args extends unknown[], T>(
  request: (...args: Args) => Promise<T>
): ResourceHook<Args, T>;
export function createResourceHook<Args extends unknown[], T>(
  request: (...args: Args) => { promise: Promise<T>; abort: Abort } | Promise<T>
): ResourceHook<Args, T> {
  return (
    requestArgs: Args,
    { deps = [], condition = true }: ResourceHookOptions = {}
  ): Resource<T | undefined> => {
    const [reloadFlag, setReloadFlag] = useState(true);
    const reload = useCallback(() => setReloadFlag(preFlag => !preFlag), []);
    const [{ promise, abort = noop }, setRequestResult] = useState<{
      promise?: Promise<T>;
      abort?: Noop;
    }>({});
    const [[data, error, loading], setRequestState] = useState<
      RequestState<T | undefined>
    >([undefined, undefined, condition]);

    useEffect(() => {
      if (!condition) {
        return setRequestResult({});
      }
      const result = request(...requestArgs);
      const requestResult =
        'abort' in result
          ? result
          : {
              promise: result,
              abort: noop,
            };
      // The rejected promise will always be handled later (in the next useEffect)
      // handle it immediately to prevent unhandled Promise rejection warning
      requestResult.promise.catch(() => {});
      setRequestResult(requestResult);
      return requestResult.abort;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, condition, reloadFlag]);

    useEffect(() => {
      if (!promise) setRequestState([undefined, undefined, condition]);
    }, [condition, promise]);
    useEffect(() => {
      if (!promise) return;
      let isCurrent = true;
      setRequestState([undefined, undefined, true]);
      promise
        .then(d => isCurrent && setRequestState([d, undefined, false]))
        .catch(e => isCurrent && setRequestState([undefined, e, false]));
      return () => {
        isCurrent = false;
      };
    }, [promise]);

    return [data, { error, loading, reload, abort }];
  };
}

export type ReourceDescriptor<T, Props> = (providerProps: Props) => T;
export function createResourceStore<T, Props, Args extends unknown[]>(
  resourceDescriptor: ReourceDescriptor<T, Props>,
  initialValue: T,
  useTriggerEffect?: (...args: Args) => unknown
) {
  const Context = createContext<T>(initialValue);
  const useResource = (...args: Args) => {
    useTriggerEffect?.(...args);
    return useContext(Context);
  };
  const Provider: React.FunctionComponent<Props> = ({
    children,
    ...restProps
  }) => {
    const providerProps = restProps as Props;
    const value = resourceDescriptor(providerProps);
    return <Context.Provider value={value}>{children}</Context.Provider>;
  };
  return {
    useResource,
    Provider,
  };
}

export const createLazyResourceHelper = () => {
  let requested = false;
  let setRequested: React.Dispatch<React.SetStateAction<boolean>> = () => {};

  const reset = () => {
    requested = false;
    setRequested(false);
  };

  const useTriggerEffect = (triggered = true) =>
    useEffect(() => {
      if (triggered) {
        requested = true;
        setRequested(true);
      }
    }, [triggered]);

  const useTriggered = () => {
    const [triggered, setTriggered] = useState(requested);
    setRequested = setTriggered;
    return triggered;
  };

  return {
    useTriggerEffect,
    reset,
    useTriggered,
  };
};

export type LazyReourceDescriptor<T, Props> = (ctx: {
  useTriggered: () => boolean;
}) => ReourceDescriptor<T, Props>;
export function createLazyResourceStore<T, Props>(
  lazyResourceDescriptor: LazyReourceDescriptor<T, Props>,
  initialValue: T
) {
  const { useTriggerEffect, reset, useTriggered } = createLazyResourceHelper();
  return {
    ...createResourceStore(
      lazyResourceDescriptor({ useTriggered }),
      initialValue,
      useTriggerEffect
    ),
    reset,
  };
}
