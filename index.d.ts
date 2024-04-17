import type { ReadableAtom } from 'nanostores'

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

export type RouterConfig = Record<string, Pattern<any> | RegExp | string>

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

// Converting string params to string | number
type Input<T> = {
  [P in keyof T]: number | string
}

type MappedC<A, B> = {
  [K in keyof A & keyof B]: A[K] extends B[K] ? never : K
}
type OptionalKeys<T> = MappedC<T, Required<T>>[keyof T]

type EmptyObject = Record<string, never>

type SearchParams = Record<string, number | string>

export type ParamsArg<
  Config extends RouterConfig,
  PageName extends keyof Config
> = keyof ParamsFromConfig<Config>[PageName] extends never
  ? [EmptyObject?, SearchParams?]
  : keyof ParamsFromConfig<Config>[PageName] extends OptionalKeys<
      ParamsFromConfig<Config>[PageName]
    >
  ? [Input<ParamsFromConfig<Config>[PageName]>?, SearchParams?]
  : [Input<ParamsFromConfig<Config>[PageName]>, SearchParams?]

type Pattern<RouteParams> = Readonly<
  [RegExp, (...parts: string[]) => RouteParams]
>

export type InputPage<
  Config extends RouterConfig = RouterConfig,
  PageName extends keyof Config = any
> = PageName extends any
  ? Input<ParamsFromConfig<Config>[PageName]> extends EmptyObject
    ? {
        params?: Input<ParamsFromConfig<Config>[PageName]>
        route: PageName
      }
    : {
        params: Input<ParamsFromConfig<Config>[PageName]>
        route: PageName
      }
  : never

export type Page<
  Config extends RouterConfig = RouterConfig,
  PageName extends keyof Config = any
> = PageName extends any
  ? {
      params: ParamsFromConfig<Config>[PageName]
      path: string
      route: PageName
      search: Record<string, string>
    }
  : never

export interface RouterOptions {
  links?: boolean
  search?: boolean
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
 * })
 * ```
 */
export interface Router<Config extends RouterConfig = RouterConfig>
  extends ReadableAtom<Page<Config, keyof Config> | undefined> {
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

  /**
   * Converted routes.
   */
  routes: [string, RegExp, (...params: string[]) => object, string?][]
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
 * })
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
export function openPage<
  Config extends RouterConfig,
  PageName extends keyof Config
>(
  router: Router<Config>,
  route: InputPage<Config, PageName>,
  search?: SearchParams
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
export function redirectPage<
  Config extends RouterConfig,
  PageName extends keyof Config
>(
  router: Router<Config>,
  route: InputPage<Config, PageName>,
  search?: SearchParams
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
export function getPagePath<
  Config extends RouterConfig,
  PageName extends keyof Config
>(
  router: Router<Config>,
  route: InputPage<Config, PageName>,
  search?: SearchParams
): string
