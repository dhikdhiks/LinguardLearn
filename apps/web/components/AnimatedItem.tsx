'use client';

import { motion } from 'framer-motion';

interface AnimatedItemProps {
  children: React.ReactNode;
  key: string | number;
  className?: string;
}

export default function AnimatedItem({ children, key, className }: AnimatedItemProps) {
  return (
    <motion.div
      key={key}
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{
        layout: { duration: 0.3, type: 'spring', stiffness: 300, damping: 25 },
        opacity: { duration: 0.2 },
        y: { duration: 0.3 },
        scale: { duration: 0.2 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}