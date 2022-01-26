# Nano Stores Router

<img align="right" width="92" height="92" title="Nano Stores logo"
     src="https://nanostores.github.io/nanostores/logo.svg">

A tiny URL router for [Nano Stores](https://github.com/nanostores/nanostores)
state manager.

* **Small.** 792 bytes (minified and gzipped).
  Zero dependencies. It uses [Size Limit] to control size.
* It has good **TypeScript** support.
* Framework agnostic. Can be used for **React**, **Preact**, **Vue**,
  **Svelte**, and vanilla JS.

Since Nano Stores promote moving logic to store, the router is a store,
not a component in UI framework like React.

```ts
// stores/router.ts
import { createRouter } from '@nanostores/router'

// Types for :params in route templates
interface Routes {
  home: void
  category: 'categoryId'
  post: 'categoryId' | 'id'
}

export const router = createRouter<Routes>({
  home: '/',
  category: '/posts/:categoryId',
  post: '/posts/:categoryId/:id'
})
```

Store in active mode listen for `<a>` clicks on `document.body` and Back button
in browser.

```tsx
// components/layout.tsx
import { useStore } from 'nanostores/react'

import { router } from '../stores/router.js'

export const Layout = () => {
  const page = useStore(router)

  if (!page) {
    return <Error404 />
  } else if (page.route === 'home') {
    return <HomePage />
  } else if (page.route === 'category') {
    return <CategoryPage categoryId={page.params.categoryId} />
  } else if (page.route === 'post') {
    return <PostPage postId={page.params.postId} />
  }
}
```

<a href="https://evilmartians.com/?utm_source=nanostores-router">
  <img src="https://evilmartians.com/badges/sponsored-by-evil-martians.svg"
       alt="Sponsored by Evil Martians" width="236" height="54">
</a>

[Size Limit]: https://github.com/ai/size-limit


## Install

```sh
npm install nanostores @nanostores/router
```


## Usage

See [Nano Stores docs](https://github.com/nanostores/nanostores#guide)
about using the store and subscribing to store’s changes in UI frameworks.


### Routes

Routes is an object of route’s name to route pattern:

```ts
createRouter({
  route1: '/',
  route2: '/path/:var1/and/:var2',
  route3: [/\/posts\/(draft|new)\/(\d+)/, (type, id) => ({ type, id })]
})
```

For string patterns you can use `:name` for variable parts. To make the
parameter optional, mark it with the `?` modifier:

```ts
createRouter({
  routeName: '/profile/:id?/:tab?'
})
```

Routes can have RegExp patterns. They should be an array with function,
which convert `()` groups to key-value map.

For TypeScript, you need specify interface with variable names, used in routes.

```ts
interface Routes {
  routeName: 'var1' | 'var2'
}

createRouter<Routes>({
  routeName: '/path/:var1/and/:var2'
})
```


### URL Generation

Using `getPagePath()` avoids hard coding URL in templates. It is better
to use the router as a single place of truth.

```tsx
import { getPagePath } from '@nanostores/router'

…
  <a href={getPagePath(router, 'post', { categoryId: 'guides', id: '10' })}>
```

If you need to change URL programmatically you can use `openPage`
or `redirectPage`:

```ts
import { openPage, redirectPage } from '@nanostores/router'

function requireLogin () {
  openPage(router, 'login')
}

function onLoginSuccess() {
  // Replace login route, so we don’t face it on back navigation
  redirectPage(router, 'home')
}
```


### Server-Side Rendering

Router can be used in Node environment without `window` and `location`.
In this case, it will always return route to `/` path.

You can manually set any other route:

```js
if (isServer) {
  router.open('/posts/demo/1')
}
```
