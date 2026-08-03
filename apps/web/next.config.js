/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  output: 'standalone',
  env: { API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1' },
};
