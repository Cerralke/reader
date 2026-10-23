# Book Reader

A small TypeScript engine that turns one book's Markdown into a quiet static reading website and a downloadable, reflowable EPUB 3. Both formats use the same parsed chapters. No framework, remote fonts, analytics, backend, or reader account.

## Develop the engine

Use Node.js 22 or 24 LTS and npm:

```sh
npm ci
npm test
npm run example
node lib/cli.js dev example
```

The example uses `/example-book/` as its base path. The dev server redirects its root to that path. Open the local server on port 3000 in your own browser. Changes to book files trigger rebuilds; refresh to see the result. A failed rebuild keeps the last successful output and reports the error in the terminal. Stop with Ctrl+C. Dev requires HTML enabled and generates the configured EPUB too.

```sh
npm run test:browser
EPUBCHECK_JAR=/path/to/epubcheck.jar npm run check:epub
```

Browser tests need Chromium (default `/usr/bin/chromium`, override with `CHROMIUM_PATH`). They exercise mobile layout, navigation without JS, preferences with/without storage, EPUB downloads, rebuilds, and axe WCAG checks. These checks complement human accessibility review.

Download EPUBCheck from its [official releases](https://github.com/w3c/epubcheck/releases), extract the archive intact, and use Java 11+. `check:epub` rebuilds the example before validation and preserves EPUBCheck's exit status. For another book:

```sh
java -jar /path/to/epubcheck.jar my-book/dist/downloads/my-book.epub
```

## Install in a separate book repository

`@your-scope/book-reader` is a **placeholder**, not a published package or claimed npm identity. Choose an available package name in `package.json` before publishing. The executable is always `book-reader`. No package has been published by this project setup.

To test locally:

```sh
# In the engine repository:
npm pack
# In a separate book repository:
npm init -y
npm install /absolute/path/to/your-scope-book-reader-0.1.0.tgz
npx book-reader build
npx book-reader dev
```

After you publish under your chosen package name, install that package with npm; the CLI commands remain the same. Engine source stays in its own repository. Packaged files include compiled JavaScript, declarations, license, documentation and the example source, excluding generated example output.

## Book layout and configuration

```text
my-book/
  book.yaml
  chapters/
    001.md
    002.md
  assets/
    cover.png
```

```yaml
title: "Example Novel"
author: "Author Name"
language: en
description: "A short description."
cover: assets/cover.png
basePath: /my-book/
siteUrl: https://example.com
chapters:
  - chapters/002.md
  - chapters/001.md
output:
  html: true
  epub: true
```

`title`, `author`, `language` and a nonempty explicit `chapters` list are required. List order is publication order, independent of filenames. UTF-8 and Polish are supported throughout. Optional fields: description, cover, basePath (default `/`), siteUrl (HTTP(S) origin), output (both default true). At least one format must be enabled. `siteUrl` plus `basePath` produces an absolute XML sitemap. Without an origin, a portable path inventory `sitemap.txt` is emitted; configure the origin before submitting a sitemap to search engines.

Chapter titles come from YAML frontmatter `title`, then the first Markdown H1, then `Chapter N`. The first Markdown H1 is removed from body content because the page renders its title. Other H1 headings become H2. Frontmatter metadata beyond title is currently ignored. Use H2 and deeper headings for chapter sections.

```markdown
---
title: A quiet morning
---

A paragraph with *emphasis* and **strong emphasis**.

> A quotation.

## A section

![Descriptive alternative text](../assets/illustration.png)

---

[Next chapter](002.md)
```

Link to another chapter using its Markdown path relative to the current chapter. Stable public URLs are derived from the source path, so editing a title does not change its URL. Moving/renaming a source file does change it. Local images must be under `assets/` and use PNG, JPEG, GIF or WebP, with simple ASCII filenames. Only referenced assets are copied/embedded. PNG/JPEG are recommended for older EPUB readers. External HTTP(S) and mailto links are allowed; remote images are rejected to keep reading private and EPUB self-contained. Raw HTML is escaped; unsafe link schemes cannot execute. Files and symlinks escaping the book directory are rejected. Input configuration and files should still be controlled by the publisher.

## Commands and output

```sh
book-reader build [book-directory]
book-reader build --format html
book-reader build --format epub
book-reader build --format all
book-reader dev [book-directory] --port 3000
```

Directory defaults to the current directory. Format flags override `output`. `html` builds omit the EPUB download link even if EPUB is normally enabled. `epub` produces only the EPUB. `all` generates both. Builds stage the complete output before replacing `dist/`; **dist is generated and replaced, so keep your own files elsewhere**. Do not run simultaneous builds against one book directory.

```text
dist/
  index.html
  chapters/chapter-<stable-id>.html
  assets/reader.css
  assets/reader.js
  assets/cover.png
  downloads/example-novel.epub
  sitemap.xml
```

Deploy the contents of `dist` to any static host at the configured base path. All generated site navigation, images, styling and download links work under a subpath. No rewrite rules are needed. EPUB internal paths are independent of the website base path. The homepage's primary action starts reading; its secondary download link is ordinary HTML. EPUB failure fails the build before publishing a link.

## Reading and accessibility

Semantic pages, skip link, native navigation, visible focus, descriptive controls, restrained typography, responsive widths and system fonts work without JavaScript. With JavaScript, a small native disclosure offers light/dark/sepia/system themes, serif/sans fonts, three sizes and widths, and two line heights. Preferences persist across chapters via guarded localStorage and are applied in the head before rendering. Storage failures leave controls usable; the default theme respects the OS. There are no animations. Readers retain browser zoom and native accessibility tools.

English and Polish interface strings live in `src/reader.ts`; add another small dictionary there. Unrecognized languages fall back to English UI while preserving the book's document language. EPUB leaves typography and theme to the reading system. Author-supplied image descriptions and heading structure still need review. No WCAG certification or device compatibility certification is claimed.

## Modules and API

- `content.ts`: validated configuration, safe files, one Markdown parser and shared model.
- `html.ts` / `reader.ts`: static templates, typography and progressive preferences.
- `epub.ts`: EPUB 3 package, navigation, spine, XHTML, CSS and embedded images using fflate ZIP.
- `index.ts`: staged multi-format build.
- `cli.ts` / `dev.ts`: CLI and loopback-only development server with polling rebuilds.

```ts
import { build, loadBook, configFrom } from '@your-scope/book-reader';
await build('./my-book', { format: 'all' });
```

The EPUB implementation is deliberately small: no conversion process or separate Markdown pipeline. The first ZIP member is uncompressed `mimetype`, with container, OPF metadata, ordered spine and navigation. EPUBCheck is the compliance gate. A publication identifier is derived from book metadata/content; modification metadata records build time. Archives are not byte-for-byte reproducible across build times.

## Current limits

No footnotes, Markdown heading anchors/fragment links, arbitrary downloadable assets, raw HTML, SVG, custom themes, plugins or live browser reload. Invalid/unsupported local links fail explicitly rather than becoming broken output. No automatic image conversion; use broadly supported image formats for older readers. One process should build a given book at a time. The server is for trusted local development, not production. Large books and images are processed in memory. EPUBCheck and automated Chromium/axe checks do not replace real Apple Books, Kobo, PocketBook and Thorium testing; those device/app checks remain manual. Kindle may require conversion or delivery through supported Amazon services.

MIT licensed. The example prose and generated abstract cover are included under the same license.
