'use client';

import { motion } from 'framer-motion';

interface AnimatedItemProps {
  children: React.ReactNode;
  key?: string | number;
  className?: string;
}

// Animasi ringan (hanya fade+slide), TANPA `layout`/spring yang mahal.
// `layout` + spring mengukur & menganimasi posisi elemen → sangat berat
// untuk list ratusan item. Animasi ini cukup untuk list kecil.
export default function AnimatedItem({ children, className }: AnimatedItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}