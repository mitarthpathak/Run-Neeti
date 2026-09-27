import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { UploadStatus } from '../types';

export function StatusPanel({ uploads }: { uploads: UploadStatus[] }) {
  return (
    <div className="space-y-4">
      {uploads.map((upload) => {
        const failed = upload.status === 'failed';
        return (
          <motion.div
            key={upload.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className={cn('rounded-xl p-6 border', failed ? 'bg-red-50 border-red-100' : 'bg-surface-container-low border-slate-200')}
          >
            <div className="flex justify-between items-start mb-4 gap-4">
              <div className="flex gap-4 min-w-0">
                <span
                  className={cn('material-symbols-outlined', failed ? 'text-red-400' : 'text-secondary')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {failed ? 'error' : upload.status === 'completed' ? 'check_circle' : 'description'}
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold truncate">{upload.fileName}</h4>
                  <p className={cn('text-[10px] uppercase tracking-wider', failed ? 'text-red-500' : 'text-on-surface-variant')}>
                    {upload.subtext || 'Processing...'}
                  </p>
                </div>
              </div>
              {!failed && <span className="text-xs text-primary font-mono shrink-0">{Math.round(upload.progress)}%</span>}
            </div>
            <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', failed ? 'bg-red-300' : 'bg-gradient-to-r from-primary to-secondary')}
                initial={{ width: 0 }}
                animate={{ width: `${failed ? 100 : upload.progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
