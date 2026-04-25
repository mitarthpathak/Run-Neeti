import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ScrollQuiz } from './ScrollQuiz';

// ─── Helper: build a dynamic roadmap from graph nodes ───────────────
function buildDynamicRoadmap(data: any) {
  const nodes = data?.nodes || [];
  if (nodes.length === 0) return null;

  // Sort by importance descending, pick top major/header nodes
  const sorted = [...nodes]
    .filter((n: any) => n.label)
    .sort((a: any, b: any) => (b.importance || 5) - (a.importance || 5));

  const coreNodes = sorted.filter((n: any) => n.type === 'major' || n.type === 'core');
  const headerNodes = sorted.filter((n: any) => n.type === 'header');
  const subNodes = sorted.filter((n: any) => n.type === 'sub-topic' || n.type === 'concept');

  // Build a 4-6 item roadmap from the hierarchy
  const roadmap: any[] = [];
  
  // Step 1: Core/major topics → "completed" (foundation)
  coreNodes.slice(0, 2).forEach((n: any, i: number) => {
    roadmap.push({
      number: String(i + 1).padStart(2, '0'),
      title: n.label,
      status: 'completed',
      desc: n.desc || `Foundational concept: ${n.label}`,
    });
  });

  // Step 2: Header topics → "in-progress" (currently studying)
  headerNodes.slice(0, 2).forEach((n: any, i: number) => {
    roadmap.push({
      number: roadmap.length === 2 ? '★' : String(roadmap.length + 1).padStart(2, '0'),
      title: n.label,
      status: i === 0 ? 'in-progress' : 'locked',
      desc: n.desc || `Key topic requiring focused study.`,
    });
  });

  // Step 3: Sub-topics → "locked" (upcoming)
  subNodes.slice(0, 2).forEach((n: any) => {
    roadmap.push({
      number: String(roadmap.length + 1).padStart(2, '0'),
      title: n.label,
      status: 'locked',
      desc: n.desc || `Advanced concept to be explored.`,
    });
  });

  // Ensure at least 3 items
  if (roadmap.length < 3) return null;
  return roadmap.slice(0, 6);
}

// ─── Helper: build related modules from graph nodes ─────────────────
function buildDynamicRelatedModules(data: any) {
  const nodes = data?.nodes || [];
  if (nodes.length === 0) return null;

  const iconMap: Record<string, string> = {
    core: 'hub', major: 'category', header: 'account_tree',
    'sub-topic': 'schema', concept: 'lightbulb',
  };

  // Pick diverse nodes for "related modules"
  const picked = [...nodes]
    .filter((n: any) => n.label && n.desc)
    .sort(() => Math.random() - 0.5)
    .slice(0, 5);

  return picked.map((n: any) => ({
    icon: iconMap[n.type] || 'auto_awesome',
    title: n.label,
    desc: n.desc ? (n.desc.length > 60 ? n.desc.slice(0, 57) + '…' : n.desc) : 'Extracted concept',
  }));
}

// ─── Main DetailsScreen ─────────────────────────────────────────────
export function DetailsScreen({ data, viewedNodeIds }: { data: any, viewedNodeIds: Set<string> }) {
  const [isRelatedMaximized, setIsRelatedMaximized] = useState(false);

  // Dynamic data from graph
  const dynamicRoadmap = useMemo(() => buildDynamicRoadmap(data), [data]);
  const dynamicModules = useMemo(() => buildDynamicRelatedModules(data), [data]);

  const metadata = useMemo(() => {
    const base = data?.metadata || {};
    return {
      title: base.title || 'Knowledge Graph',
      description: base.description || 'Your uploaded document has been analyzed and the knowledge graph is ready for exploration.',
      complexity: base.complexity || 5,
      category: base.category || 'General Study',
      roadmap: dynamicRoadmap || base.roadmap || [
        { number: '01', title: 'Document Scan', status: 'completed', desc: 'Initial extraction of core content.' },
        { number: '02', title: 'Concept Mapping', status: 'in-progress', desc: 'Building relationships between entities.' },
        { number: '03', title: 'Deep Analysis', status: 'locked', desc: 'Detailed semantic understanding.' },
      ],
      relatedModules: dynamicModules || base.relatedModules || [
        { icon: 'analytics', title: 'Pattern Recognition', desc: 'Statistical distribution of key terms' },
        { icon: 'account_tree', title: 'Hierarchy Discovery', desc: 'Nested relationship identification' },
        { icon: 'hub', title: 'Semantic Links', desc: 'Cross-concept connections' },
      ],
    };
  }, [data, dynamicRoadmap, dynamicModules]);

  const nodeCount = data?.nodes?.length || 0;
  const exploredCount = viewedNodeIds?.size || 0;
  const progressPercent = nodeCount > 0 ? Math.round((exploredCount / nodeCount) * 100) : 0;
  const filename = data?.filename || 'No document loaded';
  const hasData = !!(data && data.nodes && data.nodes.length > 0);

  return (
    <div className="space-y-12 py-8 relative">

      {/* ─── Top Hero Card with PDF info ──────────────────────── */}
      <div className="relative h-64 rounded-[40px] overflow-hidden group">
        <img
          src={`https://picsum.photos/seed/${encodeURIComponent(metadata.title)}/1200/400`}
          alt="Concept Background"
          className="w-full h-full object-cover opacity-40 transition-transform duration-700 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/50 to-transparent backdrop-blur-[2px]"></div>
        <div className="absolute inset-0 p-10 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            {/* PDF file badge */}
            <div className="flex items-center gap-3 px-5 py-2.5 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm">
              <span className="material-symbols-outlined text-primary text-lg">picture_as_pdf</span>
              <div>
                <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{filename}</p>
                <p className="text-[9px] text-on-surface-variant">{nodeCount} concepts extracted</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 backdrop-blur-md rounded-full border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                {hasData ? 'Live Document Map' : 'Awaiting Document'}
              </span>
            </div>
          </div>
          <div className="max-w-xl space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-xl">
                <span className="material-symbols-outlined text-primary text-3xl">auto_stories</span>
              </div>
              <div>
                <h3 className="text-2xl font-headline font-bold text-slate-900">{metadata.category} Intelligence</h3>
                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{filename}</p>
              </div>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed font-medium">
              {hasData
                ? `We've processed ${nodeCount} semantic entities to build your personal ${metadata.title} knowledge graph.`
                : 'Upload a PDF to see your personalized knowledge breakdown here.'}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Main 2-col: Roadmap | Title+Stats ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left: Roadmap */}
        <div className="lg:col-span-5 space-y-8">
          <div className="flex justify-between items-end">
            <h3 className="text-3xl font-headline font-bold">Prerequisite Roadmap</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{metadata.roadmap.length} Milestones</p>
          </div>
          <div className="relative space-y-12 pl-12 pt-4">
            <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-primary via-surface-container-highest to-surface-container-highest"></div>

            {metadata.roadmap.map((item: any, idx: number) => (
              <RoadmapItem
                key={idx}
                number={item.number}
                title={item.title}
                status={item.status}
                desc={item.desc}
                active={item.status === 'in-progress'}
              />
            ))}
          </div>
        </div>

        {/* Right: Content */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-6">
            <div className="flex gap-2">
              <span className="px-4 py-1 bg-tertiary/10 text-tertiary text-[10px] font-black uppercase rounded-full border border-tertiary/20 tracking-widest">{metadata.category}</span>
              <span className="px-4 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-full border border-primary/20 tracking-widest">
                {metadata.complexity >= 8 ? 'High Complexity' : metadata.complexity >= 5 ? 'Medium Complexity' : 'Low Complexity'}
              </span>
            </div>
            <h2 className="text-7xl font-headline font-bold leading-[0.9] text-slate-900">
              {metadata.title.split(' ').length > 1 ? (
                <>
                  {metadata.title.split(' ').slice(0, -1).join(' ')} <br />
                  <span className="text-primary italic">{metadata.title.split(' ').slice(-1)}</span>
                </>
              ) : (
                <span className="text-primary italic">{metadata.title}</span>
              )}
            </h2>
            <p className="text-on-surface-variant text-xl leading-relaxed font-medium opacity-80">
              {metadata.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low p-8 rounded-[32px] border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant mb-4 opacity-50">Syllabus Complexity</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-headline font-bold text-primary">Level {metadata.complexity.toString().padStart(2, '0')}</p>
                <p className="text-xs font-bold text-slate-400">/ 10</p>
              </div>
            </div>
            <div className="bg-surface-container-low p-8 rounded-[32px] border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant mb-4 opacity-50">Semantic Context</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-headline font-bold text-tertiary">{nodeCount}</p>
                <p className="text-xs font-bold text-slate-400">Concepts</p>
              </div>
            </div>
          </div>

          {/* Exploration Progress */}
          <div className="bg-surface-container-low p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50">Exploration Progress</p>
                <p className="text-xl font-headline font-bold mt-1">Syllabus Mastery</p>
              </div>
              <p className="text-3xl font-headline font-bold text-primary">{progressPercent}%</p>
            </div>
            <div className="h-4 bg-surface-container-highest rounded-full overflow-hidden p-1 shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-primary via-secondary to-tertiary rounded-full shadow-lg"
              ></motion.div>
            </div>
            <p className="text-xs text-on-surface-variant font-medium text-center">
              You have successfully explored {exploredCount} out of {nodeCount} knowledge nodes.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Side-by-side: Related Modules (LEFT) + Quiz (RIGHT) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT — Related Modules (collapsed card only) */}
        <div className="lg:col-span-4 lg:sticky lg:top-28">
          {!isRelatedMaximized && (
            <motion.div
              layoutId="related-container"
              className="bg-surface-container-low p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-tertiary/10 rounded-xl">
                    <span className="material-symbols-outlined text-tertiary text-lg">hub</span>
                  </div>
                  <h4 className="text-xl font-headline font-bold">Related Modules</h4>
                </div>
                <button onClick={() => setIsRelatedMaximized(true)} className="w-9 h-9 rounded-xl bg-surface-container-highest flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                  <span className="material-symbols-outlined text-sm">open_in_full</span>
                </button>
              </div>
              <div className="space-y-3">
                {metadata.relatedModules.slice(0, 5).map((mod: any, idx: number) => (
                  <RelatedModule key={idx} icon={mod.icon} title={mod.title} desc={mod.desc} />
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* RIGHT — Knowledge Check Quiz */}
        <div className="lg:col-span-8">
          <ScrollQuiz data={data} />
        </div>
      </div>

      {/* ─── Maximized Related Modules Overlay (outside grid, over everything) ─ */}
      <AnimatePresence>
        {isRelatedMaximized && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
              onClick={() => setIsRelatedMaximized(false)}
            />
            <motion.div
              layoutId="related-container"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative w-full max-w-4xl bg-white rounded-[48px] p-16 shadow-2xl space-y-12 z-10"
            >
              <div className="flex justify-between items-center">
                <h4 className="text-5xl font-headline font-bold">Extended Knowledge Domains</h4>
                <button onClick={() => setIsRelatedMaximized(false)} className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:bg-primary transition-all">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {metadata.relatedModules.map((mod: any, idx: number) => (
                  <RelatedModule key={idx} icon={mod.icon} title={mod.title} desc={mod.desc} large />
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── RoadmapItem ────────────────────────────────────────────────────
function RoadmapItem({ number, title, status, desc, active = false }: { number: string; title: string; status: string; desc: string; active?: boolean }) {
  return (
    <div className="relative group">
      <div className={cn(
        'absolute -left-12 w-12 h-12 rounded-full border-2 flex items-center justify-center z-10 transition-all',
        active ? 'bg-primary border-primary shadow-[0_0_16px_rgba(8,145,178,0.3)]' : 'bg-surface-container-low border-surface-container-highest group-hover:border-primary/50'
      )}>
        <span className={cn('text-xs font-bold', active ? 'text-on-primary' : 'text-on-surface-variant')}>{number}</span>
      </div>
      <div className={cn(
        'p-6 rounded-3xl border transition-all',
        active ? 'bg-surface-container-high border-primary/20' : 'bg-surface-container-low border-slate-200 opacity-60'
      )}>
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-bold">{title}</h4>
          <span className={cn('text-[8px] font-bold uppercase px-1.5 py-0.5 rounded',
            status === 'completed' ? 'bg-tertiary/20 text-tertiary' :
            status === 'in-progress' ? 'bg-primary/20 text-primary' : 'bg-surface-container-highest text-on-surface-variant'
          )}>
            {status.replace('-', ' ')}
          </span>
        </div>
        <p className="text-[10px] text-on-surface-variant leading-relaxed">
          {desc}
        </p>
        {active && (
          <div className="flex gap-3 mt-4">
            <button className="flex-1 py-2 bg-primary text-on-primary text-[10px] font-bold rounded-lg">Resume Study</button>
            <button className="flex-1 py-2 bg-surface-container-highest text-on-surface text-[10px] font-bold rounded-lg">View Exercises</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RelatedModule ──────────────────────────────────────────────────
function RelatedModule({ icon, title, desc, large = false }: { icon: string; title: string; desc: string; large?: boolean }) {
  return (
    <div className={cn(
      'flex gap-4 items-center rounded-2xl transition-all cursor-pointer group',
      large ? 'p-6 bg-slate-50 border border-slate-100 hover:border-primary/30' : 'p-4 hover:bg-surface-container-high'
    )}>
      <div className={cn(
        'bg-surface-container-highest rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shrink-0',
        large ? 'w-16 h-16 shadow-sm' : 'w-10 h-10'
      )}>
        <span className={cn('material-symbols-outlined', large ? 'text-2xl' : 'text-sm')}>{icon}</span>
      </div>
      <div className="min-w-0">
        <h5 className={cn('font-bold transition-colors group-hover:text-primary truncate', large ? 'text-xl' : 'text-sm')}>{title}</h5>
        <p className={cn('text-on-surface-variant font-medium line-clamp-2', large ? 'text-xs mt-1' : 'text-[10px]')}>{desc}</p>
      </div>
    </div>
  );
}
