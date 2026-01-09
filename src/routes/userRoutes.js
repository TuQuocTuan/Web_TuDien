// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const Word = require('../models/wordModel'); 
const { protect } = require('../middleware/authMiddleware.js');

// ============================================================
// 1. ROUTE LƯU LỊCH SỬ (Giữ nguyên)
// ============================================================
router.post('/add-history', protect, async (req, res) => {
    try {
        const { wordId } = req.body;
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy user' });
        }

        if (!user.searchHistory) {
            user.searchHistory = [];
        }

        // Xóa từ cũ nếu đã tồn tại để đưa lên đầu
        user.searchHistory = user.searchHistory.filter(item => item.wordId.toString() !== wordId);

        // Thêm vào đầu mảng
        user.searchHistory.unshift({
            wordId: wordId,      
            actedAt: new Date()  
        });

        // Giới hạn 50 từ gần nhất trong DB
        if (user.searchHistory.length > 50) {
            user.searchHistory.pop();
        }

        await user.save();
        res.status(200).json({ message: 'Đã lưu lịch sử' });

    } catch (error) {
        console.error('Lỗi thêm lịch sử:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// ============================================================
// 2. ROUTE XEM LỊCH SỬ (CÓ PHÂN TRANG + BỘ LỌC)
// URL: GET /api/user/history?page=1&limit=5&type=today
// ============================================================
// ============================================================
// 2. ROUTE XEM LỊCH SỬ (ĐÃ SỬA LOGIC LỌC NGÀY)
// URL: GET /api/user/history?page=1&limit=5&date=2025-01-09
// ============================================================
router.get('/history', protect, async (req, res) => {
    try {
        const userId = req.user._id;
        
        // 1. Lấy tham số từ URL
        const { type, date, page, limit } = req.query;

        // 2. Cấu hình phân trang
        const pageNumber = parseInt(page) || 1;
        const pageSize = parseInt(limit) || 10;

        // 3. Tìm user
        const user = await User.findById(userId).populate('searchHistory.wordId');

        if (!user) {
            return res.status(404).json({ message: 'User không tồn tại' });
        }

        // 4. Lấy mảng lịch sử (loại bỏ null và đảo ngược để lấy mới nhất)
        let allHistory = user.searchHistory
            .filter(item => item.wordId) 
            .reverse();

        // 5. LOGIC LỌC NGÀY (Đã sửa lại cho linh hoạt)
        
        // Trường hợp 1: Frontend gửi type='today' (hoặc bạn muốn test nhanh trên Postman)
        if (type === 'today') {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            const end = new Date();
            end.setHours(23, 59, 59, 999);
            
            allHistory = allHistory.filter(item => {
                const itemDate = new Date(item.actedAt || item.searchedAt);
                return itemDate >= start && itemDate <= end;
            });
        } 
        // Trường hợp 2: Có tham số 'date' gửi lên (Frontend đang chạy theo cách này)
        else if (date) { 
            // date dạng 'YYYY-MM-DD'
            const targetDate = new Date(date);
            const start = new Date(targetDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(targetDate);
            end.setHours(23, 59, 59, 999);

            allHistory = allHistory.filter(item => {
                const itemDate = new Date(item.actedAt || item.searchedAt);
                // So sánh timestamp để chính xác hơn
                return itemDate.getTime() >= start.getTime() && itemDate.getTime() <= end.getTime();
            });
        }
        // Trường hợp 3: Không có type, không có date -> Lấy tất cả (Mặc định)

        // 6. TÍNH TOÁN PHÂN TRANG (Cắt mảng trên RAM)
        const totalResults = allHistory.length;
        const totalPages = Math.ceil(totalResults / pageSize);
        
        // Xử lý trường hợp trang yêu cầu vượt quá tổng số trang (tránh lỗi mảng rỗng không mong muốn)
        const safePage = pageNumber > totalPages && totalPages > 0 ? totalPages : pageNumber;
        
        const startIndex = (safePage - 1) * pageSize;
        const endIndex = startIndex + pageSize;

        // Cắt dữ liệu
        const paginatedData = allHistory.slice(startIndex, endIndex);

        // 7. TRẢ VỀ KẾT QUẢ
        res.status(200).json({
            success: true,
            data: paginatedData,       
            currentPage: safePage,   
            totalPages: totalPages,    
            totalResults: totalResults 
        });

    } catch (error) {
        console.error('Lỗi lấy lịch sử:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// ============================================================
// 3. ROUTE DAILY WORDS (Giữ nguyên)
// ============================================================
router.get('/my-daily-words', protect, async (req, res) => {
    try {
        const user = req.user;
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        const now = Date.now();

        // 1. KIỂM TRA THỜI GIAN (LOGIC CHỐNG F5)
        if (user.dailyWords && user.dailyWords.length > 0 && user.dailyWordsTimestamp && (now - user.dailyWordsTimestamp.getTime() < TWENTY_FOUR_HOURS)) {
            console.log(`User ${user.username} đang dùng 12 từ cũ (cache).`);
            await user.populate('dailyWords');
            return res.status(200).json(user.dailyWords);
        }

        // 2. NẾU HẾT HẠN: Lấy 12 từ mới
        console.log(`Đang tạo 12 từ mới cho ${user.username}...`);

        let newWords;
        const userCategories = user.favoriteCategories;

        if (userCategories && userCategories.length > 0) {
            console.log(`Đang tìm 12 từ theo thể loại: ${userCategories.join(', ')}`);
            newWords = await Word.aggregate([
                { $match: { category: { $in: userCategories } } }, 
                { $sample: { size: 12 } }                          
            ]);

            if (newWords.length === 0) {
                console.log('Không tìm thấy từ theo thể loại, quay về lấy ngẫu nhiên...');
                newWords = await Word.aggregate([{ $sample: { size: 12 } }]);
            }
        } else {
            console.log('User không có thể loại, lấy 12 từ ngẫu nhiên...');
            newWords = await Word.aggregate([{ $sample: { size: 12 } }]);
        }

        const newWordIds = newWords.map(word => word._id);

        user.dailyWords = newWordIds;
        user.dailyWordsTimestamp = new Date(now);
        await user.save();

        res.status(200).json(newWords);

    } catch (err) {
        console.error("Lỗi khi lấy daily-words:", err.message);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

// ============================================================
// 4. ROUTE SURVEY (Giữ nguyên)
// ============================================================
router.post('/complete-survey', async (req, res) => {
    try {
        const { username, categories } = req.body;

        const updatedUser = await User.findOneAndUpdate(
            { username: username }, 
            {
                isNewbie: false, 
                favoriteCategories: categories 
            },
            { new: true } 
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'Không tìm thấy user' });
        }

        res.status(200).json({ message: 'Cập nhật sở thích thành công!' });

    } catch (err) {
        console.error("Lỗi cập nhật khảo sát:", err.message);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

module.exports = router;