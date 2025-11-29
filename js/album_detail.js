document.addEventListener('DOMContentLoaded', async () => {
    // === 1. KHỞI TẠO & LẤY PARAM ===
    const urlParams = new URLSearchParams(window.location.search);
    const albumId = urlParams.get('albumId');
    const token = localStorage.getItem('token'); // Kiểm tra lại key token của bạn

    if (!albumId || !token) {
        alert('Vui lòng đăng nhập và chọn bộ từ vựng hợp lệ.');
        window.location.href = 'album.html';
        return;
    }

    // === 2. BIẾN TOÀN CỤC ĐỂ LƯU DỮ LIỆU ===
    let originalWords = []; // Lưu danh sách gốc từ server
    let displayedWords = []; // Danh sách đang hiển thị (sau khi lọc/sort)

    // === 3. LẤY DOM ELEMENTS ===
    const titleEl = document.getElementById('album-title');
    const countEl = document.getElementById('word-count');
    const listContainer = document.getElementById('vocab-list-container');
    const practiceLink = document.getElementById('practice-link');
    const sortSelect = document.getElementById('sort-select');
    const filterRadios = document.querySelectorAll('.filter-radio'); // Các nút radio bên sidebar

    // === 4. GỌI API LẤY DỮ LIỆU ===
    try {
        const response = await fetch(`http://localhost:3000/api/albums/${albumId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.message);

        // Cập nhật thông tin Header
        titleEl.textContent = data.title;
        countEl.textContent = data.words ? data.words.length : 0;
        practiceLink.href = `practice.html?mode=ai&albumId=${data._id}`;

        // Lưu dữ liệu vào biến toàn cục
        originalWords = data.words || [];
        displayedWords = [...originalWords]; // Copy ra để xử lý

        // Sắp xếp mặc định A-Z và hiển thị
        handleSortAndFilter();

    } catch (err) {
        listContainer.innerHTML = `<p style="color:red">Lỗi: ${err.message}</p>`;
    }

    // === 5. XỬ LÝ LỌC & SẮP XẾP (CLIENT-SIDE) ===

    // Sự kiện khi đổi kiểu sắp xếp
    sortSelect.addEventListener('change', handleSortAndFilter);

    // Sự kiện khi bấm Sidebar (Lọc loại từ)
    filterRadios.forEach(radio => {
        radio.addEventListener('change', handleSortAndFilter);
    });

    function handleSortAndFilter() {
        // A. LỌC (FILTER)
        // Lấy giá trị radio đang được check
        const selectedType = document.querySelector('input[name="filter-type"]:checked').value;

        if (selectedType === 'all') {
            displayedWords = [...originalWords];
        } else {
            // Lọc theo loại từ (kiểm tra field 'type' trong DB của bạn)
            displayedWords = originalWords.filter(w =>
                w.type && w.type.toLowerCase().includes(selectedType.toLowerCase())
            );
        }

        // B. SẮP XẾP (SORT)
        const sortValue = sortSelect.value;
        displayedWords.sort((a, b) => {
            const wordA = a.word.toLowerCase();
            const wordB = b.word.toLowerCase();
            if (sortValue === 'alphabetical_asc') return wordA.localeCompare(wordB);
            if (sortValue === 'alphabetical_desc') return wordB.localeCompare(wordA);
            return 0;
        });

        // C. VẼ LẠI GIAO DIỆN
        renderList(displayedWords);
    }

    // === 6. HÀM VẼ GIAO DIỆN (GIỐNG WORD LIST) ===
    function renderList(words) {
        listContainer.innerHTML = '';

        if (words.length === 0) {
            listContainer.innerHTML = '<p class="empty-state">Không tìm thấy từ nào.</p>';
            return;
        }

        words.forEach(word => {
            // Tạo cấu trúc thẻ giống hệt bên trang Word List để ăn CSS
            const card = document.createElement('div');
            card.className = 'vocab-item'; // Class CSS của word_list.css (hoặc vocab-card tùy file css bạn)

            // Nếu bạn dùng word_list.css, cấu trúc thường là:
            // .vocab-item > .vocab-word, .vocab-meaning, .vocab-type...
            // Dưới đây là cấu trúc mẫu phổ biến, hãy chỉnh lại nếu CSS của bạn khác
            card.innerHTML = `
                <div class="vocab-content">
                    <h3 class="vocab-word">${word.word}</h3>
                    <span class="vocab-type">${word.type || '(Chưa rõ)'}</span>
                    <p class="vocab-meaning">${word.translation || word.meaning}</p>
                    ${word.pronunciation ? `<p class="vocab-pronun">${word.pronunciation}</p>` : ''}
                </div>
                <div class="vocab-actions">
                    <a href="word_detail.html?id=${word._id}" class="btn-detail">
                        <i class="fas fa-eye"></i>
                    </a>
                    </div>
            `;
            listContainer.appendChild(card);
        });
    }


    // === 6. HÀM VẼ GIAO DIỆN (GIỐNG HỆT ẢNH BẠN GỬI) ===
    function renderList(words) {
        listContainer.innerHTML = '';

        if (!words || words.length === 0) {
            listContainer.innerHTML = '<p class="empty-state">Bộ từ vựng này chưa có từ nào.</p>';
            return;
        }

        words.forEach(word => {
            const card = document.createElement('div');
            card.className = 'vocab-item';
            // Thêm ID cho thẻ div để lát nữa xóa cho dễ (ví dụ: word-item-65fd...)
            card.id = `word-item-${word._id}`;

            const typeBadge = word.type ? `<span class="badge-type">${word.type}</span>` : '';
            const meaning = word.translation || word.meaning || '';

            card.innerHTML = `
                <div class="vocab-main">
                    <a href="word_detail.html?id=${word._id}" class="vocab-word-link">${word.word}</a>
                </div>

                <div class="vocab-info-center">
                    ${typeBadge}
                    <span class="vocab-def">${meaning}</span>
                </div>

                <div class="vocab-actions-right">
                    <button class="btn-circle btn-delete" onclick="removeWordFromAlbum('${word._id}')" title="Xóa khỏi album">
                        <i class="fas fa-minus"></i>
                    </button>
                    
                    <button class="btn-circle" onclick="playAudio('${word.word}')" title="Nghe phát âm">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
            `;
            listContainer.appendChild(card);
        });
    }

    window.removeWordFromAlbum = async function (wordId) {
        // 1. Hỏi xác nhận cho chắc
        if (!confirm('Bạn có chắc muốn xóa từ này khỏi Album không?')) return;

        const albumId = new URLSearchParams(window.location.search).get('albumId');
        const token = localStorage.getItem('token');

        try {
            // 2. Gọi API Xóa (Method DELETE)
            const response = await fetch(`http://localhost:3000/api/albums/${albumId}/words/${wordId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                // 3. Xóa thành công -> Xóa thẻ div trên giao diện ngay lập tức
                const itemToRemove = document.getElementById(`word-item-${wordId}`);
                if (itemToRemove) {
                    itemToRemove.remove(); // Biến mất khỏi màn hình
                }

                // 4. Cập nhật lại số lượng từ trên header
                const countEl = document.getElementById('word-count');
                let currentCount = parseInt(countEl.innerText);
                countEl.innerText = Math.max(0, currentCount - 1);

                // alert('Đã xóa từ thành công!'); // Có thể bỏ nếu thấy phiền
            } else {
                alert(data.message || 'Lỗi khi xóa từ');
            }
        } catch (err) {
            console.error(err);
            alert('Lỗi kết nối server');
        }
    };

    // Hàm phụ trợ: Đọc từ vựng (Text-to-Speech)
    window.playAudio = function (text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US'; // Giọng Anh-Mỹ
        window.speechSynthesis.speak(utterance);
    };
});