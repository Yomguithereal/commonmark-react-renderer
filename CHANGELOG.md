# Change Log

All notable changes will be documented in this file.

## Unreleased

### Changes

- **Breaking change**: The renderer now requires Node 0.14 or higher. This is because the renderer uses stateless components internally.
- **Breaking change**: `allowNode` now receives different properties in the options argument. See `README.md` for more details.
- **Breaking change**: CommonMark has changed some type names. `Html` is now `HtmlInline`, `Header` is now `Heading` and `HorizontalRule` is now `ThematicBreak`. This affects the `allowedTypes` and `disallowedTypes` options.
- **Breaking change**: A bug in the `allowedTypes`/`disallowedTypes` and `allowNode` options made them only applicable to certain types. In this version, all types are filtered, as expected.

### Added

- New `renderers` option allows you to customize which React component should be used for rendering given types. See `README.md` for more details. (Espen Hovlandsdal / Guillaume Plique)
- New `unwrapDisallowed` option allows you to select if the contents of a disallowed node should be "unwrapped" (placed into the disallowed node position). For instance, setting this option to true and disallowing a link would still render the text of the link, instead of the whole link node and all it's children disappearing. (Espen Hovlandsdal)

## [2.2.2] - 2016-01-22

### Added

- Provide index-based keys to generated elements to silent warnings from React (Guillaume Plique)

## [2.2.1] - 2016-01-22

### Changed

- Upgrade commonmark to latest version (Guillaume Plique)

## [2.2.0] - 2015-12-11

### Added

- Allow passing `allowNode` - a function which determines if a given node should be allowed (Espen Hovlandsdal)

## [2.1.0] - 2015-11-20

### Added

- Add support for specifying which types should be allowed - `allowTypes`/`disallowedTypes` (Espen Hovlandsdal)

## [2.0.2] - 2015-11-19

### Added

- Add support for hard linebreaks (marlonbaeten)

## [2.0.1] - 2015-10-22

### Changed

- Peer dependency for React was (incorrectly) set to >= 0.14.0, when 0.13.3 was supported.

[2.1.0]: https://github.com/rexxars/commonmark-react-renderer/compare/v2.0.2...v2.1.0
[2.0.2]: https://github.com/rexxars/commonmark-react-renderer/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/rexxars/commonmark-react-renderer/compare/90b2489a515bca26d0d58954ab098a48bedee406...v2.0.1
