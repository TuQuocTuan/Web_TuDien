const mongoose = require('mongoose');

const wordSchema = new mongoose.Schema({
    // 1. CÁC TRƯỜNG CƠ BẢN 
    word: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    translation: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String, // noun, verb, adj...
        trim: true
    },
    pronunciation: {
        type: String,
        trim: true
    },
    example_en: {
        type: String,
        trim: true
    },
    example_vi: {
        type: String,
        trim: true
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],

    dailyWordsTimestamp: {
        type: Date
    }
}, { timestamps: true });

// Tạo text index để tìm kiếm nhanh hơn nếu cần
wordSchema.index({ word: 'text', translation: 'text' });

const Word = mongoose.model('Word', wordSchema);

module.exports = Word;