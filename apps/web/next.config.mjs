import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: path.join(__dirname, '../../'),
  },
  // TAMBAHKAN INI: arahkan output ke .next di dalam apps/web
  distDir: '.next',
};

export default nextConfig;