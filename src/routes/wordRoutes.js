// src/routes/wordRoutes.js
const express = require('express');
const router = express.Router();
const Word = require('../models/wordModel.js'); // Gọi khuôn mẫu Word

/**
 * @route   GET /api/words
 * @desc    Lấy TẤT CẢ từ vựng (HOẶC LỌC theo thể loại/loại từ)
 */
router.get('/', async (req, res) => {
    try {
        // 1. Lấy các bộ lọc từ query string (ví dụ: ?type=noun&category=school)
        const { type, category } = req.query;

        // 2. Xây dựng đối tượng filter
        const filter = {};

        // 3. Nếu có filter 'type' (loại từ)
        if (type) {
            // $in: tìm tất cả các từ có 'type' nằm TRONG mảng này
            // .split(','): phòng trường hợp bạn gửi nhiều loại (ví dụ: ?type=noun,verb)
            filter.type = { $in: type.split(',') };
        }

        // 4. Nếu có filter 'category' (chủ đề)
        if (category) {
            filter.category = { $in: category.split(',') };
        }

        // 5. Tìm từ trong DB với bộ lọc (nếu filter rỗng, nó sẽ trả về tất cả)
        const words = await Word.find(filter);

        // 6. Gửi về cho frontend
        res.status(200).json(words);

    } catch (err) {
        console.error("Lỗi khi lấy từ vựng:", err.message);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

module.exports = router;