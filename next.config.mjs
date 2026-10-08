/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,

  // Optimasi bundling: tree-shake barrel export library berat
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', '@base-ui/react'],
  },

  images: {
    // Format modern → lebih kecil, dikompresi otomatis oleh Vercel Image Optimization
    formats: ['image/avif', 'image/webp'],
    // Cache hasil optimisasi gambar di edge Vercel
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
