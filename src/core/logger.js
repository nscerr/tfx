/**
 * @fileoverview Centralized Logging System
 * @architecture Environment-Aware Logger
 */

import { CONFIG } from '../config/settings.js';

export const Logger = {
    // Info, System, dan Success BISA dibungkam dari Vercel Environment
    info: (msg) => { 
        if (CONFIG.SERVER.ENABLE_LOGS) console.log(`\x1b[36m${msg}\x1b[0m`); 
    },
    system: (msg) => { 
        if (CONFIG.SERVER.ENABLE_LOGS) console.log(`\x1b[35m${msg}\x1b[0m`); 
    },
    success: (msg) => { 
        if (CONFIG.SERVER.ENABLE_LOGS) console.log(`\x1b[32m${msg}\x1b[0m`); 
    },
    
    // Warning dan Error (krusial untuk pemantauan server produksi)
    warn: (msg) => {
        console.log(`\x1b[33m${msg}\x1b[0m`);
    },
    error: (msg) => {
        console.log(`\x1b[31m${msg}\x1b[0m`);
    }
};
