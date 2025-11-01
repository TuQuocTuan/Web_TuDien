document.addEventListener('DOMContentLoaded', () => {

    // =================================
    // ===== PHẦN 1: LOGIC TÌM KIẾM / GỢI Ý =====
    // =================================

    const searchInput = document.getElementById('hero-search-input');
    const suggestionsBox = document.getElementById('suggestions-box');
    const searchButton = document.getElementById('hero-search-button');

    if (!searchInput || !suggestionsBox || !searchButton) {
        console.error('Lỗi: Không tìm thấy các phần tử search của hero-section.');
        // Không return, để code daily-words vẫn chạy
    } else {

        let debounceTimer;

        // 1. KHI GÕ VÀO Ô TÌM KIẾM (Gợi ý - ĐÃ SỬA LỖI 500)
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

        // 2. HÀM VẼ GỢI Ý (Từ code của bạn)
        function renderSuggestions(suggestions) {
            suggestionsBox.innerHTML = '';
            if (suggestions.length === 0) {
                suggestionsBox.classList.remove('show');
                return;
            }
            suggestions.forEach(item => {
                const suggestionElement = document.createElement('a');
                suggestionElement.href = `word_detail.html?word=${encodeURIComponent(item.word)}`;
                suggestionElement.className = 'suggestion-item';
                suggestionElement.innerHTML = `${item.word} <span style="color: #666; font-size: 0.9em;">(${item.translation})</span>`;
                suggestionsBox.appendChild(suggestionElement);
            });
            suggestionsBox.classList.add('show');
        }

        // 3. XỬ LÝ NÚT "TRA CỨU" (ĐÃ NÂNG CẤP)
        const handleSearch = () => {
            const query = searchInput.value.trim();
            if (!query) return;

            const tagSyntax = /\[tag\]:\s*(.*)/i;
            const match = query.match(tagSyntax);

            if (match && match[1]) {
                const tagName = match[1].trim();
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

        // 4. ĐÓNG GỢI Ý KHI CLICK RA NGOÀI (Từ code của bạn)
        document.addEventListener('click', (e) => {
            if (e.target !== searchInput && e.target !== suggestionsBox) {
                suggestionsBox.classList.remove('show');
            }
        });
    }

    // =================================
    // ===== PHẦN 2: LOGIC TỪ VỰNG HÔM NAY =====
    // (Giữ nguyên code của bạn)
    // =================================
    const token = localStorage.getItem('token');
    const ctaLoggedOut = document.getElementById('cta-logged-out');
    const ctaLoggedIn = document.getElementById('cta-logged-in');

    if (token && ctaLoggedOut && ctaLoggedIn) {
        ctaLoggedOut.style.display = 'none';
        ctaLoggedIn.style.display = 'block';
        fetchDailyWords(token);
    }

    async function fetchDailyWords(token) {
        const grid = document.getElementById('daily-words-grid');
        try {
            const response = await fetch('/api/user/my-daily-words', {
                // ... (Code fetchDailyWords của bạn y hệt như cũ) ...
            });
            // ... (Phần còn lại của fetchDailyWords) ...
        } catch (err) {
            // ...
        }
    }
});
