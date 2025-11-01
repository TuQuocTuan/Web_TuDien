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

// === DELETE: XÓA MỘT BỘ TỪ ===
// (DELETE /api/albums/:id)
router.delete('/:id', protect, async (req, res) => {
    try {
        const albumId = req.params.id; // Lấy ID của album từ URL

        // Tìm và xóa album
        // Điều kiện { _id: albumId, user: req.user.id }
        // đảm bảo 2 việc:
        // 1. Album phải tồn tại.
        // 2. Album đó phải thuộc về người dùng đang đăng nhập.
        const deletedAlbum = await Album.findOneAndDelete({ 
            _id: albumId, 
            user: req.user.id 
        });

        // Nếu không tìm thấy (vì sai ID hoặc không phải chủ)
        if (!deletedAlbum) {
            return res.status(404).json({ 
                status: 'fail', 
                message: 'Không tìm thấy bộ từ vựng hoặc bạn không có quyền xóa.' 
            });
        }

        // Trả về 204 No Content (Xóa thành công, không cần trả về dữ liệu)
        res.status(204).json({
            status: 'success',
            data: null
        });

    } catch (err) {
        console.error('Lỗi khi xóa album:', err);
        res.status(500).json({ status: 'fail', message: 'Lỗi máy chủ' });
    }
});

// === CẬP NHẬT (SỬA) TÊN ALBUM ===
// (PATCH /api/albums/:id)
router.patch('/:id', protect, async (req, res) => {
    try {
        const albumId = req.params.id;
        const { title } = req.body; // Chỉ cho phép cập nhật title

        // 1. Kiểm tra xem title có được gửi lên không
        if (!title) {
            return res.status(400).json({ status: 'fail', message: 'Vui lòng nhập tên mới.' });
        }

        // 2. Tìm và cập nhật album
        // Đảm bảo album này thuộc về đúng người dùng
        const updatedAlbum = await Album.findOneAndUpdate(
            { _id: albumId, user: req.user.id }, // Điều kiện tìm
            { title: title },                     // Dữ liệu cập nhật
            { new: true, runValidators: true }   // Tùy chọn: trả về bản ghi mới và chạy validation
        );

        // 3. Nếu không tìm thấy
        if (!updatedAlbum) {
            return res.status(404).json({ 
                status: 'fail', 
                message: 'Không tìm thấy bộ từ vựng hoặc bạn không có quyền.' 
            });
        }

        // 4. Trả về thành công
        res.status(200).json({
            status: 'success',
            data: updatedAlbum
        });

    } catch (err) {
        console.error('Lỗi khi cập nhật album:', err);
        res.status(500).json({ status: 'fail', message: 'Lỗi máy chủ' });
    }
});

// === POST: THÊM MỘT TỪ (WORD) VÀO ALBUM ===
// (POST /api/albums/:albumId/words)
router.post('/:albumId/words', protect, async (req, res) => {
    try {
        const { albumId } = req.params;
        const { wordId } = req.body; // Lấy wordId từ body

        if (!wordId) {
            return res.status(400).json({ status: 'fail', message: 'Không có wordId' });
        }

        // 1. Tìm album và kiểm tra chủ sở hữu
        const album = await Album.findOne({ _id: albumId, user: req.user.id });

        if (!album) {
            return res.status(404).json({ 
                status: 'fail', 
                message: 'Không tìm thấy bộ từ vựng hoặc bạn không có quyền.' 
            });
        }

        // 2. Kiểm tra xem từ này đã có trong album chưa
        if (album.words.includes(wordId)) {
            return res.status(400).json({ 
                status: 'fail', 
                message: 'Từ này đã có trong bộ từ vựng' 
            });
        }

        // 3. Thêm từ vào mảng và lưu lại
        album.words.push(wordId);
        await album.save();

        res.status(200).json({
            status: 'success',
            message: 'Đã thêm từ vào bộ từ vựng',
            data: album
        });

    } catch (err) {
        console.error('Lỗi khi thêm từ vào album:', err);
        res.status(500).json({ status: 'fail', message: 'Lỗi máy chủ' });
    }
});

module.exports = router;

