import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as d3 from 'd3-force';
import { cn } from '../lib/utils';

interface NodeData {
  id: string;
  label: string;
  type: 'core' | 'major' | 'minor';
  category: 'primary' | 'secondary' | 'tertiary';
  x: number;
  y: number;
  desc?: string;
  icon?: string;
}

export function GraphScreen({ data, onNodeExplored, viewedNodeIds }: { data?: any, onNodeExplored: (id: string) => void, viewedNodeIds: Set<string> }) {
  const [zoom, setZoom] = useState(0.8);
  const [hoveredNode, setHoveredNode] = useState<any | null>(null);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [simNodes, setSimNodes] = useState<any[]>([]);

  // Step 1: Initialize Force Simulation for the "Web" effect
  useEffect(() => {
    if (!data?.nodes) return;

    const nodes = data.nodes.map((n: any) => ({ ...n }));
    const links = (data.edges || []).map((e: any) => ({
      source: e.source || e.from,
      target: e.target || e.to,
      ...e
    }));

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance((d: any) => {
        const sourceNode = nodes.find(n => n.id === d.source.id);
        const targetNode = nodes.find(n => n.id === d.target.id);
        if (sourceNode?.type === 'major' || targetNode?.type === 'major') return 350;
        if (sourceNode?.type === 'header' || targetNode?.type === 'header') return 200;
        return 120;
      }))
      .force("charge", d3.forceManyBody().strength((d: any) => {
        if (d.type === 'major') return -3000;
        if (d.type === 'header') return -1500;
        return -600;
      }))
      .force("center", d3.forceCenter(0, 0))
      .force("collide", d3.forceCollide().radius((d: any) => {
        if (d.type === 'major') return 200;
        if (d.type === 'header') return 140;
        return 90;
      }))
      // Adding Radial Force for the "Circular around parent" effect
      .force("radial", d3.forceRadial((d: any) => {
          if (d.type === 'major') return 0;
          if (d.type === 'header') return 350;
          if (d.type === 'sub-topic') return 550;
          return 750;
      }, 0, 0).strength(0.8))
      .force("x", d3.forceX().strength(0.05))
      .force("y", d3.forceY().strength(0.05));

    simulation.on("tick", () => {
      setSimNodes([...nodes]);
    });

    return () => simulation.stop();
  }, [data]);

  const displayNodes = simNodes.map((node) => ({
    ...node,
    isViewed: viewedNodeIds.has(node.id)
  }));

  const displayEdges = (data?.edges || []).map((edge: any) => {
    const s = displayNodes.find(n => n.id === (edge.source || edge.from));
    const t = displayNodes.find(n => n.id === (edge.target || edge.to));
    return { ...edge, s, t };
  }).filter(e => e.s && e.t);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.2));
  const handleReset = () => setZoom(0.8);

  const toggleMaximize = () => setIsMaximized(!isMaximized);

  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
    onNodeExplored(node.id);
  };

  return (
    <div className={cn("space-y-8 py-8 w-full transition-all duration-500", isMaximized ? "fixed inset-0 z-[60] bg-background p-12 overflow-hidden flex flex-col" : "max-w-full")}>
      {!isMaximized && (
        <div className="max-w-3xl space-y-4 px-4 flex justify-between items-end w-full">
          <div>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Semantic Architecture</p>
            <h2 className="text-5xl font-headline font-bold">Concept Galaxy</h2>
            <p className="text-on-surface-variant leading-relaxed max-w-lg mt-2">
              Deep dive into the neural structure of your document. Nodes represent granular concepts interconnected into a complex web of knowledge.
            </p>
          </div>
          <div className="bg-surface-container-high px-8 py-4 rounded-[32px] border border-slate-200 shadow-sm text-center">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Mastery</p>
            <p className="text-3xl font-headline font-bold text-primary">{viewedNodeIds.size} <span className="text-sm text-slate-400">/ {displayNodes.length}</span></p>
          </div>
        </div>
      )}

      <div
        className={cn(
          "relative w-full bg-surface-container-low rounded-[40px] border border-slate-200 overflow-hidden cursor-grab active:cursor-grabbing shadow-inner transition-all duration-500",
          isMaximized ? "flex-1 rounded-none border-none p-0" : "h-[850px]"
        )}
        ref={containerRef}
      >
        <motion.div
          drag
          dragConstraints={containerRef}
          className="absolute inset-0 flex items-center justify-center w-full h-full transform-origin-center"
          animate={{ scale: zoom }}
          transition={{ type: 'spring', bounce: 0.1, duration: 0.4 }}
        >
          {/* Edges SVG Layer */}
          <svg
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            width="10000"
            height="10000"
          >
            <g transform="translate(5000, 5000)">
              {displayEdges.map((edge: any, i: number) => {
                const s = edge.s;
                const t = edge.t;

                const isHoveredEdge = hoveredNode && (hoveredNode.id === s.id || hoveredNode.id === t.id);
                const isViewedEdge = s.isViewed && t.isViewed;
                const opacity = hoveredNode ? (isHoveredEdge ? 1.0 : 0.05) : (isViewedEdge ? 0.6 : 0.2);
                const strokeWidth = (edge.importance || 5) * 0.8;

                return (
                  <motion.line
                    key={i}
                    x1={s.x}
                    y1={s.y}
                    x2={t.x}
                    y2={t.y}
                    stroke={isHoveredEdge ? "var(--color-primary)" : (isViewedEdge ? "var(--color-tertiary)" : "#cbd5e1")}
                    strokeWidth={isHoveredEdge ? Math.max(strokeWidth, 6) : strokeWidth}
                    initial={{ opacity: 0 }}
                    animate={{ opacity }}
                    transition={{ duration: 0.3 }}
                  />
                );
              })}
            </g>
          </svg>

          {/* Nodes Layer */}
          {displayNodes.map((node: any) => (
            <GraphNode
              key={node.id}
              node={node}
              isViewed={node.isViewed}
              isHovered={hoveredNode?.id === node.id}
              isFaded={hoveredNode !== null && hoveredNode.id !== node.id && !displayEdges.find((e: any) => {
                const s = e.source || e.from;
                const t = e.target || e.to;
                return (s === hoveredNode.id && t === node.id) || (t === hoveredNode.id && s === node.id);
              })}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => handleNodeClick(node)}
            />
          ))}
        </motion.div>

        {/* Controls */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 space-y-2 z-40">
          <ControlButton icon="add" onClick={handleZoomIn} />
          <ControlButton icon="remove" onClick={handleZoomOut} />
          <div className="h-4"></div>
          <ControlButton icon={isMaximized ? "close_fullscreen" : "open_in_full"} onClick={toggleMaximize} />
          <ControlButton icon="center_focus_strong" onClick={handleReset} />
        </div>

        {/* Legend */}
        {!isMaximized && (
          <div className="absolute bottom-8 left-8 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/50 shadow-lg space-y-3 z-40">
            <LegendItem color="bg-primary" label="Foundational" />
            <LegendItem color="bg-secondary" label="Major Topics" />
            <LegendItem color="bg-tertiary" label="Sub-components" />
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedNode && (
          <ConceptModal
            node={selectedNode}
            allNodes={displayNodes}
            allEdges={displayEdges}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function GraphNode({ node, isViewed, isHovered, isFaded, onMouseEnter, onMouseLeave, onClick }: any) {
  // 1. ROOT (Major)
  if (node.type === 'major') {
    return (
      <motion.div
        className={cn(
          "absolute -ml-28 -mt-14 w-56 h-28 bg-white border-[3px] rounded-3xl flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-30 cursor-pointer border-primary translate-origin-center",
          isFaded ? "opacity-30" : "opacity-100"
        )}
        style={{ left: `calc(50% + ${node.x}px)`, top: `calc(50% + ${node.y}px)` }}
        animate={{ scale: isHovered ? 1.05 : 1 }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      >
        <div className="text-center p-4">
          <p className="text-lg font-black leading-tight uppercase tracking-tight">{node.label}</p>
          <div className="h-0.5 w-12 bg-primary/20 mx-auto my-2" />
          <p className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.2em]">Core Concept</p>
        </div>
      </motion.div>
    );
  }

  // 2. HEADERS (4 boxes)
  if (node.type === 'header') {
    return (
      <motion.div
        className={cn(
          "absolute -ml-24 -mt-10 w-48 h-20 bg-slate-50 border-2 rounded-2xl flex items-center justify-center z-20 cursor-pointer shadow-md border-secondary",
          isFaded ? "opacity-30" : "opacity-100"
        )}
        style={{ left: `calc(50% + ${node.x}px)`, top: `calc(50% + ${node.y}px)` }}
        animate={{ scale: isHovered ? 1.08 : 1 }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      >
        <div className="text-center px-4">
          <p className="text-xs font-black text-secondary uppercase tracking-wider leading-tight">{node.label}</p>
          <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Header Domain</p>
        </div>
      </motion.div>
    );
  }

  // 3. SUB-TOPICS (2 per header)
  if (node.type === 'sub-topic') {
    return (
      <motion.div
        className={cn(
          "absolute -ml-20 -mt-8 w-40 h-16 bg-white border rounded-xl flex items-center justify-center z-15 cursor-pointer shadow-sm border-tertiary",
          isFaded ? "opacity-30" : "opacity-100"
        )}
        style={{ left: `calc(50% + ${node.x}px)`, top: `calc(50% + ${node.y}px)` }}
        animate={{ scale: isHovered ? 1.1 : 1 }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      >
        <div className="text-center px-3">
          <p className="text-[10px] font-bold text-slate-700 leading-tight">{node.label}</p>
          <p className="text-[7px] font-bold text-tertiary/60 mt-0.5 uppercase tracking-widest">Sub-Topic</p>
        </div>
      </motion.div>
    );
  }

  // 4. CONCEPTS (1-3 per sub-topic)
  return (
    <motion.div
      className={cn(
        "absolute rounded-lg px-4 py-1.5 flex items-center justify-center z-10 cursor-pointer border border-slate-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)]",
        isFaded ? "opacity-20" : "opacity-90"
      )}
      style={{ left: `calc(50% + ${node.x}px)`, top: `calc(50% + ${node.y}px)`, transform: 'translate(-50%, -50%)' }}
      whileHover={{ scale: 1.1, zIndex: 50, border: '1px solid var(--color-primary)' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <p className="text-[9px] font-bold text-slate-600 tracking-tight">{node.label}</p>
    </motion.div>
  );
}


function ConceptModal({ node, allNodes, allEdges, onClose }: { node: any, allNodes: any[], allEdges: any[], onClose: () => void }) {
  // Get related nodes for the mini-graph
  const relatedEdges = allEdges.filter(e => (e.source || e.from) === node.id || (e.target || e.to) === node.id);
  const relatedNodeIds = new Set([node.id, ...relatedEdges.flatMap(e => [(e.source || e.from), (e.target || e.to)])]);

  // Create a sub-graph focus
  const miniNodes = allNodes.filter(n => relatedNodeIds.has(n.id)).map((n, i) => {
    const angle = (i / (relatedNodeIds.size - 1)) * Math.PI * 2;
    const dist = n.id === node.id ? 0 : 150;
    return {
      ...n,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist
    };
  });

  const miniEdges = relatedEdges;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 30 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-5xl bg-white rounded-[40px] shadow-[0_32px_128px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[650px]"
      >
        {/* Left Side: Info */}
        <div className="w-full md:w-[350px] p-8 md:p-12 flex flex-col justify-between border-r border-slate-100 bg-white z-10">
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="w-12 h-1 bg-primary rounded-full mb-4"></div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Definition & Context</p>
              <h3 className="text-3xl md:text-4xl font-headline font-bold text-slate-900 leading-[1.1]">{node.label}</h3>
            </div>

            <div className="space-y-6">
              <p className="text-sm text-slate-700 font-medium leading-relaxed italic border-l-4 border-primary/20 pl-4 py-1">
                {node.desc || "No detailed definition available for this specific technical concept."}
              </p>

              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Structural Links</p>
                <div className="grid grid-cols-1 gap-3">
                  {miniNodes.filter(n => n.id !== node.id).slice(0, 6).map(n => (
                    <RelatedNodeItem key={n.id} node={n} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-8 group px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-primary transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-slate-900/10 hover:shadow-primary/20 active:scale-95"
          >
            <span className="material-symbols-outlined text-sm transition-transform group-hover:rotate-90">close</span>
            Collapse View
          </button>
        </div>

        {/* Right Side: Mini Graph */}
        <div className="flex-1 bg-slate-50/50 relative overflow-hidden flex items-center justify-center cursor-default">
          <div className="absolute inset-0 opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}></div>

          <div className="relative w-full h-full flex items-center justify-center scale-75 md:scale-100">
            {/* Mini Edges */}
            <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
              <g transform="translate(320, 325)">
                {miniEdges.map((e, i) => {
                  const s = miniNodes.find(n => n.id === (e.source || e.from));
                  const t = miniNodes.find(n => n.id === (e.target || e.to));
                  if (!s || !t) return null;
                  return (
                    <motion.line
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                      key={i}
                      x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                      stroke="#cbd5e1"
                      strokeWidth="2"
                      strokeDasharray="6 6"
                    />
                  );
                })}
              </g>
            </svg>

            {/* Mini Nodes */}
            {miniNodes.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: i * 0.1, type: 'spring' }}
                className={cn(
                  "absolute rounded-2xl px-5 py-3 flex items-center justify-center border transition-shadow",
                  n.id === node.id
                    ? "bg-white border-primary border-[3px] z-20 w-40 h-20 shadow-xl shadow-primary/10"
                    : "bg-white/90 backdrop-blur-sm border-slate-200 shadow-sm hover:shadow-md"
                )}
                style={{ left: `calc(50% + ${n.x}px)`, top: `calc(50% + ${n.y}px)`, transform: 'translate(-50%, -50%)' }}
              >
                {n.id === node.id && (
                  <motion.div
                    className="absolute inset-0 border-4 border-primary rounded-2xl"
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                <p className={cn("font-bold text-center leading-tight", n.id === node.id ? "text-sm text-slate-900" : "text-[10px] text-slate-600")}>
                  {n.label}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="absolute top-10 right-10 flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary/20"></div>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Active Focus</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function RelatedNodeItem({ node }: { node: any }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className={cn(
        "group cursor-pointer bg-slate-50/50 rounded-2xl border border-slate-100/50 transition-all overflow-hidden",
        isOpen ? "bg-white border-primary/20 shadow-lg shadow-primary/5" : "hover:bg-slate-50 hover:border-slate-200"
      )}
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-2 h-2 rounded-full transition-all duration-500",
            isOpen ? "bg-primary scale-125" : "bg-slate-300 group-hover:bg-slate-400"
          )}></div>
          <span className={cn(
            "text-[10px] font-bold transition-colors",
            isOpen ? "text-slate-900" : "text-slate-500 group-hover:text-slate-700"
          )}>{node.label}</span>
        </div>
        <span className={cn(
          "material-symbols-outlined text-sm transition-transform duration-300",
          isOpen ? "rotate-180 text-primary" : "text-slate-300"
        )}>
          expand_more
        </span>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-8 pb-4"
          >
            <p className="text-[10px] leading-relaxed text-slate-600 font-medium italic border-l-2 border-primary/20 pl-4 py-1">
              {node.desc || "Linked concept within the document hierarchy."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ControlButton({ icon, onClick }: { icon: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-12 h-12 bg-white shadow-xl border border-slate-100/50 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all text-slate-600 hover:text-primary active:scale-95"
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </button>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("w-2.5 h-2.5 rounded-full ring-2 ring-white", color)}></div>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
    </div>
  );
}


