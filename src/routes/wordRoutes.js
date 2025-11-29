// src/routes/wordRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Word = require('../models/wordModel.js');
const { protect } = require('../middleware/authMiddleware.js');

// ===========================================
// 1. CÁC ROUTE TĨNH (STATIC ROUTES)
// ===========================================

/**
 * @route   GET /api/words
 * @desc    Lấy danh sách (Hỗ trợ tìm #tag)
 */
router.get('/', async (req, res) => {
    try {
        let filter = {};
        let sortOptions = {};
        const { type, search, page, tag, sort } = req.query;

        const currentPage = parseInt(page) || 1;
        const limit = 20; 
        const skip = (currentPage - 1) * limit;

        // --- 1. XỬ LÝ TÌM KIẾM ---
        if (tag) {
            // Hỗ trợ cách cũ: ?tag=ielts
            filter.tags = tag;
        } 
        else if (search) {
            const searchTerm = search.trim();

            // KIỂM TRA: Nếu bắt đầu bằng dấu #
            if (searchTerm.startsWith('#')) {
                // ==> TÌM THEO TAG
                // Cắt bỏ dấu # (substring(1)) và xóa khoảng trắng
                const tagKeyword = searchTerm.substring(1).trim().toLowerCase();
                
                if (tagKeyword) {
                    // Tìm các từ có chứa tag này
                    filter.tags = tagKeyword;
                }
            } else {
                // ==> TÌM THEO TỪ VỰNG / NGHĨA (LOGIC CŨ)
                const searchRegex = { $regex: `^${searchTerm}`, $options: 'i' };
                filter.$or = [
                    { word: searchRegex }, 
                    { translation: searchRegex }
                ];
            }
        }

        // --- 2. XỬ LÝ LOẠI TỪ ---
        if (type && type !== 'all') {
            filter.type = type;
        }

        // --- 3. XỬ LÝ SẮP XẾP ---
        switch (sort) {
            case 'alphabetical_desc': sortOptions = { word: -1 }; break;
            case 'newest': sortOptions = { createdAt: -1 }; break;
            case 'oldest': sortOptions = { createdAt: 1 }; break;
            default: sortOptions = { word: 1 }; break;
        }

        // --- 4. TRUY VẤN DB ---
        const totalWords = await Word.countDocuments(filter);
        const totalPages = Math.ceil(totalWords / limit);
        const words = await Word.find(filter).sort(sortOptions).skip(skip).limit(limit);

        res.status(200).json({ words, totalPages, currentPage });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

/**
 * @route   GET /api/words/suggest
 * @desc    Gợi ý từ vựng HOẶC Tag (khi gõ #)
 */
router.get('/suggest', async (req, res) => {
    try {
        const searchTerm = req.query.q;
        if (!searchTerm) return res.json([]);

        const term = searchTerm.trim();

        // NẾU NGƯỜI DÙNG GÕ DẤU #
        if (term.startsWith('#')) {
            const tagKeyword = term.substring(1).toLowerCase();
            
            // Tìm các từ có chứa tag khớp với từ khóa
            // Lưu ý: Cách này hơi thủ công vì MongoDB không hỗ trợ suggest tags trực tiếp tốt lắm
            // Ta tìm các Word có tag khớp, sau đó lấy unique tags
            const wordsWithTags = await Word.find(
                { tags: { $regex: `^${tagKeyword}`, $options: 'i' } },
                'tags' // Chỉ lấy trường tags
            ).limit(20);

            // Gom tất cả tags lại và lọc trùng
            const allTags = new Set();
            wordsWithTags.forEach(w => {
                if(w.tags) w.tags.forEach(t => {
                    if(t.toLowerCase().includes(tagKeyword)) allTags.add('#' + t);
                });
            });

            // Chuyển về mảng object cho Frontend dễ hiển thị
            const suggestions = Array.from(allTags).slice(0, 5).map(t => ({
                word: t, 
                translation: 'Tìm theo thẻ (Tag)'
            }));
            
            return res.json(suggestions);
        }

        // NẾU TÌM BÌNH THƯỜNG
        const searchRegex = { $regex: `^${term}`, $options: 'i' };
        const suggestions = await Word.find(
            { $or: [{ word: searchRegex }, { translation: searchRegex }] },
            'word translation'
        ).limit(5);

        res.status(200).json(suggestions);

    } catch (err) {
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

// ... (GIỮ NGUYÊN CÁC ROUTE POST, DELETE, GET/:PARAM Ở DƯỚI) ...
// (Nhớ copy lại đoạn route /:param thông minh mà chúng ta đã làm ở bước trước nhé)

// ===========================================
// 2. CÁC ROUTE CÓ THAM SỐ CỤ THỂ
// ===========================================
router.post('/:wordId/tags', protect, async (req, res) => { /* Giữ nguyên code cũ */ });
router.delete('/:wordId/tags', protect, async (req, res) => { /* Giữ nguyên code cũ */ });

// ===========================================
// 3. ROUTE ĐỘNG (CUỐI CÙNG)
// ===========================================
router.get('/:param', async (req, res) => {
    try {
        const { param } = req.params;
        let word = null;
        if (mongoose.Types.ObjectId.isValid(param)) {
            word = await Word.findById(param);
        }
        if (!word) {
            word = await Word.findOne({ word: { $regex: new RegExp(`^${param}$`, 'i') } });
        }
        if (!word) return res.status(404).json({ message: `Không tìm thấy: ${param}` });
        res.json(word);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server' });
    }
});

module.exports = router;