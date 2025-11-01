document.addEventListener('DOMContentLoaded', () => {
    const detailContainer = document.getElementById('word-detail-container');

    // 1. Lấy tên từ từ URL (ví dụ: ?word=Apple)
    const urlParams = new URLSearchParams(window.location.search);
    const wordName = urlParams.get('word');

    if (!wordName) {
        detailContainer.innerHTML = '<h1>Lỗi</h1><p>Không có từ nào được chỉ định để tra cứu.</p>';
        return;
    }

    // 2. Hàm Fetch API
    async function fetchWordDetails() {
        try {
            // Gọi API ta vừa tạo: /api/words/Apple
            const response = await fetch(`/api/words/${wordName}`);

            if (response.status === 404) {
                detailContainer.innerHTML = `<h1>Không tìm thấy</h1><p>Không tìm thấy từ vựng: <strong>${wordName}</strong> trong từ điển.</p>`;
                return;
            }
            if (!response.ok) {
                throw new Error('Lỗi server');
            }

            const word = await response.json(); // Lấy đối tượng từ vựng

            // 3. VẼ HTML (Sử dụng code layout cũ của bạn)
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
                            <span class="word-category">Chủ đề: ${word.category}</span>
                        </div>

                        <div class="word-body">
                            <section class="definition-block">
                                <span class="word-type">${word.type}</span>
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
                        </div>
                    `;

        } catch (err) {
            console.error('Lỗi khi tải chi tiết từ:', err);
            detailContainer.innerHTML = `<h1>Lỗi mạng</h1><p>Không thể kết nối đến server để tải từ.</p>`;
        }
    }

    // 4. Chạy hàm
    //THÊM MỚI: SỰ KIỆN PHÁT ÂM CHO CHI TIÉT TỪ
    detailContainer.addEventListener('click', (event) => {
        const audioButton = event.target.closest('.audio-btn');
        if (!audioButton)
            return;

        const wordItem = audioButton.closest('.word-header');
        const wordToSpeak = wordItem.querySelector('.word-title').innerText;

        if (wordToSpeak && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(wordToSpeak);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        }
    });

    fetchWordDetails();
});