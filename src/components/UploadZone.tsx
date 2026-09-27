import { useRef, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { apiFetch } from '../lib/api';
import type { SavedGraph, UploadStatus } from '../types';

const MAX_SIZE_MB = 4;

const STAGES = [
  { until: 15, text: 'Uploading document' },
  { until: 35, text: 'Extracting text from PDF' },
  { until: 70, text: 'Analyzing concepts with Gemini AI' },
  { until: 92, text: 'Building knowledge graph' },
];

interface UploadZoneProps {
  onGraphReady: (data: SavedGraph) => void;
  setUploads: React.Dispatch<React.SetStateAction<UploadStatus[]>>;
}

export function UploadZone({ onGraphReady, setUploads }: UploadZoneProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const busy = useRef(false);

  const updateUpload = (id: string, patch: Partial<UploadStatus>) =>
    setUploads(prev => prev.map(u => (u.id === id ? { ...u, ...patch } : u)));
  const removeUploadLater = (id: string, ms: number) =>
    setTimeout(() => setUploads(prev => prev.filter(u => u.id !== id)), ms);

  const handleFileUpload = async (file: File) => {
    if (busy.current) return;
    busy.current = true;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setUploads(prev => [...prev.filter(u => u.status !== 'completed' && u.status !== 'failed'),
      { id, fileName: file.name, progress: 0, status: 'uploading', subtext: STAGES[0].text }]);
    setLoading(true);
    setError(null);
    setNotice(null);

    // The server does not stream progress, so advance an estimate that slows
    // down as it approaches the end (typical analysis takes 10-40 s).
    let progress = 0;
    const timer = setInterval(() => {
      progress += Math.max(0.3, (92 - progress) * 0.04);
      progress = Math.min(progress, 92);
      const stage = STAGES.find(s => progress <= s.until) || STAGES[STAGES.length - 1];
      updateUpload(id, { progress, status: progress > 15 ? 'analyzing' : 'uploading', subtext: stage.text });
    }, 500);

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      const data = await apiFetch<SavedGraph & { warning?: string; cached?: boolean }>('/upload', { method: 'POST', body: formData });
      clearInterval(timer);
      updateUpload(id, {
        progress: 100,
        status: 'completed',
        subtext: data.cached ? 'Loaded from previous analysis' : data.fallbackUsed ? 'Basic keyword map generated' : 'Knowledge graph ready',
      });
      if (data.warning) setNotice(data.warning);
      removeUploadLater(id, 5000);
      // Short pause so the 100% state is visible before switching screens.
      setTimeout(() => onGraphReady(data), data.warning ? 1800 : 600);
    } catch (err: any) {
      clearInterval(timer);
      const message = err?.message || 'Something went wrong. Please try again.';
      updateUpload(id, { status: 'failed', subtext: 'Upload failed' });
      setError(message);
      removeUploadLater(id, 8000);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  const onDropRejected = (rejections: FileRejection[]) => {
    const code = rejections[0]?.errors[0]?.code;
    setNotice(null);
    setError(
      code === 'file-too-large' ? `File is too large. Maximum size is ${MAX_SIZE_MB} MB.` :
      code === 'file-invalid-type' ? 'Only PDF files are supported.' :
      code === 'too-many-files' ? 'Please upload one PDF at a time.' :
      'This file cannot be uploaded.'
    );
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: files => files[0] && handleFileUpload(files[0]),
    onDropRejected,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: MAX_SIZE_MB * 1024 * 1024,
    multiple: false,
    disabled: loading,
  });

  return (
    <div {...getRootProps()} className={cn('relative group w-full', loading ? 'cursor-wait' : 'cursor-pointer')} data-testid="upload-zone">
      <motion.div
        className={cn(
          'absolute -inset-0.5 bg-gradient-to-br from-primary to-secondary rounded-xl blur transition duration-500',
          isDragActive ? 'opacity-40' : 'opacity-10 group-hover:opacity-25'
        )}
      />
      <div className="relative glass-panel border border-slate-200 rounded-xl p-8 md:p-10 flex flex-col items-center justify-center text-center min-h-[320px]">
        <input {...getInputProps()} data-testid="file-input" />
        {loading ? (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="text-xl font-headline mb-2 text-primary">Processing Document...</h3>
            <p className="text-on-surface-variant text-sm">The AI is reading your document. This usually takes 10–40 seconds.</p>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                upload_file
              </span>
            </div>
            <h3 className="text-xl font-headline mb-2">Upload a PDF</h3>
            {error ? (
              <p role="alert" className="text-red-500 text-sm font-medium mb-2 px-4 py-2 bg-red-50 rounded-lg border border-red-100">
                {error}
              </p>
            ) : notice ? (
              <p className="text-amber-700 text-sm font-medium mb-2 px-4 py-2 bg-amber-50 rounded-lg border border-amber-100">
                {notice}
              </p>
            ) : (
              <p className="text-on-surface-variant max-w-[260px]">
                {isDragActive ? 'Drop the file here...' : (
                  <>Drag your PDF here or <span className="text-primary hover:underline">browse files</span></>
                )}
              </p>
            )}
            <div className="mt-8 flex gap-2">
              <span className="px-3 py-1 rounded-full bg-surface-container-highest text-[10px] text-primary border border-primary/20 uppercase tracking-widest font-bold">PDF Only</span>
              <span className="px-3 py-1 rounded-full bg-surface-container-highest text-[10px] text-secondary border border-secondary/20 uppercase tracking-widest font-bold">Max {MAX_SIZE_MB}MB</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
