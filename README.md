# Nano Stores Router

<img align="right" width="92" height="92" title="Nano Stores logo"
     src="https://nanostores.github.io/nanostores/logo.svg">

A tiny URL router for [Nano Stores](https://github.com/nanostores/nanostores)
state manager.

* **Small.** 684 bytes (minified and brotlied). Zero dependencies.
* Good **TypeScript** support.
* Framework agnostic. Can be used with **React**, **Preact**, **Vue**,
  **Svelte**, **Angular**, **Solid.js**, and vanilla JS.

Since Nano Stores promote moving logic to store, the router is a store,
not a component in UI framework like React.

```ts
// stores/router.ts
import { createRouter } from '@nanostores/router'

export const $router = createRouter({
  home: '/',
  list: '/posts/:category',
  post: '/posts/:category/:post'
})
```

Store in active mode listen for `<a>` clicks on `document.body` and Back button
in browser.

```tsx
// components/layout.tsx
import { useStore } from '@nanostores/react'

import { $router } from '../stores/router.js'

export const Layout = () => {
  const page = useStore($router)

  if (!page) {
    return <Error404 />
  } else if (page.route === 'home') {
    return <HomePage />
  } else if (page.route === 'list') {
    return <ListPage category={page.params.category} filters={page.search} />
  } else if (page.route === 'post') {
    return <PostPage post={page.params.post} />
  }
}
```

---

<img src="https://cdn.evilmartians.com/badges/logo-no-label.svg" alt="" width="22" height="16" />  Made in <b><a href="https://evilmartians.com/devtools?utm_source=nanostores-router&utm_campaign=devtools-button&utm_medium=github">Evil Martians</a></b>, product consulting for <b>developer tools</b>.

---


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
  route3: /\/posts\/(?<type>draft|new)\/(?<id>\d+)/
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

For TypeScript, router parameters will be converted to types automatically.
You need to use TypeScript ≥5.x.

```ts
createRouter({
  routeName: '/path/:var1/and/:var2',
  routeName2: [/path2/, () => ({ num: 1, str: '' })]
})

/**
 * Params will be inferred as:
 * {
 *   routeName: { var1: string, var2: string },
 *   routeName2: { num: number, str: string }
 * }
 */
```


### Search Query Routing

Router value contains parsed url search params:

```js
createRouter({ home: '/posts/:category?sort=name' })

location.href = '/posts/general?sort=name'
router.get() //=> {
//                   path: '/posts/general',
//                   route: 'list',
//                   params: { category: 'general' },
//                   search: { sort: 'name' }
//                 }
```

To disable the automatic parsing of search params in routes you need to set `search` option.
Router will now treat search query like `?a=1&b=2` as a string. Parameters order will be critical.

```js
createRouter({ home: '/posts?page=general' }, { search: true })

location.href = '/posts/?page=general'
router.get() //=> {
//                   path: '/posts?page=general',
//                   route: 'list',
//                   params: { },
//                   search: { }
//                 }
```


### Clicks Tracking

By default, router and `?search` params store will add `click` event listener
on `window` to track links clicks.

To disable click tracking for specific link, add `target="_self"` to link tag:

```html
<a href="/posts" target="_self">Posts</a>
```

You can disable this behavior by `links: false` options and create custom
`<Link>` component.

```js
export const $router = createRouter({ … }, { links: false })

function onClick (e) {
  let link = event.target.closest('a')
  if (isPjax(link, e)) {
    $router.open(new Url(link.href).pathname)
  }
}

export const Link = (props) => {
  return <a onClick={onClick} {...props}></a>
}
```


### URL Generation

Using `getPagePath()` avoids hard coding URL in templates. It is better
to use the router as a single place of truth.

```tsx
import { getPagePath } from '@nanostores/router'

…
  <a href={getPagePath($router, 'post', { category: 'guides', post: '10' })}>
```

If you need to change URL programmatically you can use `openPage`
or `redirectPage`:

```ts
import { openPage, redirectPage } from '@nanostores/router'

function requireLogin () {
  openPage($router, 'login')
}

function onLoginSuccess() {
  // Replace login route, so we don’t face it on back navigation
  redirectPage($router, 'home')
}
```

All functions accept search params as last argument:

```tsx
getPagePath($router, 'list', { category: 'guides' }, { sort: 'name' })
//=> '/posts/guides?sort=name'
```


### Server-Side Rendering

Router can be used in Node environment without `window` and `location`.
In this case, it will always return route to `/` path.

You can manually set any other route:

```js
if (isServer) {
  $router.open('/posts/demo/1')
}
```
