export type ConceptCategory = 'Core Concept' | 'Main Topic' | 'Sub-topic' | 'Key Detail';

export interface Concept {
  id: string;
  title: string;
  description: string;
  category: ConceptCategory;
  tags: string[];
  isNew?: boolean;
  correlationNote?: string;
}

export interface UploadStatus {
  id: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'analyzing' | 'completed' | 'failed';
  subtext?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  age: number | null;
}

export type NodeType = 'major' | 'header' | 'sub-topic' | 'concept';

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  desc?: string;
  importance?: number;
  parentId?: string | null;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
  importance?: number;
}

export interface RoadmapItem {
  number: string;
  title: string;
  status: 'completed' | 'in-progress' | 'locked' | string;
  desc: string;
}

export interface RelatedModuleItem {
  icon: string;
  title: string;
  desc: string;
}

export interface GraphMetadata {
  title?: string;
  description?: string;
  complexity?: number;
  category?: string;
  roadmap?: RoadmapItem[];
  relatedModules?: RelatedModuleItem[];
}

/** A knowledge map as used by the screens. */
export interface GraphData {
  id?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: GraphMetadata;
  filename: string;
  fallbackUsed?: boolean;
}

/** Shape returned by /api/upload and by each item of /api/graphs. */
export interface SavedGraph {
  _id?: string;
  id?: string;
  filename: string;
  createdAt?: string;
  metadata?: GraphMetadata;
  graph: { nodes: any[]; edges: any[] };
  fallbackUsed?: boolean;
}
