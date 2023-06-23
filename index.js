import { atom, onMount } from 'nanostores'

function isRouterClick(event, link) {
  return (
    link &&
    event.button === 0 && // Left mouse button
    link.target !== '_blank' && // Not for new tab
    link.origin === location.origin && // Not external link
    link.rel !== 'external' && // Not external link
    link.dataset.noRouter == null && // Now manually disabled
    !link.download && // Not download link
    !event.altKey && // Not download link by user
    !event.metaKey && // Not open in new tab by user
    !event.ctrlKey && // Not open in new tab by user
    !event.shiftKey && // Not open in new window by user
    !event.defaultPrevented // Click was not cancelled
  )
}

export function createRouter(routes, opts = {}) {
  let router = atom()
  router.routes = Object.keys(routes).map(name => {
    let value = routes[name]
    if (typeof value === 'string') {
      value = value.replace(/\/$/g, '') || '/'
      let names = (value.match(/\/:\w+/g) || []).map(i => i.slice(2))
      let pattern = value
        .replace(/[\s!#$()+,.:<=?[\\\]^{|}]/g, '\\$&')
        .replace(/\/\\:\w+\\\?/g, '/?([^/]*)')
        .replace(/\/\\:\w+/g, '/([^/]+)')
      return [
        name,
        RegExp('^' + pattern + '$', 'i'),
        (...matches) =>
          matches.reduce((params, match, index) => {
            params[names[index]] = decodeURIComponent(match)
            return params
          }, {}),
        value
      ]
    } else {
      return [name, ...value]
    }
  })

  let prev
  let parse = path => {
    if (!opts.search) path = path.split('?')[0]
    path = path.replace(/\/($|\?)/, '$1') || '/'
    if (prev === path) return false
    prev = path

    for (let [route, pattern, cb] of router.routes) {
      let match = path.match(pattern)
      if (match) {
        return { params: cb(...match.slice(1)), path, route }
      }
    }
  }

  let click = event => {
    let link = event.target.closest('a')
    if (isRouterClick(event, link)) {
      if (link.origin === location.origin) {
        event.preventDefault()
        let changed = location.hash !== link.hash
        router.open(link.pathname + link.search)
        if (changed) {
          location.hash = link.hash
          if (link.hash === '' || link.hash === '#') {
            window.dispatchEvent(new HashChangeEvent('hashchange'))
          }
        }
      }
    }
  }

  let set = router.set
  if (process.env.NODE_ENV !== 'production') {
    delete router.set
  }

  let popstate = () => {
    let page = parse(location.pathname + location.search)
    if (page !== false) set(page)
  }

  if (typeof window !== 'undefined' && typeof location !== 'undefined') {
    onMount(router, () => {
      let page = parse(location.pathname + location.search)
      if (page !== false) set(page)
      if (opts.links !== false) document.body.addEventListener('click', click)
      window.addEventListener('popstate', popstate)
      return () => {
        prev = undefined
        document.body.removeEventListener('click', click)
        window.removeEventListener('popstate', popstate)
      }
    })
  } else {
    set(parse('/'))
  }

  router.open = (path, redirect) => {
    let page = parse(path)
    if (page !== false) {
      if (typeof history !== 'undefined') {
        if (redirect) {
          history.replaceState(null, null, path)
        } else {
          history.pushState(null, null, path)
        }
      }
      set(page)
    }
  }

  return router
}

export function getPagePath(router, name, params) {
  let route = router.routes.find(i => i[0] === name)
  if (process.env.NODE_ENV !== 'production') {
    if (!route[3]) throw new Error('RegExp routes are not supported')
  }
  let path = route[3]
    .replace(/\/:\w+\?/g, i => {
      let param = params ? params[i.slice(2).slice(0, -1)] : null
      if (param) {
        return '/' + encodeURIComponent(param)
      } else {
        return ''
      }
    })
    .replace(/\/:\w+/g, i => '/' + encodeURIComponent(params[i.slice(2)]))
  return path || '/'
}

export function openPage(router, name, params) {
  router.open(getPagePath(router, name, params))
}

export function redirectPage(router, name, params) {
  router.open(getPagePath(router, name, params), true)
}

export function createSearchParams(opts = {}) {
  let store = atom({})

  let set = store.set
  if (process.env.NODE_ENV !== 'production') {
    delete store.set
  }

  let prev
  let update = href => {
    let url = new URL(href)
    if (prev === url.search) return false
    prev = url.search
    set(Object.fromEntries(url.searchParams))
  }

  store.open = (params, redirect) => {
    let search = new URLSearchParams(params).toString()
    if (search) search = '?' + search

    if (prev === search) return
    prev = search

    if (typeof history !== 'undefined') {
      let href = location.pathname + search + location.hash
      if (typeof history !== 'undefined') {
        if (redirect) {
          history.replaceState(null, null, href)
        } else {
          history.pushState(null, null, href)
        }
      }
    }
    set(params)
  }

  let click = event => {
    let link = event.target.closest('a')
    if (isRouterClick(event, link)) {
      if (link.search !== prev) {
        prev = link.search
        set(Object.fromEntries(new URL(link.href).searchParams))
      }
      if (link.pathname === location.pathname && link.hash === location.hash) {
        event.preventDefault()
        history.pushState(null, null, link.href)
      }
    }
  }

  let popstate = () => {
    update(location.href)
  }

  if (typeof window !== 'undefined' && typeof location !== 'undefined') {
    onMount(store, () => {
      popstate()
      if (opts.links !== false) document.body.addEventListener('click', click)
      window.addEventListener('popstate', popstate)
      return () => {
        document.body.removeEventListener('click', click)
        window.removeEventListener('popstate', popstate)
      }
    })
  }

  return store
}
