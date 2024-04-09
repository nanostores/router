import { JSDOM } from 'jsdom'
import { cleanStores } from 'nanostores'
import { deepStrictEqual, equal, throws } from 'node:assert'
import { afterEach, test } from 'node:test'

import {
  createRouter,
  getPagePath,
  openPage,
  redirectPage,
  type Router
} from '../index.js'

let dom = new JSDOM('<body></body>', { url: 'http://localhost/' })

// @ts-ignore
global.window = dom.window
global.document = dom.window.document
global.location = dom.window.location
global.history = dom.window.history
global.PopStateEvent = dom.window.PopStateEvent
global.MouseEvent = dom.window.MouseEvent
global.HashChangeEvent = dom.window.HashChangeEvent

function listen(aRouter: Router<any> = router): (string | undefined)[] {
  let events: (string | undefined)[] = []
  aRouter.listen(page => {
    events.push(page?.path)
  })
  return events
}

function changePath(path: string): void {
  location.hash = ''
  window.history.pushState(null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function createTag(
  parent: HTMLElement,
  tag: string,
  attrs: { [name: string]: string } = {}
): HTMLElement {
  let el = document.createElement(tag)
  for (let name in attrs) {
    el.setAttribute(name, attrs[name])
  }
  parent.appendChild(el)
  return el
}

let router = createRouter({
  draft: [/\/posts\/(draft|new)\/(\d+)/, (type, id) => ({ id, type })],
  home: '/',
  optional: '/profile/:id?/:tab?',
  post: '/posts/:categoryId/:id',
  posts: '/posts/',
  secret: '/[secret]/:id'
})

let otherRouter: Router<any> | undefined

test.before(() => {
  document.documentElement.addEventListener('click', e => {
    let link = (e.target as HTMLElement).closest('a')
    if (link) {
      e.preventDefault()
    }
  })
})

afterEach(() => {
  cleanStores(router, otherRouter)
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild)
  }
})

test('parses current location', () => {
  changePath('/posts/guides/10')
  deepStrictEqual(router.get(), {
    params: {
      categoryId: 'guides',
      id: '10'
    },
    path: '/posts/guides/10',
    route: 'post',
    search: {}
  })
})

test('ignores last slash', () => {
  changePath('/posts/guides/10/')
  deepStrictEqual(router.get(), {
    params: {
      categoryId: 'guides',
      id: '10'
    },
    path: '/posts/guides/10',
    route: 'post',
    search: {}
  })
})

test('processes 404', () => {
  changePath('/posts/guides')
  deepStrictEqual(router.get(), undefined)
})

test('escapes RegExp symbols in routes', () => {
  changePath('/[secret]/9')
  deepStrictEqual(router.get(), {
    params: {
      id: '9'
    },
    path: '/[secret]/9',
    route: 'secret',
    search: {}
  })
})

test('converts URL-encoded symbols', () => {
  changePath('/posts/a%23b/10')
  deepStrictEqual(router.get(), {
    params: {
      categoryId: 'a#b',
      id: '10'
    },
    path: '/posts/a%23b/10',
    route: 'post',
    search: {}
  })
})

test('ignores hash and search', () => {
  changePath('/posts/?id=1#top')
  deepStrictEqual(router.get(), {
    params: {},
    path: '/posts',
    route: 'posts',
    search: { id: '1' }
  })
})

test('ignores case', () => {
  changePath('/POSTS')
  deepStrictEqual(router.get(), {
    params: {},
    path: '/POSTS',
    route: 'posts',
    search: {}
  })
})

test('parameters can be optional', () => {
  changePath('/profile/')
  deepStrictEqual(router.get(), {
    params: {
      id: '',
      tab: ''
    },
    path: '/profile',
    route: 'optional',
    search: {}
  })

  changePath('/profile/10/')
  deepStrictEqual(router.get(), {
    params: {
      id: '10',
      tab: ''
    },
    path: '/profile/10',
    route: 'optional',
    search: {}
  })

  changePath('/profile/10/contacts')
  deepStrictEqual(router.get(), {
    params: {
      id: '10',
      tab: 'contacts'
    },
    path: '/profile/10/contacts',
    route: 'optional',
    search: {}
  })

  changePath('/profile//')
  deepStrictEqual(router.get(), undefined)

  changePath('/profile///')
  deepStrictEqual(router.get(), undefined)

  changePath('/profile-missed-route')
  deepStrictEqual(router.get(), undefined)

  changePath('/profile/10/contacts/20')
  deepStrictEqual(router.get(), undefined)
})

test('detects URL changes', () => {
  changePath('/posts/guides/10/')
  let events = listen()

  changePath('/')
  deepStrictEqual(router.get(), {
    params: {},
    path: '/',
    route: 'home',
    search: {}
  })
  deepStrictEqual(events, ['/'])
})

test('unbinds events', () => {
  changePath('/posts/guides/10/')
  let events = listen()

  cleanStores(router)
  changePath('/')
  deepStrictEqual(events, [])
})

test('ignores the same URL in popstate', () => {
  changePath('/posts/guides/10/')
  let events = listen()

  changePath('/posts/guides/10/')
  deepStrictEqual(events, [])
})

test('detects clicks', () => {
  changePath('/')
  let events = listen()

  createTag(document.body, 'a', { href: '/posts?a=1' }).click()
  deepStrictEqual(router.get(), {
    params: {},
    path: '/posts',
    route: 'posts',
    search: { a: '1' }
  })
  deepStrictEqual(events, ['/posts'])
})

test('disables clicks detects on request', () => {
  otherRouter = createRouter(
    {
      home: '/',
      posts: '/posts/'
    },
    {
      links: false
    }
  )
  changePath('/')
  let events = listen(otherRouter)

  createTag(document.body, 'a', { href: '/posts' }).click()
  deepStrictEqual(router.get(), {
    params: {},
    path: '/',
    route: 'home',
    search: {}
  })
  deepStrictEqual(events, [])
})

test('accepts click on tag inside link', () => {
  changePath('/')
  listen()

  let link = createTag(document.body, 'a', { href: '/posts' })
  createTag(link, 'span').click()
  equal(router.get()?.path, '/posts')
})

test('ignore non-link clicks', () => {
  changePath('/')
  listen()

  createTag(document.body, 'span', { href: '/posts' }).click()
  equal(router.get()?.path, '/')
})

test('ignores links with target self', () => {
  changePath('/')
  listen()

  let link = createTag(document.body, 'a', { href: '/posts', target: '_self' })
  let span = createTag(link, 'span')
  span.click()

  equal(router.get()?.path, '/')
})

test('ignores new-tab links', () => {
  changePath('/')
  listen()

  let link = createTag(document.body, 'a', { href: '/posts', target: '_blank' })
  link.click()

  equal(router.get()?.path, '/')
})

test('ignores external links', () => {
  changePath('/')
  let events = listen()

  let link = createTag(document.body, 'a', { href: 'http://lacalhast/posts' })
  link.click()

  equal(router.get()?.path, '/')
  deepStrictEqual(events, [])
})

test('ignores the same URL in link', () => {
  changePath('/posts')
  let events = listen()

  let link = createTag(document.body, 'a', { href: '/posts' })
  link.click()

  deepStrictEqual(events, [])
})

test('respects target self', () => {
  changePath('/')
  listen()

  let link = createTag(document.body, 'a', { href: '/posts', target: '_self' })
  link.click()

  equal(router.get()?.path, '/')
})

test('respects external rel', () => {
  changePath('/')
  listen()

  let link = createTag(document.body, 'a', {
    href: '/posts',
    rel: 'external'
  })
  link.click()

  equal(router.get()?.path, '/')
})

test('respects download attribute', () => {
  changePath('/')
  listen()

  let link = createTag(document.body, 'a', {
    download: 'a.txt',
    href: '/posts'
  })
  link.click()

  equal(router.get()?.path, '/')
})

test('supports disabling click', () => {
  changePath('/')
  listen()

  let link = createTag(document.body, 'a', { href: '/posts' })
  link.addEventListener('click', e => {
    e.preventDefault()
  })
  link.click()

  equal(router.get()?.path, '/')
})

test('opens URLs manually', () => {
  changePath('/posts/guides/10/')
  let events = listen()

  router.open('/posts/?a=1')
  equal(location.href, 'http://localhost/posts/?a=1')
  deepStrictEqual(router.get(), {
    params: {},
    path: '/posts',
    route: 'posts',
    search: { a: '1' }
  })
  deepStrictEqual(events, ['/posts'])
})

test('ignores the same URL in manual URL', () => {
  changePath('/posts/guides/10')
  let events = listen()

  router.open('/posts/guides/10')
  deepStrictEqual(events, [])
})

test('allows RegExp routes', () => {
  changePath('/posts/draft/10/')
  deepStrictEqual(router.get(), {
    params: { id: '10', type: 'draft' },
    path: '/posts/draft/10',
    route: 'draft',
    search: {}
  })
})

test('generates URLs', () => {
  equal(getPagePath(router, 'home'), '/')
  equal(getPagePath(router, 'home', {}), '/')
  equal(getPagePath(router, { route: 'home' }), '/')
  equal(getPagePath(router, 'posts'), '/posts')
  equal(getPagePath(router, 'posts', {}, { a: '1' }), '/posts?a=1')
  equal(getPagePath(router, 'posts', {}, {}), '/posts')
  equal(
    getPagePath(router, 'post', { categoryId: 'guides', id: '1' }),
    '/posts/guides/1'
  )
  equal(
    getPagePath(router, 'post', { categoryId: 'guides', id: 1 }),
    '/posts/guides/1'
  )
  equal(
    getPagePath(
      router,
      'post',
      { categoryId: 'guides', id: 1 },
      { a: 1, b: 2 }
    ),
    '/posts/guides/1?a=1&b=2'
  )
  equal(
    getPagePath(router, 'post', { categoryId: 'a#b', id: '1' }),
    '/posts/a%23b/1'
  )
  equal(getPagePath(router, 'optional', { id: '10', tab: '' }), '/profile/10')
  equal(
    getPagePath(router, 'optional', { id: '10', tab: 'a#b' }),
    '/profile/10/a%23b'
  )
  equal(getPagePath(router, 'optional'), '/profile')

  equal(getPagePath(router, { params: {}, route: 'posts' }), '/posts')
  equal(
    getPagePath(router, { params: {}, route: 'posts' }, { a: 1 }),
    '/posts?a=1'
  )
  equal(
    getPagePath(router, {
      params: { categoryId: 'guides', id: '1' },
      route: 'post'
    }),
    '/posts/guides/1'
  )
  equal(
    getPagePath(router, {
      params: { categoryId: 'guides', id: 1 },
      route: 'post'
    }),
    '/posts/guides/1'
  )
})

test('opens URLs manually by route name, pushing new stare', () => {
  let start = history.length
  changePath('/')
  listen()
  openPage(router, 'post', { categoryId: 'guides', id: '10' })
  equal(history.length - start, 3)

  equal(location.href, 'http://localhost/posts/guides/10')
  deepStrictEqual(router.get(), {
    params: {
      categoryId: 'guides',
      id: '10'
    },
    path: '/posts/guides/10',
    route: 'post',
    search: {}
  })

  openPage(router, 'post', { categoryId: 'guides', id: 11 })
  equal(location.href, 'http://localhost/posts/guides/11')
  deepStrictEqual(router.get(), {
    params: {
      categoryId: 'guides',
      id: '11'
    },
    path: '/posts/guides/11',
    route: 'post',
    search: {}
  })

  openPage(router, {
    params: { categoryId: 'guides', id: '12' },
    route: 'post'
  })
  equal(location.href, 'http://localhost/posts/guides/12')

  openPage(
    router,
    {
      params: { categoryId: 'guides', id: '12' },
      route: 'post'
    },
    { sort: 'name' }
  )
  equal(location.href, 'http://localhost/posts/guides/12?sort=name')
})

test('opens URLs manually by route name, replacing state', () => {
  let start = history.length
  changePath('/')
  listen()

  redirectPage(router, 'post', { categoryId: 'guides', id: '10' })
  equal(history.length - start, 2)
  equal(location.href, 'http://localhost/posts/guides/10')
  deepStrictEqual(router.get(), {
    params: {
      categoryId: 'guides',
      id: '10'
    },
    path: '/posts/guides/10',
    route: 'post',
    search: {}
  })

  redirectPage(router, 'post', { categoryId: 'guides', id: 11 })
  equal(location.href, 'http://localhost/posts/guides/11')
  deepStrictEqual(router.get(), {
    params: {
      categoryId: 'guides',
      id: '11'
    },
    path: '/posts/guides/11',
    route: 'post',
    search: {}
  })

  redirectPage(router, {
    params: { categoryId: 'guides', id: '12' },
    route: 'post'
  })
  equal(location.href, 'http://localhost/posts/guides/12')

  redirectPage(
    router,
    {
      params: { categoryId: 'guides', id: '12' },
      route: 'post'
    },
    {
      sort: 'name'
    }
  )
  equal(location.href, 'http://localhost/posts/guides/12?sort=name')
})

test('throws on opening RegExp router', () => {
  throws(() => {
    getPagePath(router, 'draft', { id: '1', type: 'new' })
  }, /RegExp routes are not supported/)
})

test('supports link with hash in URL with same path', () => {
  changePath('/posts')
  let events = listen()

  let link = createTag(document.body, 'a', { href: '/posts#hash' })
  link.click()

  equal(location.hash, '#hash')
  deepStrictEqual(events, [])
})

test('supports link with hash in URL and different path', () => {
  changePath('/')
  let events = listen()

  let link = createTag(document.body, 'a', { href: '/posts?q=1#hash' })
  link.click()

  equal(location.hash, '#hash')
  deepStrictEqual(events, ['/posts'])
})

test('supports link with search in URL and different path', () => {
  changePath('/')
  let events = listen()

  let link = createTag(document.body, 'a', { href: '/posts?q=1#hash' })
  link.click()

  equal(location.search, '?q=1')
  deepStrictEqual(events, ['/posts'])
})

test('generates artificial hashchange event for empty hash', () => {
  changePath('/#hash')
  let events = listen()

  let hashChangeCalled = 0
  let onHashChange = (): void => {
    hashChangeCalled += 1
  }
  window.addEventListener('hashchange', onHashChange)
  let link = createTag(document.body, 'a', { href: '/' })
  link.click()

  window.removeEventListener('hashchange', onHashChange)
  equal(location.hash, '')
  deepStrictEqual(events, [])
  equal(hashChangeCalled, 1)
})

test('uses search query on request', () => {
  otherRouter = createRouter(
    {
      a: '/p?page=a',
      b: '/p?page=b'
    },
    {
      search: true
    }
  )

  changePath('/p?page=a')
  listen(otherRouter)

  deepStrictEqual(otherRouter.get(), {
    params: {},
    path: '/p?page=a',
    route: 'a',
    search: { page: 'a' }
  })

  let link = createTag(document.body, 'a', { href: '/p?page=b' })
  link.click()
  deepStrictEqual(otherRouter.get(), {
    params: {},
    path: '/p?page=b',
    route: 'b',
    search: { page: 'b' }
  })

  changePath('/p?page=a')
  deepStrictEqual(otherRouter.get(), {
    params: {},
    path: '/p?page=a',
    route: 'a',
    search: { page: 'a' }
  })

  changePath('/p/?page=b')
  deepStrictEqual(otherRouter.get(), {
    params: {},
    path: '/p?page=b',
    route: 'b',
    search: {
      page: 'b'
    }
  })
})

test('supports dot in URL', () => {
  otherRouter = createRouter({
    text: '/page.txt'
  })

  changePath('/page.txt')
  listen(otherRouter)

  deepStrictEqual(otherRouter.get(), {
    params: {},
    path: '/page.txt',
    route: 'text',
    search: {}
  })

  changePath('/page.html')
  deepStrictEqual(otherRouter.get(), undefined)
})
