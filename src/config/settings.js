/**
 * @fileoverview Global Configuration
 * @architecture No Magic Strings/Numbers
 */
export const CONFIG = Object.freeze({
    SERVER: {
        PORT: process.env.PORT || 3000,
        API_KEY: process.env.API_KEY || 'FALLBACK_KEY', 
        ENABLE_LOGS: process.env.ENABLE_LOGS !== 'false' 
    },
    SYSTEM: {
        GLOBAL_TIMEOUT_MS: 20000,
        SOFT_TIMEOUT_MS: 10000
    },
    NETWORK: {
        // Browser fingerprinting untuk got-scraping
        BROWSER_PROFILE: {
            browsers: [{ name: 'chrome', minVersion: 110, maxVersion: 125 }],
            os: ['windows', 'macos', 'android', 'ios']
        },
        DEFAULT_TIMEOUT: 15000,
        // Fallback User-Agent jika rotasi dinamis gagal
        FALLBACK_UA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    // Konfigurasi Spesifik Modul Facebook (Diambil dari skrip lama Anda)
    FACEBOOK: {
        ENDPOINTS: {
            FDOWNLOAD_APP: 'https://fdownload.app/api/ajaxSearch',
            FBDOWNLOADER_TO: 'https://fbdownloader.to/api/ajaxSearch',
            SNAPSAVE_IO: 'https://snapsave.io/api/ajaxSearch/facebook',
            FDOWNLOADER_NET: 'https://v3.fdownloader.net/api/ajaxSearch'
        }
    },
    // [TAMBAHAN BARU] Konfigurasi Spesifik Modul TikTok
        TIKTOK: {
            ENDPOINTS: {
                MUSICALDOWN_BASE: 'https://musicaldown.com/en',
                MUSICALDOWN_DL: 'https://musicaldown.com/download',
                SAVETT_BASE: 'https://savett.cc/en1/',
                SAVETT_DL: 'https://savett.cc/en1/download',
                SAVETIK_BASE: 'https://savetik.co/en2',
                SAVETIK_API: 'https://savetik.co/api/ajaxSearch',
                TIKTOKIO_BASE: 'https://tiktokio.com/ssstiktok/',
                TIKTOKIO_API: 'https://tiktokio.com/api/v1/tk/html'
            }
        },
    // ... (Blok FACEBOOK dan TIKTOK sebelumnya)
    TWITTER: {
        ENDPOINTS: {
            SAVETWT_BASE: 'https://savetwt.com/',
            SAVETWT_DL: 'https://savetwt.com/download',
            TWITTER_VD_BASE: 'https://twittervideodownloader.com/en/',
            TWITTER_VD_DL: 'https://twittervideodownloader.com/download',
            XSAVER_BASE: 'https://www.xsaver.io/x-downloader/download.php',
            SAVETWITTER_NET: 'https://savetwitter.net/api/ajaxSearch'
        }
    }
    });
