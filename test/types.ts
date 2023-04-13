import { createRouter, openPage, redirectPage } from '../index.js'

let router = createRouter({
  home: '/',
  create: [/\/post\/(new|draft)/, type => ({ type, mode: 'editor' })],
  post: '/post/:id',
  profile: '/user/:userId?',
  exit: '/exit'
})

router.subscribe(page => {
  if (!page) {
    console.log('404')
  } else if (page.route === 'post') {
    router.open(`/post/${page.params.id}`)
    openPage(router, 'post', { id: '1' })
    openPage(router, 'home')
    openPage(router, 'profile')
    openPage(router, 'profile', {})
    openPage(router, 'profile', { userId: '123' })
    redirectPage(router, 'post', { id: '1' })
    redirectPage(router, 'home')
  } else if (page.route === 'create') {
    console.log(page.params.type, page.params.mode)
  }
})
