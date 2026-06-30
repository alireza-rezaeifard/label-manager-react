import { motion } from 'framer-motion';

export default function LoadingScreen({ message = 'در حال بارگذاری...' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="sidebar-brand-icon mx-auto mb-4 flex h-16 w-16 items-center justify-center text-2xl"
        >
          <i className="ti ti-loader" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground"
        >
          {message}
        </motion.p>
      </div>
    </div>
  );
}
