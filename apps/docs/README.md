# NestWhats documentation

The site at <https://nedcloarbr.github.io/NestWhats>, built with
[Docusaurus](https://docusaurus.io).

## Running it

```bash
yarn workspace @nestwhats/docs start        # dev server, hot reload
yarn workspace @nestwhats/docs build        # production build into build/
yarn workspace @nestwhats/docs serve        # serve that build locally
```

The dev server only builds the default locale. To see the Portuguese site:

```bash
yarn workspace @nestwhats/docs start --locale pt-BR
```

## What is written and what is generated

- `docs/**` — the guide, written by hand.
- `docs/api/**` — **generated** by `docusaurus-plugin-typedoc` from the TSDoc in
  `packages/*/src`, on every build. It is gitignored; do not edit it, and do not
  commit it. To change what it says, change the TSDoc in the package.

TypeDoc runs against `typedoc.tsconfig.json` rather than each package's own
tsconfig. The packages map `nestwhats` to the core's *source* for editor
convenience, and with an `outDir` set TypeScript then infers a `rootDir` that
those mapped files fall outside of. One program over every package has no such
boundary.

## Translations

`i18n/pt-BR` holds the Portuguese site.

```bash
yarn workspace @nestwhats/docs write-translations --locale pt-BR
```

That extracts the theme and homepage strings into
`i18n/pt-BR/code.json`. Guide pages are translated by copying the file into
`i18n/pt-BR/docusaurus-plugin-content-docs/current/` and translating it there; a
page with no translation falls back to English rather than 404ing, so partial
coverage is fine.

The API reference is not translated — it comes from the TSDoc, which is English.

## Deployment

`.github/workflows/docs.yml` builds on every push to `master` that touches
`apps/docs/**` or `packages/*/src/**`, and publishes to GitHub Pages. Pull
requests build without deploying.

The repository needs **Settings → Pages → Source: GitHub Actions** enabled once
before the first deploy will work.
