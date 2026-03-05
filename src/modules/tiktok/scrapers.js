/**
 * @fileoverview TikTok Scraper Engines
 * @architecture OOP Inheritance, Strict Header Injection
 */

import * as cheerio from 'cheerio';
import { CONFIG } from '../../config/settings.js';
import { BaseDownloader } from '../../core/BaseDownloader.js';
import { ExtractionStatus, VideoData } from '../../core/contracts.js';
import { Logger } from '../../core/logger.js';

export class MusicalDownScraper extends BaseDownloader {
    constructor() { super('TikTok', 'MusicalDown'); }

    async extractVideo(videoUrl) {
        try {
            Logger.info(`[${this.platform} - ${this.name}] Memulai inisialisasi sesi...`);
            const resGet = await this._request(CONFIG.TIKTOK.ENDPOINTS.MUSICALDOWN_BASE);
            const $ = cheerio.load(resGet.body);

            const inputName = $('input#link_url').attr('name');
            const hiddenInput = $('form#submit-form input[type="hidden"]').first();
            if (!inputName) throw new Error("Elemen input tidak ditemukan.");

            const payload = {
                [inputName]: videoUrl,
                [hiddenInput.attr('name')]: hiddenInput.attr('value'),
                'verify': '1'
            };

            const resPost = await this._request(CONFIG.TIKTOK.ENDPOINTS.MUSICALDOWN_DL, { 
                method: 'POST', 
                data: payload,
                // [INJEKSI HEADER] Wajib untuk melewati firewall MusicalDown
                headers: {
                    'origin': 'https://musicaldown.com',
                    'referer': 'https://musicaldown.com/en'
                }
            });
            const $$ = cheerio.load(resPost.body);

            const linkMp4 = $$('a[data-event="mp4_download_click"]').attr('href') || null;
            const linkHd = $$('a[data-event="hd_download_click"]').attr('href') || null;
            const linkMp3 = $$('a[data-event="mp3_download_click"]').attr('href') || null;

            let status = ExtractionStatus.ERROR_INVALID_URL;
            if (linkMp4 || linkHd) status = ExtractionStatus.SUCCESS_VIDEO;
            else if (linkMp3) status = ExtractionStatus.SUCCESS_AUDIO_ONLY;

            return new VideoData({
                status,
                author: $$('h2.video-author b').text().trim() || null,
                description: $$('p.video-desc').text().trim() || null,
                linkMp4, linkHd, linkMp3
            });
        } catch (e) {
            return new VideoData({ status: ExtractionStatus.ERROR_SYSTEM });
        }
    }
}

export class SaveTTScraper extends BaseDownloader {
    constructor() { super('TikTok', 'SaveTT'); }

    async extractVideo(videoUrl) {
        try {
            Logger.info(`[${this.platform} - ${this.name}] Mengambil CSRF Token...`);
            const resGet = await this._request(CONFIG.TIKTOK.ENDPOINTS.SAVETT_BASE);
            const csrfToken = cheerio.load(resGet.body)('input#csrf_token').val();
            if (!csrfToken) throw new Error("CSRF Token gagal didapatkan.");

            const resPost = await this._request(CONFIG.TIKTOK.ENDPOINTS.SAVETT_DL, { 
                method: 'POST', 
                data: { csrf_token: csrfToken, url: videoUrl },
                // [INJEKSI HEADER] Root cause dari bug ERROR_INVALID_URL SaveTT
                headers: {
                    'origin': 'https://savett.cc',
                    'referer': 'https://savett.cc/en1/'
                }
            });

            const $ = cheerio.load(resPost.body);
            let linkMp4 = null, linkMp3 = null;
            const images = [];

            $('.carousel-item img').each((_, el) => {
                const src = $(el).attr('src');
                if (src) images.push(src);
            });

            $('select#formatselect option').each((_, el) => {
                const text = $(el).text().toUpperCase();
                try {
                    const data = JSON.parse($(el).val() || '{}');
                    const targetUrl = data.URL?.[0];
                    if (!targetUrl) return;
                    if (text.includes('MP4') && !text.includes('WATERMARK')) linkMp4 = targetUrl;
                    else if (text.includes('MP3')) linkMp3 = targetUrl;
                } catch (e) {} 
            });

            let status = ExtractionStatus.ERROR_INVALID_URL;
            if (images.length > 0) status = ExtractionStatus.SUCCESS_SLIDE;
            else if (linkMp4) status = ExtractionStatus.SUCCESS_VIDEO;
            else if (linkMp3) status = ExtractionStatus.SUCCESS_AUDIO_ONLY;

            return new VideoData({
                status, 
                author: $('#video-info .d-none.d-md-block h3').text().trim() || null,
                linkMp4, linkMp3, images: images.length ? images : null
            });
        } catch (e) {
            return new VideoData({ status: ExtractionStatus.ERROR_SYSTEM });
        }
    }
}

export class SaveTikScraper extends BaseDownloader {
    constructor() { super('TikTok', 'SaveTik'); }

    async extractVideo(videoUrl) {
        try {
            Logger.info(`[${this.platform} - ${this.name}] Priming sesi anti-bot...`);
            await this._request(CONFIG.TIKTOK.ENDPOINTS.SAVETIK_BASE).catch(() => {});

            const resPost = await this._request(CONFIG.TIKTOK.ENDPOINTS.SAVETIK_API, {
                method: 'POST', 
                data: { q: videoUrl, lang: 'en', cftoken: '' },
                // [INJEKSI HEADER] AJAX spesifik beserta Origin
                headers: { 
                    'origin': 'https://savetik.co',
                    'referer': 'https://savetik.co/en2',
                    'x-requested-with': 'XMLHttpRequest' 
                }
            });

            let htmlContent = resPost.body;
            try { htmlContent = JSON.parse(resPost.body).data || resPost.body; } catch (e) {}

            const $ = cheerio.load(htmlContent);
            let linkHd = null, linkMp4 = null, linkMp3 = null;
            const images = [];

            $('a').each((_, el) => {
                const text = $(el).text().toUpperCase().trim();
                const href = $(el).attr('href');
                if (!href || href === '#') return;
                if (text.includes('DOWNLOAD MP4 HD')) linkHd = href;
                else if (text.includes('DOWNLOAD MP4 [1]') || text === 'DOWNLOAD MP4') linkMp4 = href;
                else if (text.includes('DOWNLOAD MP3')) linkMp3 = href;
            });

            $('.photo-list ul.download-box li a').each((_, el) => {
                const href = $(el).attr('href');
                if (href) images.push(href);
            });

            let status = ExtractionStatus.ERROR_INVALID_URL;
            if (images.length) status = ExtractionStatus.SUCCESS_SLIDE;
            else if (linkHd || linkMp4) status = ExtractionStatus.SUCCESS_VIDEO;
            else if (linkMp3) status = ExtractionStatus.SUCCESS_AUDIO_ONLY;

            return new VideoData({
                status, 
                description: $('.content .clearfix h3').text().trim() || null,
                linkMp4, linkHd, linkMp3, images: images.length ? images : null
            });
        } catch (e) {
            return new VideoData({ status: ExtractionStatus.ERROR_SYSTEM });
        }
    }
}

export class TikTokIOScraper extends BaseDownloader {
    constructor() { super('TikTok', 'TikTokIO'); }

    async extractVideo(videoUrl) {
        try {
            Logger.info(`[${this.platform} - ${this.name}] Priming sesi anti-bot...`);
            await this._request(CONFIG.TIKTOK.ENDPOINTS.TIKTOKIO_BASE).catch(() => {});

            const resPost = await this._request(CONFIG.TIKTOK.ENDPOINTS.TIKTOKIO_API, {
                method: 'POST', 
                data: { vid: videoUrl, prefix: "tiktokio.com" }, 
                isJson: true,
                // [INJEKSI HEADER] Origin dan Referer spesifik TikTokIO
                headers: {
                    'origin': 'https://tiktokio.com',
                    'referer': 'https://tiktokio.com/ssstiktok/'
                }
            });

            let htmlContent = resPost.body;
            try { htmlContent = JSON.parse(resPost.body).data || resPost.body; } catch (e) {}

            const $ = cheerio.load(htmlContent);
            let linkHd = null, linkMp4 = null, linkMp3 = null;
            const images = [];

            $('.images-grid .image-item a.download-btn-blue').each((_, el) => {
                const href = $(el).attr('href');
                if (href) images.push(href);
            });

            $('a').each((_, el) => {
                const text = $(el).text().toUpperCase();
                const css = $(el).attr('class') || '';
                const href = $(el).attr('href');
                if (!href || href === '#' || href.startsWith('javascript')) return;

                if (text.includes('WITHOUT WATERMARK (HD)') || css.includes('download-btn-green')) linkHd = href;
                else if (text.includes('WITHOUT WATERMARK') || css.includes('download-btn-blue')) {
                    if (!linkHd && $(el).closest('.images-grid').length === 0) linkMp4 = href;
                }
                else if (text.includes('DOWNLOAD MP3') || css.includes('download-btn-purple')) linkMp3 = href;
            });

            let status = ExtractionStatus.ERROR_INVALID_URL;
            if (images.length) status = ExtractionStatus.SUCCESS_SLIDE;
            else if (linkHd || linkMp4) status = ExtractionStatus.SUCCESS_VIDEO;
            else if (linkMp3) status = ExtractionStatus.SUCCESS_AUDIO_ONLY;

            return new VideoData({
                status, 
                description: $('.video-info h3').text().trim() || null,
                linkMp4, linkHd, linkMp3, images: images.length ? images : null
            });
        } catch (e) {
            return new VideoData({ status: ExtractionStatus.ERROR_SYSTEM });
        }
    }
}