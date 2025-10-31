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
        // 1. Khởi tạo query và tùy chọn
        let filter = {}; // Dùng cho tìm kiếm và lọc
        let sortOptions = {};

        const { type, category, sort, search } = req.query; // Lấy các tham số

        // 2. XỬ LÝ TÌM KIẾM (MỚI)
        if (search) {
            // $regex: tìm các từ có chứa chuỗi tìm kiếm (search)
            // $options: 'i' để không phân biệt chữ hoa/thường
            filter.word = { $regex: search, $options: 'i' };
        }

        // 3. XỬ LÝ LỌC
        if (type) {
            // $in: tìm tất cả các từ có 'type' nằm TRONG mảng này
            filter.type = { $in: type.split(',') };
        }
        if (category) {
            filter.category = { $in: category.split(',') };
        }

        // 4. XỬ LÝ SẮP XẾP
        switch (sort) {
            case 'alphabetical_asc':
                sortOptions = { word: 1 };
                break;
            case 'alphabetical_desc':
                sortOptions = { word: -1 };
                break;
            case 'newest':
                sortOptions = { createdAt: -1 };
                break;
            case 'oldest':
                sortOptions = { createdAt: 1 };
                break;
            default:
                sortOptions = { word: 1 };
                break;
        }

        // 5. Thực hiện truy vấn (kết hợp cả filter và sort)
        const words = await Word.find(filter).sort(sortOptions);

        // 6. Gửi danh sách đã sắp xếp về frontend
        res.status(200).json(words);

    } catch (err) {
        console.error("Lỗi khi lấy danh sách từ vựng:", err.message);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

router.get('/:word', async (req, res) => {
    try {
        // 1. Lấy tên từ từ URL (ví dụ: /api/words/apple -> req.params.word = 'apple')
        const wordName = req.params.word;

        // 2. Tìm kiếm từ đó trong database (không phân biệt chữ hoa/thường)
        const wordDetail = await Word.findOne({
            word: { $regex: new RegExp(`^${wordName}$`, 'i') }
        });

        if (!wordDetail) {
            return res.status(404).json({ message: `Không tìm thấy từ: ${wordName}` });
        }

        // 3. Gửi chi tiết từ vựng về frontend
        res.status(200).json(wordDetail);

    } catch (err) {
        console.error(`Lỗi khi lấy chi tiết từ ${req.params.word}:`, err.message);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});
module.exports = router;