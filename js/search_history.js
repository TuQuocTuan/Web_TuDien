// File: js/search_history.js

document.addEventListener('DOMContentLoaded', async () => {
    const listContainer = document.getElementById('search-history-list'); 
    const datePicker = document.getElementById('date-picker'); // Lấy ô chọn ngày
    const filterRadios = document.getElementsByName('filter-date'); // Lấy các nút radio
    const token = localStorage.getItem('token');

    // 1. XỬ LÝ HEADER (Giữ nguyên như cũ)
    const authButtons = document.querySelector('.auth-buttons');
    if (token && authButtons) {
        const username = localStorage.getItem('username') || 'Người dùng';
        authButtons.innerHTML = `
            <span style="margin-right: 15px; font-weight: 500; color: #333;">Chào, ${username}</span>
            <a href="#" id="logout-btn" class="btn-login" style="background-color: #ff4d4f; border-color: #ff4d4f; color: white; padding: 5px 15px;">Đăng xuất</a>
        `;
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'login.html';
        });
    }

    if (!token) {
        if(listContainer) listContainer.innerHTML = '<p style="text-align:center;">Vui lòng đăng nhập.</p>';
        return;
    }

    // ============================================================
    // 2. HÀM TẢI LỊCH SỬ (Có tham số ngày)
    // ============================================================
    async function loadHistory(selectedDate = null) {
        listContainer.innerHTML = '<p style="text-align:center;">Đang tải...</p>';
        
        try {
            // Tạo URL: Nếu có ngày thì thêm ?date=..., không thì gọi bình thường
            let url = '/api/user/history';
            if (selectedDate) {
                url += `?date=${selectedDate}`;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                alert('Hết phiên đăng nhập.');
                window.location.href = 'login.html';
                return;
            }

            const resData = await response.json();
            renderHistory(resData);

        } catch (error) {
            console.error('Lỗi:', error);
            listContainer.innerHTML = '<p style="color:red; text-align:center;">Lỗi kết nối.</p>';
        }
    }

    // 3. HÀM VẼ GIAO DIỆN
    function renderHistory(resData) {
        const historyList = Array.isArray(resData) ? resData : (resData.data || []);

        if (historyList.length > 0) {
            const htmlContent = historyList.map(item => {
                if (!item.wordId) return ''; 
                const rawDate = item.actedAt || item.searchedAt || new Date(); 
                const dateObj = new Date(rawDate);
                const timeString = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                const dateString = dateObj.toLocaleDateString('vi-VN');

                return `
                <div class="word-item">
                    <div class="item-main">
                        <a href="word_detail.html?id=${item.wordId._id}" class="item-word">${item.wordId.word}</a>
                        <span class="item-translation">${item.wordId.translation}</span>
                    </div>
                    <div class="item-info">
                        <span class="item-date">${timeString}, ${dateString}</span>
                    </div>
                    <div class="item-actions">
                        <button class="action-btn audio" onclick="playAudio('${item.wordId.word}')"><i class="fas fa-volume-up"></i></button>
                    </div>
                </div>`;
            }).join('');
            listContainer.innerHTML = htmlContent;
        } else {
            listContainer.innerHTML = '<p style="text-align:center; padding:20px; color: #666;">Không có lịch sử nào trong ngày này.</p>';
        }
    }

    // ============================================================
    // 4. BẮT SỰ KIỆN CHỌN NGÀY & LỌC
    // ============================================================
    
    // 4.1. Khi người dùng chọn ngày ở ô input date (Lịch)
    if (datePicker) {
        datePicker.addEventListener('change', (e) => {
            const dateValue = e.target.value; // Dạng YYYY-MM-DD
            
            // Bỏ chọn các nút radio khác để tránh nhầm lẫn
            filterRadios.forEach(r => r.checked = false);
            
            loadHistory(dateValue);
        });
    }

    // 4.2. Khi người dùng bấm nút radio "Tất cả"
    const allRadio = document.getElementById('filter-all');
    if (allRadio) {
        allRadio.addEventListener('change', () => {
            if (datePicker) datePicker.value = ''; // Xóa ô ngày
            loadHistory(null); // Tải lại tất cả
        });
    }

    // 4.3. Khi người dùng bấm nút radio "Hôm nay" (ĐOẠN THÊM MỚI)
    const todayRadio = document.getElementById('filter-today');
    if (todayRadio) {
        todayRadio.addEventListener('change', () => {
            // Lấy ngày hiện tại
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            
            // Tạo chuỗi ngày YYYY-MM-DD
            const todayString = `${year}-${month}-${day}`;

            // Cập nhật ô chọn ngày cho người dùng thấy
            if (datePicker) datePicker.value = todayString;

            // Gọi hàm lọc
            loadHistory(todayString);
        });
    }

    // 5. CHẠY LẦN ĐẦU (Load tất cả)
    loadHistory(null);
});

// Hàm audio (để ngoài DOMContentLoaded cũng được hoặc trong đều OK)
function playAudio(text) {
    if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        window.speechSynthesis.speak(u);
    } else {
        alert('Trình duyệt không hỗ trợ phát âm.');
    }
}