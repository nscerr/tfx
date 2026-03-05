/**
 * @fileoverview Facebook Domain Utilities
 * @architecture Modular Helper Functions, Defensive DOM Parsing
 */

import * as cheerio from 'cheerio';

/**
 * Generator Token JWT statis untuk membypass proteksi Cloudflare FDownloader.net
 */
export const generateCfToken = () => {
    const jwtChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const randomString = (length) => Array.from({ length }, () => jwtChars.charAt(Math.floor(Math.random() * jwtChars.length))).join('');
    return `JWT.${randomString(36)}.${randomString(138)}.${randomString(43)}`;
};

/**
 * Pemroses DOM HTML dari respons AJAX Facebook Downloader
 * Diperbaiki: Menggunakan filter ketat dan mengadopsi logika atribut 'title' dari skrip lama
 */
export const parseFbHtmlToLinks = (htmlContent) => {
    const $ = cheerio.load(htmlContent);
    let linkHd = null;
    let linkMp4 = null;

    $('a').each((_, elem) => {
        const href = $(elem).attr('href');
        const linkClass = $(elem).attr('class') || '';

        // Membaca teks asli dan atribut title (fallback penting dari skrip lama)
        const text = $(elem).text().toUpperCase().trim();
        const title = ($(elem).attr('title') || '').toUpperCase().trim();

        // 1. FILTER KEAMANAN (Cegah href="/", "#", atau navigasi web)
        // Video download dari API pihak ketiga HARUS berupa Absolute URL (http/https)
        if (!href || href === '#' || href === '/' || !href.startsWith('http')) {
            return;
        }

        // Abaikan link yang justru mengarah ke Facebook (tombol share)
        if (href.includes('facebook.com/sharer')) {
            return;
        }

        // 2. KONDISI TOMBOL (Filter berdasarkan class dari skrip lama)
        const isDownloadBtn = linkClass.toLowerCase().includes('download') || 
                              linkClass.toLowerCase().includes('btn') || 
                              text.includes('DOWNLOAD');

        if (!isDownloadBtn) return;

        // 3. FILTER AUDIO/RENDER (Abaikan konversi audio)
        if (text.includes('AUDIO') || title.includes('AUDIO') || text.includes('RENDER')) {
            return;
        }

        // 4. PENENTUAN KUALITAS (Fuzzy Matching dari Teks dan Title)
        const combinedInfo = `${text} ${title}`;

        if (combinedInfo.includes('HD') || combinedInfo.includes('1080') || combinedInfo.includes('720')) {
            linkHd = href;
        } else if (combinedInfo.includes('SD') || combinedInfo.includes('NORMAL')) {
            linkMp4 = href;
        } else {
            // Fallback: Jika tidak ada label HD/SD yang jelas, jadikan SD (link_mp4)
            if (!linkMp4) {
                linkMp4 = href;
            }
        }
    });

    return { linkHd, linkMp4 };
};