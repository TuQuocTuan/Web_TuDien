// src/routes/wordRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Word = require('../models/wordModel.js');
const SearchHistory = require('../models/searchHistoryModel.js'); // Bắt buộc có cái này
const { protect } = require('../middleware/authMiddleware.js');
const User = require('../models/userModel');

// ===========================================
// 1. CÁC ROUTE TĨNH
// ===========================================

// Route: Lấy danh sách từ (giữ nguyên)
router.get('/', async (req, res) => {
    try {
        let filter = {};
        const { type, search, tag, sort, page } = req.query;
        const limit = 20; 
        const skip = ((parseInt(page) || 1) - 1) * limit;

        if (tag) filter.tags = tag;
        else if (search) {
            const s = search.trim();
            if (s.startsWith('#')) {
                const t = s.substring(1).trim().toLowerCase();
                if (t) filter.tags = t;
            } else {
                const r = { $regex: `^${s}`, $options: 'i' };
                filter.$or = [{ word: r }, { translation: r }];
            }
        }
        if (type && type !== 'all') filter.type = type;

        let sortOptions = { word: 1 };
        if (sort === 'newest') sortOptions = { createdAt: -1 };

        const totalWords = await Word.countDocuments(filter);
        const words = await Word.find(filter).sort(sortOptions).skip(skip).limit(limit);

        res.status(200).json({ words, totalPages: Math.ceil(totalWords / limit) });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Route: Suggest Search (giữ nguyên)
router.get('/suggest', async (req, res) => {
    try {
        const term = req.query.q?.trim();
        if (!term) return res.json([]);

        if (term.startsWith('#')) {
            const tag = term.substring(1).toLowerCase();
            const words = await Word.find({ tags: { $regex: `^${tag}`, $options: 'i' } }, 'tags').limit(20);
            const tags = new Set();
            words.forEach(w => w.tags?.forEach(t => t.toLowerCase().includes(tag) && tags.add('#' + t)));
            return res.json(Array.from(tags).slice(0, 5).map(t => ({ word: t, type: 'tag' })));
        }

        const regex = { $regex: `^${term}`, $options: 'i' };
        const suggestions = await Word.find({ $or: [{ word: regex }, { translation: regex }] })
            .select('word translation type pronunciation image')
            .limit(10);
        res.json(suggestions);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// ===========================================
// [QUAN TRỌNG] ROUTE GỢI Ý MỚI (DỰA VÀO LỊCH SỬ TÌM KIẾM)
// ===========================================
router.get('/recommendations', protect, async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Lấy lịch sử và populate từ vựng
        const user = await User.findById(userId).populate('searchHistory.wordId');

        // --- [CODE MỚI] LOGIC GIỚI HẠN THỜI GIAN ---
        
        // Tạo mốc thời gian: Lấy thời điểm hiện tại trừ đi 3 ngày
        const daysLimit = 3;
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - daysLimit);

        // Lọc lịch sử: Chỉ lấy những mục được tra SAU ngày pastDate
        // Giả sử trong searchHistory bạn có lưu field 'searchedAt' là ngày tra
        const recentHistory = user.searchHistory.filter(item => {
            return item.searchedAt && new Date(item.searchedAt) >= pastDate;
        });
        // -------------------------------------------

        // 2. Lấy danh sách từ vựng từ lịch sử ĐÃ LỌC (chỉ 3 ngày gần đây)
        const historyWords = recentHistory
            .map(item => item.wordId)
            .filter(word => word !== null);

        // 3. Lấy ID để loại trừ (Tránh gợi ý lại những từ vừa tra 3 ngày qua)
        // Lưu ý: Nếu bạn muốn KHÔNG BAO GIỜ gợi ý lại từ đã tra (dù tra 1 năm trước),
        // thì bước này bạn nên lấy từ user.searchHistory gốc thay vì recentHistory.
        // Ở đây mình để theo recentHistory cho đúng flow "tươi mới".
        const searchWordIds = historyWords.map(w => w._id);

        // 4. Tổng hợp Tags (Chỉ từ những từ tra trong 3 ngày qua) -> "Sở thích tươi mới"
        let userInterestTags = [];
        historyWords.forEach(w => {
            if (w.tags && w.tags.length > 0) {
                userInterestTags.push(...w.tags);
            }
        });

        // Xóa các tag trùng lặp để mảng gọn hơn (Optional nhưng nên làm)
        userInterestTags = [...new Set(userInterestTags)];

        // 5. Logic tìm từ gợi ý (Query DB)
        let recommendations = [];

        if (userInterestTags.length > 0) {
            recommendations = await Word.aggregate([
                { $match: { 
                    tags: { $in: userInterestTags },  // Có tag liên quan đến 3 ngày gần đây
                    _id: { $nin: searchWordIds }      // Không trùng từ vừa tra
                }},
                { $sample: { size: 12 } }
            ]);
        }

        // 6. Nếu thiếu thì Random bù vào
        if (recommendations.length < 12) {
            const countNeeded = 12 - recommendations.length;
            
            // Lấy thêm ID của recommendations hiện tại để tránh random trúng nó
            const currentRecommendIds = recommendations.map(r => r._id);
            const excludeIds = [...searchWordIds, ...currentRecommendIds];

            const randomWords = await Word.aggregate([
                { $match: { _id: { $nin: excludeIds } } },
                { $sample: { size: countNeeded } }
            ]);
            recommendations = recommendations.concat(randomWords);
        }

        res.json(recommendations);

    } catch (err) {
        console.error("Lỗi gợi ý:", err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// src/routes/wordRoutes.js

// API Xóa Tag khỏi từ vựng
// Frontend gọi: DELETE /api/words/:wordId/tags
// Body gửi lên: { "tag": "ten_tag_muon_xoa" }
router.delete('/:wordId/tags', protect, async (req, res) => {
    try {
        const { wordId } = req.params;
        const { tag } = req.body; // Lấy tên tag cần xóa từ body

        if (!tag) {
            return res.status(400).json({ message: 'Thiếu tên tag cần xóa' });
        }

        const word = await Word.findById(wordId);
        if (!word) {
            return res.status(404).json({ message: 'Không tìm thấy từ vựng' });
        }

        // Lọc bỏ tag cần xóa ra khỏi mảng tags
        // (Giữ lại những tag KHÁC với tag cần xóa)
        const oldLength = word.tags.length;
        word.tags = word.tags.filter(t => t !== tag);

        // Nếu độ dài không đổi nghĩa là không tìm thấy tag đó để xóa
        if (word.tags.length === oldLength) {
             return res.status(400).json({ message: 'Tag này không tồn tại trong từ' });
        }

        await word.save();

        res.json({ message: `Đã xóa tag "${tag}"`, currentTags: word.tags });

    } catch (err) {
        console.error("Lỗi xóa tag:", err);
        res.status(500).json({ message: 'Lỗi server khi xóa tag' });
    }
});
// ===========================================
// ROUTE ĐỘNG (ĐỂ CUỐI CÙNG)
// ===========================================
router.get('/:param', async (req, res) => {
    try {
        const { param } = req.params;
        let word = null;
        if (mongoose.Types.ObjectId.isValid(param)) word = await Word.findById(param);
        if (!word) word = await Word.findOne({ word: { $regex: new RegExp(`^${param}$`, 'i') } });
        
        if (!word) return res.status(404).json({ message: 'Không tìm thấy' });
        
        // [QUAN TRỌNG] LƯU LỊCH SỬ TÌM KIẾM NẾU NGƯỜI DÙNG ĐÃ ĐĂNG NHẬP
        // Đoạn này giúp API /recommendations học được user thích gì
        if (req.user) { 
            // Lưu ý: Middleware protect không bắt buộc ở route này, 
            // nên bạn cần check req.user từ middleware optionalAuth (nếu có)
            // Hoặc xử lý ở client gửi API riêng để lưu history.
        }
        
        res.json(word);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server' });
    }
});

module.exports = router;