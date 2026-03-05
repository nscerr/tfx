/**
 * @fileoverview Twitter Aggregator System
 * @architecture Promise Race, Smart Data Upgrading, Regex Sanitization
 */

import { CONFIG } from '../../config/settings.js';
import { ExtractionStatus, VideoData } from '../../core/contracts.js';
import { Logger } from '../../core/logger.js';

export class TwitterAggregatorManager {
    constructor(scrapers) { 
        this.scrapers = scrapers; 
    }

    _getKastaScore(result) {
        if (result.status === ExtractionStatus.SUCCESS_VIDEO) return result.link_hd ? 1 : 2;
        return 4;
    }

    /**
     * [PERBAIKAN] Pembersih Ekstrem: 
     * Menghapus enter mati, spasi ganda, link t.co, dan kutip asimetris
     */
    _cleanText(str) {
        if (!str) return null;

        let cleaned = str
            // 1. Menghapus URL pendek t.co bawaan Twitter di mana pun ia berada
            .replace(/https?:\/\/t\.co\/\w+/g, '')
            // 2. Mengatasi enter mati dan spasi ganda
            .replace(/\\r\\n/g, '\n')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '')
            .replace(/&quot;/g, '"') // Normalisasi entitas HTML ke kutip asli
            .replace(/\s+/g, ' ')
            .trim();

        // 3. Mengupas kutip di paling awal (^) atau paling akhir ($) kalimat secara agresif
        // Ini mengatasi kasus di mana kutip hanya ada di satu sisi (asimetris)
        cleaned = cleaned.replace(/^["']+|["']+$/g, '').trim();

        return cleaned || null;
    }

    _mergeMetadata(master, newData, scraperName) {
        // 1. Menjahit Author
        if (!master.author && newData.author) { 
            master.author = this._cleanText(newData.author); 
            Logger.system(`[*] Menjahit Author dari ${scraperName}`); 
        }

        // 2. [PERBAIKAN] Logika Upgrade Deskripsi (Menghindari teks terpotong)
        const cleanNewDesc = this._cleanText(newData.description);
        if (cleanNewDesc) {
            // Jika master belum punya deskripsi, ATAU deskripsi baru LEBIH PANJANG dari master
            if (!master.description || cleanNewDesc.length > master.description.length) {
                master.description = cleanNewDesc; 
                Logger.system(`[*] Menjahit/Update Deskripsi yang lebih lengkap dari ${scraperName}`); 
            }
        }

        // 3. Menjahit Resolusi HD
        if (!master.link_hd && newData.link_hd) { 
            master.link_hd = newData.link_hd; 
            Logger.system(`[*] Menjahit kualitas HD dari ${scraperName}`); 
        }
    }

    async fetchBestDownloadData(videoUrl) {
        return new Promise((resolve) => {
            let masterPayload = null; 
            let highestKasta = 4;
            let softDeadlineTimer = null; 
            let globalDeadlineTimer = null;
            let activeWorkers = this.scrapers.length; 
            let isResolved = false;

            Logger.system(`[TW Aggregator] Mengerahkan ${activeWorkers} scraper secara paralel...`);

            const finalize = (reason) => {
                if (isResolved) return; 
                isResolved = true;
                if (softDeadlineTimer) clearTimeout(softDeadlineTimer);
                if (globalDeadlineTimer) clearTimeout(globalDeadlineTimer);
                Logger.system(`[TW Aggregator] Selesai (Trigger: ${reason}).`);
                resolve(masterPayload || new VideoData({ status: ExtractionStatus.ERROR_SYSTEM }));
            };

            globalDeadlineTimer = setTimeout(() => finalize('Global Timeout'), CONFIG.SYSTEM.GLOBAL_TIMEOUT_MS);

            this.scrapers.forEach(scraper => {
                scraper.extractVideo(videoUrl).then(result => {
                    if (isResolved) return;
                    const currentKasta = this._getKastaScore(result);

                    if (!masterPayload && currentKasta <= 2) {
                        masterPayload = result; 
                        highestKasta = currentKasta;
                        masterPayload.author = this._cleanText(masterPayload.author);
                        masterPayload.description = this._cleanText(masterPayload.description);
                        Logger.system(`[+] ${scraper.name} memegang Master Data (Kasta: ${currentKasta})`);
                    } else if (masterPayload && currentKasta < highestKasta) {
                        this._mergeMetadata(result, masterPayload, scraper.name);
                        masterPayload = result; 
                        highestKasta = currentKasta;
                        Logger.system(`[+] ${scraper.name} merebut Master Data (Kasta: ${currentKasta})`);
                    } else if (masterPayload && currentKasta === highestKasta) {
                        this._mergeMetadata(masterPayload, result, scraper.name);
                    }

                    if (highestKasta === 1) {
                        const isMetadataComplete = !!masterPayload.author && !!masterPayload.description;

                        if (isMetadataComplete) {
                            // Tunggu sejenak barangkali ada peladen lain yang bawa deskripsi lebih panjang
                            if (!softDeadlineTimer) {
                                Logger.warn(`[TW Aggregator] Data dikunci. Memberi waktu 3 detik barangkali ada deskripsi lebih baik...`);
                                softDeadlineTimer = setTimeout(() => finalize('Soft Timeout (Optimalisasi Metadata)'), 3000);
                            }
                        } else if (!softDeadlineTimer) {
                            Logger.warn(`[TW Aggregator] Metadata belum lengkap. Mengaktifkan Soft Timeout 10s...`);
                            softDeadlineTimer = setTimeout(() => finalize('Soft Timeout (Pencarian Metadata)'), CONFIG.SYSTEM.SOFT_TIMEOUT_MS);
                        }
                    } else if (highestKasta === 2 && !softDeadlineTimer) {
                        softDeadlineTimer = setTimeout(() => finalize('Soft Timeout'), CONFIG.SYSTEM.SOFT_TIMEOUT_MS);
                    }
                }).catch(() => {}).finally(() => {
                    activeWorkers--;
                    if (activeWorkers === 0 && !isResolved) finalize('Semua Worker Selesai');
                });
            });
        });
    }
}