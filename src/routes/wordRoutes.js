// src/routes/wordRoutes.js
const express = require('express');
const router = express.Router();
const Word = require('../models/wordModel.js'); // Gọi khuôn mẫu Word
const { protect } = require('../middleware/authMiddleware.js');
const crypto = require('crypto'); // (Bạn cần cái này cho /forgot-password)

/**
 * @route   GET /api/words
 * @desc    Lấy TẤT CẢ từ vựng (Hỗ trợ Lọc, Sắp xếp, Tìm kiếm, Phân trang)
 */
router.get('/', async (req, res) => {
    try {
        let filter = {};
        let sortOptions = {};

        const { type, category, sort, search, page, tag } = req.query;

        const currentPage = parseInt(page) || 1;
        const limit = 5;
        const skip = (currentPage - 1) * limit;

        if (tag) {
            filter.tags = tag;
        }
        else if (search) {
            const searchRegex = { $regex: `^${search}`, $options: 'i' };
            filter.$or = [
                { word: searchRegex },
                { translation: searchRegex }
            ];
        }
        else if (type && type !== 'all') {
            filter.type = type;
        }

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

        const totalWords = await Word.countDocuments(filter);
        const totalPages = Math.ceil(totalWords / limit);
        const words = await Word.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            words: words,
            totalPages: totalPages,
            currentPage: currentPage
        });

    } catch (err) {
        console.error("Lỗi khi lấy danh sách từ vựng:", err.message);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

// ===========================================
// ===== SỬA LỖI THỨ TỰ (ĐẶT /suggest LÊN TRÊN) =====
// ===========================================
/**
 * @route   GET /api/words/suggest
 * @desc    Lấy gợi ý từ vựng (autocomplete)
 */
router.get('/suggest', async (req, res) => {
    try {
        const searchTerm = req.query.q;
        if (!searchTerm) {
            return res.json([]);
        }

        const searchRegex = { $regex: `^${searchTerm}`, $options: 'i' };

        const suggestions = await Word.find(
            {
                $or: [
                    { word: searchRegex },
                    { translation: searchRegex }
                ]
            },
            'word translation'
        ).limit(5);

        res.status(200).json(suggestions);

    } catch (err) {
        console.error("Lỗi khi lấy gợi ý:", err.message);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

/**
 * @route   POST /api/words/:wordId/tags
 * @desc    Thêm 1 tag mới vào từ vựng
 */
router.post('/:wordId/tags', protect, async (req, res) => {
    try {
        const { wordId } = req.params;
        let { tagName } = req.body;

        if (!tagName) {
            return res.status(400).json({ message: 'Tên tag không được rỗng' });
        }

        tagName = tagName.trim().toLowerCase();

        const word = await Word.findById(wordId);
        if (!word) {
            return res.status(404).json({ message: 'Không tìm thấy từ vựng' });
        }

        await Word.updateOne(
            { _id: wordId },
            { $addToSet: { tags: tagName } }
        );

        res.status(201).json({ message: 'Đã thêm tag!', newTag: tagName });

    } catch (err) {
        console.error("Lỗi khi thêm tag:", err.message);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

router.delete('/:wordId/tags', protect, async (req, res) => {
    try {
        const { wordId } = req.params;
        const { tagName } = req.body; // Lấy tag name từ body

        if (!tagName) {
            return res.status(400).json({ message: 'Tên tag không được rỗng' });
        }

        // 1. Tìm từ vựng
        const word = await Word.findById(wordId);
        if (!word) {
            return res.status(404).json({ message: 'Không tìm thấy từ vựng' });
        }

        // 2. Xóa tag khỏi mảng (dùng $pull)
        await Word.updateOne(
            { _id: wordId },
            { $pull: { tags: tagName } } // $pull: Kéo ra khỏi mảng
        );

        // 3. Trả về thành công
        res.status(200).json({ message: 'Đã xóa tag!' });

    } catch (err) {
        console.error("Lỗi khi xóa tag:", err.message);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

// ===========================================
// ===== ĐẶT /:word (ROUTE ĐỘNG) XUỐNG DƯỚI CÙNG =====
// ===========================================
/**
 * @route   GET /api/words/:word
 * @desc    Lấy chi tiết MỘT từ vựng
 */
router.get('/:word', async (req, res) => {
    try {
        const wordName = req.params.word;

        const wordDetail = await Word.findOne({
            word: { $regex: new RegExp(`^${wordName}$`, 'i') }
        });

        if (!wordDetail) {
            return res.status(404).json({ message: `Không tìm thấy từ: ${wordName}` });
        }

        res.status(200).json(wordDetail);

    } catch (err) {
        console.error(`Lỗi khi lấy chi tiết từ ${req.params.word}:`, err.message);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});


module.exports = router;