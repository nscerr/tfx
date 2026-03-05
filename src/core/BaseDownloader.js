/**
 * @fileoverview Abstract Base Class for all Social Media Downloaders
 * @architecture Abstraction, Inheritance, Stateful Session Management
 */

import { gotScraping } from 'got-scraping';
import { CookieJar } from 'tough-cookie';
import { CONFIG } from '../config/settings.js';
import { Logger } from './logger.js';

export class BaseDownloader {
    constructor(platformName, scraperName) {
        // Mencegah instansiasi langsung dari Base Class (Konsep Abstract Class di OOP)
        if (new.target === BaseDownloader) {
            throw new TypeError("Kritis: Tidak dapat menginstansiasi kelas BaseDownloader secara langsung.");
        }

        this.platform = platformName; // Contoh: 'Facebook' atau 'TikTok'
        this.name = scraperName;      // Contoh: 'SnapSave' atau 'FDownloader'

        // Memori terisolasi untuk masing-masing instance scraper (Stateful)
        this.cookieJar = new CookieJar();
    }

    /**
     * Engine utama untuk melakukan HTTP Request secara aman
     * @protected
     * @param {string} url - Target URL API/HTML
     * @param {Object} options - Konfigurasi spesifik request (method, data, headers)
     * @returns {Promise<Object>} Respons dari got-scraping
     */
    async _request(url, options = {}) {
        const { method = 'GET', data = null, headers = {}, isJson = false } = options;

        const reqOptions = {
            url,
            method,
            cookieJar: this.cookieJar,
            headerGeneratorOptions: CONFIG.NETWORK.BROWSER_PROFILE,
            headers: {
                ...headers, // Menggabungkan custom headers jika ada
            },
            timeout: { request: CONFIG.NETWORK.DEFAULT_TIMEOUT },
            // Mencegah got-scraping melempar error otomatis pada HTTP 400/500
            // agar kita bisa memparsing pesan error JSON dari server target secara manual
            throwHttpErrors: false 
        };

        // Injecting Payload based on Content-Type
        if (data) {
            if (isJson) {
                reqOptions.json = data;
            } else {
                reqOptions.form = data; // Form url-encoded
            }
        }

        try {
            return await gotScraping(reqOptions);
        } catch (error) {
            Logger.error(`[${this.platform} - ${this.name}] Koneksi terputus: ${error.message}`);
            throw error; // Melempar error ke scraper spesifik untuk ditangani
        }
    }

    /**
     * Kontrak Wajib yang harus diimplementasikan oleh setiap child class
     * @abstract
     */
    async extractVideo(videoUrl) {
        throw new Error(`Kritis: Method 'extractVideo()' wajib diimplementasikan di kelas ${this.name}`);
    }
}