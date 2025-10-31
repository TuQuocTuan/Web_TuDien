document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const authButtonsContainer = document.querySelector('.auth-buttons');

    const modalHTML = `
<div class="modal-overlay" id="auth-modal">
    <div class="modal-box">
        <h3>Bạn chưa đăng nhập</h3>
        <p>Bạn cần đăng nhập hoặc đăng ký để sử dụng chức năng này. Chuyển đến trang đăng nhập?</p>
        <div class="modal-buttons">
            <button class="modal-btn cancel" id="auth-modal-cancel">Hủy</button>
            <button class="modal-btn confirm" id="auth-modal-confirm">Đăng nhập</button>
        </div>
    </div>
</div>
`;

    // "Tiêm" HTML này vào cuối trang
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Lấy các phần tử của modal vừa tạo
    const authModal = document.getElementById('auth-modal');
    const authModalCancel = document.getElementById('auth-modal-cancel');
    const authModalConfirm = document.getElementById('auth-modal-confirm');

    // --- PHẦN 2: LOGIC HIỂN THỊ MODAL ---
    function showAuthModal() {
        if (authModal) {
            authModal.classList.add('show');
        }
    }
    function hideAuthModal() {
        if (authModal) {
            authModal.classList.remove('show');
        }
    }

    // Gắn sự kiện cho các nút trong modal
    if (authModalCancel) {
        authModalCancel.addEventListener('click', hideAuthModal);
    }
    if (authModalConfirm) {
        authModalConfirm.addEventListener('click', () => {
            window.location.href = 'login.html'; // Chuyển sang trang đăng nhập
        });
    }

    if (token && username) {
        // 1. NẾU ĐÃ ĐĂNG NHẬP:
        authButtonsContainer.innerHTML = ''; // Xóa nút cũ

        // 2. Tạo cấu trúc Dropdown mới
        const userMenuHTML = `
            <div class="user-menu-container">
                <button id="user-menu-btn" class="user-menu-btn">
                    Chào, ${username}!
                    <i class="fas fa-caret-down"></i>
                </button>
                <div id="user-dropdown" class="user-dropdown-content">
                    <a href="word_history.html">
                        <i class="fas fa-history"></i> Lịch sử tra từ
                    </a>
                    <a href="result_history.html">
                        <i class="fas fa-clipboard-list"></i> Lịch sử bài thi
                    </a>
                    <div class="dropdown-divider"></div>
                    <a href="#" id="logout-btn" class="logout-link">
                        <i class="fas fa-sign-out-alt"></i> Đăng xuất
                    </a>
                </div>
            </div>
        `;

        authButtonsContainer.innerHTML = userMenuHTML;

        // 3. Logic điều khiển Dropdown
        const menuButton = document.getElementById('user-menu-btn');
        const dropdown = document.getElementById('user-dropdown');

        menuButton.addEventListener('click', () => {
            dropdown.classList.toggle('show');
        });

        window.addEventListener('click', (event) => {
            if (menuButton && !menuButton.contains(event.target)) {
                if (dropdown.classList.contains('show')) {
                    dropdown.classList.remove('show');
                }
            }
        });

        // 4. Logic Đăng xuất
        const logoutButton = document.getElementById('logout-btn');
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            window.location.reload();
        });

    }
    else {
        // ===================================
        // 2. NẾU CHƯA ĐĂNG NHẬP (Code mới)
        // ===================================
        // Giữ nguyên 2 nút "Đăng nhập" / "Đăng ký"
        // Và tìm tất cả các link "riêng tư"
        const privateLinks = document.querySelectorAll('.private-link');

        const popupMessage = 'Bạn cần đăng nhập hoặc đăng ký để sử dụng chức năng này. Chuyển đến trang đăng nhập?';

        privateLinks.forEach(link => {
            // Gắn sự kiện "chặn"
            link.addEventListener('click', (e) => {
                // Ngăn trình duyệt chuyển trang
                e.preventDefault();

                // Hiển thị pop-up
                const userConfirmed = showAuthModal(); // Dùng 'confirm' để hỏi Yes/No

                // Nếu user nhấn "OK" (Yes)
                if (userConfirmed) {
                    window.location.href = 'login.html'; // Chuyển họ đến trang đăng nhập
                }
            });
        });
    }
});