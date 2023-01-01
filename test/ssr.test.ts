import { cleanStores } from 'nanostores'
import { equal } from 'uvu/assert'
import { test } from 'uvu'

import { createRouter, createSearchParams } from '../index.js'

let router = createRouter({
  posts: '/posts/',
  home: '/'
} as const)

let params = createSearchParams()

test.after.each(() => {
  cleanStores(router, params)
})

test('opens home by default', () => {
  equal(router.get(), {
    path: '/',
    route: 'home',
    params: {}
  })
  equal(params.get(), {})
})

test('opens custom page', () => {
  router.listen(() => {})
  params.listen(() => {})

  router.open('/posts')
  params.open({ a: '2' })

  equal(router.get(), {
    path: '/posts',
    route: 'posts',
    params: {}
  })
  equal(params.get(), { a: '2' })
})

test.run()
