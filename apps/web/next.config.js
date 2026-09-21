/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,

  // The site is published to cPanel as plain files and served by Apache; there
  // is no Node process in production. The PHP API sits alongside it under /api.
  output: 'export',
  trailingSlash: true,

  // Static export cannot run the image optimiser.
  images: { unoptimized: true },

  // Fail the build on a type error rather than shipping one. Next only enforces
  // this when asked, and the deploy artifact is committed — so a type error
  // that slipped through would be published rather than caught.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  // Security headers are set by Apache (see public/.htaccess and
  // public/api/.htaccess); `output: 'export'` cannot emit headers itself.
};
