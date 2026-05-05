import { useEffect, useState } from 'react';
import { X, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

interface PdfViewerProps {
  file: File | null;
  fileName: string;
  onClose: () => void;
}

export function PdfViewer({ file, fileName, onClose }: PdfViewerProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    setUrl(blobUrl);
    return () => { URL.revokeObjectURL(blobUrl); setUrl(null); };
  }, [file]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!file || !url) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-bg/80 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative z-10 flex flex-col h-full">
        <div className="p-4 border-b border-border flex justify-between items-center bg-surf1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gold/10 rounded-lg flex items-center justify-center text-gold">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold">{fileName}</h3>
              <p className="text-[10px] text-text-dark uppercase tracking-widest">Document Original</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-text-dim hover:text-white transition-colors" title="Fermer">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 bg-white">
          <iframe src={url} className="w-full h-full border-none" title="PDF Viewer" />
        </div>
      </div>
    </div>
  );
}
