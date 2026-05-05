import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { OccupancyData, AppConfig, HotelConfig } from '../types';
import { cn } from '../utils/cn';
import { getOccupancyRate, getRateClass, getDayOccupied, getDayPrice } from '../utils/helpers';

interface DayInspectorProps {
  report: OccupancyData | null;
  initialIndex: number | null;
  hotel: HotelConfig;
  config: AppConfig;
  onClose: () => void;
}

export function DayInspector({ report, initialIndex, hotel, config, onClose }: DayInspectorProps) {
  const [index, setIndex] = useState(initialIndex ?? 0);

  useEffect(() => {
    if (initialIndex !== null) setIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight' && report) setIndex(i => Math.min(report.daysCount - 1, i + 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [report, onClose]);

  if (!report || initialIndex === null) return null;

  const dl = report.dateLabels[index];
  const cap = report.capaciteDay[index];
  const libres = report.libresTotal[index];
  const occ = getDayOccupied(report, index);
  const rate = getOccupancyRate(report, index);
  const price = getDayPrice(report, index, hotel, config);
  const ca = occ * price;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-surf2 border-2 border-gold/40 rounded-3xl p-8 shadow-2xl overflow-hidden w-full max-w-md z-10"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-gold/5 rounded-bl-full pointer-events-none" />

        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[10px] font-bold text-gold uppercase tracking-[0.3em] mb-1">Focus Journalier</p>
            <h3 className="font-serif text-3xl font-bold">{dl?.full || '-'}</h3>
          </div>
          <button onClick={onClose} className="p-2 text-text-dark hover:text-white transition-colors bg-white/5 rounded-full" title="Fermer">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0} className="p-1.5 bg-surf1 border border-border rounded-lg text-text-dim hover:text-white disabled:opacity-30" title="Jour précédent">
            <ChevronLeft size={14} />
          </button>
          <span className="text-[10px] text-text-dark">{index + 1} / {report.daysCount}</span>
          <button onClick={() => setIndex(Math.min(report.daysCount - 1, index + 1))} disabled={index === report.daysCount - 1} className="p-1.5 bg-surf1 border border-border rounded-lg text-text-dim hover:text-white disabled:opacity-30" title="Jour suivant">
            <ChevronRight size={14} />
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-surf1 p-5 rounded-2xl border border-border">
            <p className="text-[10px] text-text-dark uppercase font-bold mb-1">Occupation</p>
            <p className="text-3xl font-serif text-gold-light">{rate.toFixed(1)}%</p>
            <p className="text-[11px] text-text-dim mt-1">{occ} / {cap} chambres</p>
          </div>
          <div className="bg-surf1 p-5 rounded-2xl border border-border">
            <p className="text-[10px] text-text-dark uppercase font-bold mb-1">CA Journalier</p>
            <p className="text-3xl font-serif text-blue">{ca.toLocaleString('fr')} {config.currency}</p>
            <p className="text-[11px] text-text-dim mt-1">Prix : {price}{config.currency}</p>
          </div>
        </div>

        {/* Detail */}
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
          <div className="sticky top-0 z-10 bg-surf2 flex justify-between text-[9px] font-bold text-text-dark uppercase border-b border-border pb-2 mb-2 px-2">
            <span>Catégorie</span>
            <div className="flex gap-6"><span className="w-10 text-right text-blue">Libres</span><span className="w-10 text-right">Vendues</span></div>
          </div>
          {hotel.types.map(t => {
            const tLib = report.libresType[t.code]?.[index] || 0;
            const tOcc = report.occupied[t.code]?.[index] || 0;
            return (
              <div key={t.code} className="flex justify-between items-center py-2 px-2 border-b border-border/5 hover:bg-white/5 rounded-lg transition-colors">
                <span className="text-sm font-bold text-text-dim">{t.label}</span>
                <div className="flex gap-6 font-serif font-bold text-lg">
                  <span className={cn("w-10 text-right", tLib > 0 ? "text-blue" : "text-text-dark/40")}>{tLib}</span>
                  <span className="w-10 text-right text-white">{tOcc}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-border flex justify-between items-center bg-blue/5 rounded-2xl p-4">
          <div className="text-[10px] font-bold text-gold uppercase tracking-wider">Total</div>
          <div className="flex gap-6 font-serif font-bold text-2xl">
            <span className="text-blue">{libres}</span>
            <span className="text-white">{occ}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-[10px] text-text-dark">
          <CheckCircle2 size={14} className="text-green" />
          Capacité totale : {cap} chambres
        </div>
      </motion.div>
    </div>
  );
}
