import { createRouter, openPage, redirectPage } from '../index.js'

let router = createRouter({
  create: [/\/post\/(new|draft)/, type => ({ mode: 'editor', type })],
  exit: '/exit',
  home: '/',
  post: '/post/:id',
  profile: '/user/:userId?'
})

router.subscribe(page => {
  if (!page) {
    console.log('404')
  } else if (page.route === 'post') {
    router.open(`/post/${page.params.id}`)
    openPage(router, 'post', { id: '1' })
    openPage(router, 'post', { id: 1 })
    openPage(router, 'home')
    openPage(router, 'profile')
    openPage(router, 'profile', {})
    openPage(router, 'profile', { userId: '123' })
    openPage(router, 'profile', { userId: 123 })
    openPage(router, { route: 'post', params: { id: '1' } })
    openPage(router, { route: 'post', params: { id: 1 } })
    redirectPage(router, 'post', { id: '1' })
    redirectPage(router, 'home')
  } else if (page.route === 'create') {
    console.log(page.params.type, page.params.mode)
  }
})
