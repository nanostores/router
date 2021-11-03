import { cleanStores } from 'nanostores'
import { equal } from 'uvu/assert'
import { test } from 'uvu'

import { createRouter } from '../index.js'

let router = createRouter<{
  posts: void
  home: void
}>({
  posts: '/posts/',
  home: '/'
})

test.after.each(() => {
  cleanStores(router)
})

test('opens home by default', () => {
  equal(router.get(), {
    path: '/',
    route: 'home',
    params: {}
  })
})

test('opens custom page', () => {
  router.listen(() => {})
  router.open('/posts')
  equal(router.get(), {
    path: '/posts',
    route: 'posts',
    params: {}
  })
})

test.run()
