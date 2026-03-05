/**
 * @fileoverview Main API Gateway Router
 * @architecture Dynamic Routing, Dependency Injection
 */

import express from 'express';
import { Logger } from '../core/logger.js';
import { ExtractionStatus } from '../core/contracts.js';

// Import Mesin Facebook
import { FacebookAggregatorManager } from '../modules/facebook/aggregator.js';
import { FDownloadApp, FBDownloaderTo, SnapSaveIo, FDownloaderNet } from '../modules/facebook/scrapers.js';

// [TAMBAHKAN IMPORT TIKTOK DI SINI]
import { TiktokAggregatorManager } from '../modules/tiktok/aggregator.js';
import { MusicalDownScraper, SaveTTScraper, SaveTikScraper, TikTokIOScraper } from '../modules/tiktok/scrapers.js';

// IMPORT TWITTER
import { TwitterAggregatorManager } from '../modules/twitter/aggregator.js';
import { SaveTwtScraper, TwitterVideoDownloaderScraper, XSaverScraper, SaveTwitterNetScraper } from '../modules/twitter/scrapers.js';

// ==========================================
// DEPENDENCY INJECTION (Inisialisasi Singleton)
// ==========================================
const fbScrapers = [
    new FDownloadApp(),
    new FBDownloaderTo(),
    new SnapSaveIo(),
    new FDownloaderNet()
];
const fbAggregator = new FacebookAggregatorManager(fbScrapers);

// [AKTIFKAN INISIALISASI TIKTOK]
const ttScrapers = [
    new MusicalDownScraper(),
    new SaveTTScraper(),
    new SaveTikScraper(),
    new TikTokIOScraper()
];
const ttAggregator = new TiktokAggregatorManager(ttScrapers);

// INISIALISASI TWITTER
const twScrapers = [
    new SaveTwtScraper(), new TwitterVideoDownloaderScraper(), 
    new XSaverScraper(), new SaveTwitterNetScraper()
];
const twAggregator = new TwitterAggregatorManager(twScrapers);

const router = express.Router();

// ==========================================
// CONTROLLER (Dynamic Endpoint)
// ==========================================
router.post('/:platform', async (req, res) => {
    const { platform } = req.params;
    const { url } = req.body;

    // 1. Validasi Input Dasar
    if (!url || typeof url !== 'string') {
        return res.status(400).json({
            success: false,
            error: "Bad Request",
            message: "Parameter 'url' wajib disertakan dalam JSON body."
        });
    }

    try {
        let result;

        // 2. Switch Case Routing Berdasarkan Platform
        switch (platform.toLowerCase()) {
            case 'fb':
            case 'facebook':
                Logger.info(`[Gateway] Meneruskan request ke Mesin Facebook untuk: ${url}`);
                result = await fbAggregator.fetchBestDownloadData(url);
                break;

            case 'tt':
            case 'tiktok':
                Logger.info(`[Gateway] Meneruskan request ke Mesin TikTok untuk: ${url}`);
                result = await ttAggregator.fetchBestDownloadData(url);
                break;

            case 'tw':
            case 'twitter':
            case 'x':
                Logger.info(`[Gateway] Meneruskan request ke Mesin Twitter untuk: ${url}`);
                result = await twAggregator.fetchBestDownloadData(url);
                break;

            default:
                return res.status(404).json({
                    success: false,
                    error: "Not Found",
                    message: `Platform '${platform}' tidak didukung. Gunakan 'fb' atau 'tt'.`
                });
        }

        // 3. Standarisasi Format Respons (Global Response Mapping)
        if (result.status === ExtractionStatus.ERROR_INVALID_URL) {
            return res.status(422).json({ success: false, data: result.toDict(), message: "URL tidak valid atau video tidak ditemukan." });
        }
        if (result.status === ExtractionStatus.ERROR_PRIVATE_VIDEO) {
            return res.status(403).json({ success: false, data: result.toDict(), message: "Video bersifat Pribadi (Private)." });
        }
        if (result.status === ExtractionStatus.ERROR_SYSTEM) {
            return res.status(500).json({ success: false, data: result.toDict(), message: "Gagal mengekstrak video dari server target." });
        }

        // 4. Sukses Mengembalikan Data
        return res.status(200).json({
            success: true,
            data: result.toDict()
        });

    } catch (error) {
        Logger.error(`[Gateway] Terjadi Fatal Error di Controller: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "Terjadi kesalahan sistem internal."
        });
    }
});

export default router;