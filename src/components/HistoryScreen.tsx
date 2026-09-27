import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { apiFetch } from '../lib/api';
import type { SavedGraph, User } from '../types';

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  'Computer Science': { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  'Mathematics': { bg: 'bg-secondary/10', text: 'text-secondary', border: 'border-secondary/20' },
  'Physics': { bg: 'bg-tertiary/10', text: 'text-tertiary', border: 'border-tertiary/20' },
  default: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
};
const getCategoryStyle = (cat: string) => categoryColors[cat] || categoryColors.default;

interface HistoryScreenProps {
  onLoadGraph: (graph: SavedGraph) => void;
  user: User | null;
  onSignInClick: () => void;
}

export function HistoryScreen({ onLoadGraph, user, onSignInClick }: HistoryScreenProps) {
  const [graphs, setGraphs] = useState<SavedGraph[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch<{ graphs: SavedGraph[] }>('/graphs')
      .then(data => !cancelled && setGraphs(data.graphs))
      .catch(err => !cancelled && setError(err.message || 'Failed to fetch saved graphs'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [user]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this saved map?')) return;
    setDeletingId(id);
    try {
      await apiFetch(`/graphs/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setGraphs(prev => prev.filter(g => g._id !== id));
    } catch (err: any) {
      setError(err.message || 'Could not delete the map.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-10 py-8">
      <div className="max-w-xl">
        <h2 className="text-4xl md:text-5xl font-headline font-bold mb-4">Saved Networks</h2>
        <p className="text-on-surface-variant leading-relaxed">
          Every PDF you analyze while signed in is saved here. Click a card to open its knowledge graph again.
        </p>
      </div>

      {!user ? (
        <div className="text-center py-20 bg-surface-container-low rounded-[40px] border border-slate-200">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4 block">lock</span>
          <p className="text-slate-500 font-medium mb-4">Sign in to view your saved graphs.</p>
          <button onClick={onSignInClick} className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:opacity-90">Sign In</button>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div role="alert" className="bg-red-50 text-red-500 p-6 rounded-2xl border border-red-100 text-center">
          {error}
        </div>
      ) : graphs.length === 0 ? (
        <div className="text-center py-20 bg-surface-container-low rounded-[40px] border border-slate-200">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4 block">folder_open</span>
          <p className="text-slate-500 font-medium">No saved graphs yet. Upload a PDF to create your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {graphs.map((item, idx) => {
              const catStyle = getCategoryStyle(item.metadata?.category || '');
              const id = item._id as string;
              return (
                <motion.div
                  key={id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(idx, 10) * 0.05 }}
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-shadow cursor-pointer group overflow-hidden relative"
                  onClick={() => onLoadGraph(item)}
                  data-testid="history-card"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex justify-between items-start mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined">picture_as_pdf</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                      </span>
                      <button
                        onClick={e => handleDelete(e, id)}
                        disabled={deletingId === id}
                        aria-label="Delete saved map"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-primary text-sm">description</span>
                    <p className="text-[11px] font-bold text-primary truncate">{item.filename || 'Untitled.pdf'}</p>
                  </div>

                  <h4 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors truncate">
                    {item.metadata?.title || 'Untitled Graph'}
                  </h4>

                  <p className="text-xs text-on-surface-variant line-clamp-3 mb-5 min-h-[42px]">
                    {item.metadata?.description || 'Knowledge network generated from the uploaded document.'}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-5">
                    {item.metadata?.category && (
                      <span className={cn('px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border', catStyle.bg, catStyle.text, catStyle.border)}>
                        {item.metadata.category}
                      </span>
                    )}
                    {item.metadata?.complexity ? (
                      <span className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                        Level {item.metadata.complexity}
                      </span>
                    ) : null}
                    {item.fallbackUsed && (
                      <span className="px-3 py-1 bg-amber-50 rounded-full text-[9px] font-black text-amber-600 uppercase tracking-widest border border-amber-100">
                        Basic map
                      </span>
                    )}
                  </div>

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
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
