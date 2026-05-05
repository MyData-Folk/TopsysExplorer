import React, { useCallback } from 'react';
import { FileUp, AlertCircle, Calendar, Trash2, Download } from 'lucide-react';
import { OccupancyData, AppConfig, HotelConfig } from '../types';
import { parseTopsysPdf, detectEstablishmentName } from '../lib/pdfParser';
import { cn } from '../utils/cn';
import { hydrateReport } from '../utils/helpers';

interface ImportTabProps {
  config: AppConfig;
  activeHotel: HotelConfig;
  reports: OccupancyData[];
  selectedReportId: string | null;
  isLoading: boolean;
  error: string | null;
  onAddReport: (r: OccupancyData) => void;
  onDeleteReport: (id: string) => void;
  onSelectReport: (id: string) => void;
  onStorePdf: (id: string, file: File) => void;
  onSwitchToAnalyse: () => void;
  onSetLoading: (v: boolean) => void;
  onSetError: (e: string | null) => void;
  onShowToast: (msg: string, type?: 'ok' | 'error') => void;
  onUpdateHotel: (updates: Partial<HotelConfig>) => void;
  onDetectNewHotel: (name: string, buffer: ArrayBuffer) => void;
}

export function ImportTab({
  config, activeHotel, reports, selectedReportId,
  isLoading, error,
  onAddReport, onDeleteReport, onSelectReport, onStorePdf,
  onSwitchToAnalyse, onSetLoading, onSetError, onShowToast,
  onUpdateHotel, onDetectNewHotel,
}: ImportTabProps) {

  const handleFile = useCallback(async (file: File) => {
    onSetLoading(true);
    onSetError(null);
    try {
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const data = JSON.parse(text) as OccupancyData;
        if (!data.id || !data.dateLabels) throw new Error("JSON invalide");
        onAddReport(hydrateReport(data));
        onSwitchToAnalyse();
        onShowToast('Rapport JSON importé');
        return;
      }

      const buffer = await file.arrayBuffer();
      let hotelToUse = activeHotel;

      const detectedName = await detectEstablishmentName(buffer.slice(0));
      if (detectedName) {
        const existing = config.hotels.find(h =>
          h.name.toLowerCase() === detectedName.toLowerCase() ||
          detectedName.toLowerCase().includes(h.name.toLowerCase())
        );
        if (existing) {
          hotelToUse = existing;
        } else {
          onDetectNewHotel(detectedName, buffer.slice(0));
          return;
        }
      }

      const result = await parseTopsysPdf(buffer.slice(0), hotelToUse, config);
      result.fileName = file.name;
      onStorePdf(result.id, file);
      onAddReport(result);

      if (result.establishmentName && activeHotel.name === 'Folkestone Opera') {
        onUpdateHotel({ name: result.establishmentName, address: result.establishmentAddress || activeHotel.address });
      }

      onSwitchToAnalyse();
      onShowToast('Rapport PDF importé avec succès');
    } catch (err: any) {
      console.error(err);
      onSetError(err.message || "Erreur lors de la lecture du fichier.");
      onShowToast(err.message || "Erreur d'import", 'error');
    } finally {
      onSetLoading(false);
    }
  }, [config, activeHotel]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const exportReportJson = (r: OccupancyData) => {
    const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${r.fileName.replace('.pdf', '')}_data.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl mx-auto py-12 space-y-8">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="bg-surf1 border-2 border-dashed border-border rounded-2xl p-14 text-center group hover:border-gold/40 transition-all cursor-pointer relative overflow-hidden"
      >
        <input type="file" accept=".pdf,.json" onChange={handleInputChange} className="absolute inset-0 opacity-0 cursor-pointer" />
        <div className="w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-gold group-hover:scale-110 transition-transform">
          <FileUp size={28} />
        </div>
        <h3 className="font-serif text-xl font-bold text-text mb-2">Charger un rapport</h3>
        <p className="text-text-dim text-sm mb-6">
          Glissez-déposez votre fichier <strong className="text-text">Planning / Types (PDF)</strong> ou un <strong className="text-text">Export (JSON)</strong>.
        </p>
        <div className="flex justify-center gap-2">
          <span className="px-3 py-1 rounded-lg bg-surf2 text-[10px] uppercase font-bold tracking-wider text-text-dark border border-border">PDF</span>
          <span className="px-3 py-1 rounded-lg bg-surf2 text-[10px] uppercase font-bold tracking-wider text-text-dark border border-border">JSON</span>
        </div>
      </div>

      {isLoading && (
        <div className="text-center flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-dim">Extraction en cours...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red/10 border border-red/20 rounded-xl flex items-center gap-3 text-red text-sm">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Report list */}
      {reports.length > 0 && (
        <div className="bg-surf1 p-5 rounded-2xl border border-border">
          <h3 className="text-[10px] font-bold text-text-dark uppercase tracking-widest mb-4">Rapports chargés ({reports.length})</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
            {reports.map(r => (
              <div
                key={r.id}
                className={cn(
                  "group p-3 rounded-xl border transition-all cursor-pointer",
                  selectedReportId === r.id ? "bg-gold/10 border-gold/30" : "bg-surf2 border-transparent hover:border-border-hover"
                )}
                onClick={() => { onSelectReport(r.id); onSwitchToAnalyse(); }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-text">
                    <Calendar size={12} className="text-gold" />
                    <span>{r.dateLabels[0]?.short} au {r.dateLabels[r.daysCount - 1]?.short}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); exportReportJson(r); }} className="p-1.5 text-text-dark hover:text-blue rounded-lg hover:bg-blue/10 transition-colors" title="Export JSON">
                      <Download size={12} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); onDeleteReport(r.id); }} className="p-1.5 text-text-dark hover:text-red rounded-lg hover:bg-red/10 transition-colors" title="Supprimer">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="text-[9px] text-text-dark truncate mt-1">{r.fileName || 'Import JSON'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
