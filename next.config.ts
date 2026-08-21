import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { createRequire } from "module";

const require = createRequire(import.meta.url);

const nextConfig: NextConfig = {
  // `next dev` and `next build` get their own output directory.
  //
  // Sharing one `.next` lets a production build leave a route manifest behind
  // that the dev server then reads as authoritative. Pages that exist start
  // answering 404 — `/vi/login` did — and nothing explains why, because
  // nothing is actually broken: the manifest is just from the other mode.
  // Splitting the directories makes the two unable to see each other's state,
  // so `rm -rf .next` stops being a debugging step.
  //
  // Production still builds to `.next`, so nothing about deployment changes.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      tldraw: require.resolve("tldraw"),
      "@tldraw/editor": require.resolve("@tldraw/editor"),
      "@tldraw/store": require.resolve("@tldraw/store"),
      "@tldraw/state": require.resolve("@tldraw/state"),
      "@tldraw/state-react": require.resolve("@tldraw/state-react"),
      "@tldraw/utils": require.resolve("@tldraw/utils"),
      "@tldraw/validate": require.resolve("@tldraw/validate"),
      "@tldraw/tlschema": require.resolve("@tldraw/tlschema"),
    };
    return config;
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
