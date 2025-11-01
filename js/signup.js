document.addEventListener('DOMContentLoaded', () => {

    const registerForm = document.getElementById('register-form');
    const messageEl = document.getElementById('message');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // LẤY LẠI GIÁ TRỊ USERNAME
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        messageEl.style.color = 'gray';
        messageEl.textContent = 'Đang xử lý...';

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                // GỬI LẠI USERNAME
                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                messageEl.style.color = 'green';
                messageEl.textContent = data.message;
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
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