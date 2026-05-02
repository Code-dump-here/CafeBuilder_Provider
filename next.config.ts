import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { createRequire } from "module";

const require = createRequire(import.meta.url);

const nextConfig: NextConfig = {
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
