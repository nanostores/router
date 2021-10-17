/**
 * @jest-environment node
 */

import { cleanStores } from 'nanostores'

import { createRouter } from '../index.js'

let router = createRouter<{
  posts: void
  home: void
}>({
  posts: '/posts/',
  home: '/'
})

afterEach(() => {
  cleanStores(router)
})

it('opens home by default', () => {
  expect(router.get()).toEqual({
    path: '/',
    route: 'home',
    params: {}
  })
})

it('opens cutom page', () => {
  router.listen(() => {})
  router.open('/posts')
  expect(router.get()).toEqual({
    path: '/posts',
    route: 'posts',
    params: {}
  })
})
