/**
 * @fileoverview Universal Data Contracts for API Response
 * @architecture Interface Standardization
 */

export const ExtractionStatus = Object.freeze({
    SUCCESS_VIDEO: "SUCCESS_VIDEO",
    SUCCESS_AUDIO_ONLY: "SUCCESS_AUDIO_ONLY",
    SUCCESS_SLIDE: "SUCCESS_SLIDE",
    ERROR_INVALID_URL: "ERROR_INVALID_URL",
    ERROR_PRIVATE_VIDEO: "ERROR_PRIVATE_VIDEO", // Status baru khusus untuk proteksi Facebook
    ERROR_SYSTEM: "ERROR_SYSTEM"
});

export class VideoData {
    constructor({ status, author = null, description = null, linkMp4 = null, linkHd = null, linkMp3 = null, images = null }) {
        this.status = status;
        this.author = author;
        this.description = description;
        this.link_mp4 = linkMp4;  // Biasanya untuk kualitas SD (Standard Definition)
        this.link_hd = linkHd;    // Kualitas HD
        this.link_mp3 = linkMp3;  // Audio Only
        this.images = images;     // Array untuk mode Slide/Carousel
    }

    toDict() {
        return { ...this };
    }
}