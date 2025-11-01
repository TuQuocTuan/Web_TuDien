document.addEventListener('DOMContentLoaded', () => {
    const detailContainer = document.getElementById('word-detail-container');
    let currentWordId = null;

    // 1. Lấy tên từ từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const wordName = urlParams.get('word');
    const token = localStorage.getItem('token');

    // === LẤY CÁC PHẦN TỬ MODAL "THÊM TỪ" ===
    const addToAlbumModal = document.getElementById('add-to-album-modal');
    const albumSelectList = document.getElementById('album-select-list');
    const saveToAlbumBtn = document.getElementById('save-to-album-btn');
    const cancelAddBtn = document.getElementById('cancel-add-btn');
    const addToAlbumError = document.getElementById('add-to-album-error');

    if (!wordName) {
        detailContainer.innerHTML = '<h1>Lỗi</h1><p>Không có từ nào được chỉ định để tra cứu.</p>';
        return;
    }

    // 2. Hàm Fetch API
    async function fetchWordDetails() {
        try {
            const response = await fetch(`/api/words/${wordName}`);
            if (response.status === 404) {
                detailContainer.innerHTML = `<h1>Không tìm thấy</h1><p>Không tìm thấy từ vựng: <strong>${wordName}</strong> trong từ điển.</p>`;
                return;
            }
            if (!response.ok) throw new Error('Lỗi server');

            const word = await response.json();
            currentWordId = word._id;

            // 3. Vẽ HTML
            detailContainer.innerHTML = `
                <div class="word-header">
                    <div class="word-top-line">
                        <h1 class="word-title">${word.word}</h1>
                        <button class="audio-btn" aria-label="Nghe phát âm">
                            <i class="fas fa-volume-up"></i>
                        </button>
                    </div>
                    <span class="word-pronunciation">${word.pronunciation || 'N/A'}</span>
                    <span class="word-translation">${word.translation.split(';')[0]}</span>
                </div>

                <div class="word-actions">
                    <button class="add-to-album-btn" data-word-id="${word._id}">
                        <i class="fas fa-plus"></i> Thêm vào bộ từ
                    </button>
                </div>

                <div class="word-body">
                    <section class="definition-block">
                        <span class="word-type">${word.type || ''}</span>
                        <ol class="definition-list">
                            <li>
                                <p class="definition-vi-text">${word.translation}</p>
                                ${word.example_en ? `
                                <div class="example-group">
                                    <p class="example-en"><i>Ví dụ: "${word.example_en}"</i></p>
                                    <p class="example-vi"><i>(Dịch: ${word.example_vi || '...'})</i></p>
                                </div>
                                ` : ''}
                            </li>
                        </ol>
                    </section>

                    <section class="tag-section">
                        <h3>Tags (Thẻ)</h3>
                        <div class="tag-list" id="tag-list-container"></div>
                    </section>
                </div>
            `;

            renderTags(word.tags);

        } catch (err) {
            console.error('Lỗi khi tải chi tiết từ:', err);
            detailContainer.innerHTML = `<h1>Lỗi mạng</h1><p>Không thể kết nối đến server để tải từ.</p>`;
        }
    }

    // 5. Hàm vẽ tags
    function renderTags(tags) {
        const tagListContainer = document.getElementById('tag-list-container');
        if (!tagListContainer) return;

        tagListContainer.innerHTML = '';

        if (!tags || tags.length === 0) {
            tagListContainer.innerHTML = '<p>Chưa có tag nào.</p>';
            return;
        }

        tags.forEach(tag => {
            const tagElement = document.createElement('a');
            tagElement.className = 'tag-item';
            tagElement.href = `word_list.html?tag=${tag}`;
            tagElement.innerHTML = `
                        ${tag} 
                        <span class="delete-tag" data-tag-name="${tag}" title="Xóa tag này">×</span>
                    `;
            tagListContainer.appendChild(tagElement);
        });
    }

    async function handleDeleteTag(deleteButton) {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Vui lòng đăng nhập để xóa tag!');
            return;
        }

        const tagName = deleteButton.dataset.tagName;
        if (!tagName || !currentWordId) return;

        if (!confirm(`Bạn có chắc muốn xóa tag "${tagName}" không?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/words/${currentWordId}/tags`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ tagName: tagName })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            // Xóa thành công, xóa thẻ tag đó khỏi giao diện
            const tagItem = deleteButton.closest('.tag-item');
            if (tagItem) {
                tagItem.remove();
                // Kiểm tra nếu không còn tag nào
                const tagListContainer = document.getElementById('tag-list-container');
                if (tagListContainer && tagListContainer.children.length === 0) {
                    tagListContainer.innerHTML = '<p>Chưa có tag nào.</p>';
                }
            }

        } catch (err) {
            alert('Lỗi khi xóa tag: ' + err.message);
        }
    }

    // ==========================================
    // ===== 6. CÁC HÀM XỬ LÝ ALBUM =====
    // ==========================================

    async function loadAlbumsForModal() {
        if (!albumSelectList) return;
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
                        ${album.title} (${album.words.length})
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
                const saveButton = detailContainer.querySelector('.add-to-album-btn');
                if (saveButton) {
                    saveButton.innerHTML = '<i class="fas fa-check"></i> Đã thêm!';
                    saveButton.disabled = true;
                }
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            addToAlbumError.textContent = err.message;
        }
    }

    // 8. Bộ điều khiển sự kiện
    detailContainer.addEventListener('click', async (event) => {
        const audioButton = event.target.closest('.audio-btn');
        if (audioButton) {
            const wordItem = audioButton.closest('.word-header');
            const wordToSpeak = wordItem.querySelector('.word-title').innerText;
            if (wordToSpeak && 'speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(wordToSpeak);
                utterance.lang = 'en-US';
                utterance.rate = 0.9;
                window.speechSynthesis.speak(utterance);
            }
            return;
        }

        const saveButton = event.target.closest('.add-to-album-btn');
        if (saveButton && !saveButton.disabled) {
            if (!token) {
                alert('Vui lòng đăng nhập để sử dụng chức năng này.');
                window.location.href = 'login.html';
                return;
            }
            const wordId = saveButton.dataset.wordId;
            saveToAlbumBtn.dataset.wordId = wordId;

            await loadAlbumsForModal();
            addToAlbumModal.style.display = 'flex';
            return;
        }

        const deleteButton = event.target.closest('.delete-tag');
                if (deleteButton) {
                    event.preventDefault(); // Ngăn link (thẻ a) chuyển trang
                    handleDeleteTag(deleteButton);
                    return;
                }
    });

    if (cancelAddBtn) cancelAddBtn.addEventListener('click', () => addToAlbumModal.style.display = 'none');
    if (saveToAlbumBtn) saveToAlbumBtn.addEventListener('click', executeSaveToAlbum);

    // 10. Chạy
    fetchWordDetails();
});
