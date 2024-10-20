import { atom, onMount } from 'nanostores'

export function createRouter(routes, opts = {}) {
  let router = atom()
  router.routes = Object.keys(routes).map(name => {
    let value = routes[name]

    if (typeof value !== 'string') {
      return [name, ...[value].flat()]
    }

    value = value.replace(/\/$/g, '') || '/'

    let pattern = value
      .replace(/[\s!#$()+,.:<=?[\\\]^{|}]/g, '\\$&')
      .replace(/\/\\:(\w+)\\\?/g, '(?:/(?<$1>(?<=/)[^/]+))?')
      .replace(/\/\\:(\w+)/g, '/(?<$1>[^/]+)')

    return [name, RegExp('^' + pattern + '$', 'i'), null, value]
  })

  let prev
  let parse = href => {
    let url = new URL(href.replace(/#$/, ''), 'http://a')
    let cache = url.pathname + url.search + url.hash
    if (prev === cache) return false
    prev = cache

    let path = opts.search ? url.pathname + url.search : url.pathname
    path = path.replace(/\/($|\?)/, '$1') || '/'

    for (let [route, pattern, callback] of router.routes) {
      let match = path.match(pattern)
      if (match) {
        return {
          hash: url.hash,
          // If route has callback for params decoding use it.
          // Otherwise decode params from named capture groups
          params: callback
            ? callback(...match.slice(1))
            : Object.keys({ ...match.groups }).reduce((pars, key) => {
                // match === undefined when nothing captured in regexp group
                // and we swap it with empty string for backward compatibility
                pars[key] = match.groups[key]
                  ? decodeURIComponent(match.groups[key])
                  : ''
                return pars
              }, {}),
          path,
          route,
          search: Object.fromEntries(url.searchParams)
        }
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
      let hashChanged = location.hash !== link.hash
      router.open(link.href)
      if (hashChanged) {
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

  let change = () => {
    let page = parse(location.href)
    if (page !== false) set(page)
  }

  if (typeof window !== 'undefined' && typeof location !== 'undefined') {
    onMount(router, () => {
      let page = parse(location.href)
      if (page !== false) set(page)
      if (opts.links !== false) document.body.addEventListener('click', click)
      window.addEventListener('popstate', change)
      window.addEventListener('hashchange', change)
      return () => {
        prev = undefined
        document.body.removeEventListener('click', click)
        window.removeEventListener('popstate', change)
        window.removeEventListener('hashchange', change)
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
