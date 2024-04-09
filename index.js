import { atom, onMount } from 'nanostores'

export function createRouter(routes, opts = {}) {
  let router = atom()
  router.routes = Object.keys(routes).map(name => {
    let value = routes[name]
    if (typeof value === 'string') {
      value = value.replace(/\/$/g, '') || '/'
      let names = value.match(/(?<=\/:)\w+/g) || []
      let pattern = value
        .replace(/[\s!#$()+,.:<=?[\\\]^{|}]/g, '\\$&')
        .replace(/\/\\:\w+\\\?/g, '(?:/((?<=/)[^/]+))?')
        .replace(/\/\\:\w+/g, '/([^/]+)')
      return [
        name,
        RegExp('^' + pattern + '$', 'i'),
        (...matches) =>
          matches.reduce((params, match, index) => {
            // match === undefined when nothing captured in regexp group
            // and we swap it with empty string for backward compatibility
            params[names[index]] = match ? decodeURIComponent(match) : ''
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
    path = path.replace(/\/($|\?)/, '$1') || '/'
    if (prev === path) return false
    prev = path

    let url = new URL(path, 'http://a')
    if (!opts.search) path = url.pathname

    let search = Object.fromEntries(url.searchParams)

    for (let [route, pattern, cb] of router.routes) {
      let match = path.match(pattern)
      if (match) {
        return { params: cb(...match.slice(1)), path, route, search }
      }
    }
  }

  let click = event => {
    let link = event.target.closest('a')
    if (
      link &&
      event.button === 0 && // Left mouse button
      link.target !== '_blank' && // Not for new tab
      link.origin === location.origin && // Not external link
      link.rel !== 'external' && // Not external link
      link.target !== '_self' && // Now manually disabled
      !link.download && // Not download link
      !event.altKey && // Not download link by user
      !event.metaKey && // Not open in new tab by user
      !event.ctrlKey && // Not open in new tab by user
      !event.shiftKey && // Not open in new window by user
      !event.defaultPrevented // Click was not cancelled
    ) {
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

export function getPagePath(router, name, params, search) {
  if (typeof name === 'object') {
    search = params
    params = name.params
    name = name.route
  }
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
  let postfix = ''
  if (search) {
    postfix = '' + new URLSearchParams(search)
    if (postfix) postfix = '?' + postfix
  }
  return (path || '/') + postfix
}

export function openPage(router, name, params, search) {
  router.open(getPagePath(router, name, params, search))
}

export function redirectPage(router, name, params, search) {
  router.open(getPagePath(router, name, params, search), true)
}
