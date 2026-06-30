import { motion } from 'framer-motion';

export default function LoadingSpinner({ size = 16, className = '' }) {
  return (
    <motion.i
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      className={`ti ti-loader ${className}`}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        fontSize: size,
      }}
    />
  );
}
