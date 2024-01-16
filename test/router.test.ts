import { JSDOM } from 'jsdom'
import { cleanStores } from 'nanostores'
import { test } from 'uvu'
import { equal, is, throws } from 'uvu/assert'

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

test.after.each(() => {
  cleanStores(router, otherRouter)
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild)
  }
})

test('parses current location', () => {
  changePath('/posts/guides/10')
  equal(router.get(), {
    params: {
      categoryId: 'guides',
      id: '10'
    },
    path: '/posts/guides/10',
    route: 'post'
  })
})

test('ignores last slash', () => {
  changePath('/posts/guides/10/')
  equal(router.get(), {
    params: {
      categoryId: 'guides',
      id: '10'
    },
    path: '/posts/guides/10',
    route: 'post'
  })
})

test('processes 404', () => {
  changePath('/posts/guides')
  is(router.get(), undefined)
})

test('escapes RegExp symbols in routes', () => {
  changePath('/[secret]/9')
  equal(router.get(), {
    params: {
      id: '9'
    },
    path: '/[secret]/9',
    route: 'secret'
  })
})

test('converts URL-encoded symbols', () => {
  changePath('/posts/a%23b/10')
  equal(router.get(), {
    params: {
      categoryId: 'a#b',
      id: '10'
    },
    path: '/posts/a%23b/10',
    route: 'post'
  })
})

test('ignores hash and search', () => {
  changePath('/posts/?id=1#top')
  equal(router.get(), {
    params: {},
    path: '/posts',
    route: 'posts'
  })
})

test('ignores case', () => {
  changePath('/POSTS')
  equal(router.get(), {
    params: {},
    path: '/POSTS',
    route: 'posts'
  })
})

test('parameters can be optional', () => {
  changePath('/profile/')
  equal(router.get(), {
    params: {
      id: '',
      tab: ''
    },
    path: '/profile',
    route: 'optional'
  })

  changePath('/profile/10/')
  equal(router.get(), {
    params: {
      id: '10',
      tab: ''
    },
    path: '/profile/10',
    route: 'optional'
  })

  changePath('/profile/10/contacts')
  equal(router.get(), {
    params: {
      id: '10',
      tab: 'contacts'
    },
    path: '/profile/10/contacts',
    route: 'optional'
  })
})

test('detects URL changes', () => {
  changePath('/posts/guides/10/')
  let events = listen()

  changePath('/')
  equal(router.get(), { params: {}, path: '/', route: 'home' })
  equal(events, ['/'])
})

test('unbinds events', () => {
  changePath('/posts/guides/10/')
  let events = listen()

  cleanStores(router)
  changePath('/')
  equal(events, [])
})

test('ignores the same URL in popstate', () => {
  changePath('/posts/guides/10/')
  let events = listen()

  changePath('/posts/guides/10/')
  equal(events, [])
})

test('detects clicks', () => {
  changePath('/')
  let events = listen()

  createTag(document.body, 'a', { href: '/posts' }).click()
  equal(router.get(), {
    params: {},
    path: '/posts',
    route: 'posts'
  })
  equal(events, ['/posts'])
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
  equal(router.get(), {
    params: {},
    path: '/',
    route: 'home'
  })
  equal(events, [])
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
  equal(events, [])
})

test('ignores the same URL in link', () => {
  changePath('/posts')
  let events = listen()

  let link = createTag(document.body, 'a', { href: '/posts' })
  link.click()

  equal(events, [])
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

  router.open('/posts/')
  equal(location.href, 'http://localhost/posts/')
  equal(router.get(), {
    params: {},
    path: '/posts',
    route: 'posts'
  })
  equal(events, ['/posts'])
})

test('ignores the same URL in manual URL', () => {
  changePath('/posts/guides/10')
  let events = listen()

  router.open('/posts/guides/10')
  equal(events, [])
})

test('allows RegExp routes', () => {
  changePath('/posts/draft/10/')
  equal(router.get(), {
    params: { id: '10', type: 'draft' },
    path: '/posts/draft/10',
    route: 'draft'
  })
})

test('generates URLs', () => {
  equal(getPagePath(router, 'home'), '/')
  equal(getPagePath(router, 'posts'), '/posts')
  equal(
    getPagePath(router, 'post', { categoryId: 'guides', id: '1' }),
    '/posts/guides/1'
  )
  equal(
    getPagePath(router, 'post', { categoryId: 'guides', id: 1 }),
    '/posts/guides/1'
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
})

test('opens URLs manually by route name, pushing new stare', () => {
  let start = history.length
  changePath('/')
  listen()
  openPage(router, 'post', { categoryId: 'guides', id: '10' })
  equal(history.length - start, 3)

  equal(location.href, 'http://localhost/posts/guides/10')
  equal(router.get(), {
    params: {
      categoryId: 'guides',
      id: '10'
    },
    path: '/posts/guides/10',
    route: 'post'
  })

  openPage(router, 'post', { categoryId: 'guides', id: 11 })
  equal(history.length - start, 4)
  equal(location.href, 'http://localhost/posts/guides/11')
  equal(router.get(), {
    params: {
      categoryId: 'guides',
      id: '11'
    },
    path: '/posts/guides/11',
    route: 'post'
  })
})

test('opens URLs manually by route name, replacing state', () => {
  let start = history.length
  changePath('/')
  listen()
  redirectPage(router, 'post', { categoryId: 'guides', id: '10' })
  equal(history.length - start, 2)

  equal(location.href, 'http://localhost/posts/guides/10')
  equal(router.get(), {
    params: {
      categoryId: 'guides',
      id: '10'
    },
    path: '/posts/guides/10',
    route: 'post'
  })
})

test('throws on opening RegExp router', () => {
  throws(() => {
    getPagePath(router, 'draft', { id: '1', type: 'new' })
  }, 'RegExp routes are not supported')
})

test('supports link with hash in URL with same path', () => {
  changePath('/posts')
  let events = listen()

  let link = createTag(document.body, 'a', { href: '/posts#hash' })
  link.click()

  equal(location.hash, '#hash')
  equal(events, [])
})

test('supports link with hash in URL and different path', () => {
  changePath('/')
  let events = listen()

  let link = createTag(document.body, 'a', { href: '/posts?q=1#hash' })
  link.click()

  equal(location.hash, '#hash')
  equal(events, ['/posts'])
})

test('supports link with search in URL and different path', () => {
  changePath('/')
  let events = listen()

  let link = createTag(document.body, 'a', { href: '/posts?q=1#hash' })
  link.click()

  equal(location.search, '?q=1')
  equal(events, ['/posts'])
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
  equal(events, [])
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

  equal(otherRouter.get(), {
    params: {},
    path: '/p?page=a',
    route: 'a'
  })

  let link = createTag(document.body, 'a', { href: '/p?page=b' })
  link.click()
  equal(otherRouter.get(), {
    params: {},
    path: '/p?page=b',
    route: 'b'
  })

  changePath('/p?page=a')
  equal(otherRouter.get(), {
    params: {},
    path: '/p?page=a',
    route: 'a'
  })

  changePath('/p/?page=b')
  equal(otherRouter.get(), {
    params: {},
    path: '/p?page=b',
    route: 'b'
  })
})

test('supports dot in URL', () => {
  otherRouter = createRouter({
    text: '/page.txt'
  })

  changePath('/page.txt')
  listen(otherRouter)

  equal(otherRouter.get(), {
    params: {},
    path: '/page.txt',
    route: 'text'
  })

  changePath('/page.html')
  equal(otherRouter.get(), undefined)
})

test.run()
