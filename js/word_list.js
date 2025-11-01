document.addEventListener('DOMContentLoaded', () => {
    // Lấy các phần tử HTML
    const vocabListContainer = document.getElementById('vocab-list-container');
    const allFilterRadios = document.querySelectorAll('.filter-sidebar input[name="filter-type"]');
    const sortSelectEl = document.getElementById('sort-select');
    const searchInputEl = document.getElementById('thanhtimkiem');
    const paginationContainer = document.querySelector('.pagination');
    const filterTitleEl = document.getElementById('filter-title');
    const filterGroupContainer = document.getElementById('filter-group-container');
    const token = localStorage.getItem('token');

    // === LẤY CÁC PHẦN TỬ MODAL "THÊM TỪ" ===
    const addToAlbumModal = document.getElementById('add-to-album-modal');
    const albumSelectList = document.getElementById('album-select-list');
    const saveToAlbumBtn = document.getElementById('save-to-album-btn');
    const cancelAddBtn = document.getElementById('cancel-add-btn');
    const addToAlbumError = document.getElementById('add-to-album-error');

    // BẢNG DỊCH LOẠI TỪ
    const typeTranslationMap = {
        'danh từ': 'noun', 'động từ': 'verb', 'tính từ': 'adjective',
        'trạng từ': 'adverb', 'phó từ': 'adverb', 'giới từ': 'preposition',
        'mạo từ': 'article', 'thán từ': 'interjection'
    };

    // ĐỌC URL (NÂNG CẤP: Đọc cả 'search' và 'tag')
    const urlParams = new URLSearchParams(window.location.search);
    const searchFromURL = urlParams.get('search');
    const tagFromURL = urlParams.get('tag');

    if (searchFromURL) {
        searchInputEl.value = searchFromURL;
    }
    if (tagFromURL) {
        searchInputEl.value = `[tag]: ${tagFromURL}`;
        if (filterTitleEl) filterTitleEl.textContent = `Tag: "${tagFromURL}"`;
        if (searchInputEl) searchInputEl.disabled = true;
        if (sortSelectEl) sortSelectEl.disabled = true;
        if (filterGroupContainer) filterGroupContainer.style.display = 'none';
    }

    // HÀM 1: "Vẽ" HTML (ĐÃ LÀM SẠCH KÝ TỰ LẠ)
    function renderWords(words) {
        vocabListContainer.innerHTML = '';
        if (words.length === 0) {
            vocabListContainer.innerHTML = '<p style="padding: 1rem;">Không tìm thấy từ vựng nào.</p>';
            return;
        }
        words.forEach(word => {
            const wordItem = document.createElement('div');
            wordItem.className = 'vocab-item';
            let typeText = word.type || '';
            let typeClass = typeTranslationMap[typeText.toLowerCase()] || 'default';
            wordItem.innerHTML = `
                        <div class="item-main">
                            <a href="word_detail.html?word=${word.word}" class="item-word">${word.word}</a>
                            <span class="item-pronunciation">${word.pronunciation || ''}</span>
                        </div>
                        <div class="item-info">
                            <span class="item-type ${typeClass}">${typeText}</span>
                            <p class="item-definition">${word.translation}</p>
                        </div>
                        <div class="item-actions">
                            <button class="action-btn add" aria-label="Thêm vào bộ từ" data-word-id="${word._id}">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button class="action-btn audio" aria-label="Nghe" data-word="${word.word}">
                                <i class="fas fa-volume-up"></i>
                            </button>
                        </div>
                    `;
            vocabListContainer.appendChild(wordItem);
        });
    }

    // HÀM 2: VẼ PHÂN TRANG
    function renderPagination(totalPages, currentPage) {
        paginationContainer.innerHTML = '';
        if (totalPages <= 1) return;
        const prevButton = createPageLink('<i class="fas fa-angle-left"></i>', currentPage - 1);
        if (currentPage === 1) prevButton.classList.add('disabled');
        paginationContainer.appendChild(prevButton);
        const pagesToShow = new Set();
        pagesToShow.add(1); pagesToShow.add(totalPages); pagesToShow.add(currentPage);
        if (currentPage > 1) pagesToShow.add(currentPage - 1);
        if (currentPage < totalPages) pagesToShow.add(currentPage + 1);
        if (currentPage > 3) pagesToShow.add(currentPage - 2);
        if (currentPage < totalPages - 2) pagesToShow.add(currentPage + 2);
        const sortedPages = Array.from(pagesToShow).sort((a, b) => a - b);
        let lastPage = 0;
        sortedPages.forEach(page => {
            if (lastPage !== 0 && page - lastPage > 1) {
                paginationContainer.appendChild(createPageLink('...', null, true));
            }
            paginationContainer.appendChild(createPageLink(page, page, false, currentPage));
            lastPage = page;
        });
        const nextButton = createPageLink('<i class="fas fa-angle-right"></i>', currentPage + 1);
        if (currentPage === totalPages) nextButton.classList.add('disabled');
        paginationContainer.appendChild(nextButton);
    }

    // HÀM 3: HÀM TẠO NÚT
    function createPageLink(pageText, pageNumber, isDots = false, currentPage = 0) {
        const pageLink = document.createElement('a');
        pageLink.href = '#';
        pageLink.className = 'page-link';
        pageLink.innerHTML = pageText;
        if (isDots) {
            pageLink.classList.add('dots');
        } else {
            if (pageNumber === currentPage) {
                pageLink.classList.add('active');
            }
            pageLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (pageNumber && !pageLink.classList.contains('disabled')) {
                    fetchAndRenderWords(pageNumber);
                }
            });
        }
        return pageLink;
    }

    // (ĐÃ XÓA HÀM attachAudioListeners() VÌ DÙNG EVENT DELEGATION BÊN DƯỚI)

    // HÀM 4: LẤY DỮ LIỆU TỪ API (Hàm chính)
    async function fetchAndRenderWords(page = 1) {
        const queryParts = [];
        const currentParams = new URLSearchParams(window.location.search);
        const currentTag = currentParams.get('tag');
        const searchQuery = searchInputEl.value.trim();
        const tagSyntax = /\[tag\]:\s*(.*)/i;
        const searchMatch = searchQuery.match(tagSyntax);

        if (currentTag) {
            queryParts.push(`tag=${encodeURIComponent(currentTag)}`);
            queryParts.push(`page=${page}`);
        }
        else if (searchMatch && searchMatch[1]) {
            const tagName = searchMatch[1].trim();
            queryParts.push(`tag=${encodeURIComponent(tagName)}`);
            queryParts.push(`page=${page}`);
            if (filterTitleEl) filterTitleEl.textContent = `Tag: "${tagName}"`;
            if (sortSelectEl) sortSelectEl.disabled = true;
            if (filterGroupContainer) filterGroupContainer.style.display = 'none';
        }
        else {
            if (filterTitleEl) filterTitleEl.textContent = 'Bộ lọc';
            if (sortSelectEl) sortSelectEl.disabled = false;
            if (filterGroupContainer) filterGroupContainer.style.display = 'block';
            if (searchQuery) queryParts.push(`search=${encodeURIComponent(searchQuery)}`);
            let typeFilter = '';
            allFilterRadios.forEach(radio => {
                if (radio.checked && radio.value !== 'all') typeFilter = radio.value;
            });
            if (typeFilter) queryParts.push(`type=${typeFilter}`);
            queryParts.push(`sort=${sortSelectEl.value}`);
            queryParts.push(`page=${page}`);
        }

        let queryString = `?${queryParts.join('&')}`;

        // Gọi API
        try {
            vocabListContainer.innerHTML = '<p>Đang tải từ vựng...</p>';
            const response = await fetch(`/api/words${queryString}`);
            if (!response.ok) throw new Error('Lỗi mạng');
            const data = await response.json();
            renderWords(data.words);
            renderPagination(data.totalPages, data.currentPage);
            // (Không cần attachAudioListeners() vì đã dùng event delegation)
        } catch (err) {
            console.error('Lỗi khi tải từ:', err);
            vocabListContainer.innerHTML = '<p style="padding: 1rem; color: red;">Lỗi tải từ vựng.</p>';
        }
    }

    // === GẮN SỰ KIỆN (Listeners) ===
    if (!tagFromURL) {
        allFilterRadios.forEach(radio => {
            radio.addEventListener('change', () => fetchAndRenderWords(1));
        });
        sortSelectEl.addEventListener('change', () => fetchAndRenderWords(1));
        searchInputEl.addEventListener('input', () => {
            const query = searchInputEl.value.trim();
            if (!query.startsWith('[tag]:')) {
                fetchAndRenderWords(1);
            }
        });
        searchInputEl.addEventListener('change', () => {
            fetchAndRenderWords(1);
        });
    }

    // === GẮN SỰ KIỆN CHO NÚT "+" VÀ "LOA" (EVENT DELEGATION) ===
    vocabListContainer.addEventListener('click', handleVocabListClick);

    // === GẮN SỰ KIỆN CHO MODAL ===
    cancelAddBtn.addEventListener('click', () => addToAlbumModal.style.display = 'none');
    saveToAlbumBtn.addEventListener('click', executeSaveToAlbum);

    // Tải danh sách lần đầu (trang 1)
    fetchAndRenderWords(1);

    // === CÁC HÀM MỚI CHO CHỨC NĂNG "THÊM VÀO ALBUM" ===

    async function handleVocabListClick(e) {
        // 1. Xử lý nút Thêm (dấu +)
        const addButton = e.target.closest('.action-btn.add');
        if (addButton) {
            if (!token) {
                alert('Vui lòng đăng nhập để sử dụng chức năng này.');
                window.location.href = 'login.html';
                return;
            }
            const wordId = addButton.dataset.wordId;
            saveToAlbumBtn.dataset.wordId = wordId;

            await loadAlbumsForModal();
            addToAlbumModal.style.display = 'flex';
        }

        // 2. Xử lý nút Audio (loa)
        const audioButton = e.target.closest('.action-btn.audio');
        if (audioButton) {
            const word = audioButton.dataset.word;
            if (word) {
                const utterance = new SpeechSynthesisUtterance(word);
                utterance.lang = 'en-US';
                window.speechSynthesis.speak(utterance);
            }
        }
    }

    // === HÀM TẢI ALBUMS (ĐÃ SỬA SANG DROPDOWN) ===
    async function loadAlbumsForModal() {
        albumSelectList.innerHTML = '<p>Đang tải bộ từ vựng...</p>';
        addToAlbumError.textContent = '';
        saveToAlbumBtn.disabled = true;

        try {
            const res = await fetch('/api/albums', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            if (!data.data || data.results === 0) {
                albumSelectList.innerHTML = '<p>Bạn chưa có bộ từ nào. <a href="album.html" target="_blank">Tạo bộ từ mới?</a></p>';
            } else {
                const selectEl = document.createElement('select');
                selectEl.id = 'album-select-dropdown';
                selectEl.name = 'album-select';
                selectEl.className = 'album-select-dropdown';

                selectEl.innerHTML = data.data.map(album => `
                        <option value="${album._id}">
                            ${album.title} (${album.words.length} từ)
                        </option>
                    `).join('');

                albumSelectList.innerHTML = '';
                albumSelectList.appendChild(selectEl);

                saveToAlbumBtn.disabled = false;
            }
        } catch (err) {
            albumSelectList.innerHTML = `<p style="color: red;">Lỗi tải album: ${err.message}</p>`;
        }
    }

    // === HÀM LƯU VÀO ALBUM (ĐÃ SỬA SANG DROPDOWN) ===
    async function executeSaveToAlbum() {
        const wordId = saveToAlbumBtn.dataset.wordId;
        const selectedAlbumDropdown = albumSelectList.querySelector('#album-select-dropdown');

        if (!selectedAlbumDropdown) {
            addToAlbumError.textContent = 'Bạn chưa chọn bộ từ nào.';
            return;
        }

        const albumId = selectedAlbumDropdown.value;
        addToAlbumError.textContent = '';

        try {
            const res = await fetch(`/api/albums/${albumId}/words`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ wordId: wordId })
            });

            const data = await res.json();

            if (res.ok) {
                alert('Đã thêm từ vào bộ từ vựng thành công!');
                addToAlbumModal.style.display = 'none';
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            addToAlbumError.textContent = err.message;
        }
    }

});
