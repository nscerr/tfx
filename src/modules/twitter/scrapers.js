/**
 * @fileoverview Twitter Scraper Engines
 * @architecture Two-Step Verification, Dynamic Parsing
 */

import * as cheerio from 'cheerio';
import { CONFIG } from '../../config/settings.js';
import { BaseDownloader } from '../../core/BaseDownloader.js';
import { ExtractionStatus, VideoData } from '../../core/contracts.js';
import { Logger } from '../../core/logger.js';
import { sortDynamicResolutions, decodeWrappedUrl } from './utils.js';

export class SaveTwtScraper extends BaseDownloader {
    constructor() { super('Twitter', 'SaveTwt.com'); }
    async extractVideo(videoUrl) {
        try {
            Logger.info(`[${this.platform} - ${this.name}] Step 1: Priming Sesi & Token...`);
            const resGet = await this._request(CONFIG.TWITTER.ENDPOINTS.SAVETWT_BASE);
            const $ = cheerio.load(resGet.body);
            const token = $('input[name="_token"]').val() || $('input[type="hidden"]').val();
            if (!token) throw new Error("Hidden Token gagal diambil.");

            Logger.info(`[${this.platform} - ${this.name}] Step 2: Mengirim Payload...`);
            const resPost = await this._request(CONFIG.TWITTER.ENDPOINTS.SAVETWT_DL, {
                method: 'POST',
                data: { _token: token, locale: 'en', url: videoUrl },
                headers: { 'origin': 'https://savetwt.com', 'referer': 'https://savetwt.com/' }
            });

            const $$ = cheerio.load(resPost.body);
            let author = $$('.download__item__profile_pic span').text().replace('Posted by ', '').trim();
            let description = $$('.download__item__caption__text').text().trim();

            const rawLinks = [];
            $$('tbody tr').each((_, row) => {
                const resolutionText = $$(row).find('td').first().text().trim();
                const dlLink = $$(row).find('td:nth-child(2) a.download__item__info__actions__button').attr('href');
                if (dlLink && resolutionText) rawLinks.push({ url: dlLink, text: resolutionText });
            });

            const { linkHd, linkMp4 } = sortDynamicResolutions(rawLinks);
            let status = linkHd || linkMp4 ? ExtractionStatus.SUCCESS_VIDEO : ExtractionStatus.ERROR_INVALID_URL;

            return new VideoData({ status, author, description, linkMp4, linkHd });
        } catch (e) {
            return new VideoData({ status: ExtractionStatus.ERROR_SYSTEM });
        }
    }
}

export class TwitterVideoDownloaderScraper extends BaseDownloader {
    constructor() { super('Twitter', 'TwitterVideoDownloader'); }
    async extractVideo(videoUrl) {
        try {
            Logger.info(`[${this.platform} - ${this.name}] Step 1: Priming Sesi & Token...`);
            const resGet = await this._request(CONFIG.TWITTER.ENDPOINTS.TWITTER_VD_BASE);
            const $ = cheerio.load(resGet.body);
            const csrfToken = $('input[name="csrfmiddlewaretoken"]').val();
            const gqlToken = $('input[name="gql"]').val();
            if (!csrfToken || !gqlToken) throw new Error("CSRF/GQL Token gagal diambil.");

            Logger.info(`[${this.platform} - ${this.name}] Step 2: Mengirim Payload...`);
            const resPost = await this._request(CONFIG.TWITTER.ENDPOINTS.TWITTER_VD_DL, {
                method: 'POST',
                data: { csrfmiddlewaretoken: csrfToken, tweet: videoUrl, gql: gqlToken },
                headers: { 'origin': 'https://twittervideodownloader.com', 'referer': CONFIG.TWITTER.ENDPOINTS.TWITTER_VD_BASE }
            });

            const $$ = cheerio.load(resPost.body);
            const rawLinks = [];
            $$('#download-section a').each((_, el) => {
                const href = $$(el).attr('href');
                const text = $$(el).text().trim() + " " + ($$(el).attr('data-filename') || '');
                if (href && (href.includes('.mp4') || href.includes('video.twimg'))) {
                    rawLinks.push({ url: href, text });
                }
            });

            const { linkHd, linkMp4 } = sortDynamicResolutions(rawLinks);
            let status = linkHd || linkMp4 ? ExtractionStatus.SUCCESS_VIDEO : ExtractionStatus.ERROR_INVALID_URL;

            return new VideoData({ status, linkMp4, linkHd });
        } catch (e) {
            return new VideoData({ status: ExtractionStatus.ERROR_SYSTEM });
        }
    }
}

export class XSaverScraper extends BaseDownloader {
    constructor() { super('Twitter', 'XSaver'); }
    async extractVideo(videoUrl) {
        try {
            Logger.info(`[${this.platform} - ${this.name}] Mengirim GET Single-Step...`);
            const targetUrl = `${CONFIG.TWITTER.ENDPOINTS.XSAVER_BASE}?url=${encodeURIComponent(videoUrl)}`;
            const resGet = await this._request(targetUrl, {
                headers: { 'referer': 'https://www.xsaver.io/x-downloader/' }
            });

            const $ = cheerio.load(resGet.body);
            const description = $('.video-title').text().trim();
            const rawLinks = [];

            // [PERBAIKAN] Mengambil teks dari Quality Badge (misal: "Quality - 1080p")
            const topBtn = $('a.download-bttn:contains("Download (MP4)")').attr('href');
            const qualityBadgeText = $('.quality-badge').text().trim(); 

            if (topBtn) {
                // Jika badge ada, gunakan itu agar regex tahu resolusinya. Jika tidak, pakai fallback mutlak
                rawLinks.push({ 
                    url: decodeWrappedUrl(topBtn), 
                    text: qualityBadgeText || "Highest HD Mutlak" 
                });
            }

            // Ambil Variant Lain
            $('.variant-item a.variant-link').each((_, el) => {
                const href = $(el).attr('href');
                const bitrate = $(el).find('.badge').text().trim();
                if (href) rawLinks.push({ url: decodeWrappedUrl(href), text: bitrate });
            });

            const { linkHd, linkMp4 } = sortDynamicResolutions(rawLinks);
            let status = linkHd || linkMp4 ? ExtractionStatus.SUCCESS_VIDEO : ExtractionStatus.ERROR_INVALID_URL;

            return new VideoData({ status, description, linkMp4, linkHd });
        } catch (e) {
            return new VideoData({ status: ExtractionStatus.ERROR_SYSTEM });
        }
    }
}

export class SaveTwitterNetScraper extends BaseDownloader {
    constructor() { super('Twitter', 'SaveTwitter.net'); }
    async extractVideo(videoUrl) {
        try {
            Logger.info(`[${this.platform} - ${this.name}] Mengirim POST AJAX...`);
            const resPost = await this._request(CONFIG.TWITTER.ENDPOINTS.SAVETWITTER_NET, {
                method: 'POST',
                data: { q: videoUrl, lang: 'en', cftoken: '' },
                headers: { 
                    'origin': 'https://savetwitter.net', 
                    'referer': 'https://savetwitter.net/en4',
                    'x-requested-with': 'XMLHttpRequest'
                }
            });

            const $ = cheerio.load(resPost.body);
            const description = $('.tw-middle > .content > .clearfix h3').text().trim();

            const rawLinks = [];
            $('.tw-right > .dl-action a.tw-button-dl').each((_, el) => {
                const href = $(el).attr('href');
                const text = $(el).text().trim();
                if (href && href.startsWith('http')) rawLinks.push({ url: href, text });
            });

            const { linkHd, linkMp4 } = sortDynamicResolutions(rawLinks);
            let status = linkHd || linkMp4 ? ExtractionStatus.SUCCESS_VIDEO : ExtractionStatus.ERROR_INVALID_URL;

            return new VideoData({ status, description, linkMp4, linkHd });
        } catch (e) {
            return new VideoData({ status: ExtractionStatus.ERROR_SYSTEM });
        }
    }
}