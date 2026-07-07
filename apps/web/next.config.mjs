/** @type {import('next').NextConfig} */
const nextConfig = {
  // Important for monorepo: helps Next.js find dependencies in the root
  outputFileTracingRoot: import.meta.dirname,
  
  // Your other config options here
  reactStrictMode: true,
};

export default nextConfig;