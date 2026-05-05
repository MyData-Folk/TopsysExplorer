import React, { useState, useMemo } from 'react';
import { FileUp, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, BarChart3, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { OccupancyData, AppConfig, HotelConfig } from '../types';
import { cn } from '../utils/cn';

interface EvolutionTabProps {
  config: AppConfig;
  hotel: HotelConfig;
  onShowToast: (msg: string, type?: 'ok' | 'error') => void;
}

interface ReportSummary {
  id: string;
  fileName: string;
  periodStr: string;
  avgRate: number;
  totalOcc: number;
  totalLibres: number;
  daysCount: number;
  dailyRates: { day: number; rate: number }[];
  typeRates: Record<string, number>;
  rawData: OccupancyData;
}

const COLORS = ['#d4b162', '#60a5fa', '#34d399', '#f59e0b', '#ef4444', '#a78bfa', '#f472b6'];

function summarizeReport(report: OccupancyData, hotel: HotelConfig): ReportSummary {
  const dailyRates: { day: number; rate: number }[] = [];
  let totalOcc = 0;
  let totalLibres = 0;

  for (let i = 0; i < report.daysCount; i++) {
    const cap = report.capaciteDay[i];
    const occ = cap - report.libresTotal[i];
    totalOcc += occ;
    totalLibres += report.libresTotal[i];
    dailyRates.push({ day: i + 1, rate: cap > 0 ? (occ / cap) * 100 : 0 });
  }

  const avgRate = dailyRates.length > 0 ? dailyRates.reduce((s, d) => s + d.rate, 0) / dailyRates.length : 0;

  const typeRates: Record<string, number> = {};
  hotel.types.forEach(t => {
    const occ = report.occupied[t.code];
    if (occ) {
      const total = occ.reduce((s, v) => s + v, 0);
      typeRates[t.code] = t.capacity * report.daysCount > 0
        ? (total / (t.capacity * report.daysCount)) * 100
        : 0;
    }
  });

  return {
    id: report.id,
    fileName: report.fileName,
    periodStr: report.periodStr,
    avgRate,
    totalOcc,
    totalLibres,
    daysCount: report.daysCount,
    dailyRates,
    typeRates,
    rawData: report,
  };
}

export function EvolutionTab({ config, hotel, onShowToast }: EvolutionTabProps) {
  const [loadedReports, setLoadedReports] = useState<ReportSummary[]>([]);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newReports: ReportSummary[] = [];
    const fileList: File[] = Array.from(files);
    for (let fi = 0; fi < fileList.length; fi++) {
      const file: File = fileList[fi];
      try {
        const text = await file.text();
        const data = JSON.parse(text) as OccupancyData;
        if (!data.id || !data.dateLabels || !data.libresTotal) {
          onShowToast(`${file.name}: format invalide`, 'error');
          continue;
        }
        if (loadedReports.some(r => r.id === data.id)) continue;
        newReports.push(summarizeReport(data, hotel));
      } catch {
        onShowToast(`Fichier ${fi + 1}: erreur de lecture`, 'error');
      }
    }

    if (newReports.length > 0) {
      setLoadedReports(prev => [...prev, ...newReports]);
      onShowToast(`${newReports.length} rapport(s) ajouté(s)`);
    }
    e.target.value = '';
  };

  const removeReport = (id: string) => {
    setLoadedReports(prev => prev.filter(r => r.id !== id));
  };

  const comparison = useMemo(() => {
    if (loadedReports.length < 2) return null;

    const sorted = [...loadedReports].sort((a, b) => {
      const dateA = a.rawData.dateLabels[0]?.date;
      const dateB = b.rawData.dateLabels[0]?.date;
      if (dateA && dateB) return new Date(dateA).getTime() - new Date(dateB).getTime();
      return 0;
    });

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const rateDiff = last.avgRate - first.avgRate;
    const occDiff = last.totalOcc - first.totalOcc;

    const chartData = sorted.map((r, i) => ({
      name: r.periodStr || `Rapport ${i + 1}`,
      taux: Math.round(r.avgRate * 10) / 10,
      occupees: r.totalOcc,
      libres: r.totalLibres,
    }));

    const typeEvolution: { type: string; data: { period: string; rate: number }[] }[] = [];
    hotel.types.forEach(t => {
      const data = sorted.map(r => ({
        period: r.periodStr || r.fileName,
        rate: Math.round((r.typeRates[t.code] || 0) * 10) / 10,
      }));
      if (data.some(d => d.rate > 0)) {
        typeEvolution.push({ type: t.label, data });
      }
    });

    return { sorted, first, last, rateDiff, occDiff, chartData, typeEvolution };
  }, [loadedReports, hotel.types]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="bg-surf1 p-6 rounded-2xl border border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-serif font-bold flex items-center gap-3">
              <BarChart3 size={22} className="text-gold" />
              Évolution Multi-Périodes
            </h2>
            <p className="text-xs text-text-dark mt-1">Comparez les taux d'occupation entre différentes périodes en chargeant vos rapports JSON archivés.</p>
          </div>
          <label className="flex items-center gap-2 px-5 py-2.5 bg-gold text-bg rounded-xl text-xs font-bold cursor-pointer hover:bg-gold-light transition-all shadow-lg shadow-gold/10">
            <FileUp size={16} /> Charger rapports JSON
            <input type="file" accept=".json" multiple onChange={handleFiles} className="hidden" />
          </label>
        </div>
      </div>

      {/* Loaded reports list */}
      {loadedReports.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {loadedReports.map((r, i) => (
            <div key={r.id} className="p-4 bg-surf1 border border-border rounded-xl flex items-start gap-3 group">
              <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-text truncate">{r.periodStr || r.fileName}</div>
                <div className="text-[10px] text-text-dark mt-0.5">
                  {r.daysCount} jours &middot; Taux moy: <span className="text-gold font-bold">{r.avgRate.toFixed(1)}%</span>
                </div>
              </div>
              <button onClick={() => removeReport(r.id)} className="p-1 text-text-dark hover:text-red opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {loadedReports.length === 0 && (
        <div className="text-center py-20 opacity-40">
          <BarChart3 size={64} className="mx-auto mb-4" />
          <p className="text-sm">Chargez au moins 2 rapports JSON pour comparer l'évolution.</p>
          <p className="text-xs text-text-dark mt-2">Exportez vos rapports depuis l'onglet Analyse ou Import.</p>
        </div>
      )}

      {loadedReports.length === 1 && (
        <div className="bg-amber/10 border border-amber/20 rounded-2xl p-6 text-center text-amber text-sm">
          Chargez au moins un deuxième rapport pour comparer l'évolution.
        </div>
      )}

      {/* Comparison results */}
      {comparison && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-surf1 border border-border rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                {comparison.rateDiff > 0 ? <ArrowUpRight size={18} className="text-green" /> : comparison.rateDiff < 0 ? <ArrowDownRight size={18} className="text-red" /> : <Minus size={18} className="text-text-dark" />}
                <span className="text-[10px] font-bold text-text-dark uppercase tracking-widest">Variation taux</span>
              </div>
              <div className={cn("text-3xl font-serif font-bold", comparison.rateDiff > 0 ? "text-green" : comparison.rateDiff < 0 ? "text-red" : "text-text-dim")}>
                {comparison.rateDiff > 0 ? '+' : ''}{comparison.rateDiff.toFixed(1)}%
              </div>
              <div className="text-[10px] text-text-dark mt-1">
                {comparison.first.avgRate.toFixed(1)}% → {comparison.last.avgRate.toFixed(1)}%
              </div>
            </div>

            <div className="p-5 bg-surf1 border border-border rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                {comparison.occDiff > 0 ? <TrendingUp size={18} className="text-green" /> : <TrendingDown size={18} className="text-red" />}
                <span className="text-[10px] font-bold text-text-dark uppercase tracking-widest">Nuitées vendues</span>
              </div>
              <div className={cn("text-3xl font-serif font-bold", comparison.occDiff > 0 ? "text-green" : "text-red")}>
                {comparison.occDiff > 0 ? '+' : ''}{comparison.occDiff.toLocaleString('fr')}
              </div>
              <div className="text-[10px] text-text-dark mt-1">
                {comparison.first.totalOcc.toLocaleString('fr')} → {comparison.last.totalOcc.toLocaleString('fr')}
              </div>
            </div>

            <div className="p-5 bg-surf1 border border-border rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={18} className="text-blue" />
                <span className="text-[10px] font-bold text-text-dark uppercase tracking-widest">Périodes comparées</span>
              </div>
              <div className="text-3xl font-serif font-bold text-blue">{loadedReports.length}</div>
              <div className="text-[10px] text-text-dark mt-1">
                Total: {loadedReports.reduce((s, r) => s + r.daysCount, 0)} jours analysés
              </div>
            </div>
          </div>

          {/* Taux evolution chart */}
          <div className="bg-surf1 border border-border p-6 rounded-2xl">
            <h3 className="text-[10px] font-bold text-text-dark uppercase tracking-widest mb-6 flex items-center gap-2">
              <TrendingUp size={12} className="text-gold" /> Taux d'occupation moyen par période
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparison.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--theme-text-dark)', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--theme-text-dark)', fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--theme-surf1)', border: '1px solid var(--theme-border)', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '12px' }}
                    labelStyle={{ color: 'var(--theme-text-dim)', fontSize: '10px' }}
                  />
                  <Bar dataKey="taux" fill="var(--theme-gold)" radius={[6, 6, 0, 0]} name="Taux moyen %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Nuitées line chart */}
          <div className="bg-surf1 border border-border p-6 rounded-2xl">
            <h3 className="text-[10px] font-bold text-text-dark uppercase tracking-widest mb-6 flex items-center gap-2">
              <BarChart3 size={12} className="text-blue" /> Nuitées vendues & chambres libres
            </h3>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparison.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--theme-text-dark)', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--theme-text-dark)', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--theme-surf1)', border: '1px solid var(--theme-border)', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '12px' }}
                    labelStyle={{ color: 'var(--theme-text-dim)', fontSize: '10px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="occupees" stroke="var(--theme-green)" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 0 }} name="Nuitées vendues" />
                  <Line type="monotone" dataKey="libres" stroke="var(--theme-blue)" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 0 }} name="Chambres libres" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Per-type evolution */}
          {comparison.typeEvolution.length > 0 && (
            <div className="bg-surf1 border border-border p-6 rounded-2xl">
              <h3 className="text-[10px] font-bold text-text-dark uppercase tracking-widest mb-6">
                Évolution par type de chambre
              </h3>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-text-dark">
                      <th className="text-left p-3 font-bold uppercase text-[10px]">Type</th>
                      {comparison.sorted.map((r, i) => (
                        <th key={r.id} className="p-3 text-center font-bold text-[10px]">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            {r.periodStr || `P${i + 1}`}
                          </div>
                        </th>
                      ))}
                      <th className="p-3 text-center font-bold text-[10px]">Tendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.typeEvolution.map(te => {
                      const first = te.data[0].rate;
                      const last = te.data[te.data.length - 1].rate;
                      const diff = last - first;
                      return (
                        <tr key={te.type} className="border-b border-border/50 hover:bg-surf2/50">
                          <td className="p-3 font-bold text-text">{te.type}</td>
                          {te.data.map((d, i) => (
                            <td key={i} className="p-3 text-center font-mono text-text-dim">{d.rate.toFixed(1)}%</td>
                          ))}
                          <td className="p-3 text-center">
                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
                              diff > 2 ? "bg-green/10 text-green" : diff < -2 ? "bg-red/10 text-red" : "bg-surf3 text-text-dark"
                            )}>
                              {diff > 0 ? <ArrowUpRight size={10} /> : diff < 0 ? <ArrowDownRight size={10} /> : <Minus size={10} />}
                              {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Daily overlay chart */}
          {loadedReports.length >= 2 && loadedReports.length <= 5 && (
            <div className="bg-surf1 border border-border p-6 rounded-2xl">
              <h3 className="text-[10px] font-bold text-text-dark uppercase tracking-widest mb-6">
                Superposition journalière
              </h3>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" vertical={false} />
                    <XAxis
                      dataKey="day"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--theme-text-dark)', fontSize: 10 }}
                      label={{ value: 'Jour', position: 'bottom', fontSize: 10, fill: 'var(--theme-text-dark)' }}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--theme-text-dark)', fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--theme-surf1)', border: '1px solid var(--theme-border)', borderRadius: '12px' }}
                      labelStyle={{ color: 'var(--theme-text-dim)', fontSize: '10px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    {comparison.sorted.map((r, i) => (
                      <Line
                        key={r.id}
                        data={r.dailyRates}
                        dataKey="rate"
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={1.5}
                        dot={false}
                        name={r.periodStr || r.fileName}
                        type="monotone"
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[9px] text-text-dark mt-3 text-center">Axe X = numéro de jour dans la période (1 à N)</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
