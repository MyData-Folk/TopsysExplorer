import { RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { FilterState, OccupancyData, AppConfig, HotelConfig, ViewMode } from '../types';
import { cn } from '../utils/cn';

interface FilterBarProps {
  filters: FilterState;
  report: OccupancyData;
  config: AppConfig;
  hotel: HotelConfig;
  onFiltersChange: (f: FilterState) => void;
  onReset: () => void;
}

const VIEW_LABELS: Record<ViewMode, string> = { all: 'Tout', libres: 'Libres', occupees: 'Occupées', taux: 'Taux' };
const DOW_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export function FilterBar({ filters, report, config, hotel, onFiltersChange, onReset }: FilterBarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const activeCount = [
    filters.view !== 'all',
    filters.types.size > 0,
    filters.dateFrom >= 0 || filters.dateTo >= 0,
    filters.dows.size < 7,
    filters.tauxMin > 0 || filters.tauxMax < 100,
  ].filter(Boolean).length;

  const updateFilter = (patch: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  return (
    <aside className={cn(
      "sticky top-4 self-start transition-all duration-300 shrink-0",
      collapsed ? "w-10" : "w-64"
    )}>
      {collapsed ? (
        <div className="bg-surf1 border border-border rounded-2xl p-2 flex flex-col items-center gap-2">
          <button onClick={() => setCollapsed(false)} className="p-1.5 hover:bg-surf2 rounded-lg transition-colors" title="Ouvrir filtres">
            <ChevronRight size={16} className="text-text-dim" />
          </button>
          {activeCount > 0 && (
            <span className="w-5 h-5 rounded-full text-[9px] font-bold bg-gold/10 text-gold flex items-center justify-center">{activeCount}</span>
          )}
        </div>
      ) : (
        <div className="bg-surf1 border border-border rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <h3 className="text-xs font-bold flex-1">Filtres</h3>
            {activeCount > 0 && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gold/10 text-gold">{activeCount}</span>}
            <button onClick={e => { e.stopPropagation(); onReset(); }} className="text-[10px] text-text-dark hover:text-text flex items-center gap-1" title="Réinitialiser">
              <RotateCcw size={10} />
            </button>
            <button onClick={() => setCollapsed(true)} className="p-1 hover:bg-surf2 rounded transition-colors" title="Réduire">
              <ChevronLeft size={14} className="text-text-dim" />
            </button>
          </div>

          {/* Sections */}
          <div className="p-4 space-y-5 max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
            {/* View mode */}
            <section>
              <label className="text-[9px] font-bold text-text-dark uppercase tracking-wider block mb-2">Affichage</label>
              <div className="grid grid-cols-2 gap-1">
                {(Object.keys(VIEW_LABELS) as ViewMode[]).map(v => (
                  <button key={v} onClick={() => updateFilter({ view: v })} className={cn("px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all", filters.view === v ? "bg-gold/10 border-gold text-gold" : "bg-surf2 border-border text-text-dark hover:text-text")}>
                    {VIEW_LABELS[v]}
                  </button>
                ))}
              </div>
            </section>

            {/* Types */}
            <section>
              <label className="text-[9px] font-bold text-text-dark uppercase tracking-wider block mb-2">Types</label>
              <div className="space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar">
                {hotel.types.map(t => {
                  const checked = filters.types.size === 0 || filters.types.has(t.code);
                  const avgRate = report.occupied[t.code]
                    ? Math.round(report.occupied[t.code].reduce((a, b) => a + b, 0) / (t.capacity * report.daysCount) * 100)
                    : 0;
                  return (
                    <label key={t.code} className="flex items-center gap-2 text-[10px] cursor-pointer p-1 rounded hover:bg-surf2">
                      <input type="checkbox" checked={checked} className="accent-gold w-3 h-3"
                        onChange={() => {
                          const next = new Set(filters.types);
                          if (filters.types.size === 0) {
                            hotel.types.forEach(tt => { if (tt.code !== t.code) next.add(tt.code); });
                          } else if (next.has(t.code)) { next.delete(t.code); } else { next.add(t.code); }
                          if (next.size === hotel.types.length) next.clear();
                          updateFilter({ types: next });
                        }} />
                      <span className="font-bold truncate flex-1">{t.label}</span>
                      <span className="text-text-dark">{avgRate}%</span>
                    </label>
                  );
                })}
              </div>
            </section>

            {/* Dates */}
            <section>
              <label className="text-[9px] font-bold text-text-dark uppercase tracking-wider block mb-2">Plage</label>
              <div className="space-y-2">
                <select value={filters.dateFrom} onChange={e => updateFilter({ dateFrom: +e.target.value })} className="w-full bg-surf2 border border-border rounded-lg p-1.5 text-[10px] text-text-dim focus:border-gold outline-none">
                  <option value={-1}>Début</option>
                  {report.dateLabels.map((d, i) => <option key={i} value={i}>{d.short}</option>)}
                </select>
                <select value={filters.dateTo} onChange={e => updateFilter({ dateTo: +e.target.value })} className="w-full bg-surf2 border border-border rounded-lg p-1.5 text-[10px] text-text-dim focus:border-gold outline-none">
                  <option value={-1}>Fin</option>
                  {report.dateLabels.map((d, i) => <option key={i} value={i}>{d.short}</option>)}
                </select>
              </div>
            </section>

            {/* DOW */}
            <section>
              <label className="text-[9px] font-bold text-text-dark uppercase tracking-wider block mb-2">Jours</label>
              <div className="grid grid-cols-4 gap-1">
                {DOW_LABELS.map((d, i) => (
                  <button key={i} onClick={() => {
                    const next = new Set(filters.dows);
                    if (next.has(i)) next.delete(i); else next.add(i);
                    updateFilter({ dows: next });
                  }} className={cn("py-1 rounded text-[9px] font-bold border", filters.dows.has(i) ? "bg-gold/10 border-gold text-gold" : "bg-surf2 border-border text-text-dark")}>
                    {d}
                  </button>
                ))}
              </div>
            </section>

            {/* Taux range */}
            <section>
              <label className="text-[9px] font-bold text-text-dark uppercase tracking-wider block mb-2">Taux</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-text-dark w-7">Min</span>
                  <input type="range" min={0} max={100} value={filters.tauxMin} onChange={e => updateFilter({ tauxMin: +e.target.value })} className="flex-1 accent-gold h-1" />
                  <span className="text-[10px] text-text-dim w-8 text-right">{filters.tauxMin}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-text-dark w-7">Max</span>
                  <input type="range" min={0} max={100} value={filters.tauxMax} onChange={e => updateFilter({ tauxMax: +e.target.value })} className="flex-1 accent-gold h-1" />
                  <span className="text-[10px] text-text-dim w-8 text-right">{filters.tauxMax}%</span>
                </div>
                <label className="flex items-center gap-2 text-[10px] text-text-dim mt-2 cursor-pointer">
                  <input type="checkbox" checked={filters.showOnlyFiltered} onChange={e => updateFilter({ showOnlyFiltered: e.target.checked })} className="accent-gold w-3 h-3" />
                  Masquer filtrées
                </label>
              </div>
            </section>
          </div>
        </div>
      )}
    </aside>
  );
}
