export interface Concept {
  id: string;
  title: string;
  description: string;
  category: 'Theoretical Framework' | 'Historical Context' | 'Interdisciplinary Link';
  tags: string[];
  isNew?: boolean;
  correlationNote?: string;
}

export interface UploadStatus {
  fileName: string;
  progress: number;
  status: 'uploading' | 'analyzing' | 'completed';
  subtext?: string;
}

export interface User {
  email: string;
  phone: string;
  password: string;
  age: string;
  name?: string;
}
