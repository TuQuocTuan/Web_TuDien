document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('login-form');
    const messageEl = document.getElementById('message');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // SỬA LẠI: Lấy 'username' thay vì 'email'
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        messageEl.style.color = 'gray';
        messageEl.textContent = 'Đang kiểm tra...';

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                // SỬA LẠI: Gửi 'username' thay vì 'email'
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) { // 200 OK
                messageEl.style.color = 'green';
                messageEl.textContent = data.message;

                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.username);

                setTimeout(() => {
                    if (data.isNewbie === true) {
                        // Nếu là newbie -> điền khảo sát
                        window.location.href = 'khaosat.html';
                    } else {
                        // Nếu không -> về trang chủ
                        window.location.href = 'index.html';
                    }
                }, 1500);

            } else { // 400, 404, 500
                messageEl.style.color = 'red';
                messageEl.textContent = data.message;
            }

        } catch (err) {
            console.error('Lỗi Fetch:', err);
            messageEl.style.color = 'red';
            messageEl.textContent = 'Không thể kết nối. (Hãy kiểm tra F12 Console)';
        }
    });
});
