/**
 * @fileoverview Facebook Aggregator System (Multi-Scraper Orchestration)
 * @architecture Promise Race, Non-blocking I/O, State Lock
 * @author Principal Software Engineer
 */

import { CONFIG } from '../../config/settings.js';
import { ExtractionStatus, VideoData } from '../../core/contracts.js';
import { Logger } from '../../core/logger.js';

export class FacebookAggregatorManager {
    constructor(scrapers) {
        this.scrapers = scrapers;
    }

    _getKastaScore(result) {
        if (result.status === ExtractionStatus.SUCCESS_VIDEO) {
            return result.link_hd ? 1 : 2;
        }
        if (result.status === ExtractionStatus.ERROR_PRIVATE_VIDEO) {
            return 3;
        }
        return 4;
    }

    _mergeMetadata(master, newData, scraperName) {
        if (!master.link_hd && newData.link_hd) {
            master.link_hd = newData.link_hd;
            Logger.system(`[*] Menjahit metadata: Kualitas HD ditambahkan dari ${scraperName}`);
        }
    }

    async fetchBestDownloadData(videoUrl) {
        return new Promise((resolve) => {
            let masterPayload = null;
            let highestKasta = 4;
            let softDeadlineTimer = null;
            let globalDeadlineTimer = null;
            let activeWorkers = this.scrapers.length;
            let isPrivateDetected = false;

            // [OPTIMASI ARSITEKTUR] State Lock untuk mencegah eksekusi redundan
            let isResolved = false; 

            Logger.system(`[FB Aggregator] Mengerahkan ${activeWorkers} scraper secara paralel...`);

            // Fungsi Pembersihan Memori & Resolusi
            const finalize = (reason) => {
                // Mencegah peladen yang lambat mengeksekusi blok ini berulang kali
                if (isResolved) return; 
                isResolved = true; // Kunci gerbang finish

                if (softDeadlineTimer) clearTimeout(softDeadlineTimer);
                if (globalDeadlineTimer) clearTimeout(globalDeadlineTimer);

                Logger.system(`[FB Aggregator] Selesai (Trigger: ${reason}).`);

                if (!masterPayload && isPrivateDetected) {
                    return resolve(new VideoData({ status: ExtractionStatus.ERROR_PRIVATE_VIDEO }));
                }

                resolve(masterPayload || new VideoData({ status: ExtractionStatus.ERROR_SYSTEM }));
            };

            globalDeadlineTimer = setTimeout(() => finalize('Global Timeout'), CONFIG.SYSTEM.GLOBAL_TIMEOUT_MS);

            this.scrapers.forEach(scraper => {
                scraper.extractVideo(videoUrl)
                    .then(result => {
                        // Jika garis finish sudah dilewati pemenang lain, hentikan pemrosesan ekstra
                        if (isResolved) return; 

                        const currentKasta = this._getKastaScore(result);

                        if (currentKasta === 3) {
                            isPrivateDetected = true;
                            Logger.warn(`[FB Aggregator] Peringatan: ${scraper.name} mendeteksi video Private.`);
                        }

                        if (!masterPayload && currentKasta <= 2) {
                            masterPayload = result;
                            highestKasta = currentKasta;
                            Logger.system(`[+] ${scraper.name} memegang Master Data (Kasta: ${currentKasta})`);
                        } else if (masterPayload && currentKasta < highestKasta) {
                            this._mergeMetadata(result, masterPayload, scraper.name);
                            masterPayload = result;
                            highestKasta = currentKasta;
                            Logger.system(`[+] ${scraper.name} mengambil alih Master Data (Kasta naik ke: ${currentKasta})`);
                        } else if (masterPayload && currentKasta === highestKasta) {
                            this._mergeMetadata(masterPayload, result, scraper.name);
                        }

                        // Evaluasi Pemenang Cepat (Short-Circuit)
                        if (highestKasta === 1) {
                            finalize(`Kualitas Tertinggi (HD) diamankan oleh ${scraper.name}`);
                        } else if (highestKasta === 2 && !softDeadlineTimer) {
                            Logger.warn(`[FB Aggregator] Soft Timeout aktif. Menunggu ${CONFIG.SYSTEM.SOFT_TIMEOUT_MS / 1000}s untuk kualitas HD...`);
                            softDeadlineTimer = setTimeout(() => finalize('Soft Timeout (Pencarian HD Berakhir)'), CONFIG.SYSTEM.SOFT_TIMEOUT_MS);
                        }
                    })
                    .catch(() => {})
                    .finally(() => {
                        activeWorkers--;
                        // Panggil finalize hanya jika gerbang belum dikunci
                        if (activeWorkers === 0 && !isResolved) finalize('Semua Worker Selesai');
                    });
            });
        });
    }
}