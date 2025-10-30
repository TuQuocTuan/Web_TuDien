document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const authButtonsContainer = document.querySelector('.auth-buttons');

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
    // 5. NẾU CHƯA ĐĂNG NHẬP:
    // Tự động giữ nguyên 2 nút "Đăng nhập" / "Đăng ký"
});