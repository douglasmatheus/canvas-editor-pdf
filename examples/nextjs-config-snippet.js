// next.config.js — required snippet to use canvas-editor-pdf/node with Next.js
//
// Why: @napi-rs/canvas and @resvg/resvg-js are native modules (prebuilt
// binaries), and canvas-editor-pdf already ships pre-bundled artifacts at
// dist/node/. Webpack would either fail to bundle the native binaries or
// duplicate the canvas-editor-pdf code wastefully. Marking them external
// tells webpack "leave these alone, let Node resolve them at runtime".
//
// Pick the variant that matches your Next.js version.

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing options here...

  // -----------------------------------------------------------------------
  // OPTION A — Next 15+ (recommended if you can)
  // -----------------------------------------------------------------------
  // serverExternalPackages: [
  //   '@napi-rs/canvas',
  //   '@resvg/resvg-js',
  //   'canvas-editor-pdf'
  // ],

  // -----------------------------------------------------------------------
  // OPTION B — Next 13.4 – 14.x (experimental name)
  // -----------------------------------------------------------------------
  // experimental: {
  //   serverComponentsExternalPackages: [
  //     '@napi-rs/canvas',
  //     '@resvg/resvg-js',
  //     'canvas-editor-pdf'
  //   ]
  // },

  // -----------------------------------------------------------------------
  // OPTION C — Next 12.x (no top-level option, drop down to webpack)
  // -----------------------------------------------------------------------
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push(
        '@napi-rs/canvas',
        '@resvg/resvg-js',
        'canvas-editor-pdf'
      )
    }
    return config
  },
}

module.exports = nextConfig
