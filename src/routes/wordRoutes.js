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
        // --- 1. LẤY CÁC THAM SỐ (BAO GỒM 'PAGE') ---
        let filter = {}; // Đối tượng filter
        let sortOptions = {};
        const { type, category, sort, search, page } = req.query; // Thêm 'page'

        // --- 2. CÀI ĐẶT PHÂN TRANG ---
        const currentPage = parseInt(page) || 1; // Lấy số trang, mặc định là 1
        const limit = 5; // <-- BẠN YÊU CẦU 5 TỪ MỖI TRANG
        const skip = (currentPage - 1) * limit; // Bỏ qua bao nhiêu từ

        // --- 3. LOGIC LỌC VÀ TÌM KIẾM (GIỮ NGUYÊN CỦA BẠN) ---
        if (type) {
            filter.type = { $in: type.split(',') };
        }
        if (category) {
            filter.category = { $in: category.split(',') };
        }
        if (search) {
            const searchRegex = { $regex: `^${search}`, $options: 'i' };
            filter.$or = [
                { word: searchRegex },
                { translation: searchRegex }
            ];
        }

        // --- 4. LOGIC SẮP XẾP (GIỮ NGUYÊN CỦA BẠN) ---
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
                sortOptions = { word: 1 };
                break;
        }

        // --- 5. THỰC HIỆN TRUY VẤN (ĐÃ NÂNG CẤP) ---

        // A. Đếm TỔNG SỐ từ khớp với bộ lọc (để biết có bao nhiêu trang)
        const totalWords = await Word.countDocuments(filter);
        const totalPages = Math.ceil(totalWords / limit); // Tính tổng số trang

        // B. Lấy 5 từ của trang hiện tại
        const words = await Word.find(filter)
            .sort(sortOptions)
            .skip(skip)   // Bỏ qua các trang trước
            .limit(limit); // Chỉ lấy 5

        // --- 6. TRẢ VỀ DỮ LIỆU (ĐÃ NÂNG CẤP) ---
        res.status(200).json({
            words: words,               // Mảng 5 từ
            totalPages: totalPages,     // Tổng số trang
            currentPage: currentPage    // Trang hiện tại
        });

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