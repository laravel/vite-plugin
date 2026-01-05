# Release Notes

## [Unreleased](https://github.com/laravel/vite-plugin/compare/v2.0.1...2.x)

## [v2.0.1](https://github.com/laravel/vite-plugin/compare/v2.0.0...v2.0.1) - 2025-08-26

* Automatically create hotFile parent directory by [@adrum](https://github.com/adrum) in https://github.com/laravel/vite-plugin/pull/334

## [v2.0.0](https://github.com/laravel/vite-plugin/compare/v1.3.0...v2.0.0) - 2025-07-09

* Vite 7 support by [@sweptsquash](https://github.com/sweptsquash) in https://github.com/laravel/vite-plugin/pull/328
* Upgrade dependencies by [@timacdonald](https://github.com/timacdonald) in https://github.com/laravel/vite-plugin/pull/331

## [v1.3.0](https://github.com/laravel/vite-plugin/compare/v1.2.0...v1.3.0) - 2025-06-03

* Use rollup types from Vite by [@sapphi-red](https://github.com/sapphi-red) in https://github.com/laravel/vite-plugin/pull/325

## [v1.2.0](https://github.com/laravel/vite-plugin/compare/v1.1.1...v1.2.0) - 2025-01-21

* [1.x] Fix Invalid URL issue with Vite 6.0.9 by [@batinmustu](https://github.com/batinmustu) in https://github.com/laravel/vite-plugin/pull/317
* [1.x] Add default CORS origins by [@timacdonald](https://github.com/timacdonald) in https://github.com/laravel/vite-plugin/pull/318

## [v1.1.1](https://github.com/laravel/vite-plugin/compare/v1.1.0...v1.1.1) - 2024-12-03

* [1.1] Fix dependency issue with Vite 5 by [@jessarcher](https://github.com/jessarcher) in https://github.com/laravel/vite-plugin/pull/313

## [v1.1.0](https://github.com/laravel/vite-plugin/compare/v1.0.6...v1.1.0) - 2024-12-02

* Upgrade to Vite 6 by [@timacdonald](https://github.com/timacdonald) in https://github.com/laravel/vite-plugin/pull/310

## [v1.0.6](https://github.com/laravel/vite-plugin/compare/v1.0.5...v1.0.6) - 2024-11-12

* Replace dead link in Security Policy by [@Jubeki](https://github.com/Jubeki) in https://github.com/laravel/vite-plugin/pull/300
* Look for certificates in valet linux config directory by [@jameshulse](https://github.com/jameshulse) in https://github.com/laravel/vite-plugin/pull/307

## [v1.0.5](https://github.com/laravel/vite-plugin/compare/v1.0.4...v1.0.5) - 2024-07-09

* TypeScript: define entrypoints using object by [@tylerlwsmith](https://github.com/tylerlwsmith) in https://github.com/laravel/vite-plugin/pull/298

## [v1.0.4](https://github.com/laravel/vite-plugin/compare/v1.0.3...v1.0.4) - 2024-05-17

* Include base in hotFile without modifying server.origin replacement by [@danielztolnai](https://github.com/danielztolnai) in https://github.com/laravel/vite-plugin/pull/296

## [v1.0.3](https://github.com/laravel/vite-plugin/compare/v1.0.2...v1.0.3) - 2024-05-16

* Append base to hot file by [@timacdonald](https://github.com/timacdonald) in https://github.com/laravel/vite-plugin/pull/290
* Support Laravel Herd for windows by [@mozex](https://github.com/mozex) in https://github.com/laravel/vite-plugin/pull/293

## [v1.0.2](https://github.com/laravel/vite-plugin/compare/v1.0.1...v1.0.2) - 2024-02-28

* [1.x] Fix HMR issue when `resources/lang` directory doesn't exist and a symlink is present in the root directory by [@jessarcher](https://github.com/jessarcher) in https://github.com/laravel/vite-plugin/pull/285

## [v1.0.1](https://github.com/laravel/vite-plugin/compare/v1.0.0...v1.0.1) - 2023-12-27

* [1.x] Simpler conditional by [@Jubeki](https://github.com/Jubeki) in https://github.com/laravel/vite-plugin/pull/273
* [1.x] Account for imported CSS files while cleaning by [@timacdonald](https://github.com/timacdonald) in https://github.com/laravel/vite-plugin/pull/275
* [1.x] Fix exit error messages by [@timacdonald](https://github.com/timacdonald) in https://github.com/laravel/vite-plugin/pull/276

## [v1.0.0](https://github.com/laravel/vite-plugin/compare/v0.8.1...v1.0.0) - 2023-12-19

* [1.0] Drop CJS build and export types first by [@benmccann](https://github.com/benmccann) in https://github.com/laravel/vite-plugin/pull/235
* [1.x] Introduce `clean-orphaned-assets` binary by [@timacdonald](https://github.com/timacdonald) in https://github.com/laravel/vite-plugin/pull/251
* [0.8.x] Respect vite server.origin in viteDevServerUrl by [@nurdism](https://github.com/nurdism) in https://github.com/laravel/vite-plugin/pull/255
* [1.x] Vite 5 by [@timacdonald](https://github.com/timacdonald) in https://github.com/laravel/vite-plugin/pull/269
* [0.8.x] Fallback pages by [@timacdonald](https://github.com/timacdonald) in https://github.com/laravel/vite-plugin/pull/271
* [1.x] Auto detect Valet / Herd TLS certificates by [@timacdonald](https://github.com/timacdonald) in https://github.com/laravel/vite-plugin/pull/180

## [v0.8.1](https://github.com/laravel/vite-plugin/compare/v0.8.0...v0.8.1) - 2023-09-26

- [0.8] Fix issue with `0.0.0.0` network resolution by [@timacdonald](https://github.com/timacdonald) in https://github.com/laravel/vite-plugin/pull/241
- Upgrade vitest by [@sapphi-red](https://github.com/sapphi-red) in https://github.com/laravel/vite-plugin/pull/246

## [v0.8.0](https://github.com/laravel/vite-plugin/compare/v0.7.8...v0.8.0) - 2023-08-08

- fix: compile error following upgrade.md's vite to mix guide by [@AshboDev](https://github.com/AshboDev) in https://github.com/laravel/vite-plugin/pull/231
- Support Laravel Herd by [@claudiodekker](https://github.com/claudiodekker) in https://github.com/laravel/vite-plugin/pull/233

## [v0.7.8](https://github.com/laravel/vite-plugin/compare/v0.7.7...v0.7.8) - 2023-05-24

- Ensure 'node' has a fallback type when working with static import linters by @timacdonald in https://github.com/laravel/vite-plugin/pull/227

## [v0.7.7](https://github.com/laravel/vite-plugin/compare/v0.7.6...v0.7.7) - 2023-05-16

- Expose base types by @timacdonald in https://github.com/laravel/vite-plugin/pull/220
- Add a DOCTYPE by @matijs in https://github.com/laravel/vite-plugin/pull/215

## [v0.7.6](https://github.com/laravel/vite-plugin/compare/v0.7.5...v0.7.6) - 2023-05-10

- Polyfill import.meta.url for CJS builds by @timacdonald in https://github.com/laravel/vite-plugin/pull/217

## [v0.7.5](https://github.com/laravel/vite-plugin/compare/v0.7.4...v0.7.5) - 2023-05-09

- Build MJS and CJS versions of the plugin by @timacdonald in https://github.com/laravel/vite-plugin/pull/189

## [v0.7.4](https://github.com/laravel/vite-plugin/compare/v0.7.3...v0.7.4) - 2023-02-07

### Added

- Provide hook to access dev url while transforming by @timacdonald in https://github.com/laravel/vite-plugin/pull/195

## [v0.7.3](https://github.com/laravel/vite-plugin/compare/v0.7.2...v0.7.3) - 2022-12-20

### Changed

- Update package.json to use vite 4 compatible vite-plugin-full-reload by @iquad in https://github.com/laravel/vite-plugin/pull/186
- Respects users base config option by @timacdonald in https://github.com/laravel/vite-plugin/pull/188

## [v0.7.2](https://github.com/laravel/vite-plugin/compare/v0.7.1...v0.7.2) - 2022-12-15

### Added

- Adds Vite 4 support in https://github.com/laravel/vite-plugin/pull/179

## [v0.7.1](https://github.com/laravel/vite-plugin/compare/v0.7.0...v0.7.1) - 2022-11-21

### Fixed

- Fix node type issue by @timacdonald in https://github.com/laravel/vite-plugin/pull/166

## [v0.7.0](https://github.com/laravel/vite-plugin/compare/v0.6.1...v0.7.0) - 2022-10-25

### Changed

- Respect user manifest config by @jessarcher in https://github.com/laravel/vite-plugin/pull/150
- Support loading certificates from environment variables by @innocenzi in https://github.com/laravel/vite-plugin/pull/151

### Fixed

- Fix colors by @timacdonald in https://github.com/laravel/vite-plugin/pull/154

## [v0.6.1](https://github.com/laravel/vite-plugin/compare/v0.6.0...v0.6.1) - 2022-09-21

### Changed

- Fail running HMR in known environments by @timacdonald in https://github.com/laravel/vite-plugin/pull/128
- Do not inline small assets, by default by @timacdonald in https://github.com/laravel/vite-plugin/pull/131
- Add `lang` directories to default refresh paths by @fabio-ivona in https://github.com/laravel/vite-plugin/pull/135
- Add config option to utilise Valet TLS certificates by @timacdonald in https://github.com/laravel/vite-plugin/pull/129

### Fixed

- Ensure custom 404 page shows after server restarts by @timacdonald in https://github.com/laravel/vite-plugin/pull/141

## [v0.6.0](https://github.com/laravel/vite-plugin/compare/v0.5.4...v0.6.0) - 2022-08-25

### Added

- Support customising hot file / build path by @timacdonald in https://github.com/laravel/vite-plugin/pull/118

## [v0.5.4](https://github.com/laravel/vite-plugin/compare/v0.5.3...v0.5.4) - 2022-08-16

### Changed

- Allow chosing different env files by @LucdoOf in https://github.com/laravel/vite-plugin/pull/113

## [v0.5.3](https://github.com/laravel/vite-plugin/compare/v0.5.2...v0.5.3) - 2022-08-04

### Fixed

- Support both string and integer based IP versions by @timacdonald in https://github.com/laravel/vite-plugin/pull/108

## [v0.5.2](https://github.com/laravel/vite-plugin/compare/v0.5.1...v0.5.2) - 2022-07-22

No major changes.

## [v0.5.1](https://github.com/laravel/vite-plugin/compare/v0.5.0...v0.5.1) - 2022-07-22

### Fixed

- Do not externalise inertia helpers by @timacdonald in https://github.com/laravel/vite-plugin/pull/95
- Prevent console warning when Vite pings HMR by @jessarcher in https://github.com/laravel/vite-plugin/pull/98
- Use HMR port when specified by @guilheb in https://github.com/laravel/vite-plugin/pull/63

## [v0.5.0](https://github.com/laravel/vite-plugin/compare/v0.4.0...v0.5.0) - 2022-07-19

### Added

- Vite 3 support by @timacdonald in https://github.com/laravel/vite-plugin/pull/77

## [v0.4.0](https://github.com/laravel/package-template/compare/v0.1.0...v0.4.0) - 2022-07-13

### Changed

- Help users that visit the Vite dev server directly by @jessarcher in https://github.com/laravel/vite-plugin/pull/57
- Change default SSR build directory by @jessarcher in https://github.com/laravel/vite-plugin/pull/70

## v0.1.0 (2022-05-28)

Initial pre-release.
