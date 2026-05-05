import React from 'react';
import { cn } from '../utils/cn';

interface KPICardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ size?: number }>;
  color: 'gold' | 'blue' | 'green' | 'amber';
}

const colorMap = {
  gold: 'border-gold/20 bg-surf1',
  blue: 'border-blue/20 bg-surf1',
  green: 'border-green/20 bg-surf1',
  amber: 'border-amber/20 bg-surf1',
};

const iconColorMap = {
  gold: 'text-gold bg-gold/10',
  blue: 'text-blue bg-blue/10',
  green: 'text-green bg-green/10',
  amber: 'text-amber bg-amber/10',
};

const valueColorMap = {
  gold: 'text-gold',
  blue: 'text-blue',
  green: 'text-green',
  amber: 'text-amber',
};

export function KPICard({ label, value, sub, icon: Icon, color }: KPICardProps) {
  return (
    <div className={cn("p-5 rounded-2xl border transition-all hover:shadow-lg hover:shadow-black/5", colorMap[color])}>
      <div className="flex justify-between items-start mb-3">
        <div className={cn("p-2 rounded-lg", iconColorMap[color])}>
          <Icon size={18} />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-widest text-text-dark">{label}</span>
      </div>
      <div className={cn("text-2xl font-serif font-bold mb-0.5", valueColorMap[color])}>{value}</div>
      <div className="text-[10px] text-text-dark font-medium">{sub}</div>
    </div>
  );
}
