# Release Notes

## [Unreleased](https://github.com/laravel/vite-plugin/compare/v0.7.0...main)

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
