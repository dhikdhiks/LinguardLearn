import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: path.join(__dirname, '../../'),
  },
  // HAPUS outputFileTracingRoot (jangan dipakai!)
};

export default nextConfig;