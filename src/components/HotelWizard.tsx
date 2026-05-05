import React, { useState, useCallback } from 'react';
import { FileUp, CheckCircle2, ChevronRight, ChevronLeft, Building2, Bed, List, EyeOff, Download, X, AlertTriangle, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoomType, HotelConfig } from '../types';
import { PdfScanResult, scanPdfForWizard } from '../lib/pdfParser';
import { DEFAULT_IGNORE_PREFIXES } from '../utils/constants';
import { cn } from '../utils/cn';
import { downloadBlob } from '../utils/helpers';

interface HotelWizardProps {
  onComplete: (hotel: HotelConfig) => void;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'ok' | 'error') => void;
}

type Step = 'upload' | 'identity' | 'capacity' | 'types' | 'lines' | 'ignore' | 'summary';

const STEPS: { id: Step; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'upload', label: 'Upload PDF', icon: FileUp },
  { id: 'identity', label: 'Identité', icon: Building2 },
  { id: 'capacity', label: 'Capacité', icon: Bed },
  { id: 'types', label: 'Typologies', icon: List },
  { id: 'lines', label: 'Lignes parsées', icon: Edit3 },
  { id: 'ignore', label: 'Ignorer', icon: EyeOff },
  { id: 'summary', label: 'Résumé', icon: CheckCircle2 },
];

export function HotelWizard({ onComplete, onClose, onShowToast }: HotelWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [scanResult, setScanResult] = useState<PdfScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [reference, setReference] = useState('');
  const [totalCapacity, setTotalCapacity] = useState(0);
  const [types, setTypes] = useState<RoomType[]>([]);
  const [ignorePrefixes, setIgnorePrefixes] = useState<string[]>([]);
  const [lineDecisions, setLineDecisions] = useState<Record<string, 'use' | 'ignore'>>({});
  const [defaultRoomPrice, setDefaultRoomPrice] = useState(150);

  const stepIdx = STEPS.findIndex(s => s.id === currentStep);

  const goNext = () => {
    const next = STEPS[stepIdx + 1];
    if (next) setCurrentStep(next.id);
  };
  const goPrev = () => {
    const prev = STEPS[stepIdx - 1];
    if (prev) setCurrentStep(prev.id);
  };

  const handleUpload = useCallback(async (file: File) => {
    setIsScanning(true);
    try {
      const buffer = await file.arrayBuffer();
      const result = await scanPdfForWizard(buffer);
      setScanResult(result);
      setName(result.detectedName || '');
      setAddress(result.detectedAddress || '');
      setTotalCapacity(result.detectedCapacity);
      setTypes(result.detectedTypes.map(t => ({ ...t })));
      const merged = [...new Set([...DEFAULT_IGNORE_PREFIXES, ...result.suggestedIgnore])];
      setIgnorePrefixes(merged);

      const decisions: Record<string, 'use' | 'ignore'> = {};
      result.allLineCategories.forEach(lc => {
        decisions[lc.line] = lc.category === 'ignore' ? 'ignore' : 'use';
      });
      setLineDecisions(decisions);

      setCurrentStep('identity');
      onShowToast('PDF analysé avec succès');
    } catch (err: any) {
      onShowToast(err.message || 'Erreur de lecture PDF', 'error');
    } finally {
      setIsScanning(false);
    }
  }, [onShowToast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.pdf')) handleUpload(file);
  }, [handleUpload]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  };

  const updateType = (idx: number, field: keyof RoomType, val: string | number) => {
    const updated = [...types];
    updated[idx] = { ...updated[idx], [field]: val };
    setTypes(updated);
  };

  const removeType = (idx: number) => setTypes(types.filter((_, i) => i !== idx));

  const addType = () => setTypes([...types, { code: '', label: '', description: '', capacity: 0 }]);

  const exportHotelConfig = () => {
    const hotelConfig: HotelConfig = {
      id: `hotel-${Date.now()}`,
      name,
      address,
      reference,
      totalCapacity: types.reduce((s, t) => s + t.capacity, 0),
      types,
      defaultRoomPrice,
      ignorePrefixes: ignorePrefixes.filter(Boolean),
    };
    downloadBlob(
      new Blob([JSON.stringify(hotelConfig, null, 2)], { type: 'application/json' }),
      `hotel_${name.replace(/\s+/g, '_').toLowerCase()}_config.json`
    );
    onShowToast('Configuration hôtel exportée');
  };

  const finalize = () => {
    const hotel: HotelConfig = {
      id: `hotel-${Date.now()}`,
      name,
      address,
      reference,
      totalCapacity: types.reduce((s, t) => s + t.capacity, 0),
      types,
      defaultRoomPrice,
      ignorePrefixes: ignorePrefixes.filter(Boolean),
    };
    onComplete(hotel);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-bg/90 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-surf1 border border-border rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-serif font-bold text-text">Configurer un nouvel hôtel</h2>
            <p className="text-[10px] text-text-dark uppercase tracking-widest mt-0.5">Assistant de configuration étape par étape</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surf2 rounded-xl text-text-dark hover:text-text transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 py-3 border-b border-border flex items-center gap-1 overflow-x-auto shrink-0">
          {STEPS.map((step, i) => (
            <React.Fragment key={step.id}>
              <button
                onClick={() => { if (i <= stepIdx || (scanResult && i > 0)) setCurrentStep(step.id); }}
                disabled={!scanResult && i > 0}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all",
                  currentStep === step.id ? "bg-gold/10 text-gold border border-gold/30" :
                  i < stepIdx ? "text-green bg-green/5 border border-green/20" :
                  "text-text-dark border border-transparent"
                )}
              >
                {i < stepIdx ? <CheckCircle2 size={12} /> : <step.icon size={12} />}
                <span className="hidden md:inline">{step.label}</span>
              </button>
              {i < STEPS.length - 1 && <ChevronRight size={12} className="text-text-dark shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

              {/* Step: Upload */}
              {currentStep === 'upload' && (
                <div className="max-w-lg mx-auto py-8">
                  <div
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    className="bg-surf2 border-2 border-dashed border-border rounded-2xl p-12 text-center group hover:border-gold/40 transition-all cursor-pointer relative"
                  >
                    <input type="file" accept=".pdf" onChange={handleFileInput} className="absolute inset-0 opacity-0 cursor-pointer" />
                    {isScanning ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-text-dim">Analyse du PDF en cours...</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-gold group-hover:scale-110 transition-transform">
                          <FileUp size={28} />
                        </div>
                        <h3 className="font-serif text-xl font-bold text-text mb-2">Charger un rapport modèle</h3>
                        <p className="text-text-dim text-sm">
                          Uploadez un rapport PDF Topsys de l'hôtel à configurer. Le système détectera automatiquement la structure.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Step: Identity */}
              {currentStep === 'identity' && (
                <div className="max-w-lg mx-auto space-y-6">
                  <div className="bg-surf2 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-2 text-[10px] text-text-dark font-bold uppercase tracking-widest mb-1">
                      <Building2 size={12} className="text-gold" /> Détecté automatiquement
                    </div>
                    <p className="text-xs text-text-dim">Vérifiez et corrigez si nécessaire.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-dark uppercase mb-1.5">Nom de l'établissement</label>
                      <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-surf2 border border-border rounded-xl p-3 text-sm focus:border-gold outline-none text-text" placeholder="Nom de l'hôtel" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-dark uppercase mb-1.5">Adresse</label>
                      <input value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-surf2 border border-border rounded-xl p-3 text-sm focus:border-gold outline-none text-text" placeholder="Adresse complète" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-dark uppercase mb-1.5">Référence</label>
                      <input value={reference} onChange={e => setReference(e.target.value)} className="w-full bg-surf2 border border-border rounded-xl p-3 text-sm focus:border-gold outline-none text-text" placeholder="Réf. interne (optionnel)" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-dark uppercase mb-1.5">Prix moyen par nuit (€)</label>
                      <input type="number" value={defaultRoomPrice} onChange={e => setDefaultRoomPrice(parseInt(e.target.value) || 0)} className="w-full bg-surf2 border border-border rounded-xl p-3 text-sm focus:border-gold outline-none text-text" />
                    </div>
                  </div>
                </div>
              )}

              {/* Step: Capacity */}
              {currentStep === 'capacity' && (
                <div className="max-w-lg mx-auto space-y-6">
                  <div className="bg-surf2 rounded-xl p-4 border border-border">
                    <p className="text-xs text-text-dim">Capacité totale détectée à partir des types de chambres. Ajustez si nécessaire.</p>
                  </div>

                  <div className="bg-gold/5 border border-gold/20 rounded-2xl p-8 text-center">
                    <div className="text-[10px] font-bold text-text-dark uppercase tracking-widest mb-2">Capacité totale</div>
                    <input
                      type="number"
                      value={totalCapacity}
                      onChange={e => setTotalCapacity(parseInt(e.target.value) || 0)}
                      className="text-4xl font-serif font-bold text-gold bg-transparent text-center w-32 outline-none border-b-2 border-gold/30 focus:border-gold mx-auto"
                    />
                    <div className="text-xs text-text-dim mt-3">chambres</div>
                  </div>

                  <div className="bg-surf2 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-2 text-xs text-text-dim">
                      <AlertTriangle size={14} className="text-amber" />
                      Somme des types: {types.reduce((s, t) => s + t.capacity, 0)} chambres
                      {types.reduce((s, t) => s + t.capacity, 0) !== totalCapacity && (
                        <span className="text-amber font-bold">(différent de la capacité déclarée)</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step: Types */}
              {currentStep === 'types' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="bg-surf2 rounded-xl p-3 border border-border flex-1 mr-4">
                      <p className="text-xs text-text-dim">{types.length} types détectés. Modifiez les codes, labels et capacités.</p>
                    </div>
                    <button onClick={addType} className="px-4 py-2 bg-gold text-bg rounded-xl text-xs font-bold hover:bg-gold-light transition-all shrink-0">
                      + Ajouter
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_100px_1.5fr_70px_40px] gap-2 px-3 text-[9px] font-bold text-text-dark uppercase tracking-wider">
                      <span>Code</span><span>Label</span><span>Description</span><span>Capacité</span><span></span>
                    </div>
                    {types.map((t, i) => (
                      <div key={i} className="grid grid-cols-[1fr_100px_1.5fr_70px_40px] gap-2 p-2 bg-surf2 border border-border rounded-xl items-center">
                        <input value={t.code} onChange={e => updateType(i, 'code', e.target.value)} className="bg-surf3 border border-border rounded-lg p-2 text-xs focus:border-gold outline-none text-text" placeholder="13 DCLA" />
                        <input value={t.label} onChange={e => updateType(i, 'label', e.target.value)} className="bg-surf3 border border-border rounded-lg p-2 text-xs focus:border-gold outline-none text-text" placeholder="DCLA" />
                        <input value={t.description} onChange={e => updateType(i, 'description', e.target.value)} className="bg-surf3 border border-border rounded-lg p-2 text-xs focus:border-gold outline-none text-text" placeholder="Description" />
                        <input type="number" value={t.capacity} onChange={e => updateType(i, 'capacity', parseInt(e.target.value) || 0)} className="bg-surf3 border border-border rounded-lg p-2 text-xs focus:border-gold outline-none text-text text-center" />
                        <button onClick={() => removeType(i)} className="p-1.5 text-text-dark hover:text-red rounded-lg hover:bg-red/10 transition-colors justify-self-center">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step: Lines */}
              {currentStep === 'lines' && scanResult && (
                <div className="space-y-4">
                  <div className="bg-surf2 rounded-xl p-3 border border-border">
                    <p className="text-xs text-text-dim">Voici les lignes extraites du PDF. Marquez celles à utiliser ou ignorer.</p>
                  </div>

                  <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {scanResult.allLineCategories.slice(0, 80).map((lc, i) => (
                      <div key={i} className={cn(
                        "flex items-center gap-3 p-2 rounded-lg text-[11px] font-mono border transition-all",
                        lineDecisions[lc.line] === 'ignore' ? "bg-red/5 border-red/10 opacity-50" : "bg-surf2 border-border"
                      )}>
                        <button
                          onClick={() => setLineDecisions(prev => ({ ...prev, [lc.line]: prev[lc.line] === 'ignore' ? 'use' : 'ignore' }))}
                          className={cn(
                            "shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold border transition-all",
                            lineDecisions[lc.line] === 'ignore' ? "bg-red/10 border-red/30 text-red" : "bg-green/10 border-green/30 text-green"
                          )}
                        >
                          {lineDecisions[lc.line] === 'ignore' ? '✕' : '✓'}
                        </button>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase shrink-0",
                          lc.category === 'type' ? "bg-gold/10 text-gold" :
                          lc.category === 'data' ? "bg-blue/10 text-blue" :
                          lc.category === 'ignore' ? "bg-red/10 text-red" :
                          "bg-surf3 text-text-dark"
                        )}>
                          {lc.category}
                        </span>
                        <span className="truncate text-text-dim">{lc.line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step: Ignore */}
              {currentStep === 'ignore' && (
                <div className="max-w-lg mx-auto space-y-6">
                  <div className="bg-surf2 rounded-xl p-4 border border-border">
                    <p className="text-xs text-text-dim">Préfixes de lignes à ignorer lors du parsing. Le système sautera toute ligne commençant par ces mots.</p>
                  </div>

                  <div className="space-y-2">
                    {ignorePrefixes.map((prefix, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-surf2 border border-border rounded-xl">
                        <EyeOff size={12} className="text-red shrink-0" />
                        <input
                          value={prefix}
                          onChange={e => {
                            const updated = [...ignorePrefixes];
                            updated[i] = e.target.value;
                            setIgnorePrefixes(updated);
                          }}
                          className="flex-1 bg-surf3 border border-border rounded-lg p-2 text-xs focus:border-gold outline-none text-text"
                        />
                        <button onClick={() => setIgnorePrefixes(ignorePrefixes.filter((_, j) => j !== i))} className="p-1.5 text-text-dark hover:text-red rounded-lg hover:bg-red/10">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setIgnorePrefixes([...ignorePrefixes, ''])}
                      className="w-full p-2 bg-surf2 border border-dashed border-border rounded-xl text-xs text-text-dark hover:text-text hover:border-gold/30 transition-all"
                    >
                      + Ajouter un préfixe
                    </button>
                  </div>
                </div>
              )}

              {/* Step: Summary */}
              {currentStep === 'summary' && (
                <div className="max-w-lg mx-auto space-y-6">
                  <div className="bg-green/5 border border-green/20 rounded-2xl p-6 text-center">
                    <CheckCircle2 size={32} className="text-green mx-auto mb-3" />
                    <h3 className="text-lg font-serif font-bold text-text mb-1">Configuration prête</h3>
                    <p className="text-xs text-text-dim">Vérifiez le résumé et exportez la configuration.</p>
                  </div>

                  <div className="bg-surf2 rounded-2xl p-5 border border-border space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-text-dark uppercase">Nom</span>
                      <span className="text-sm font-bold text-text">{name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-text-dark uppercase">Adresse</span>
                      <span className="text-sm text-text-dim">{address}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-text-dark uppercase">Capacité totale</span>
                      <span className="text-sm font-bold text-gold">{types.reduce((s, t) => s + t.capacity, 0)} chambres</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-text-dark uppercase">Types de chambres</span>
                      <span className="text-sm text-text-dim">{types.length} types</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-text-dark uppercase">Préfixes ignorés</span>
                      <span className="text-sm text-text-dim">{ignorePrefixes.filter(Boolean).length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-text-dark uppercase">Prix moyen</span>
                      <span className="text-sm text-text-dim">{defaultRoomPrice} €</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={exportHotelConfig} className="flex items-center justify-center gap-2 p-4 bg-surf2 border border-border hover:border-gold/30 rounded-xl text-xs font-bold transition-all">
                      <Download size={16} /> Exporter JSON
                    </button>
                    <button onClick={finalize} className="flex items-center justify-center gap-2 p-4 bg-gold text-bg rounded-xl text-xs font-bold hover:bg-gold-light shadow-lg shadow-gold/10 transition-all">
                      <CheckCircle2 size={16} /> Ajouter à l'app
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer navigation */}
        {currentStep !== 'upload' && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
            <button onClick={goPrev} className="flex items-center gap-2 px-4 py-2 bg-surf2 border border-border rounded-xl text-xs font-bold text-text-dim hover:text-text transition-all">
              <ChevronLeft size={14} /> Précédent
            </button>
            <div className="text-[10px] text-text-dark">
              Étape {stepIdx + 1} / {STEPS.length}
            </div>
            {currentStep !== 'summary' && (
              <button onClick={goNext} className="flex items-center gap-2 px-4 py-2 bg-gold text-bg rounded-xl text-xs font-bold hover:bg-gold-light transition-all">
                Suivant <ChevronRight size={14} />
              </button>
            )}
            {currentStep === 'summary' && <div />}
          </div>
        )}
      </motion.div>
    </div>
  );
}
