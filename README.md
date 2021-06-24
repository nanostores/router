# Nano Stores Router

<img align="right" width="95" height="148" title="Logux logotype"
     src="https://logux.io/branding/logotype.svg">

*Under construction*

<a href="https://evilmartians.com/?utm_source=logux-client">
  <img src="https://evilmartians.com/badges/sponsored-by-evil-martians.svg"
       alt="Sponsored by Evil Martians" width="236" height="54">
</a>

Since we promote moving logic to store, the router is a good part
of the application to be moved from UI framework like React.

```ts
import { createRouter } from 'nanostores'

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

You can use `getPagePath()` to avoid hard coding URL to a template. It is better
to use the router as a single place of truth.

```tsx
import { getPagePath } from 'nanostores'

…
  <a href={getPagePath(router, 'post', { categoryId: 'guides', id: '10' })}>
```

If you need to change URL programmatically you can use `openPage`
or `replacePage`:

```ts
import { openPage, replacePage } from 'nanostores'

function requireLogin () {
  openPage(router, 'login')
}

function onLoginSuccess() {
  // Replace login route, so we don’t face it on back navigation
  replacePage(router, 'home')
}
```
