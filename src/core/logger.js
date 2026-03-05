/**
 * @fileoverview Centralized Telemetry & Observability
 * @architecture Single Responsibility Principle (SRP)
 */

import { CONFIG } from '../config/settings.js';

export const Logger = Object.freeze({
    info: (msg) => CONFIG.SYSTEM.VERBOSE_LOGGING && console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
    success: (msg) => CONFIG.SYSTEM.VERBOSE_LOGGING && console.log(`\x1b[32m[OK]\x1b[0m ${msg}`),
    warn: (msg) => CONFIG.SYSTEM.VERBOSE_LOGGING && console.warn(`\x1b[33m[WARN]\x1b[0m ${msg}`),
    error: (msg) => CONFIG.SYSTEM.VERBOSE_LOGGING && console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
    system: (msg) => CONFIG.SYSTEM.VERBOSE_LOGGING && console.log(`\x1b[35m[SYSTEM]\x1b[0m ${msg}`)
});