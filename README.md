# useResource 


A set of simple utilities for declarative async resource fetching.

![npm](https://flat.badgen.net/npm/v/@leancloud/use-resource)
![bundle size](https://flat.badgen.net/bundlephobia/minzip/@leancloud/use-resource)
![ci status](https://img.shields.io/github/workflow/status/leancloud/use-resource/CI?style=flat-square)
![code cov](https://flat.badgen.net/codecov/c/github/leancloud/use-resource)

## Features

- 🧾 Declarative, intuitive and minimal core API
- ⚛ Atomic, composable enhancement hooks
- 🔌 Protocol agnostic
- 💪 Written in TypeScript
- 🌲 Small size (~1KB gzipped) and tree-shaking ready

## Install

```bash
npm install @leancloud/use-resource
```

## Example

First, create a hook for `fetch`:
```tsx
import { createResourceHook } from '@leancloud/use-resource';

async function fetchJSON<T>(...args: Parameters<typeof fetch>) {
  return (await (await fetch(...args)).json()) as T;
}

const useFetch = createResourceHook(fetchJSON);
```

use `useFetch` in the `Clock` component:

```tsx
const Clock = () => {
  const [data, { error, loading, reload }] = useFetch<{ datetime: string }>([
    "https://worldtimeapi.org/api/timezone/etc/utc"
  ]);
  return (
    <div>
      <p>Current Time:</p>
      <p>
        {loading && "Loading..."}
        {error && error.message}
        {data && data.datetime}
      </p>
      <button onClick={reload}>Reload</button>
    </div>
  );
};
```
[![Edit use-resource-prototype](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/use-resource-prototype-i5wys?fontsize=14&hidenavigation=1&theme=dark&view=preview)

## Advanced usage

Currently there is an introduction available in Chinese:

[《用 React Hook 的风格加载数据》](https://www.notion.so/React-Hook-076214bf3d0d48b59220e9f702d9b879)

🚧 We are working on the translation.
