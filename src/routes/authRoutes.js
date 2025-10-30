// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/userModel.js'); // Gọi khuôn mẫu User

const crypto = require('crypto'); // Gói tạo token ngẫu nhiên
const { sendWelcomeEmail, sendResetEmail } = require('../utils/sendEmail.js'); // Lấy hàm mới

// ĐỊNH NGHĨA TUYẾN ĐƯỜNG: POST /api/auth/register
router.post('/register', async (req, res) => {
    console.log('--- API /register ĐÃ ĐƯỢC GỌI! ---');
    try {
        // 1. Lấy dữ liệu từ form (username, email, password)
        const { username, email, password } = req.body;

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

        sendWelcomeEmail(newUser.email, newUser.username); // Gửi email chào mừng

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
            username: user.username,
            isNewbie: user.isNewbie // kiểm tra trạng thái newbie
        });

    } catch (err) {
        console.error("Lỗi khi đăng nhập:", err.message);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

router.post('/forgot_pass', async (req, res) => {
    try {
        // 1. Lấy email từ form
        const { email } = req.body;
        const user = await User.findOne({ email: email });

        // 2. (Bảo mật) Nếu không tìm thấy user, vẫn gửi thông báo "thành công"
        // Điều này ngăn kẻ xấu dò xem email nào đã tồn tại trong hệ thống.
        if (!user) {
            return res.status(200).json({ message: 'Nếu email tồn tại, link reset sẽ được gửi.' });
        }

        // 3. Tạo Token ngẫu nhiên
        const resetToken = crypto.randomBytes(20).toString('hex');

        // 4. Lưu token và thời gian hết hạn (1 giờ) vào user
        user.passwordResetToken = resetToken;
        user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 giờ (tính bằng mili-giây)
        await user.save();

        // 5. Tạo link đầy đủ (quan trọng)
        const resetURL = `http://localhost:3000/reset_pass.html?token=${resetToken}`;

        // 6. Gửi email
        await sendResetEmail(user.email, resetURL);
        
        // 7. Gửi thông báo
        res.status(200).json({ message: 'Nếu email tồn tại, link reset sẽ được gửi.' });

    } catch (err) {
        console.error("Lỗi khi quên mật khẩu:", err.message);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

router.post('/reset_pass', async (req, res) => { // <-- SỬA TÊN ROUTE Ở ĐÂY
    try {
        const { newPassword, token } = req.body;

        // BẠN CŨNG CẦN ĐẢM BẢO TÊN BIẾN TRONG DB ĐANG DÙNG CÁI NÀY
        const user = await User.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
        }

        const bcrypt = require('bcryptjs'); 
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        
        await user.save();

        res.status(200).json({ message: 'Đã cập nhật mật khẩu thành công!' });

    } catch (err) {
        console.error("Lỗi khi reset mật khẩu:", err.message);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

module.exports = router;