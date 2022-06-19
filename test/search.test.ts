import { equal } from 'uvu/assert'
import { cleanStores } from 'nanostores'
import { JSDOM } from 'jsdom'
import { test } from 'uvu'

import { createSearchParams } from '../index.js'

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

function listen(): Record<string, string>[] {
  let events: Record<string, string>[] = []
  store.listen(params => {
    events.push(params)
  })
  return events
}

function changePath(url: string): void {
  location.hash = ''
  window.history.pushState(null, '', url)
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

let store = createSearchParams()

test.before(() => {
  document.documentElement.addEventListener('click', e => {
    let link = (e.target as HTMLElement).closest('a')
    if (link) {
      e.preventDefault()
    }
  })
})

test.after.each(() => {
  cleanStores(store)
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild)
  }
})

test('parses current location', () => {
  changePath('/page?a=1')
  equal(store.get(), { a: '1' })
})

test('parses with empty search', () => {
  changePath('/page')
  equal(store.get(), {})
})

test('converts URL-encoded symbols', () => {
  changePath('/?category=a%23b')
  equal(store.get(), {
    category: 'a#b'
  })
})

test('ignores hash and path', () => {
  changePath('/posts/?id=1#top')
  equal(store.get(), { id: '1' })
})

test('works without params', () => {
  changePath('/posts/?fast')
  equal(store.get(), { fast: '' })
})

test('detects URL changes', () => {
  changePath('/?a=1')
  let events = listen()

  changePath('/?a=2')
  equal(store.get(), { a: '2' })
  equal(events, [{ a: '2' }])
})

test('unbinds events', () => {
  changePath('/?a=1')
  let events = listen()

  cleanStores(store)
  changePath('/?a=2')
  equal(events, [])
})

test('ignores the same URL in popstate', () => {
  changePath('/?a=1')
  let events = listen()

  changePath('/?a=1')
  equal(events, [])
})

test('detects clicks', () => {
  changePath('/?a=1')
  let events = listen()

  createTag(document.body, 'a', { href: '/page?a=2' }).click()
  equal(store.get(), { a: '2' })
  equal(events, [{ a: '2' }])
  equal(location.toString(), 'http://localhost/page?a=2')
})

test('accepts click on tag inside link', () => {
  changePath('/')
  listen()

  let link = createTag(document.body, 'a', { href: '/page?a=2' })
  createTag(link, 'span').click()
  equal(store.get(), { a: '2' })
  equal(location.toString(), 'http://localhost/page?a=2')
})

test('ignore non-link clicks', () => {
  changePath('/?a=1')
  listen()

  createTag(document.body, 'span', { href: '/page?a=2' }).click()
  equal(store.get(), { a: '1' })
})

test('ignores links with noRouter data attribute', () => {
  changePath('/?a=1')
  listen()

  let link = createTag(document.body, 'a', { href: '/page?a=2' })
  link.dataset.noRouter = ''
  let span = createTag(link, 'span')
  span.click()

  equal(store.get(), { a: '1' })
})

test('ignores new-tab links', () => {
  changePath('/?a=1')
  listen()

  let link = createTag(document.body, 'a', { href: '/?a=2', target: '_blank' })
  link.click()

  equal(store.get(), { a: '1' })
})

test('ignores external links', () => {
  changePath('/?a=1')
  let events = listen()

  let link = createTag(document.body, 'a', { href: 'http://lacalhast/?a=2' })
  link.click()

  equal(store.get(), { a: '1' })
  equal(events, [])
})

test('ignores the same URL in link', () => {
  changePath('?a=1')
  let events = listen()

  let link = createTag(document.body, 'a', { href: '/posts?a=1' })
  link.click()

  equal(events, [])
})

test('respects data-ignore-router', () => {
  changePath('/?a=1')
  listen()

  let link = createTag(document.body, 'a', { href: '/?a=2' })
  link.setAttribute('data-no-router', '1')
  link.click()

  equal(store.get(), { a: '1' })
})

test('respects external rel', () => {
  changePath('/?a=1')
  listen()

  let link = createTag(document.body, 'a', {
    href: '/?a=2',
    rel: 'external'
  })
  link.click()

  equal(store.get(), { a: '1' })
})

test('respects download attribute', () => {
  changePath('/?a=1')
  listen()

  let link = createTag(document.body, 'a', {
    href: '/?a=2',
    download: 'a.txt'
  })
  link.click()

  equal(store.get(), { a: '1' })
})

test('opens URLs manually', () => {
  changePath('/page?a=1#hash')
  let events = listen()

  store.open({ a: '2' })
  equal(location.href, 'http://localhost/page?a=2#hash')
  equal(store.get(), { a: '2' })
  equal(events, [{ a: '2' }])
})

test('opens empty params manually', () => {
  changePath('/page?a=1')
  let events = listen()

  store.open({})
  equal(location.href, 'http://localhost/page')
  equal(store.get(), {})
  equal(events, [{}])
})

test('opens URLs manually with state replacing', () => {
  let start = history.length
  changePath('/')
  listen()
  store.open({ a: '2' }, true)
  equal(history.length - start, 1)

  equal(location.href, 'http://localhost/?a=2')
  equal(store.get(), { a: '2' })
})

test('ignores the same URL in manual URL', () => {
  changePath('/?a=1')
  let events = listen()

  store.open({ a: '1' })
  equal(events, [])
})

test('supports link with hash in URL and different path', () => {
  changePath('/?a=1')
  let events = listen()

  let link = createTag(document.body, 'a', { href: '/posts?a=1#hash' })
  link.click()

  equal(location.toString(), 'http://localhost/posts?a=1#hash')
  equal(events, [])
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

test.run()
