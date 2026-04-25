import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TopAppBar, BottomNavBar } from './components/Navigation';
import { AuthModal } from './components/AuthModal';
import { UploadZone } from './components/UploadZone';
import { StatusPanel } from './components/StatusPanel';
import { ConceptCard } from './components/ConceptCard';
import { HeroScreen } from './components/HeroScreen';
import { GraphScreen } from './components/GraphScreen';
import { DetailsScreen } from './components/DetailsScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { Concept, UploadStatus, User } from './types';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('hero');
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Scroll to top on screen change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [currentScreen]);
  const [user, setUser] = useState<User | null>(null);
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const [graphData, setGraphData] = useState<any>(null);
  const [viewedNodeIds, setViewedNodeIds] = useState<Set<string>>(new Set());

  const handleGraphDataUpdate = (data: any) => {
    // Extract actual graph content if coming from full API response
    const content = data.graph || data;
    const meta = data.metadata || content.metadata;

    if (content && content.nodes) {
      // Clear viewed nodes for new graph
      setViewedNodeIds(new Set());
      
      // Update the main concepts list with real data from the AI
      const newConcepts = content.nodes.slice(0, 15).map((n: any) => ({
        id: n.id,
        title: n.label,
        description: n.desc || 'Semantic node extracted from source document.',
        category: n.type === 'core' ? 'Foundational' : (n.type === 'major' ? 'Major Topic' : 'Granular Detail'),
        tags: [n.category || 'general'],
        isNew: true
      }));
      setConcepts(newConcepts);

      content.nodes = content.nodes.map((n: any, i: number) => ({
          ...n,
          type: n.type || (i < 5 ? 'core' : (i < 20 ? 'major' : 'minor')),
          category: n.category || ['primary', 'secondary', 'tertiary'][i % 3]
      }));

      if (content.edges) {
        content.edges = content.edges.map((e: any) => ({
          ...e,
          source: e.source || e.from,
          target: e.target || e.to,
          importance: e.importance || 5
        }));
      }
    }
    
    setGraphData({
      ...content,
      metadata: meta,
      filename: data.filename || content.filename
    });

    // Auto-switch to graph view as requested
    setCurrentScreen('graph');
  };

  const onNodeExplored = (nodeId: string) => {
    setViewedNodeIds(prev => new Set(prev).add(nodeId));
  };

  const handleLoadSavedGraph = (item: any) => {
    // Standardize structure for visualization
    const data = {
      ...item.graph,
      metadata: item.metadata
    };
    handleGraphDataUpdate(data);
    setCurrentScreen('graph');
  };

  const [concepts, setConcepts] = useState<Concept[]>([
    {
      id: '1',
      title: 'Linguistic Relativism',
      description: 'The structure of a language affects its speakers\' world view or cognition.',
      category: 'Theoretical Framework',
      tags: ['sapir-whorf', 'cognition'],
    },
    {
      id: '2',
      title: 'Structuralism',
      description: 'Elements of human culture must be understood by way of their relationship to a broader system.',
      category: 'Historical Context',
      tags: ['ferdinand de saussure', 'systems'],
    },
    {
      id: '3',
      title: 'Post-Phenomenology',
      description: 'Exploration of the relationship between humans and technology, focusing on how artifacts mediate our perception and action.',
      category: 'Interdisciplinary Link',
      tags: ['technology', 'perception'],
      isNew: true,
      correlationNote: 'High cross-correlation with Computer Science section',
    }
  ]);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('run_neeti_current_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('run_neeti_current_user');
      }
    }
  }, []);

  const handleAuth = (authedUser: User) => {
    setUser(authedUser);
    setShowAuthModal(false);
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem('run_neeti_current_user');
  };



  const renderScreen = () => {
    switch (currentScreen) {
      case 'hero':
        return <HeroScreen 
          onStartJourney={() => setCurrentScreen('upload')} 
          onExploreArchives={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
        />;
      case 'graph':
        return <GraphScreen data={graphData} onNodeExplored={onNodeExplored} viewedNodeIds={viewedNodeIds} />;
      case 'details':
        return <DetailsScreen data={graphData} viewedNodeIds={viewedNodeIds} />;
      case 'history':
        return <HistoryScreen onLoadGraph={handleLoadSavedGraph} user={user} />;
      case 'upload':
      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Discovered Concepts */}
            <div className="lg:col-span-7">
              <div className="bg-surface-container-low rounded-xl p-8 min-h-[600px] flex flex-col border border-slate-200">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h3 className="text-2xl font-headline font-bold">Discovered Concepts</h3>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mt-1">Real-time NER Analysis</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-tertiary/10 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                    <span className="text-[10px] text-tertiary font-bold uppercase">Engine Active</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {concepts.map((concept) => (
                      <ConceptCard key={concept.id} concept={concept} />
                    ))}
                  </AnimatePresence>
                </div>

                {/* Abstract Visual Placeholder */}
                <div className="mt-auto pt-8">
                  <div className="h-32 rounded-xl overflow-hidden relative">
                    <img 
                      alt="Graph Concept Background" 
                      className="w-full h-full object-cover opacity-50" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDvA5krNHjvv8anGrY6w7z-bXkOyUU4INzj2yDNS9FcXuew3TxCrxVfkjFQIER7w20kazQKLehlUvHjxq0K1Hi-LGlxOXAdv082_7knT1vfgYEUPU-Wj_Qi5SWrcVQqR1gdUTEv1O5I4ZaFACSPBHI03dvPhHlEV6Xs3iGq8uo0NPk7xDklHXOgMnLEQckN8kStyoKbPnmvypgiSz48uQMHrTEj0-Mx8xaMGxNgq7L0Vd3iMWL93JcdP3yuClngxom-Km-GyMq5Jq4" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low to-transparent"></div>
                    <div className="absolute bottom-4 left-4 flex items-center gap-2">
                      <span className="text-[9px] font-mono text-primary/60 tracking-widest uppercase">
                        System Latency: 12ms // Entities Processed: {1244 + concepts.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Upload Zone */}
            <div className="lg:col-span-5 space-y-8">
              <section>
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-headline font-bold mb-2"
                >
                  Knowledge Extraction
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-on-surface-variant leading-relaxed"
                >
                  Feed the curator with your academic manuscripts. Our engine will map the semantic landscape of your syllabi in real-time.
                </motion.p>
              </section>

              <UploadZone setGraphData={handleGraphDataUpdate} setUploads={setUploads} user={user} />

              <AnimatePresence>
                {uploads.length > 0 && (
                  <StatusPanel uploads={uploads} />
                )}
              </AnimatePresence>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen pb-24 overflow-x-hidden">
      <TopAppBar 
        user={user} 
        onSignInClick={() => setShowAuthModal(true)} 
        onSignOut={handleSignOut}
        currentScreen={currentScreen}
        onScreenChange={setCurrentScreen}
      />
      
      <main className="pt-24 px-6 max-w-7xl mx-auto">
        <motion.div
          key={currentScreen}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {renderScreen()}
        </motion.div>
      </main>

      <BottomNavBar currentScreen={currentScreen} onScreenChange={setCurrentScreen} user={user} />

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onAuth={handleAuth} 
      />

      {/* Decorative Glows */}
      <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/3 blur-[120px] rounded-full -z-10"></div>
      <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/3 blur-[120px] rounded-full -z-10"></div>
    </div>
  );
}
