// src/utils/sendEmail.js
const nodemailer = require('nodemailer');

// 1. Cấu hình "Người vận chuyển" (Transporter)
const transporter = nodemailer.createTransport({
    service: 'gmail', // Dùng dịch vụ Gmail
    auth: {
        user: process.env.EMAIL_USER, // Lấy email từ .env
        pass: process.env.EMAIL_PASS  // Lấy mật khẩu 16 số từ .env
    }
});

// 2. Tạo hàm gửi mail chào mừng
const sendWelcomeEmail = async (userEmail, username) => {
    try {
        // 3. Nội dung email
        const mailOptions = {
            from: `"Wordee" <${process.env.EMAIL_USER}>`, // Tên người gửi
            to: userEmail, // Gửi đến email của user
            subject: 'Chào mừng bạn đến với Wordee!', // Tiêu đề
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Chào mừng, ${username}!</h2>
                    <p>Cảm ơn bạn đã đăng ký tài khoản tại Wordee.</p>
                    <p>Chúc bạn có một trải nghiệm học từ vựng thật vui vẻ.</p>
                    <br>
                    <p>Trân trọng,</p>
                    <p>Đội ngũ Wordee</p>
                </div>
            `
        };

        // 4. Gửi mail
        await transporter.sendMail(mailOptions);
        console.log(`Email chào mừng đã gửi tới: ${userEmail}`);

    } catch (err) {
        console.error('Lỗi khi gửi email:', err.message);
    }
}; // <-- DẤU NGOẶC KẾT THÚC CỦA sendWelcomeEmail (ĐÃ SỬA)

// 3. Tạo hàm gửi mail Reset (Bây giờ đã nằm riêng)
const sendResetEmail = async (userEmail, resetURL) => {
    try {
        const mailOptions = {
            from: `"Wordee" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: 'Yêu cầu đặt lại mật khẩu Wordee',
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Bạn vừa yêu cầu đặt lại mật khẩu?</h2>
                    <p>Vui lòng nhấn vào link bên dưới để đặt lại mật khẩu của bạn. Link này sẽ hết hạn sau 1 giờ.</p>
                    <p>
                        <a href="${resetURL}" 
                           style="background-color: #2a4a87; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">
                           Đặt Lại Mật Khẩu
                        </a>
                    </p>
                    <p>Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email reset đã gửi tới: ${userEmail}`);

    } catch (err) {
        console.error('Lỗi khi gửi email reset:', err.message);
    }
};

// 4. Xuất hàm này ra để file khác dùng (Bây giờ đã đúng)
module.exports = { 
    sendWelcomeEmail, 
    sendResetEmail 
};