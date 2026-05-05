import { FileUp, LayoutDashboard, Settings, GitCompareArrows, HelpCircle, Cloud } from 'lucide-react'
import { TabId } from '../types'
import { cn } from '../utils/cn'

const TABS = [
  { id: 'import' as TabId, label: 'Importer', icon: FileUp },
  { id: 'analyse' as TabId, label: 'Analyse & KPIs', icon: LayoutDashboard },
  { id: 'evolution' as TabId, label: 'Évolution', icon: GitCompareArrows },
  { id: 'settings' as TabId, label: 'Configuration', icon: Settings },
  { id: 'help' as TabId, label: 'Aide', icon: HelpCircle },
  { id: 'cloud' as TabId, label: 'Cloud', icon: Cloud },
]

interface TabNavProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  isCloudConnected?: boolean
}

export function TabNav({ activeTab, onTabChange, isCloudConnected }: TabNavProps) {
  return (
    <nav className="flex px-8 border-b border-border bg-surf1 h-12 shrink-0 sticky top-0 z-50">
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
  )
}
