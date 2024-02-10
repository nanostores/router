import { createRouter, openPage, redirectPage } from '../index.js'

let router = createRouter({
  home: '/',
  create: [/\/post\/(new|draft)/, type => ({ mode: 'editor', id: 123 })],
  post: '/post/:id',
  exit: '/exit'
})

router.subscribe(page => {
  if (!page) {
    console.log('404')
  } else if (page.route === 'post') {
    // THROWS Property 'type' does not exist on type 'Record<"id"
    router.open(`/post/${page.params.type}`)
    // THROWS '"home" | "exit" | "create"' and '"creat"' have no overlap
  } else if (page.route === 'creat') {
    console.log('create')
  }
})

router.subscribe(page => {
  // THROWS is possibly 'undefined'
  console.log(page.route)
})

// THROWS No overload matches this call.
openPage(router, 'post', { id: '1', category: 'guides' })
// THROWS No overload matches this call.
openPage(router, 'home', { id: '1' })

// THROWS Type 'boolean' is not assignable to type 'string | number'.
openPage(router, 'home', {}, { search: false })

// THROWS No overload matches this call.
openPage(router, { route: 'home', params: {} }, { search: false })

// THROWS Argument of type 'string' is not assignable to parameter of type
openPage(router, 'post')

// THROWS No overload matches this call.
redirectPage(router, 'post', { id: '1', category: 'guides' })
// THROWS No overload matches this call
redirectPage(router, { route: 'post', params: { category: 'guides' } })
// THROWS No overload matches this call.
redirectPage(router, 'home', { id: '1' })

// THROWS Property 'set' does not exist on type
router.set({ route: 'home', params: {}, path: '/' })
