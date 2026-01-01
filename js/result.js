// js/result.js

document.addEventListener('DOMContentLoaded', () => {
    // ============================================================
    // 1. ĐỌC DỮ LIỆU TỪ URL
    // ============================================================
    const urlParams = new URLSearchParams(window.location.search);

    // Lấy điểm số
    const correct = parseInt(urlParams.get('correct')) || 0;
    const total = parseInt(urlParams.get('total')) || 0;
    const score = urlParams.get('score') || 0; // Điểm thang 10
    const incorrect = total - correct;

    // Lấy thông tin để làm lại bài
    const albumId = urlParams.get('albumId');
    const mode = urlParams.get('mode');

    // ============================================================
    // 2. HIỂN THỊ THÔNG TIN CƠ BẢN LÊN MÀN HÌNH
    // ============================================================

    // Tên user
    const username = localStorage.getItem('username') || 'Bạn';
    const userEl = document.getElementById('username-display');
    if (userEl) userEl.innerText = username;

    // Vòng tròn điểm
    const scoreEl = document.getElementById('score-number');
    if (scoreEl) scoreEl.innerText = score;

    // Số câu đúng
    const correctEl = document.getElementById('correct-count');
    if (correctEl) correctEl.innerText = correct;

    // Số câu sai
    const incorrectEl = document.getElementById('incorrect-count');
    if (incorrectEl) incorrectEl.innerText = incorrect;

    // Tổng số câu
    const totalEl = document.getElementById('total-count');
    if (totalEl) totalEl.innerText = total;

    // ============================================================
    // 3. XỬ LÝ NÚT "THI LẠI" (RETRY)
    // ============================================================
    const retryBtn = document.querySelector('.retry-btn'); 

    if (retryBtn) {
        if (albumId) {
            // Nếu có albumId, tạo link quay lại bài thi
            let practiceUrl = `practice.html?albumId=${albumId}`;
            if (mode) {
                practiceUrl += `&mode=${mode}`;
            }
            retryBtn.href = practiceUrl;
        } else {
            // Nếu mất ID, quay về danh sách
            retryBtn.href = 'practice_list.html';
        }
    }

    // ============================================================
    // 4. [MỚI] XỬ LÝ HIỂN THỊ CHI TIẾT (REVIEW)
    // ============================================================
    const toggleBtn = document.getElementById('toggle-details-btn');
    const detailsContainer = document.getElementById('details-container');

    // Lấy log trả lời từ LocalStorage (được lưu bên practice.js)
    const detailsData = JSON.parse(localStorage.getItem('quizResultDetails') || '[]');

    // Nếu không có dữ liệu log (hoặc mảng rỗng), ẩn nút xem chi tiết
    if (!detailsData || detailsData.length === 0) {
        if (toggleBtn) toggleBtn.style.display = 'none';
    } else {
        // Render danh sách câu hỏi ra HTML
        if (detailsContainer) {
            detailsContainer.innerHTML = detailsData.map((item, index) => {
                const isCorrect = item.isCorrect;
                // Class CSS tương ứng (xanh/đỏ)
                const statusClass = isCorrect ? 'is-correct' : 'is-wrong';
                // Icon tương ứng
                const icon = isCorrect 
                    ? '<i class="fas fa-check" style="color: #2e7d32"></i>' 
                    : '<i class="fas fa-times" style="color: #c62828"></i>';
                
                // HTML cho từng dòng
                return `
                    <div class="detail-item ${statusClass}">
                        <div class="detail-question">
                            Câu ${index + 1}: ${item.questionText} ${icon}
                        </div>
                        <div class="detail-answer user-ans">
                            Bạn chọn: <strong>${item.userAnswer}</strong>
                        </div>
                        ${!isCorrect ? `
                            <div class="detail-answer correct-ans">
                                Đáp án đúng: <strong>${item.correctAnswer}</strong>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        }
    }

    // Sự kiện Click nút "Xem chi tiết"
    if (toggleBtn && detailsContainer) {
        toggleBtn.addEventListener('click', () => {
            if (detailsContainer.style.display === 'none') {
                // Hiện lên
                detailsContainer.style.display = 'block';
                toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Ẩn chi tiết';
            } else {
                // Ẩn đi
                detailsContainer.style.display = 'none';
                toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Xem chi tiết';
            }
        });
    }
});