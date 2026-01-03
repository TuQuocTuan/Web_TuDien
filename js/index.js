document.addEventListener('DOMContentLoaded', () => {

    // =================================
    // ===== PHẦN 1: LOGIC TÌM KIẾM / GỢI Ý =====
    // =================================

    const searchInput = document.getElementById('hero-search-input');
    const suggestionsBox = document.getElementById('suggestions-box');
    const searchButton = document.getElementById('hero-search-button');

    if (searchInput && suggestionsBox && searchButton) {

        let debounceTimer;

        // 1. KHI GÕ VÀO Ô TÌM KIẾM
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            clearTimeout(debounceTimer);

            // Nếu rỗng HOẶC đang gõ cú pháp [tag]: -> KHÔNG GỢI Ý
            if (query.length === 0 || query.startsWith('[')) {
                suggestionsBox.innerHTML = '';
                suggestionsBox.classList.remove('show');
                return;
            }

            debounceTimer = setTimeout(async () => {
                try {
                    const response = await fetch(`/api/words/suggest?q=${query}`);
                    if (!response.ok) return;
                    const suggestions = await response.json();
                    renderSuggestions(suggestions);
                } catch (err) {
                    console.error('Lỗi fetch gợi ý:', err);
                }
            }, 300);
        });

        // 2. HÀM VẼ GỢI Ý (CẬP NHẬT ĐỂ HIỂN THỊ ĐẸP HƠN)
        function renderSuggestions(suggestions) {
            suggestionsBox.innerHTML = '';
            if (suggestions.length === 0) {
                suggestionsBox.classList.remove('show');
                return;
            }

            suggestions.forEach(item => {
                const suggestionElement = document.createElement('a');
                
                // Xử lý nếu là TAG
                if (item.type === 'tag') {
                    suggestionElement.href = `word_list.html?tag=${encodeURIComponent(item.word.replace('#', ''))}`;
                    suggestionElement.className = 'suggestion-item tag-item';
                    suggestionElement.innerHTML = `<i class="fas fa-tag"></i> ${item.word}`;
                } 
                // Xử lý nếu là TỪ VỰNG
                else {
                    suggestionElement.href = `word_detail.html?word=${encodeURIComponent(item.word)}`;
                    suggestionElement.className = 'suggestion-item';
                    
                    // Hiển thị: Word (n) /IPA/ : Nghĩa
                    const typeHtml = item.type ? `<span style="color: #007bff; font-size: 0.9em; margin: 0 5px;">(${item.type})</span>` : '';
                    const ipaHtml = item.pronunciation ? `<span style="color: #666; font-size: 0.85em; margin-right: 5px;">${item.pronunciation}</span>` : '';
                    
                    suggestionElement.innerHTML = `
                        <strong>${item.word}</strong> ${typeHtml} ${ipaHtml}
                        <span style="color: #555; display:block; font-size: 0.9em;">${item.translation}</span>
                    `;
                }
                
                suggestionsBox.appendChild(suggestionElement);
            });
            suggestionsBox.classList.add('show');
        }

        // 3. XỬ LÝ NÚT "TRA CỨU"
        const handleSearch = () => {
            const query = searchInput.value.trim();
            if (!query) return;

            // Kiểm tra cú pháp tìm tag thủ công
            if (query.startsWith('#')) {
                const tagName = query.substring(1).trim();
                window.location.href = `word_list.html?tag=${encodeURIComponent(tagName)}`;
            } else {
                window.location.href = `word_list.html?search=${encodeURIComponent(query)}`;
            }
        };

        // Gắn sự kiện (cả click và Enter)
        searchButton.addEventListener('click', handleSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });

        // 4. ĐÓNG GỢI Ý KHI CLICK RA NGOÀI
        document.addEventListener('click', (e) => {
            if (e.target !== searchInput && e.target !== suggestionsBox) {
                suggestionsBox.classList.remove('show');
            }
        });
    }

    // =================================
    // ===== PHẦN 2: LOGIC TỪ VỰNG HÔM NAY (ĐÃ SỬA LỖI TOKEN) =====
    // =================================
    const token = localStorage.getItem('token');
    const ctaLoggedOut = document.getElementById('cta-logged-out');
    const ctaLoggedIn = document.getElementById('cta-logged-in');

    if (token) {
        // Đã đăng nhập -> Ẩn CTA đăng ký, Hiện lưới từ vựng
        if(ctaLoggedOut) ctaLoggedOut.style.display = 'none';
        if(ctaLoggedIn) ctaLoggedIn.style.display = 'block';
        fetchDailyWords(token);
    } else {
        // Chưa đăng nhập -> Hiện CTA đăng ký
        if(ctaLoggedOut) ctaLoggedOut.style.display = 'block';
        if(ctaLoggedIn) ctaLoggedIn.style.display = 'none';
    }

    async function fetchDailyWords(token) {
        const grid = document.getElementById('daily-words-grid');
        if (!grid) return;

        try {
            // --- SỬA LỖI Ở ĐÂY: THÊM HEADER AUTHENTICATION ---
            // Gọi API lấy từ gợi ý (recommendations) thay vì my-daily-words cũ nếu muốn dùng logic mới
            // Hoặc dùng route cũ nếu bạn chưa đổi tên route
            const response = await fetch('/api/words/recommendations', { 
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // <--- QUAN TRỌNG NHẤT
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Token hết hạn -> Đăng xuất
                    localStorage.removeItem('token');
                    window.location.reload();
                    return;
                }
                throw new Error('Lỗi tải dữ liệu');
            }

            const words = await response.json();
            renderDailyWords(words, grid);

        } catch (err) {
            console.error('Lỗi daily words:', err);
            grid.innerHTML = '<p style="text-align:center;">Không thể tải từ vựng gợi ý lúc này.</p>';
        }
    }

    function renderDailyWords(words, container) {
        container.innerHTML = '';
        
        if (!words || words.length === 0) {
            container.innerHTML = '<p>Chưa có từ vựng nào để gợi ý. Hãy thử tra cứu vài từ nhé!</p>';
            return;
        }

        words.forEach(word => {
            const card = document.createElement('div');
            card.className = 'word-card'; // Đảm bảo bạn có CSS cho class này
            
            // Logic click vào thẻ -> chuyển trang chi tiết
            card.onclick = () => {
                window.location.href = `word_detail.html?word=${encodeURIComponent(word.word)}`;
            };

            card.innerHTML = `
                <h3>${word.word}</h3>
                <p class="word-type">${word.type ? `(${word.type})` : ''}</p>
                <p class="word-mean">${word.translation}</p>
            `;
            container.appendChild(card);
        });
    }
});