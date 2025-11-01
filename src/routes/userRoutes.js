// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const Word = require('../models/wordModel'); // <-- Cần Word model
const { protect } = require('../middleware/authMiddleware.js');

router.get('/my-daily-words', protect, async (req, res) => {
    try {
        const user = req.user;
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        const now = Date.now();

        // 1. KIỂM TRA THỜI GIAN (LOGIC CHỐNG F5 - Giữ nguyên)
        if (user.dailyWords && user.dailyWords.length > 0 && user.dailyWordsTimestamp && (now - user.dailyWordsTimestamp.getTime() < TWENTY_FOUR_HOURS)) {

            console.log(`User ${user.username} đang dùng 12 từ cũ (cache).`);
            await user.populate('dailyWords');
            return res.status(200).json(user.dailyWords);
        }

        // 2. NẾU HẾT HẠN: Lấy 12 từ mới
        console.log(`Đang tạo 12 từ mới cho ${user.username}...`);

        let newWords;

        // ===========================================
        // ===== LOGIC MỚI: KIỂM TRA SỞ THÍCH =====
        // ===========================================

        // 3. Lấy các thể loại user đã chọn (ví dụ: ['school', 'sports'])
        const userCategories = user.favoriteCategories;

        if (userCategories && userCategories.length > 0) {
            // 3A. NẾU USER CÓ SỞ THÍCH:
            console.log(`Đang tìm 12 từ theo thể loại: ${userCategories.join(', ')}`);

            // Dùng $match để lọc theo thể loại, $sample để lấy ngẫu nhiên
            newWords = await Word.aggregate([
                { $match: { category: { $in: userCategories } } }, // Lọc
                { $sample: { size: 12 } }                          // Lấy ngẫu nhiên
            ]);

            // (Dự phòng: Nếu các thể loại đó có quá ít từ (hoặc = 0),
            //  chúng ta quay lại lấy ngẫu nhiên)
            if (newWords.length === 0) {
                console.log('Không tìm thấy từ theo thể loại, quay về lấy ngẫu nhiên...');
                newWords = await Word.aggregate([{ $sample: { size: 12 } }]);
            }

        } else {
            // 3B. NẾU USER KHÔNG CÓ SỞ THÍCH: Lấy 12 từ ngẫu nhiên
            console.log('User không có thể loại, lấy 12 từ ngẫu nhiên...');
            newWords = await Word.aggregate([{ $sample: { size: 12 } }]);
        }
        // ===========================================
        // ===== HẾT LOGIC MỚI =====
        // ===========================================

        const newWordIds = newWords.map(word => word._id);

        // 4. CẬP NHẬT USER (Giữ nguyên)
        user.dailyWords = newWordIds;
        user.dailyWordsTimestamp = new Date(now);
        await user.save();

        // 5. Trả về 12 từ mới
        res.status(200).json(newWords);

    } catch (err) {
        console.error("Lỗi khi lấy daily-words:", err.message);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});


// API: POST /api/user/complete-survey
router.post('/complete-survey', async (req, res) => {
    try {
        // 1. Lấy ID user (giả sử gửi kèm) và các lựa chọn
        // (Cách tốt hơn là lấy từ token, nhưng ta sẽ làm sau)
        const { username, categories } = req.body;

        // 2. Tìm user và cập nhật
        const updatedUser = await User.findOneAndUpdate(
            { username: username }, // Tìm user bằng username
            {
                isNewbie: false, // <-- Đổi trạng thái newbie
                favoriteCategories: categories // <-- Lưu các lựa chọn (sẽ bị lỗi, xem ghi chú)
            },
            { new: true } // Trả về user đã cập nhật
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