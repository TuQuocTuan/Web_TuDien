// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/userModel');

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