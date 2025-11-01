document.addEventListener('DOMContentLoaded', () => {
    const resetForm = document.getElementById('reset-form');
    const messageEl = document.getElementById('message');
    const passwordEl = document.getElementById('password');
    const confirmPasswordEl = document.getElementById('confirm-password');

    // 1. Lấy token (mã) từ đường dẫn URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        messageEl.style.color = 'red';
        messageEl.textContent = 'Lỗi: Token không hợp lệ. Vui lòng thử lại.';
    }

    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 2. Kiểm tra 2 mật khẩu có khớp không
        if (passwordEl.value !== confirmPasswordEl.value) {
            messageEl.style.color = 'red';
            messageEl.textContent = 'Mật khẩu không khớp. Vui lòng nhập lại.';
            return;
        }

        if (!token) {
            messageEl.style.color = 'red';
            messageEl.textContent = 'Lỗi: Token bị thiếu. Vui lòng yêu cầu link mới.';
            return;
        }

        messageEl.style.color = 'gray';
        messageEl.textContent = 'Đang lưu...';

        try {
            // 3. Gửi mật khẩu mới và token lên server
            const response = await fetch('/api/auth/reset_pass', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    newPassword: passwordEl.value,
                    token: token
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message);
            }

            messageEl.style.color = 'green';
            messageEl.textContent = data.message;

            // 4. Chuyển về trang đăng nhập
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);

        } catch (err) {
            messageEl.style.color = 'red';
            messageEl.textContent = err.message || 'Lỗi không xác định.';
        }
    });
});