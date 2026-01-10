const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
    // ID của user làm bài
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Tên album
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
    },
    
    // --- PHẦN NÀY ĐỂ LƯU CHI TIẾT ---
    questions: [
        {
            questionText: { type: String, required: true }, // Nội dung câu hỏi
            userAnswer: { type: String, required: true },   // Đáp án bạn chọn
            correctAnswer: { type: String, required: true },// Đáp án đúng
            isCorrect: { type: Boolean, default: false }    // Kết quả đúng/sai
        }
    ]
    // -------------------------------------------

}, { 
    // Tự động thêm ngày làm bài (createdAt)
    timestamps: true 
});

const Result = mongoose.model('Result', resultSchema);

module.exports = Result;