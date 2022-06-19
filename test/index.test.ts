import { equal, is, throws } from 'uvu/assert'
import { cleanStores } from 'nanostores'
import { JSDOM } from 'jsdom'
import { test } from 'uvu'

import { createRouter, getPagePath, openPage, redirectPage } from '../index.js'

let dom = new JSDOM('<body></body>', { url: 'http://localhost/' })

// @ts-ignore
global.window = dom.window
global.document = dom.window.document
global.location = dom.window.location
global.history = dom.window.history
global.navigator = dom.window.navigator
global.PopStateEvent = dom.window.PopStateEvent
global.MouseEvent = dom.window.MouseEvent
global.HashChangeEvent = dom.window.HashChangeEvent

function listen(): (string | undefined)[] {
  let events: (string | undefined)[] = []
  router.listen(page => {
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

let router = createRouter<{
  optional: 'id' | 'tab'
  secret: 'id'
  posts: void
  draft: 'type' | 'id'
  post: 'categoryId' | 'id'
  home: void
}>({
  optional: '/profile/:id?/:tab?',
  secret: '/[secret]/:id',
  posts: '/posts/',
  draft: [/\/posts\/(draft|new)\/(\d+)/, (type, id) => ({ type, id })],
  post: '/posts/:categoryId/:id',
  home: '/'
})

test.before(() => {
  document.documentElement.addEventListener('click', e => {
    let link = (e.target as HTMLElement).closest('a')
    if (link) {
      e.preventDefault()
    }
  })
})

test.after.each(() => {
  cleanStores(router)
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild)
  }
})

test('parses current location', () => {
  changePath('/posts/guides/10')
  equal(router.get(), {
    path: '/posts/guides/10',
    route: 'post',
    params: {
      categoryId: 'guides',
      id: '10'
    }
  })
})

test('ignores last slash', () => {
  changePath('/posts/guides/10/')
  equal(router.get(), {
    path: '/posts/guides/10',
    route: 'post',
    params: {
      categoryId: 'guides',
      id: '10'
    }
  })
})

test('processes 404', () => {
  changePath('/posts/guides')
  is(router.get(), undefined)
})

test('escapes RegExp symbols in routes', () => {
  changePath('/[secret]/9')
  equal(router.get(), {
    path: '/[secret]/9',
    route: 'secret',
    params: {
      id: '9'
    }
  })
})

test('converts URL-encoded symbols', () => {
  changePath('/posts/a%23b/10')
  equal(router.get(), {
    path: '/posts/a%23b/10',
    route: 'post',
    params: {
      categoryId: 'a#b',
      id: '10'
    }
  })
})

test('ignores hash and search', () => {
  changePath('/posts/?id=1#top')
  equal(router.get(), {
    path: '/posts',
    route: 'posts',
    params: {}
  })
})

test('ignores case', () => {
  changePath('/POSTS')
  equal(router.get(), {
    path: '/POSTS',
    route: 'posts',
    params: {}
  })
})

test('parameters can be optional', () => {
  changePath('/profile/')
  equal(router.get(), {
    path: '/profile',
    route: 'optional',
    params: {
      id: '',
      tab: ''
    }
  })

  changePath('/profile/10/')
  equal(router.get(), {
    path: '/profile/10',
    route: 'optional',
    params: {
      id: '10',
      tab: ''
    }
  })

  changePath('/profile/10/contacts')
  equal(router.get(), {
    path: '/profile/10/contacts',
    route: 'optional',
    params: {
      id: '10',
      tab: 'contacts'
    }
  })
})

test('detects URL changes', () => {
  changePath('/posts/guides/10/')
  let events = listen()

  changePath('/')
  equal(router.get(), { path: '/', route: 'home', params: {} })
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
    path: '/posts',
    route: 'posts',
    params: {}
  })
  equal(events, ['/posts'])
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

test('ignores prevented events', () => {
  changePath('/')
  listen()

  let link = createTag(document.body, 'a', { href: '/posts' })
  let span = createTag(link, 'span')
  span.addEventListener('click', e => {
    e.preventDefault()
  })
  span.click()

  equal(router.get()?.path, '/')
})

test('ignores links with noRouter data attribute', () => {
  changePath('/')
  listen()

  let link = createTag(document.body, 'a', { href: '/posts' })
  link.dataset.noRouter = ''
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

test('respects data-ignore-router', () => {
  changePath('/')
  listen()

  let link = createTag(document.body, 'a', { href: '/posts' })
  link.setAttribute('data-no-router', '1')
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
    href: '/posts',
    download: 'a.txt'
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
    path: '/posts',
    route: 'posts',
    params: {}
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
    path: '/posts/draft/10',
    route: 'draft',
    params: { type: 'draft', id: '10' }
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
    getPagePath(router, 'post', { categoryId: 'a#b', id: '1' }),
    '/posts/a%23b/1'
  )
  equal(getPagePath(router, 'optional', { id: '10', tab: '' }), '/profile/10')
  equal(
    getPagePath(router, 'optional', { id: '10', tab: 'a#b' }),
    '/profile/10/a%23b'
  )
})

test('opens URLs manually by route name, pushing new stare', () => {
  let start = history.length
  changePath('/')
  listen()
  openPage(router, 'post', { categoryId: 'guides', id: '10' })
  equal(history.length - start, 2)

  equal(location.href, 'http://localhost/posts/guides/10')
  equal(router.get(), {
    path: '/posts/guides/10',
    route: 'post',
    params: {
      categoryId: 'guides',
      id: '10'
    }
  })
})

test('opens URLs manually by route name, replacing state', () => {
  let start = history.length
  changePath('/')
  listen()
  redirectPage(router, 'post', { categoryId: 'guides', id: '10' })
  equal(history.length - start, 1)

  equal(location.href, 'http://localhost/posts/guides/10')
  equal(router.get(), {
    path: '/posts/guides/10',
    route: 'post',
    params: {
      categoryId: 'guides',
      id: '10'
    }
  })
})

test('throws on opening RegExp router', () => {
  throws(() => {
    getPagePath(router, 'draft', { type: 'new', id: '1' })
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
  let searchRouter = createRouter(
    {
      a: '/p?page=a',
      b: '/p?page=b'
    },
    {
      search: true
    }
  )

  changePath('/p?page=a')
  let events: (string | undefined)[] = []
  searchRouter.listen(page => {
    events.push(page?.path)
  })

  equal(searchRouter.get(), {
    path: '/p?page=a',
    route: 'a',
    params: {}
  })

  let link = createTag(document.body, 'a', { href: '/p?page=b' })
  link.click()
  equal(searchRouter.get(), {
    path: '/p?page=b',
    route: 'b',
    params: {}
  })

  changePath('/p?page=a')
  equal(searchRouter.get(), {
    path: '/p?page=a',
    route: 'a',
    params: {}
  })
})

test.run()
