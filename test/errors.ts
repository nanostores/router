import { createRouter, openPage, redirectPage } from '../index.js'

let router = createRouter({
  home: '/',
  create: [/\/post\/(new|draft)/, type => ({ mode: 'editor', id: 123 })],
  post: '/post/:id',
  exit: '/exit'
} as const)

router.subscribe(page => {
  if (!page) {
    console.log('404')
  } else if (page.route === 'post') {
    // THROWS 'type' does not exist on type 'Params<"id">'
    router.open(`/post/${page.params.type}`)
    // THROWS '"exit" | "home" | "create"' and '"creat"' have no overlap
  } else if (page.route === 'creat') {
    console.log('create')
  }
})

router.subscribe(page => {
  // THROWS Object is possibly 'undefined'
  console.log(page.route)
})

// THROWS category: string; }' is not assignable to parameter
openPage(router, 'post', { id: '1', category: 'guides' })
// THROWS Expected 2 arguments, but got 3
openPage(router, 'home', { id: '1' })

// THROWS Type 'string' is not assignable to type 'number'.
openPage(router, 'create', { id: '1' })
// THROWS Expected 3 arguments, but got 2.
openPage(router, 'create')

// THROWS category: string; }' is not assignable to parameter
redirectPage(router, 'post', { id: '1', category: 'guides' })
// THROWS Expected 2 arguments, but got 3
redirectPage(router, 'home', { id: '1' })

// THROWS Property 'set' does not exist on type
router.set({ route: 'home', params: {}, path: '/' })
