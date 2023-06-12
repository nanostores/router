import { cleanStores } from 'nanostores'
import { test } from 'uvu'
import { equal } from 'uvu/assert'

import { createRouter, createSearchParams } from '../index.js'

let router = createRouter({
  home: '/',
  posts: '/posts/'
} as const)

let params = createSearchParams()

test.after.each(() => {
  cleanStores(router, params)
})

test('opens home by default', () => {
  equal(router.get(), {
    params: {},
    path: '/',
    route: 'home'
  })
  equal(params.get(), {})
})

test('opens custom page', () => {
  router.listen(() => {})
  params.listen(() => {})

  router.open('/posts')
  params.open({ a: '2' })

  equal(router.get(), {
    params: {},
    path: '/posts',
    route: 'posts'
  })
  equal(params.get(), { a: '2' })
})

test.run()
