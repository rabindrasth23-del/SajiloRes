import type { NextConfig } from "next";

const nextConfig: NextConfig = { productionBrowserSourceMaps: true,
  /* config options here */
};

import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });
export default withBundleAnalyzer(nextConfig);
