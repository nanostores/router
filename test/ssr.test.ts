import { cleanStores } from 'nanostores'
import { test, afterEach } from 'node:test'
import { deepStrictEqual } from 'node:assert'

import { createRouter, createSearchParams } from '../index.js'

let router = createRouter({
  home: '/',
  posts: '/posts/'
})

let params = createSearchParams()

afterEach(() => {
  cleanStores(router, params)
})

test('opens home by default', () => {
  deepStrictEqual(router.get(), {
    params: {},
    path: '/',
    route: 'home'
  })
  deepStrictEqual(params.get(), {})
})

test('opens custom page', () => {
  router.listen(() => {})
  params.listen(() => {})

  router.open('/posts')
  params.open({ a: '2' })

  deepStrictEqual(router.get(), {
    params: {},
    path: '/posts',
    route: 'posts'
  })
  deepStrictEqual(params.get(), { a: '2' })
})
