        document.addEventListener('DOMContentLoaded', () => {
            const forgotForm = document.getElementById('forgot-form');
            const messageEl = document.getElementById('message');

            forgotForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;

                messageEl.style.color = 'gray';
                messageEl.textContent = 'Đang kiểm tra...';

                try {
                    const response = await fetch('/api/auth/forgot_pass', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: email })
                    });
                    
                    const data = await response.json();
                    
                    // Bất kể thành công hay thất bại, đều báo thành công
                    // (Để tránh lộ thông tin email nào đã đăng ký)
                    messageEl.style.color = 'green';
                    messageEl.textContent = data.message;

                } catch (err) {
                    messageEl.style.color = 'red';
                    messageEl.textContent = 'Không thể kết nối. Vui lòng thử lại.';
                }
            });
        });
