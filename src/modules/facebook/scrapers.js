/**
 * @fileoverview Facebook Scraper Engines
 * @architecture OOP Inheritance, Single Responsibility Principle
 */

import { CONFIG } from '../../config/settings.js';
import { BaseDownloader } from '../../core/BaseDownloader.js';
import { ExtractionStatus, VideoData } from '../../core/contracts.js';
import { Logger } from '../../core/logger.js';
import { generateCfToken, parseFbHtmlToLinks } from './utils.js';

/**
 * Kelas abstrak spesifik untuk FB agar kita tidak mengulang logika parsing JSON yang sama
 * untuk ke-4 endpoint (karena struktur AJAX mereka identik)
 */
class BaseFacebookAjaxScraper extends BaseDownloader {
    async _processAjaxRequest(targetUrl, payload) {
        try {
            Logger.info(`[${this.platform} - ${this.name}] Mengirim POST payload untuk: ${targetUrl}`);

            const response = await this._request(this.configEndpoint, {
                method: 'POST',
                data: payload,
                // Mengirim sebagai Form URL Encoded sesuai kebiasaan API ini
                isJson: false 
            });

            // Parsing JSON manual dengan proteksi
            let data;
            try {
                data = JSON.parse(response.body);
            } catch (e) {
                Logger.error(`[${this.platform} - ${this.name}] Gagal memparsing JSON respons dari server target.`);
                return new VideoData({ status: ExtractionStatus.ERROR_SYSTEM });
            }

            // Penanganan Error Spesifik: Video Private
            if (data.mess && data.mess.toLowerCase().includes('private')) {
                Logger.warn(`[${this.platform} - ${this.name}] Video terdeteksi sebagai Private.`);
                return new VideoData({ status: ExtractionStatus.ERROR_PRIVATE_VIDEO });
            }

            // Ekstraksi HTML jika sukses
            if (data.status === 'ok' && data.data) {
                const { linkHd, linkMp4 } = parseFbHtmlToLinks(data.data);

                if (linkHd || linkMp4) {
                    Logger.success(`[${this.platform} - ${this.name}] Sukses mengekstrak link unduhan.`);
                    return new VideoData({
                        status: ExtractionStatus.SUCCESS_VIDEO,
                        linkHd: linkHd,
                        linkMp4: linkMp4
                    });
                } else {
                    Logger.warn(`[${this.platform} - ${this.name}] HTML diterima namun link tidak ditemukan.`);
                    return new VideoData({ status: ExtractionStatus.ERROR_INVALID_URL });
                }
            }

            return new VideoData({ status: ExtractionStatus.ERROR_INVALID_URL });

        } catch (error) {
            return new VideoData({ status: ExtractionStatus.ERROR_SYSTEM });
        }
    }
}

// ---------------------------------------------------------
// IMPLEMENTASI KELAS PEKERJA (WORKERS)
// ---------------------------------------------------------

export class FDownloadApp extends BaseFacebookAjaxScraper {
    constructor() {
        super('Facebook', 'FDownload.app');
        this.configEndpoint = CONFIG.FACEBOOK.ENDPOINTS.FDOWNLOAD_APP;
    }
    async extractVideo(videoUrl) {
        const payload = { p: "home", q: videoUrl, lang: "en" };
        return await this._processAjaxRequest(videoUrl, payload);
    }
}

export class FBDownloaderTo extends BaseFacebookAjaxScraper {
    constructor() {
        super('Facebook', 'FBDownloader.to');
        this.configEndpoint = CONFIG.FACEBOOK.ENDPOINTS.FBDOWNLOADER_TO;
    }
    async extractVideo(videoUrl) {
        // Token statis bawaan skrip lama (Bisa kedaluwarsa, namun dipertahankan sesuai aslinya)
        const payload = { k_exp: "1759715048", k_token: "4e254dc86683e6d2639c0e8a83c4b5dfc83bbd18fde85f923690897bd7dd2d47", p: "home", q: videoUrl, lang: "id", v: "v2" };
        return await this._processAjaxRequest(videoUrl, payload);
    }
}

export class SnapSaveIo extends BaseFacebookAjaxScraper {
    constructor() {
        super('Facebook', 'SnapSave.io');
        this.configEndpoint = CONFIG.FACEBOOK.ENDPOINTS.SNAPSAVE_IO;
    }
    async extractVideo(videoUrl) {
        const payload = { q: videoUrl };
        return await this._processAjaxRequest(videoUrl, payload);
    }
}

export class FDownloaderNet extends BaseFacebookAjaxScraper {
    constructor() {
        super('Facebook', 'FDownloader.net');
        this.configEndpoint = CONFIG.FACEBOOK.ENDPOINTS.FDOWNLOADER_NET;
    }
    async extractVideo(videoUrl) {
        // Token cf dinamis digenerate di sini
        const payload = { k_token: '80e05c77e8e4d03b53e9fdeef08c31a4de9cd0861709a530c2299d3e8922f373', q: videoUrl, cftoken: generateCfToken(), lang: 'id', web: 'fdownloader.net', v: 'v2' };
        return await this._processAjaxRequest(videoUrl, payload);
    }
}