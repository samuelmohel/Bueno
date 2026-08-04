/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  env: { API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1' },
};
