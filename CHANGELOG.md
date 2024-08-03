# Change Log
This project adheres to [Semantic Versioning](http://semver.org/).

## 0.15.1
* Added Nano Stores 0.11 support.

## 0.15.0
* Added named capturing group to RegExp routes (by @easing).

## 0.14.2
* Fixed `:param?` RegExp (by @easing).

## 0.14.1
* Added Nano Stores 0.10 support.

## 0.14.0
* Added `search` with parsed search params to store’s value.
* Added `search` argument to all functions to get and open URL.
* Removed `createSearchParams` in favor of `route.search` of normal router.

## 0.13
* Added page object support in `getPagePath`, `openPage`, and `redirectPage`.

## 0.12.1
* Fixed parameter output type regression.

## 0.12
* Allowed to pass number to router parameter.
* Removed Node.js 16 support.

## 0.11
* Replaced `data-no-router` to `target="_self"`.
* Added ignoring clicks with `event.preventDefault()` calls.

## 0.10
* Moved to Nano Stores 0.9.

## 0.9.1
* Added funding to package meta.

## 0.9
* Moved to Nano Stores 0.8.
* Moved to TypeScript 5.
* Removed Node.js 14 support.

## 0.8.3
* Fixed URL normalization on `search` option.

## 0.8.2
* Added `ParamsArg`, `RouterConfig`, `ParamsFromRoutesConfig` types export.

## 0.8.1
* Fixed optional params in `getPagePath()` (by Artem Shkurenko).

## 0.8
* Added routes params automatic inferring (by Daniil Kozlov).

## 0.7
* Moved to Nano Stores 0.6.

## 0.6
* Moved to Nano Stores 0.6.

## 0.5
* Added `opts.links` to the stores to disable link clicks tracking.
* Added `defaultPrevented` in router click processing.

## 0.4
* Removed Node.js 12 support.
* Added `createSearchParams()` for `?search` store.
* Added `search` option to `createRouter()`.
* Ignored `defaultPrevented` in click processing.

## 0.3.1
* Fixed URL parameters encoding/decoding.

## 0.3
* Added optional route parameters (by Eduard Aksamitov).

## 0.2.2
* Fixed search params disappear when you click on links (by Andrei Eres).

## 0.2.1
* Fixed `open()` arguments types (by @davidmz).

## 0.2
* Moved to Nano Stores 0.5.

## 0.1.1
* Fixed Server-Side Rendering support.

## 0.1
* Initial release.
