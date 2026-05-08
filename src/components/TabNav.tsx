import { FileUp, LayoutDashboard, Settings, GitCompareArrows, HelpCircle, Cloud } from 'lucide-react';
import type { ComponentType } from 'react';
import { TabId } from '../types';
import { cn } from '../utils/cn';

const TABS: { id: TabId; label: string; shortLabel: string; icon: ComponentType<{ size?: number }> }[] = [
  { id: 'import', label: 'Importer', shortLabel: 'Import', icon: FileUp },
  { id: 'analyse', label: 'Analyse & KPIs', shortLabel: 'Analyse', icon: LayoutDashboard },
  { id: 'evolution', label: 'Évolution', shortLabel: 'Évol.', icon: GitCompareArrows },
  { id: 'settings', label: 'Configuration', shortLabel: 'Config', icon: Settings },
  { id: 'help', label: 'Aide', shortLabel: 'Aide', icon: HelpCircle },
  { id: 'cloud', label: 'Cloud', shortLabel: 'Cloud', icon: Cloud },
];

interface TabNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isCloudConnected?: boolean;
}

export function TabNav({ activeTab, onTabChange, isCloudConnected }: TabNavProps) {
  return (
    <nav className="hidden md:flex px-8 border-b border-border bg-surf1 h-12 shrink-0 sticky top-0 z-50">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-5 border-b-2 text-xs font-semibold transition-all h-full outline-none",
            activeTab === tab.id
              ? "border-gold text-gold"
              : "border-transparent text-text-dim hover:text-text hover:border-border-hover"
          )}
        >
          <div className="relative">
            <tab.icon size={15} />
            {tab.id === 'cloud' && isCloudConnected && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green rounded-full" />
            )}
          </div>
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

export function TabNavMobile({ activeTab, onTabChange, isCloudConnected }: TabNavProps) {
  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surf1/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="grid h-16 grid-cols-6 px-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            aria-label={tab.label}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            className={cn(
              "min-h-11 rounded-xl px-1 text-[9px] font-bold transition-all flex flex-col items-center justify-center gap-1",
              activeTab === tab.id
                ? "text-gold bg-gold/10"
                : "text-text-dark hover:text-text"
            )}
          >
            <div className="relative">
              <tab.icon size={18} />
              {tab.id === 'cloud' && isCloudConnected && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green rounded-full" />
              )}
            </div>
            <span className="leading-none">{tab.shortLabel}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
