const express = require('express');
const router = express.Router();
const Album = require('../models/albumModel');
// Import middleware xác thực của bạn
const { protect } = require('../middleware/authMiddleware'); 

// === GET: LẤY TẤT CẢ BỘ TỪ CỦA NGƯỜI DÙNG ===
// (GET /api/albums)
router.get('/', protect, async (req, res) => {
    try {
        // Tìm tất cả album thuộc về user đã đăng nhập (lấy từ req.user)
        const albums = await Album.find({ user: req.user.id });

        res.status(200).json({
            status: 'success',
            results: albums.length,
            data: albums
        });
    } catch (err) {
        res.status(500).json({ status: 'fail', message: 'Lỗi máy chủ' });
    }
});

// === POST: TẠO BỘ TỪ MỚI ===
// (POST /api/albums)
// ... (Hàm router.get giữ nguyên) ...

// === POST: TẠO BỘ TỪ MỚI ===
// (POST /api/albums)
router.post('/', protect, async (req, res) => {
    try {
        // CHỈ LẤY TITLE
        const { title } = req.body; 

        const newAlbum = await Album.create({
            title,
            // (ĐÃ XÓA DESCRIPTION)
            user: req.user.id 
        });

        res.status(201).json({
            status: 'success',
            data: newAlbum
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
});

module.exports = router;

