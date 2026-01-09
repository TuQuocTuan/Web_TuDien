// File: js/search_history.js

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Đã cập nhật code mới - Phiên bản có thông báo k có lịch sử"); // Dòng này để kiểm tra code mới nhận chưa

    const listContainer = document.getElementById('search-history-list'); 
    const paginationContainer = document.getElementById('pagination'); 
    const datePicker = document.getElementById('date-picker'); 
    const token = localStorage.getItem('token');

    // Nút bộ lọc
    const btnAll = document.getElementById('btn-filter-all');
    const btnToday = document.getElementById('btn-filter-today');

    // Biến quản lý
    let currentPage = 1;
    const LIMIT = 5; 
    let currentSelectedDate = null; // Biến quan trọng để biết đang chọn ngày nào

    // 1. XỬ LÝ HEADER
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
    // HÀM TIỆN ÍCH: Đổi màu nút (UX)
    // ============================================================
    function setActiveFilter(activeId) {
        if (btnAll) btnAll.classList.remove('active-filter');
        if (btnToday) btnToday.classList.remove('active-filter');
        
        if (activeId) {
            const el = document.getElementById(activeId);
            if (el) el.classList.add('active-filter');
        }
    }

    // ============================================================
    // 2. HÀM TẢI LỊCH SỬ
    // ============================================================
    async function loadHistory(selectedDate = null) {
        listContainer.innerHTML = '<p style="text-align:center;">Đang tải...</p>';
        if (paginationContainer) paginationContainer.innerHTML = '';

        try {
            let url = `/api/user/history?page=${currentPage}&limit=${LIMIT}`;
            
            // Cập nhật biến toàn cục để dùng lúc vẽ giao diện
            if (selectedDate) {
                url += `&date=${selectedDate}`;
                currentSelectedDate = selectedDate; 
            } else {
                currentSelectedDate = null;
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

            let historyList = [];
            let totalPages = 0;
            let current = 1;

            if (resData.data && Array.isArray(resData.data)) {
                historyList = resData.data;
                totalPages = resData.totalPages || 1;
                current = resData.currentPage || 1;
            } else if (Array.isArray(resData)) {
                historyList = resData;
            }

            renderHistory(historyList);
            renderPagination(totalPages, current);

        } catch (error) {
            console.error('Lỗi:', error);
            listContainer.innerHTML = '<p style="color:red; text-align:center;">Lỗi kết nối server.</p>';
        }
    }

    // ============================================================
    // 3. HÀM VẼ DANH SÁCH (ĐÃ CẬP NHẬT THÔNG BÁO)
    // ============================================================
    function renderHistory(historyList) {
        listContainer.innerHTML = '';

        if (historyList && historyList.length > 0) {
            const htmlContent = historyList.map(item => {
                const wordObj = item.wordId || {};
                if (!wordObj._id) return ''; 

                const rawDate = item.actedAt || item.searchedAt || item.createdAt || new Date(); 
                const dateObj = new Date(rawDate);
                const timeString = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                const dateString = dateObj.toLocaleDateString('vi-VN');

                return `
                <div class="word-item">
                    <div class="item-main">
                        <a href="word_detail.html?id=${wordObj._id}" class="item-word">${wordObj.word || 'Unknown'}</a>
                        <span class="item-translation">${wordObj.translation || ''}</span>
                    </div>
                    <div class="item-info">
                        <span class="item-date">${timeString}, ${dateString}</span>
                    </div>
                    <div class="item-actions">
                        <button class="action-btn audio" onclick="playAudio('${wordObj.word || ''}')"><i class="fas fa-volume-up"></i></button>
                    </div>
                </div>`;
            }).join('');
            listContainer.innerHTML = htmlContent;
        } else {
            // === PHẦN BẠN MUỐN SỬA NẰM Ở ĐÂY ===
            let msg = 'Chưa có lịch sử tra từ nào.';
            
            // Nếu đang lọc theo ngày thì báo rõ ngày đó
            if (currentSelectedDate) {
                // Đổi định dạng yyyy-mm-dd sang dd/mm/yyyy
                try {
                    const parts = currentSelectedDate.split('-');
                    const vnDate = `${parts[2]}/${parts[1]}/${parts[0]}`; 
                    msg = `Không có lịch sử tra cứu trong ngày <b>${vnDate}</b>.`;
                } catch(e) {
                    msg = `Không có lịch sử tra cứu trong ngày này.`;
                }
            }

            listContainer.innerHTML = `
                <div style="text-align:center; padding:40px; color: #666;">
                    <i class="fas fa-calendar-times" style="font-size: 40px; color:#e0e0e0; display:block; margin-bottom:15px;"></i>
                    <p style="font-size: 16px;">${msg}</p>
                </div>`;
        }
    }

    // 4. HÀM VẼ PHÂN TRANG
    function renderPagination(totalPages, page) {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';
        
        let total = parseInt(totalPages) || 0;
        let current = parseInt(page) || 1;

        if (total <= 1) return;

        const prevBtn = createPageBtn('<', current - 1);
        if (current === 1) prevBtn.classList.add('disabled');
        paginationContainer.appendChild(prevBtn);

        const pagesToShow = new Set([1, total, current]);
        if (current > 1) pagesToShow.add(current - 1);
        if (current < total) pagesToShow.add(current + 1);
        if (current > 3) pagesToShow.add(current - 2);
        if (current < total - 2) pagesToShow.add(current + 2);

        const sortedPages = Array.from(pagesToShow).filter(p => p > 0 && p <= total).sort((a, b) => a - b);

        let lastPage = 0;
        sortedPages.forEach(p => {
            if (lastPage !== 0 && p - lastPage > 1) {
                paginationContainer.appendChild(createPageBtn('...', null, true));
            }
            paginationContainer.appendChild(createPageBtn(p, p, false, current));
            lastPage = p;
        });

        const nextBtn = createPageBtn('>', current + 1);
        if (current === total) nextBtn.classList.add('disabled');
        paginationContainer.appendChild(nextBtn);
    }

    function createPageBtn(text, pageNum, isDots = false, current = 0) {
        const btn = document.createElement('button');
        btn.innerHTML = text;
        btn.className = 'pagination-btn'; 

        if (isDots) {
            btn.disabled = true;
            btn.style.border = 'none';
            btn.style.background = 'transparent';
        } else {
            if (pageNum === current) btn.classList.add('active');
            if (!pageNum) btn.disabled = true;

            btn.addEventListener('click', () => {
                if (pageNum && !btn.classList.contains('disabled') && !btn.classList.contains('active')) {
                    currentPage = pageNum; 
                    loadHistory(currentSelectedDate); 
                }
            });
        }
        return btn;
    }

    // ============================================================
    // 5. BẮT SỰ KIỆN
    // ============================================================
    
    // 5.1. Khi chọn ngày ở ô input date
    if (datePicker) {
        datePicker.addEventListener('change', (e) => {
            const dateValue = e.target.value; 
            currentPage = 1;
            setActiveFilter(null); 
            loadHistory(dateValue);
        });
    }

    // 5.2. Khi bấm nút "Tất cả"
    if (btnAll) {
        btnAll.addEventListener('click', () => { 
            if (datePicker) datePicker.value = ''; 
            currentPage = 1;
            
            setActiveFilter('btn-filter-all'); 
            loadHistory(null); 
        });
    }

    // 5.3. Khi bấm nút "Hôm nay"
    if (btnToday) {
        btnToday.addEventListener('click', () => { 
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayString = `${year}-${month}-${day}`;

            if (datePicker) datePicker.value = todayString;
            currentPage = 1;

            setActiveFilter('btn-filter-today'); 
            loadHistory(todayString);
        });
    }

    // 6. CHẠY LẦN ĐẦU
    setActiveFilter('btn-filter-all');
    loadHistory(null);
});

// Hàm audio global
function playAudio(text) {
    if (!text) return;
    if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        window.speechSynthesis.speak(u);
    } else {
        alert('Trình duyệt không hỗ trợ phát âm.');
    }
}