# Changelog

All notable changes to this project are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-08-27

### Added

- Contacts without uploaded photos now render deterministic local SVG avatar
  images generated from their name and email.
- The contacts table shows an actual avatar image in every row without calling
  any external avatar API.

## [0.2.0] - 2026-08-26

### Added

- Contacts hold many addresses, each typed `Home`, `Work`, or `Other`, with one
  optional primary address.
- The contact detail page groups addresses by type and shows primary addresses
  first inside each group.
- The contact form can add and remove address rows while preserving normal HTML
  form submission through indexed field names.

### Changed

- The contact form submits a repeatable `addresses` array instead of five flat
  address fields.
- Nested FastAPI validation errors for address rows now render on the matching
  row and field.

### Removed

- **Breaking:** flat `address`, `city`, `state`, `postal_code`, and `country`
  fields on the `Contact` type. This frontend requires backend `0.2.0` or
  newer.

## [0.1.0] - 2026-08-26

### Added

- Contact photos with a circular avatar and initials fallback.
- Initial contacts UI for list, detail, create, edit, delete, search, sort, and
  pagination.
