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
        let filter = {}; // Đối tượng filter
        let sortOptions = {};

        const { type, category, sort, search } = req.query;

        // 1. XỬ LÝ LỌC (Filter)
        // (Những filter này sẽ được AND (kết hợp) với tìm kiếm)
        if (type) {
            filter.type = { $in: type.split(',') };
        }
        if (category) {
            filter.category = { $in: category.split(',') };
        }

        // 2. XỬ LÝ TÌM KIẾM (ĐÃ NÂNG CẤP)
        if (search) {
            // $regex: tìm các từ BẮT ĐẦU BẰNG (^) 'search'
            // $options: 'i' (không phân biệt hoa/thường)
            const searchRegex = { $regex: `^${search}`, $options: 'i' };

            // $or: Tìm trong TRƯỜNG NÀY hoặc TRƯỜNG KIA
            filter.$or = [
                { word: searchRegex },         // Tìm trong tiếng Anh
                { translation: searchRegex }  // HOẶC Tìm trong tiếng Việt
            ];
        }

        // 3. XỬ LÝ SẮP XẾP (Giữ nguyên)
        switch (sort) {
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
                sortOptions = { word: 1 }; // Mặc định A-Z
                break;
        }

        // 4. Thực hiện truy vấn
        // Mongoose sẽ tự hiểu: (Filter A AND Filter B) AND (Search 1 OR Search 2)
        const words = await Word.find(filter).sort(sortOptions);

        res.status(200).json(words);

    } catch (err) {
        console.error("Lỗi khi lấy danh sách từ vựng:", err.message);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

router.get('/suggest', async (req, res) => {
    try {
        const searchTerm = req.query.q; 
        if (!searchTerm) {
            return res.json([]); 
        }

        // Tạo regex
        const searchRegex = { $regex: `^${searchTerm}`, $options: 'i' };

        // Tìm 5 từ BẮT ĐẦU BẰNG từ khóa
        const suggestions = await Word.find(
            { 
                $or: [
                    { word: searchRegex },         // Tìm trong tiếng Anh
                    { translation: searchRegex }  // HOẶC Tìm trong tiếng Việt
                ]
            },
            'word translation' // Lấy cả 2 trường để hiển thị
        ).limit(5); // Giới hạn 5 kết quả
        
        res.status(200).json(suggestions);

    } catch (err) {
        console.error("Lỗi khi lấy gợi ý:", err.message);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

router.get('/:word', async (req, res) => {
    try {
        // 1. Lấy tên từ từ URL (ví dụ: /api/words/apple)
        const wordName = req.params.word;

        // 2. Tìm từ đó (không phân biệt hoa/thường)
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