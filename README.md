# Lumora

**Presentations people can explore.** Lumora is a web platform for building interactive presentations (hotspots, quizzes, branching paths, animations and transitions), designed with security as a requirement from day one.

> The app's interface is in Italian.

**Live demo: [lumora-rosario.vercel.app](https://lumora-rosario.vercel.app)**. Press "Prova subito, senza account" to open the editor without signing up.

![Lumora homepage: a solar system where every planet is a feature](docs/screenshots/home.png)

![The tour through the planets: one world per feature, with a shooting star, meteors, an alien ship and a comet between stops](docs/screenshots/tour.gif)

## Features

- **Try it without an account**: "Prova subito" opens the editor on an example presentation for a temporary guest. Guests cannot publish and are deleted, with everything they made, after 24 hours.
- **Themes with their own art direction**: 19 themes, each built on one of seven art directions (orbits, magazine, bold blocks, collage, chalkboard, neon, soft shapes). The direction changes how covers, cards, headings, list marks and background textures are composed, so the same page looks like a different design in each theme, not just a different palette. 11 templates and 25 animated page layouts (full-bleed photo, mosaic, arrow process, concept map, VS comparison, percentage ring, icon grid, pyramid, timeline and more) share one grid and shrink their text to fit real content.
- **Real 3D objects, rendered in the browser**: Lumora has its own WebGL ray marcher (no 3D library): 16 forms (sphere, gem, molecule, drop, twisted column, interlocked rings...) in 12 physically inspired materials (glass that refracts through the whole object, mirror chrome, tinted metal, marble with veins, clay, plaster, neon, iridescent film...), lit like a studio product shot with soft shadows, ambient occlusion and a shadow on an invisible floor. One shared WebGL context draws every object and thumbnail, a few per frame. Each theme has its own 3D look on covers, sections and closings; the editor adds single objects or 12 ready-made compositions (planet with ring, podium, zen stack, coins in flight...), turns them by dragging, and "Stile 3D" re-makes every object of a presentation at once. Zib picks the materials and forms for each topic. Flat drawings get an SVG-lighting relief (puffed, carved or enamelled).
- **Templates in Lemo-Opuscar styles**: 11 templates (chalkboard lesson, keynote pitch, game-show quiz, data report, picture-book story, art deco portfolio, blueprint workshop, travel diary, tutorial, news report), each following the storytelling order of a style from the Lemo-Opuscar library, with its own theme and example content.
- **Zib writes whole presentations**: ask Zib for a presentation on any topic (optionally "with images"). With AI enabled, creating it asks Claude, through a tool call validated with zod, for the real content of every page (facts, steps, numbers, quiz questions with explanations), speaker notes with sources to check, and a look chosen for that topic: theme, margin drawings and photo search words. Limits are checked before any AI work; without AI, Lumora builds the outline with guiding placeholders.
- **Topic decorations**: illustrations in the page margins, chosen by Zib for any topic or from 14 presets. A placement algorithm only uses free margin spots, so they never cover text, photos or buttons; their amount is adjustable.
- **Free photos on request**: "Foto gratis" searches Wikimedia Commons through an authenticated, rate-limited endpoint (`/api/immagini`); only freely licensed JPEG/PNG/WebP files from Wikimedia hosts are accepted. Photos stay clean: author and licence are listed on an automatic "Crediti foto" page at the end, as the licences require.
- **Tools you will not find elsewhere**: "Cambia impaginazione" redraws a page with another layout that fits the same words; "Zib sulla pagina" rewrites, shortens, simplifies, enriches or translates the selected text; "Dispensa" turns the presentation into a printable handout with each page's text and notes. Main colours, background textures and decoration amount are customisable for the whole presentation.
- **Visual editor** with three columns (pages, canvas and properties panel): 28 shapes (stars, arrows, hearts, speech bubbles, leaves, clouds and more), a handle to rotate any element through 360° plus mirroring, 32 fonts, solid colors or gradients, shadows, outlines, layers, alignment, undo/redo and keyboard shortcuts.
- **Interactivity**: glowing hotspots, pop-up details, content to reveal, buttons that jump to other pages (quizzes and branching stories), external links with confirmation.
- **Animations and transitions**: 7 entrance effects, 4 looping effects, and fade, slide, zoom and 3D-rotate transitions between pages. All of them respect `prefers-reduced-motion`.
- **Present and share**: presenter mode with notes and timer, auto-advance, PDF export, public link with optional password, QR code and embed code.
- **The homepage is a product in itself**: an interactive solar system where every planet is a feature. The planets are rendered pixel by pixel on a canvas from procedural textures generated in Web Workers; the gas giants are modeled on Jupiter and Saturn (irregular bands, vortices, a great storm, limb darkening). Between stops a small show plays around the planet (a shooting star, a meteor shower, an alien ship circling it, a comet, a satellite); one wheel or swipe gesture moves exactly one planet, and on phones the tour drops the costly effects to stay smooth.
- **Zib, the assistant**: an alien in its spaceship (drag it anywhere on screen) that answers in real time (streaming) through Claude. On request ("make me a presentation about photosynthesis", optionally "with images") it proposes an outline and, after a preview, writes the full presentation. Without an API key it falls back to a built-in engine that understands questions without accents and with typos, answers several topics at once, follows the conversation and suggests follow-up questions.

| Tour of the features | Zib assistant |
| --- | --- |
| ![A stop of the planet tour, with an alien ship circling the planet](docs/screenshots/tour.png) | ![Chat with the Zib assistant](docs/screenshots/zib.png) |

| Dashboard | Editor |
| --- | --- |
| ![Presentations dashboard](docs/screenshots/dashboard.png) | ![Lumora editor](docs/screenshots/editor.png) |

| Themes and templates | Page layouts |
| --- | --- |
| ![Choosing a theme and template](docs/screenshots/temi.png) | ![Page layout menu](docs/screenshots/layout.png) |

On phones: the homepage, the planet tour and the editor, which stacks into one column.

![Lumora on a phone: homepage, planet tour and editor](docs/screenshots/mobile.png)

## Security

Security was designed around the OWASP Top 10 and checked with a local penetration test (unauthorized access, CSRF, injection, IDOR, malicious uploads, brute force, user enumeration, information leaks).

| Area | How it is protected |
| --- | --- |
| Passwords | argon2id with a concurrency limit; passwords found in known breaches are rejected (Have I Been Pwned, k-anonymity) |
| Login | lockout after 10 attempts, limits per IP and per email, same message and same timing for existing and non-existing accounts |
| Two-factor | TOTP with protection against code reuse, recovery codes stored as HMAC |
| Sessions | opaque tokens stored only as SHA-256 hashes, `__Host-` cookie that is HttpOnly, Secure and SameSite, rotation on password change |
| Sensitive data | TOTP secrets encrypted with AES-256-GCM, keys derived with HKDF |
| CSRF | Origin check on every request that changes data, unexpected HTTP methods rejected |
| XSS and framing | Content Security Policy with nonce and `strict-dynamic`, no unchecked HTML, framing allowed only on the embed page |
| Authorization | every read and write is filtered by owner: other users' resources return 404 |
| Uploads | file type checked from the file's bytes (not the extension), images served with `nosniff` and a `sandbox` CSP |
| Abuse | rate limits on login, saves, publishing, uploads and the assistant; per-user storage quotas |
| Content | every document validated with a Zod schema; `https` links only |
| Privacy | self-service account deletion (password and explicit confirmation, cascade delete of presentations, images and sessions); privacy, terms and cookie pages; only technical cookies |

These rules are checked by automated tests on a real PostgreSQL database
([`src/lib/security.int.test.ts`](src/lib/security.int.test.ts), run in CI on every push):
no access to another user's presentations, no private, deleted or note-revealing public pages,
single-use email tokens stored as hashes, rate limits, and complete deletion of accounts and
expired guests. Each test was checked to fail when its rule is removed.

Details and vulnerability reporting in [SECURITY.md](SECURITY.md).

## Tech stack

- **Next.js 16** (App Router, Server Actions, proxy for CSP and CSRF), **React 19**, **TypeScript**
- **Tailwind CSS 4** and **Motion** for animations and interactions
- **PostgreSQL** with **Prisma 7**
- **Canvas 2D + Web Workers** for the procedural planets
- **Claude API** (`@anthropic-ai/sdk`) for the assistant, with streaming responses
- **Vitest** for tests, **ESLint**, **GitHub Actions** with CodeQL and Dependabot

## Running locally

You need Node.js 22 or later and PostgreSQL.

```bash
git clone https://github.com/rosariosapienza12/lumora.git
cd lumora
npm install
cp .env.example .env   # then fill in DATABASE_URL and ENCRYPTION_KEY
npx prisma migrate deploy
npm run dev
```

The site runs at http://localhost:3000. To generate `ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`ANTHROPIC_API_KEY` is optional: without it, Zib answers using the built-in guide.

## Deploying for free (Vercel + Neon)

1. **Database:** create a free project on [Neon](https://neon.tech) and copy the
   connection string with connection pooling switched off (migrations need a direct
   connection).
2. **App:** on [Vercel](https://vercel.com) choose **Add New → Project**, import this
   repository and add these environment variables:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | the Neon connection string |
   | `ENCRYPTION_KEY` | 32 random bytes in base64 (command above) |
   | `APP_URL` | the site address, e.g. `https://lumora.vercel.app` |

3. **Deploy.** Vercel runs the `vercel-build` script, which applies the database
   migrations and then builds the app. `vercel.json` runs the server code in
   Frankfurt (`fra1`), next to a Neon database in Frankfurt: every page makes
   several database queries, and a server on another continent would add a
   round trip across the ocean to each one. Pick the region of your database.

Optional extras:
- `RESEND_API_KEY` and `MAIL_FROM` (a domain verified on [Resend](https://resend.com))
  to send confirmation and password-reset emails. Without them, people can still sign
  up, sign in, use the editor and try Lumora as a guest, but publishing needs a
  confirmed email.
- `ANTHROPIC_API_KEY` for Zib's AI answers. Without it, Zib uses its built-in guide.
- `CONTACT_EMAIL`: the address shown on the privacy and terms pages for data requests.

`TRUSTED_PROXY_HOPS` stays `0` on Vercel, which replaces `X-Forwarded-For` with the
real client address.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | development server |
| `npm run build` | production build |
| `npm run vercel-build` | database migrations + production build (used by Vercel) |
| `npm start` | starts the production build |
| `npm test` | unit tests; with `DATABASE_TESTS=1` also the security tests on a real PostgreSQL |
| `npm run lint` | code linting |
| `npm run typecheck` | type checking |
| `npm run e2e` | end-to-end tests with Playwright, on a computer and on a phone (signed-in tests use the dev test account) |

## Project structure

```
src/
  app/            pages and routes (marketing, auth, dashboard, editor, sharing, API)
  components/     planets, player, assistant, slide elements
  lib/            authentication, cryptography, validation, rate limiting, editor
  proxy.ts        Content Security Policy with nonce and CSRF check
prisma/           database schema and migrations
```

## Author

**Rosario Sapienza**: design, development and security testing.

Released under the [MIT](LICENSE) license.
