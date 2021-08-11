/**
 * @jest-environment node
 */

import { cleanStores, getValue } from 'nanostores'

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
  expect(getValue(router)).toEqual({
    path: '/',
    route: 'home',
    params: {}
  })
})

it('opens cutom page', () => {
  router.listen(() => {})
  router.open('/posts')
  expect(getValue(router)).toEqual({
    path: '/posts',
    route: 'posts',
    params: {}
  })
})
