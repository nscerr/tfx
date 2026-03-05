/**
 * @fileoverview Twitter Domain Utilities & Dynamic Resolution Sorter
 * @architecture Math-based Sorting, Dynamic Extraction
 */

import * as cheerio from 'cheerio';

/**
 * Mengurutkan array of objects { url, text/quality } berdasarkan angka resolusi/bitrate
 * [PERBAIKAN] Dukungan konversi Mbps vs Kbps dan filter .m3u8
 */

export const sortDynamicResolutions = (linksArray) => {
    if (!linksArray || linksArray.length === 0) return { linkHd: null, linkMp4: null };

    // 1. Filter agresif: Buang semua playlist streaming (.m3u8)
    const validLinks = linksArray.filter(item => item.url && !item.url.includes('.m3u8'));

    const parsedLinks = validLinks.map(item => {
        let score = 0;
        const text = item.text.toLowerCase();

        // Pola 1: Dimensi Pixel (contoh: "1364x720")
        const dimensionMatch = text.match(/(\d+)\s*x\s*(\d+)/);
        if (dimensionMatch) {
            score = parseInt(dimensionMatch[1]) * parseInt(dimensionMatch[2]);
        } 
        // Pola 2: Bitrate (Konversi Mbps ke Kbps)
        else if (text.includes('mbps')) {
            const match = text.match(/([\d.]+)/); // Menangkap desimal seperti 10.37
            if (match) score = parseFloat(match[1]) * 1000; // 10.37 Mbps -> 10370 Score
        } 
        else if (text.includes('kbps')) {
            const match = text.match(/([\d.]+)/);
            if (match) score = parseFloat(match[1]); // 950 Kbps -> 950 Score
        }
        // Pola 3: Resolusi 'p' (contoh: "1080p")
        else {
            const pMatch = text.match(/(\d+)(p)?/);
            if (pMatch) score = parseInt(pMatch[1]);

            // Fallback Score Mutlak: Jika teks mengandung jaminan kualitas tertinggi
            if (text.includes('highest') || text.includes('quality')) score = 9999999;
        }

        return { url: item.url, score: score };
    });

    // Urutkan Descending (Tertinggi ke Terendah)
    parsedLinks.sort((a, b) => b.score - a.score);

    // Hapus duplikat URL
    const uniqueLinks = [...new Map(parsedLinks.map(item => [item.url, item])).values()];

    return {
        linkHd: uniqueLinks[0]?.url || null,
        linkMp4: uniqueLinks.length > 1 ? uniqueLinks[uniqueLinks.length - 1].url : uniqueLinks[0]?.url
    };
};

/**
 * Membersihkan URL yang terbungkus oleh PHP redirect (khusus XSaver)
 */
export const decodeWrappedUrl = (rawUrl) => {
    if (!rawUrl) return null;
    const urlParamMatch = rawUrl.match(/url=(.+)/);
    return urlParamMatch ? decodeURIComponent(urlParamMatch[1]) : rawUrl;
};