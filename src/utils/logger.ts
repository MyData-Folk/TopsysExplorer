type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

const LOG_KEY = 'topsys_debug_logs';
const MAX_LOGS = 200;

class Logger {
  private logs: LogEntry[] = [];

  constructor() {
    // Charger les logs précédents pour ne pas perdre le contexte d'un crash/freeze
    const saved = localStorage.getItem(LOG_KEY);
    if (saved) {
      try {
        this.logs = JSON.parse(saved);
      } catch {
        this.logs = [];
      }
    }
    this.info('Logger', 'Initialisation du système de logs');
  }

  private addLog(level: LogLevel, module: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data: data ? this.sanitizeData(data) : undefined
    };

    this.logs.push(entry);
    
    // Garder seulement les N derniers logs
    if (this.logs.length > MAX_LOGS) {
      this.logs.shift();
    }

    // Persister immédiatement
    localStorage.setItem(LOG_KEY, JSON.stringify(this.logs));
    
    // Affichage console en mode dev
    const color = level === 'error' ? 'red' : level === 'warn' ? 'orange' : level === 'debug' ? 'gray' : 'blue';
    console.log(`%c[${module}] ${message}`, `color: ${color}`, data || '');
  }

  private sanitizeData(data: any): any {
    try {
      // Éviter les objets trop gros ou circulaires
      return JSON.parse(JSON.stringify(data));
    } catch {
      return '[Data non sérialisable]';
    }
  }

  debug(module: string, message: string, data?: any) { this.addLog('debug', module, message, data); }
  info(module: string, message: string, data?: any) { this.addLog('info', module, message, data); }
  warn(module: string, message: string, data?: any) { this.addLog('warn', module, message, data); }
  error(module: string, message: string, data?: any) { this.addLog('error', module, message, data); }

  getLogs() { return this.logs; }

  clear() {
    this.logs = [];
    localStorage.removeItem(LOG_KEY);
  }

  exportReport() {
    const report = {
      app: 'TopsysExplorer V2',
      userAgent: navigator.userAgent,
      time: new Date().toISOString(),
      localStorageKeys: Object.keys(localStorage),
      logs: this.logs
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `topsys-diagnostic-${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const logger = new Logger();
