# Nano Stores Router

<img align="right" width="95" height="148" title="Logux logotype"
     src="https://logux.io/branding/logotype.svg">

A tiny URL router for [Nano Stores](https://github.com/nanostores/nanostores)
state manager.

* **Small.** 660 bytes (minified and gzipped).
  Zero dependencies. It uses [Size Limit] to control size.
* It has good **TypeScript** support.

Since Nano Stores promote moving logic to store, the router is a store,
not a component in UI framework like React.

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

```ts
// components/layout.tsx
import { useStore } from 'nanostores/react'

import { router } from '../stores/router'

export const Layout = () => {
  const page = useStore(router)
  if (page.route === 'home') {
    return <HomePage />
  } else if (page.route === 'category') {
    return <CategoryPage categoryId={page.params.categoryId} />
  } else if (page.route === 'post') {
    return <PostPage
      categoryId={page.params.categoryId}
      postId={page.params.postId}
    />
  } else {
    return <NotFoundPage />
  }
}
```

<a href="https://evilmartians.com/?utm_source=logux-client">
  <img src="https://evilmartians.com/badges/sponsored-by-evil-martians.svg"
       alt="Sponsored by Evil Martians" width="236" height="54">
</a>

[Size Limit]: https://github.com/ai/size-limit


## Install

```sh
npm install nanostores @nanostores/router
```


## Usage

You can use `getPagePath()` to avoid hard coding URL to a template. It is better
to use the router as a single place of truth.

```tsx
import { getPagePath } from '@nanostores/router'

…
  <a href={getPagePath(router, 'post', { categoryId: 'guides', id: '10' })}>
```

If you need to change URL programmatically you can use `openPage`
or `replacePage`:

```ts
import { openPage, replacePage } from '@nanostores/router'

function requireLogin () {
  openPage(router, 'login')
}

function onLoginSuccess() {
  // Replace login route, so we don’t face it on back navigation
  replacePage(router, 'home')
}
```
