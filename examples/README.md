# Examples

Each file in this directory is **self-contained** — copy it into your project,
adapt the imports, and it works. Pick the one that matches your stack:

## Backend / Node

| File | When to use |
|---|---|
| [next-pages-router-api.ts](./next-pages-router-api.ts) | Next.js 12.x – 14.x using `pages/api/...` |
| [next-app-router-api.ts](./next-app-router-api.ts) | Next.js 13.4+ using `app/.../route.ts` |
| [nextjs-config-snippet.js](./nextjs-config-snippet.js) | The `next.config.js` tweak required by **both** Next examples (webpack externals or `serverExternalPackages`, depending on your Next version) |
| [express-server.mjs](./express-server.mjs) | Plain Node / Express / Fastify-style HTTP server |
| [standalone-script.mjs](./standalone-script.mjs) | CLI tools, batch jobs, queue workers — no HTTP layer |

## Browser / Frontend

| File | When to use |
|---|---|
| [browser-client.html](./browser-client.html) | Vanilla JS page that POSTs to one of the backend examples and downloads the resulting PDF. Same pattern in React/Vue/Svelte — just wrap the `fetch` in your framework. |

## Common setup (any backend)

Before running anything in this directory you need three packages installed in
the consumer project:

```bash
npm install canvas-editor-pdf @napi-rs/canvas @resvg/resvg-js
```

- `@napi-rs/canvas` powers text measurement (Skia native binary)
- `@resvg/resvg-js` powers SVG → PNG for LaTeX rendering
- Both are declared as **optional peer deps** of `canvas-editor-pdf`, so
  browser consumers can skip them, but Node consumers must install them
  explicitly (they don't get pulled in automatically).

Requires **Node 18+**.

## Common pitfalls

1. **Bundler tries to bundle the native binaries** → mark `@napi-rs/canvas`,
   `@resvg/resvg-js` and `canvas-editor-pdf` as externals (see
   [nextjs-config-snippet.js](./nextjs-config-snippet.js); the same idea
   applies to webpack/esbuild/etc. in non-Next setups).

2. **CORS error from a browser frontend** → the server-side `cors` middleware
   must not use `origin: '*'` with `credentials: true` at the same time
   (browsers reject this combination per spec). See the example handlers for
   a config that actually passes preflight.

3. **TS can't find `canvas-editor-pdf/node`** → your tsconfig has
   `moduleResolution: "node"` (the legacy form). The subpath export needs
   modern resolution. Change to:
   ```json
   "moduleResolution": "bundler"  // or "node16" / "nodenext"
   ```

4. **PDF is truncated / empty** → server's JSON body parser is capping the
   payload. For Next set `export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }`
   in the route file; for Express use `app.use(express.json({ limit: '10mb' }))`.
