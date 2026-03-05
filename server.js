/**
 * @fileoverview Enterprise API Server Entry Point
 * @architecture Express, Helmet, CORS, Graceful Shutdown
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import { CONFIG } from './src/config/settings.js';
import { Logger } from './src/core/logger.js';
import { requireApiKey } from './src/middlewares/authMiddleware.js';
import apiRoutes from './src/routes/apiRoutes.js';

const app = express();

// ==========================================
// MIDDLEWARES
// ==========================================
app.use(helmet()); 
app.use(cors());   
app.use(express.json()); 

// ==========================================
// ROUTER MOUNTING
// ==========================================
// Menyambungkan rute utama API dan melindunginya dengan API Key
app.use('/api/v1/extract', requireApiKey, apiRoutes);

// Endpoint Health Check (Bebas API Key, khusus untuk dimonitor oleh PM2 / Cloudflare)
app.get('/health', (req, res) => {
    res.status(200).json({ status: "OK", uptime: process.uptime() });
});

// Penanganan Rute 404 Global
app.use((req, res) => {
    res.status(404).json({ success: false, message: "Endpoint tidak ditemukan." });
});

// ==========================================
// SERVER INITIALIZATION & GRACEFUL SHUTDOWN
// ==========================================
// const server = app.listen(CONFIG.SERVER.PORT, () => {
//Logger.system('=========================================');
//Logger.system(`🚀 Enterprise Downloader API Berjalan!`);
//Logger.system(`📡 Port      : ${CONFIG.SERVER.PORT}`);
//Logger.system(`🚪 Endpoint  : POST /api/v1/extract/:platform`);
//Logger.system('=========================================');
//});

//process.on('SIGTERM', () => {
//Logger.warn('Sinyal SIGTERM diterima: Menutup server HTTP secara elegan...');
//server.close(() => {
//Logger.system('Server HTTP ditutup.');
//process.exit(0);
//});
//});

export default app;
