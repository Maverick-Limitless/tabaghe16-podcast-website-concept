# Deployment — a fully static site

The build output (`build/`) is a complete static site: every page is prerendered HTML plus hashed assets, with a `404.html` fallback for unmatched URLs. There is no server runtime, no database, and no API. Any static host can serve it as-is.

## Build

```sh
pnpm install --frozen-lockfile   # lockfile matches package.json
pnpm run sync                    # refresh the store from the official feed
pnpm run build                   # prerender everything into build/
```

`pnpm run preview` serves the result locally at `http://localhost:4173` — the same command the E2E suite builds against.

The **build machine needs network access** to the Acast feed for `sync`; the built site itself is static and makes no server-side requests. Visitors' browsers fetch two things from third parties: episode artwork from `assets.pippa.io` and — only after a visitor presses play — audio from the Acast hosts, both allowlisted in the CSP.

## Host requirements

1. Serve `build/` at the site root with `404.html` as the not-found fallback (all mainstream static hosts support this; some call it the SPA/error fallback — point it at the file `404.html`, which is already the rendered Persian recovery page).
2. Set the headers a meta-tag CSP cannot carry — these are part of the security contract (`docs/SECURITY.md`):

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: <the meta-tag policy>; frame-ancestors 'none'
```

(Repeating the CSP as a header lets you add `frame-ancestors`, which meta tags ignore. Copy the directive list from any built page's CSP meta tag.)
3. Long-cache the hashed `/_app/immutable/` assets (`Cache-Control: public, max-age=31536000, immutable`); serve `index.html`-type pages with `no-cache` or short caching so redeploys appear immediately.
4. Set `PUBLIC_ORIGIN` at build time to the real `https://` origin so canonical URLs, Open Graph URLs, and the sitemap point at the deployed address (see `.env.example`).

## Refreshing content (the whole operations model)

There is no admin panel in this cut, by design. Freshness is a build concern:

```sh
pnpm run sync     # fetch the official feed, run the extraction rules,
                  # write data/store/*.json (idempotent; safe to re-run)
git add data/store && git commit -m "chore: sync store from the feed"
pnpm run build && <deploy build/>
```

- **Scheduling:** any scheduler that can run those three steps — a GitHub Action on a cron, a server cron with the repository checked out, or a manual rhythm. A daily refresh matches the show's publication cadence with generous margin.
- **Freshness visibility:** the archive's stale-data banner reads `data/store/sync-run.json` and appears only when the last successful sync is older than the configured threshold (`STALE_AFTER_DAYS`, currently 14) — the public site degrades to a quiet notice, never to empty pages.
- **Failure behavior:** a failed sync changes nothing — the committed store keeps serving, and `sync-run.json` records the failure. A truncated or unreachable feed never un-publishes episodes (records missing from a run are retained by the sync).

## Rollback

The store, the code, and the build are all in git: `git revert` (or checkout the previous tag), rebuild, redeploy. There is no data migration to unwind — the committed JSON store *is* the backup, and any previous build remains servable as-is.

## Choosing a host

Anything static works. Considerations that matter for this site: custom-domain HTTPS with a certificate the host manages (required for `PUBLIC_ORIGIN`), header control for the block above, and a cache purge on deploy. The site has no region or latency-sensitivity beyond ordinary static-asset delivery; no serverless functions are needed.

## Checklist before going live

- [ ] Owner approval obtained (this remains an unsolicited concept until then — `README.md` §14)
- [ ] `PUBLIC_ORIGIN` set to the real https origin
- [ ] Security headers from this page configured on the host
- [ ] A scheduled (or manual-with-reminder) `sync` + commit + deploy rhythm in place
- [ ] `npx playwright test` green against the production build from a clean checkout
