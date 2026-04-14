/**
 * @fileoverview Authentication Middleware
 * @architecture Single Responsibility Principle (SRP)
 */

import { CONFIG } from '../config/settings.js';
import { Logger } from '../core/logger.js';

export const requireApiKey = (req, res, next) => {
    const clientKey = req.headers['x-api-key'];

    if (!clientKey || clientKey !== CONFIG.SERVER.API_KEY) {
        Logger.warn(`[Gateway] Percobaan akses ditolak. IP: ${req.ip}`);
        return res.status(401).json({
            success: false,
            error: "Unauthorized",
            message: "Akses tidak valid"
        });
    }

    next();
};
