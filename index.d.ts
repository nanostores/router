import { ReadableAtom } from 'nanostores'

// Splitting string by delimiter
type Split<S extends string, D extends string> = string extends S
  ? string[]
  : S extends ''
  ? []
  : S extends `${infer T}${D}${infer U}`
  ? [T, ...Split<U, D>]
  : [S]

// Converting path array to object
type PathToParams<PathArray, Params = {}> = PathArray extends [
  infer First,
  ...infer Rest
]
  ? First extends `:${infer Param}`
    ? // eslint-disable-next-line @typescript-eslint/no-shadow
      First extends `:${infer Param}?`
      ? PathToParams<Rest, Params & Partial<Record<Param, string>>>
      : PathToParams<Rest, Params & Record<Param, string>>
    : PathToParams<Rest, Params>
  : Params

type ParseUrl<Path extends string> = PathToParams<Split<Path, '/'>>

export type RouterConfig = Record<string, string | Pattern<any>>

export type ConfigFromRouter<SomeRouter> = SomeRouter extends Router<
  infer Config
>
  ? Config
  : never

// Converting routes to params
type ParamsFromConfig<K extends RouterConfig> = {
  [key in keyof K]: K[key] extends Pattern<infer P>
    ? P
    : K[key] extends string
    ? ParseUrl<K[key]>
    : never
}

type MappedC<A, B> = {
  [K in keyof A & keyof B]: A[K] extends B[K] ? never : K
}
type OptionalKeys<T> = MappedC<T, Required<T>>[keyof T]

export type ParamsArg<
  Config extends RouterConfig,
  PageName extends keyof Config
> = keyof ParamsFromConfig<Config>[PageName] extends never
  ? []
  : keyof ParamsFromConfig<Config>[PageName] extends OptionalKeys<
      ParamsFromConfig<Config>[PageName]
    >
  ? [ParamsFromConfig<Config>[PageName]?]
  : [ParamsFromConfig<Config>[PageName]]

type Pattern<RouteParams> = Readonly<
  [RegExp, (...parts: string[]) => RouteParams]
>

export type Page<
  Config extends RouterConfig = RouterConfig,
  PageName extends keyof Config = any
> = PageName extends any
  ? {
      path: string
      route: PageName
      params: ParamsFromConfig<Config>[PageName]
    }
  : never

export interface RouterOptions {
  search?: boolean
  links?: boolean
}

/**
 * Router store. Use {@link createRouter} to create it.
 *
 * It is a simple router without callbacks. Think about it as a URL parser.
 *
 * ```ts
 * import { createRouter } from 'nanostores'
 *
 * export const router = createRouter({
 *   home: '/',
 *   category: '/posts/:categoryId',
 *   post: '/posts/:categoryId/:id'
 * } as const)
 * ```
 */
export interface Router<Config extends RouterConfig = RouterConfig>
  extends ReadableAtom<Page<Config, keyof Config> | undefined> {
  /**
   * Converted routes.
   */
  routes: [string, RegExp, (...params: string[]) => object, string?][]

  /**
   * Open URL without page reloading.
   *
   * ```js
   * router.open('/posts/guides/10')
   * ```
   *
   * @param path Absolute URL (`https://example.com/a`)
   *             or domain-less URL (`/a`).
   * @param redirect Don’t add entry to the navigation history.
   */
  open(path: string, redirect?: boolean): void
}

/**
 * Create {@link Router} store.
 *
 * ```ts
 * import { createRouter } from 'nanostores'
 *
 * export const router = createRouter({
 *   home: '/',
 *   category: '/posts/:categoryId',
 *   post: '/posts/:categoryId/:id'
 * } as const)
 * ```
 *
 * @param routes URL patterns.
 * @param opts Options.
 */
export function createRouter<const Config extends RouterConfig>(
  routes: Config,
  opts?: RouterOptions
): Router<Config>

/**
 * Open page by name and parameters. Pushes new state into history.
 *
 * ```js
 * import { openPage } from 'nanostores'
 *
 * openPage(router, 'post', { categoryId: 'guides', id: '10' })
 * ```
 *
 * @param name Route name.
 * @param params Route parameters.
 */
export function openPage<
  Config extends RouterConfig,
  PageName extends keyof Config
>(
  router: Router<Config>,
  name: PageName,
  ...params: ParamsArg<Config, PageName>
): void

/**
 * Open page by name and parameters. Replaces recent state in history.
 *
 * ```js
 * import { redirectPage } from '@logux/state'
 *
 * openPage(router, 'login')
 * // replace login route, so we don't face it on back navigation
 * redirectPage(router, 'post', { categoryId: 'guides', id: '10' })
 * ```
 *
 * @param name Route name.
 * @param params Route parameters.
 */
export function redirectPage<
  Config extends RouterConfig,
  PageName extends keyof Config
>(
  router: Router<Config>,
  name: PageName,
  ...params: ParamsArg<Config, PageName>
): void

/**
 * Generates pathname by name and parameters. Useful to render links.
 *
 * ```js
 * import { getPageUrl } from 'nanostores'
 *
 * getPageUrl(router, 'post', { categoryId: 'guides', id: '10' })
 * //=> '/posts/guides/10'
 * ```
 *
 * @param name Route name.
 * @param params Route parameters.
 */
export function getPagePath<
  Config extends RouterConfig,
  PageName extends keyof Config
>(
  router: Router<Config>,
  name: PageName,
  ...params: ParamsArg<Config, PageName>
): string

export interface SearchParamsOptions {
  links?: boolean
}

/**
 * Store to watch for `?search` URL part changes.
 *
 * It will track history API and clicks on page’s links.
 */
export interface SearchParamsStore
  extends ReadableAtom<Record<string, string>> {
  /**
   * Change `?search` URL part and update store value.
   *
   * ```js
   * searchParams.open({ sort: 'name', type: 'small' })
   * ```
   *
   * @param path Absolute URL (`https://example.com/a`)
   *             or domain-less URL (`/a`).
   * @param redirect Don’t add entry to the navigation history.
   */
  open(params: Record<string, string>, redirect?: boolean): void
}

/**
 * Create {@link SearchParamsStore} store to watch for `?search` URL part.
 *
 * ```js
 * import { createSearchParams } from 'nanostores'
 *
 * export const searchParams = createSearchParams()
 * ```
 *
 * @param opts Options.
 */
export function createSearchParams(
  opts?: SearchParamsOptions
): SearchParamsStore
