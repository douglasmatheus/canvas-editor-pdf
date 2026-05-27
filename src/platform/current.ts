/**
 * Re-export of the browser platform shim. This is the module DrawPdf imports.
 *
 * The Node build (vite --mode lib-node) replaces this file with ./node.ts via
 * `resolve.alias` in vite.config.ts. Browser builds use this file as-is.
 *
 * Do NOT import from './browser' or './node' directly — always go through './current'
 * so the platform swap stays centralized.
 */
export { platform } from './browser'
