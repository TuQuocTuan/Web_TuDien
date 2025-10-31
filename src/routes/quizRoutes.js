// src/routes/quizRoutes.js
const express = require('express');
const router = express.Router();
const Word = require('../models/wordModel.js'); // Gọi khuôn mẫu Word
const { protect } = require('../middleware/authMiddleware.js'); // (Tùy chọn, nhưng nên có)
const Result = require('../models/resultModel.js');
/**
 * @route   GET /api/quiz/start
 * @desc    Tạo một bài quiz "Điền vào chỗ trống"
 * @access  Private (Cần đăng nhập)
 * @query   category=school (Thể loại)
 * @query   limit=10 (Số lượng câu)
 */
router.get('/start', protect, async (req, res) => {
    try {
        const { category } = req.query;
        const limit = parseInt(req.query.limit) || 10;

        // 1. Xây dựng bộ lọc
        const filter = {
            example_en: { $exists: true, $ne: "" } // BẮT BUỘC phải có ví dụ
        };

        // 2. LOGIC "TRỘN ĐỀ" (MỚI)
        // Chỉ lọc theo thể loại NẾU category tồn tại VÀ nó không phải là 'all'
        if (category && category !== 'all') {
            filter.category = category;
        }
        // (Nếu category là 'all' hoặc undefined, nó sẽ lấy từ TẤT CẢ)

        // 3. Lấy ngẫu nhiên 'limit' (10) từ vựng khớp
        const words = await Word.aggregate([
            { $match: filter },
            { $sample: { size: limit } }
        ]);

        if (words.length === 0) {
            return res.status(404).json({ message: `Không tìm thấy từ vựng nào (có ví dụ) cho thể loại: ${category}` });
        }

        // 4. Tạo câu hỏi "Điền vào chỗ trống" (THÊM GỢI Ý)
        const questions = words.map(word => {
            const regex = new RegExp(word.word, 'i');
            const questionText = word.example_en.replace(regex, '_______');

            return {
                questionText: questionText,
                answer: word.word,
                translation: word.translation,
                answerLength: word.word.length // <-- THÊM GỢI Ý SỐ KÝ TỰ
            };
        });

        // 5. Gửi bộ câu hỏi về
        res.status(200).json(questions);

    } catch (err) {
        console.error("Lỗi khi tạo quiz:", err.message);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

// LƯU KẾT QUẢ QUIZ
router.post('/submit', protect, async (req, res) => {
    try {
        // 2. Lấy dữ liệu điểm từ frontend
        const { category, score, totalQuestions } = req.body;
        // Lấy ID user từ token (đã được 'protect' giải mã)
        const userId = req.user.id;

        if (score === undefined || totalQuestions === undefined || !category) {
            return res.status(400).json({ message: 'Thiếu thông tin điểm số hoặc thể loại.' });
        }

        // 3. Tạo một bản ghi kết quả mới
        const newResult = new Result({
            user: userId,
            category: category,
            score: score,
            totalQuestions: totalQuestions
        });

        // 4. Lưu vào DB
        await newResult.save();

        // 5. Trả về kết quả (để chuyển trang)
        res.status(201).json({
            message: 'Đã lưu kết quả!',
            resultId: newResult._id, // Gửi ID của kết quả mới
            score: newResult.score,
            total: newResult.totalQuestions
        });

    } catch (err) {
        console.error("Lỗi khi lưu kết quả quiz:", err.message);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});
module.exports = router;