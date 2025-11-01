// src/models/wordModel.js
const mongoose = require('mongoose');

const wordSchema = new mongoose.Schema({
    // Từ Tiếng Anh (ví dụ: 'Apple')
    word: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    // Nghĩa Tiếng Việt (ví dụ: 'Quả táo')
    translation: {
        type: String,
        required: true,
        trim: true
    },
    // Loại từ (ví dụ: 'noun', 'verb')
    type: {
        type: String,
        trim: true
    },
    // Phiên âm (ví dụ: '/ˈæpəl/')
    pronunciation: {
        type: String,
        trim: true
    },
    // Thể loại (đây là cái bạn cần)
    category: {
        type: String, // Ví dụ: 'food', 'school', 'science'
        required: true,
        trim: true
    },
    // Câu ví dụ
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
        lowercase: true // Tự động đổi "School" thành "school"
    }],
    dailyWords: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Word'
    }],
    dailyWordsTimestamp: {
        type: Date
    }
}, { timestamps: true });

const Word = mongoose.model('Word', wordSchema);

module.exports = Word;