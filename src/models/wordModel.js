const mongoose = require('mongoose');

const wordSchema = new mongoose.Schema({
    // 1. CÁC TRƯỜNG CƠ BẢN (Giữ nguyên)
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

    // // 2. [MỚI] TRƯỜNG QUAN HỆ TỪ VỰNG (Phục vụ gợi ý Context-based)
    // related_words: {
    //     // Từ đồng nghĩa (Ví dụ: Beautiful -> [Pretty, Gorgeous])
    //     synonyms: [{
    //         type: String,
    //         trim: true
    //     }],
    //     // Từ trái nghĩa (Ví dụ: Beautiful -> [Ugly])
    //     antonyms: [{
    //         type: String,
    //         trim: true
    //     }],
    //     // Từ cùng gia đình (Word Family) (Ví dụ: Beauty (n), Beautifully (adv))
    //     family: [{
    //         type: String,
    //         trim: true
    //     }]
    // },

    // 3. CÁC TRƯỜNG KHÁC (Giữ nguyên logic cũ của bạn)
    // dailyWords: [{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Word'
    // }],
    dailyWordsTimestamp: {
        type: Date
    }
}, { timestamps: true });

// Tạo text index để tìm kiếm nhanh hơn nếu cần
wordSchema.index({ word: 'text', translation: 'text' });

const Word = mongoose.model('Word', wordSchema);

module.exports = Word;