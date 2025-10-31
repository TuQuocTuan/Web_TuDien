// src/models/resultModel.js
const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
    // ID của user làm bài (lấy từ token)
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Thể loại (ví dụ: "school", "sports")
    category: {
        type: String,
        required: true
    },
    // Điểm số
    score: {
        type: Number,
        required: true
    },
    // Tổng số câu
    totalQuestions: {
        type: Number,
        required: true
    }
}, { 
    // Tự động thêm ngày làm bài (createdAt)
    timestamps: true 
});

const Result = mongoose.model('Result', resultSchema);

module.exports = Result;