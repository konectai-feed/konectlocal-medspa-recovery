type Level='debug'|'info'|'warn'|'error';
export function log(level: Level, message: string, context: Record<string, unknown> = {}) { console[level](JSON.stringify({ level, message, service: 'medspa-recovery', timestamp: new Date().toISOString(), ...context })); }
