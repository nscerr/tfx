/**
 * @fileoverview TikTok Aggregator System
 * @architecture Promise Race, Non-blocking I/O, Smart Data Stitching
 */

import { CONFIG } from '../../config/settings.js';
import { ExtractionStatus, VideoData } from '../../core/contracts.js';
import { Logger } from '../../core/logger.js';

export class TiktokAggregatorManager {
    constructor(scrapers) {
        this.scrapers = scrapers;
    }

    _getKastaScore(status) {
        if (status === ExtractionStatus.SUCCESS_SLIDE) return 1;
        if (status === ExtractionStatus.SUCCESS_VIDEO) return 1;
        if (status === ExtractionStatus.SUCCESS_AUDIO_ONLY) return 2;
        return 4; 
    }

    _mergeMetadata(master, newData, scraperName) {
        if (!master.author && newData.author) {
            master.author = newData.author;
            Logger.system(`[*] Menjahit metadata (Author: ${newData.author}) dari ${scraperName}`);
        }
        if (!master.description && newData.description) {
            master.description = newData.description;
            Logger.system(`[*] Menjahit metadata (Deskripsi) dari ${scraperName}`);
        }
        // Jika peladen baru punya link_hd dan master belum punya, tambahkan (opsional untuk TikTok)
        if (!master.link_hd && newData.link_hd) {
            master.link_hd = newData.link_hd;
            Logger.system(`[*] Menjahit link kualitas HD dari ${scraperName}`);
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

            Logger.system(`[TT Aggregator] Mengerahkan ${activeWorkers} scraper secara paralel...`);

            const finalize = (reason) => {
                if (isResolved) return;
                isResolved = true;

                if (softDeadlineTimer) clearTimeout(softDeadlineTimer);
                if (globalDeadlineTimer) clearTimeout(globalDeadlineTimer);

                Logger.system(`[TT Aggregator] Selesai (Trigger: ${reason}).`);
                resolve(masterPayload || new VideoData({ status: ExtractionStatus.ERROR_SYSTEM }));
            };

            globalDeadlineTimer = setTimeout(() => finalize('Global Timeout'), CONFIG.SYSTEM.GLOBAL_TIMEOUT_MS);

            this.scrapers.forEach(scraper => {
                scraper.extractVideo(videoUrl)
                    .then(result => {
                        if (isResolved) return;

                        const currentKasta = this._getKastaScore(result.status);

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

                        // [PERBAIKAN ARSITEKTUR: SMART SHORT-CIRCUIT]
                        if (highestKasta === 1) {
                            // Cek apakah metadata krusial (Author) sudah ada
                            const isMetadataComplete = !!masterPayload.author;

                            if (isMetadataComplete) {
                                // Jika data sempurna (Kasta 1 + Author ada), eksekusi instan!
                                finalize(`Data Sempurna diamankan oleh ${scraper.name}`);
                            } else if (!softDeadlineTimer) {
                                // Jika Kasta 1 tapi Author kosong, beri waktu (Soft Timeout) bagi MusicalDown
                                // untuk menyusul dan menjahit data Author.
                                Logger.warn(`[TT Aggregator] Video/Slide didapat, tapi Author kosong. Mengaktifkan Soft Timeout...`);
                                softDeadlineTimer = setTimeout(() => finalize('Soft Timeout (Pencarian Metadata Berakhir)'), CONFIG.SYSTEM.SOFT_TIMEOUT_MS);
                            }
                        } else if (highestKasta === 2 && !softDeadlineTimer) {
                            Logger.warn(`[TT Aggregator] Soft Timeout aktif. Menunggu Kasta 1...`);
                            softDeadlineTimer = setTimeout(() => finalize('Soft Timeout'), CONFIG.SYSTEM.SOFT_TIMEOUT_MS);
                        }
                    })
                    .catch(() => {})
                    .finally(() => {
                        activeWorkers--;
                        if (activeWorkers === 0 && !isResolved) finalize('Semua Worker Selesai');
                    });
            });
        });
    }
}