// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/userModel.js'); // Gọi khuôn mẫu User

// ĐỊNH NGHĨA TUYẾN ĐƯỜNG: POST /api/auth/register
router.post('/register', async (req, res) => {
    console.log('--- API /register ĐÃ ĐƯỢC GỌI! ---');
    try {
        // 1. Lấy dữ liệu từ form (username, email, password)
        const { username,email,password } = req.body;

        const usernameExists = await User.findOne({ username: username });
        if (usernameExists) {
            return res.status(400).json({ message: 'Username này đã được sử dụng' });
        }

        // 2. Kiểm tra xem email đã tồn tại chưa
        const userExists = await User.findOne({ email: email });
        if (userExists) {
            // 400 = Bad Request (Yêu cầu không hợp lệ)
            return res.status(400).json({ message: 'Email này đã được sử dụng' });
        }

        // 3. Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10); // "Muối" mã hóa
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Tạo user mới
        const newUser = new User({
            username: username,
            email: email,
            password: hashedPassword // Lưu mật khẩu đã mã hóa
        });

        // 5. Lưu user vào MongoDB
        await newUser.save();

        // 6. Trả về thông báo thành công
        // 201 = Created (Đã tạo thành công)
        res.status(201).json({ message: 'Đăng ký tài khoản thành công!' });

    } catch (err) {
        console.error("Lỗi khi đăng ký:", err.message);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

// (Sau này chúng ta sẽ thêm logic cho /login ở đây)
router.post('/login', async (req, res) => {
    // 1. Yêu cầu gói 'jsonwebtoken'
    const jwt = require('jsonwebtoken');

    try {
        // 2. Lấy username và password từ form
        const { username, password } = req.body;

        // 3. Tìm user trong database bằng email
        const user = await User.findOne({ username: username });
        
        // 4. Nếu không tìm thấy user -> Báo lỗi
        if (!user) {
            return res.status(404).json({ message: 'Email này không tồn tại.' });
        }

        // 5. So sánh mật khẩu
        //    Dùng bcrypt.compare để so sánh mật khẩu GỐC (từ form)
        //    với mật khẩu ĐÃ MÃ HÓA (trong database)
        const isMatch = await bcrypt.compare(password, user.password);

        // 6. Nếu mật khẩu sai -> Báo lỗi
        if (!isMatch) {
            return res.status(400).json({ message: 'Mật khẩu không chính xác.' });
        }

        // 7. ĐĂNG NHẬP THÀNH CÔNG: Tạo "Vé" (Token)
        //    Tạo một "vé" chứa ID của user, có thời hạn 1 ngày
        //    (process.env.JWT_SECRET là một chuỗi bí mật)
        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET, 
            { expiresIn: '1d' } 
        );

        // 8. Trả "vé" (token) về cho trình duyệt
        res.status(200).json({
            message: 'Đăng nhập thành công!',
            token: token,
            username: user.username
        });

    } catch (err) {
        console.error("Lỗi khi đăng nhập:", err.message);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

module.exports = router;