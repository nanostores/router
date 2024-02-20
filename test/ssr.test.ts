import { cleanStores } from 'nanostores'
import { deepStrictEqual } from 'node:assert'
import { afterEach, test } from 'node:test'

import { createRouter } from '../index.js'

let router = createRouter({
  home: '/',
  posts: '/posts/'
})

afterEach(() => {
  cleanStores(router)
})

test('opens home by default', () => {
  deepStrictEqual(router.get(), {
    params: {},
    path: '/',
    route: 'home',
    search: {}
  })
})

test('opens custom page', () => {
  router.listen(() => {})

  router.open('/posts?q=2')

  deepStrictEqual(router.get(), {
    params: {},
    path: '/posts',
    route: 'posts',
    search: { q: '2' }
  })
})
