import { JSDOM } from 'jsdom'
import { cleanStores } from 'nanostores'
import { test, afterEach } from 'node:test'
import { deepStrictEqual, equal } from 'node:assert'

import { createSearchParams, type SearchParamsStore } from '../index.js'

let dom = new JSDOM('<body></body>', { url: 'http://localhost/' })

// @ts-ignore
global.window = dom.window
global.document = dom.window.document
global.location = dom.window.location
global.history = dom.window.history
global.PopStateEvent = dom.window.PopStateEvent
global.MouseEvent = dom.window.MouseEvent
global.HashChangeEvent = dom.window.HashChangeEvent

function listen(aStore = store): Record<string, string>[] {
  let events: Record<string, string>[] = []
  aStore.listen(params => {
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

let otherStore: SearchParamsStore | undefined

test.before(() => {
  document.documentElement.addEventListener('click', e => {
    let link = (e.target as HTMLElement).closest('a')
    if (link) {
      e.preventDefault()
    }
  })
})

afterEach(() => {
  cleanStores(store, otherStore)
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild)
  }
})

test('parses current location', () => {
  changePath('/page?a=1')
  deepStrictEqual(store.get(), { a: '1' })
})

test('parses with empty search', () => {
  changePath('/page')
  deepStrictEqual(store.get(), {})
})

test('converts URL-encoded symbols', () => {
  changePath('/?category=a%23b')
  deepStrictEqual(store.get(), {
    category: 'a#b'
  })
})

test('ignores hash and path', () => {
  changePath('/posts/?id=1#top')
  deepStrictEqual(store.get(), { id: '1' })
})

test('works without params', () => {
  changePath('/posts/?fast')
  deepStrictEqual(store.get(), { fast: '' })
})

test('detects URL changes', () => {
  changePath('/?a=1')
  let events = listen()

  changePath('/?a=2')
  deepStrictEqual(store.get(), { a: '2' })
  deepStrictEqual(events, [{ a: '2' }])
})

test('unbinds events', () => {
  changePath('/?a=1')
  let events = listen()

  cleanStores(store)
  changePath('/?a=2')
  deepStrictEqual(events, [])
})

test('ignores the same URL in popstate', () => {
  changePath('/?a=1')
  let events = listen()

  changePath('/?a=1')
  deepStrictEqual(events, [])
})

test('detects clicks', () => {
  changePath('/?a=1')
  let events = listen()

  createTag(document.body, 'a', { href: '/?a=2' }).click()
  equal(location.toString(), 'http://localhost/?a=2')
  deepStrictEqual(store.get(), { a: '2' })
  deepStrictEqual(events, [{ a: '2' }])
})

test('ignores clicks detection on request', () => {
  otherStore = createSearchParams({ links: false })
  changePath('/?a=1')
  let events = listen(otherStore)

  createTag(document.body, 'a', { href: '/page?a=2' }).click()
  deepStrictEqual(store.get(), { a: '1' })
  deepStrictEqual(events, [])
})

test('accepts click on tag inside link', () => {
  changePath('/')
  listen()

  let link = createTag(document.body, 'a', { href: '/?a=2' })
  createTag(link, 'span').click()
  equal(location.toString(), 'http://localhost/?a=2')
  deepStrictEqual(store.get(), { a: '2' })
})

test('ignore non-link clicks', () => {
  changePath('/?a=1')
  listen()

  createTag(document.body, 'span', { href: '/page?a=2' }).click()
  deepStrictEqual(store.get(), { a: '1' })
})

test('ignores new-tab links', () => {
  changePath('/?a=1')
  listen()

  let link = createTag(document.body, 'a', { href: '/?a=2', target: '_blank' })
  link.click()

  deepStrictEqual(store.get(), { a: '1' })
})

test('ignores external links', () => {
  changePath('/?a=1')
  let events = listen()

  let link = createTag(document.body, 'a', { href: 'http://lacalhast/?a=2' })
  link.click()

  deepStrictEqual(store.get(), { a: '1' })
  deepStrictEqual(events, [])
})

test('ignores the same URL in link', () => {
  changePath('?a=1')
  let events = listen()

  let link = createTag(document.body, 'a', { href: '/posts?a=1' })
  link.click()

  deepStrictEqual(events, [])
})

test('respects target self', () => {
  changePath('/?a=1')
  listen()

  let link = createTag(document.body, 'a', { href: '/?a=2', target: '_self' })
  link.click()

  deepStrictEqual(store.get(), { a: '1' })
})

test('respects external rel', () => {
  changePath('/?a=1')
  listen()

  let link = createTag(document.body, 'a', {
    href: '/?a=2',
    rel: 'external'
  })
  link.click()

  deepStrictEqual(store.get(), { a: '1' })
})

test('respects download attribute', () => {
  changePath('/?a=1')
  listen()

  let link = createTag(document.body, 'a', {
    download: 'a.txt',
    href: '/?a=2'
  })
  link.click()

  deepStrictEqual(store.get(), { a: '1' })
})

test('opens URLs manually', () => {
  changePath('/page?a=1#hash')
  let events = listen()

  store.open({ a: '2' })
  equal(location.href, 'http://localhost/page?a=2#hash')
  deepStrictEqual(store.get(), { a: '2' })
  deepStrictEqual(events, [{ a: '2' }])

  store.open({ a: 3 })
  equal(location.href, 'http://localhost/page?a=3#hash')
  deepStrictEqual(store.get(), { a: '3' })
  deepStrictEqual(events, [{ a: '2' }, { a: '3' }])
})

test('opens empty params manually', () => {
  changePath('/page?a=1')
  let events = listen()

  store.open({})
  equal(location.href, 'http://localhost/page')
  deepStrictEqual(store.get(), {})
  deepStrictEqual(events, [{}])
})

test('opens URLs manually with state replacing', () => {
  let start = history.length
  changePath('/')
  listen()
  store.open({ a: '2' }, true)
  equal(history.length - start, 2)
  equal(location.href, 'http://localhost/?a=2')
  deepStrictEqual(store.get(), { a: '2' })
})

test('ignores the same URL in manual URL', () => {
  changePath('/?a=1')
  let events = listen()

  store.open({ a: '1' })
  deepStrictEqual(events, [])

  store.open({ a: 1 })
  deepStrictEqual(events, [])
})

test('supports link with hash in URL and different path', () => {
  changePath('/?a=1')
  let events = listen()

  let link = createTag(document.body, 'a', { href: '/posts?a=1#hash' })
  link.click()

  deepStrictEqual(events, [])
})
