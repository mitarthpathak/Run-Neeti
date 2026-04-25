import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { User } from '../types';

interface SavedGraph {
  _id: string;
  filename: string;
  createdAt: string;
  metadata?: any;
  graph: any;
}

export function HistoryScreen({ onLoadGraph, user }: { onLoadGraph: (graph: any) => void; user: User | null }) {
  const [graphs, setGraphs] = useState<SavedGraph[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGraphs = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/graphs?userEmail=${user.email}`);
        const data = await response.json();
        if (data.success) {
          setGraphs(data.graphs);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError('Failed to fetch saved graphs');
      } finally {
        setLoading(false);
      }
    };

    fetchGraphs();
  }, [user]);

  // Category color map
  const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
    'Computer Science': { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
    'Mathematics': { bg: 'bg-secondary/10', text: 'text-secondary', border: 'border-secondary/20' },
    'Physics': { bg: 'bg-tertiary/10', text: 'text-tertiary', border: 'border-tertiary/20' },
    default: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  };

  const getCategoryStyle = (cat: string) => categoryColors[cat] || categoryColors.default;

  return (
    <div className="space-y-10 py-8">
      <div className="max-w-xl">
        <h2 className="text-5xl font-headline font-bold mb-4">Saved Networks</h2>
        <p className="text-on-surface-variant leading-relaxed">
          Access your previous excavations. Every PDF you've analyzed is stored here for retrieval.
        </p>
      </div>

      {!user?.email ? (
        <div className="text-center py-20 bg-surface-container-low rounded-[40px] border border-slate-200">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4 block">lock</span>
          <p className="text-slate-500 font-medium">Sign in to view your saved graphs.</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-500 p-6 rounded-2xl border border-red-100 text-center">
          {error}
        </div>
      ) : graphs.length === 0 ? (
        <div className="text-center py-20 bg-surface-container-low rounded-[40px] border border-slate-200">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4 block">folder_open</span>
          <p className="text-slate-500 font-medium">No saved graphs found yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {graphs.map((item, idx) => {
            const catStyle = getCategoryStyle(item.metadata?.category || '');
            const nodeTypes = (item.graph?.nodes || []).reduce((acc: Record<string, number>, n: any) => {
              const t = n.type || 'concept';
              acc[t] = (acc[t] || 0) + 1;
              return acc;
            }, {});

            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group overflow-hidden relative"
                onClick={() => onLoadGraph(item)}
              >
                {/* Accent stripe */}
                <div className={cn('absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-tertiary opacity-0 group-hover:opacity-100 transition-opacity')} />

                {/* Header row: icon, date */}
                <div className="flex justify-between items-start mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined">picture_as_pdf</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                {/* PDF Filename — prominently shown */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-primary text-sm">description</span>
                  <p className="text-[11px] font-bold text-primary truncate">{item.filename || 'Untitled.pdf'}</p>
                </div>

                {/* Title (from metadata — the subject/topic) */}
                <h4 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors truncate">
                  {item.metadata?.title || 'Untitled Graph'}
                </h4>

                {/* Brief description */}
                <p className="text-xs text-on-surface-variant line-clamp-3 mb-5 min-h-[42px]">
                  {item.metadata?.description || 'Knowledge network generated from the uploaded document.'}
                </p>

                {/* Category & Complexity badges */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {item.metadata?.category && (
                    <span className={cn('px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border', catStyle.bg, catStyle.text, catStyle.border)}>
                      {item.metadata.category}
                    </span>
                  )}
                  {item.metadata?.complexity && (
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                      Level {item.metadata.complexity}
                    </span>
                  )}
                </div>

                {/* Stats footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex gap-2">
                    <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]">hub</span>
                      {item.graph?.nodes?.length || 0} Nodes
                    </span>
                    <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]">link</span>
                      {item.graph?.edges?.length || 0} Edges
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all">
                    arrow_forward
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
