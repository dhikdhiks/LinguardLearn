import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // KONFIGURASI UTAMA: beri tahu Turbopack di mana root sebenarnya
  turbopack: {
    root: path.join(__dirname, '../../'),
  },

  // HAPUS atau KOMMENT dulu outputFileTracingRoot
  // outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;