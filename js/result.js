// js/result.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. ĐỌC DỮ LIỆU TỪ URL (Do practice.js gửi sang)
    const urlParams = new URLSearchParams(window.location.search);
    
    // Lấy điểm số
    const correct = parseInt(urlParams.get('correct')) || 0;
    const total = parseInt(urlParams.get('total')) || 0;
    const score = urlParams.get('score') || 0; // Điểm thang 10
    const incorrect = total - correct;

    // Lấy thông tin để làm lại bài
    const albumId = urlParams.get('albumId');
    const mode = urlParams.get('mode');

    // 2. HIỂN THỊ LÊN MÀN HÌNH
    
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

    // 3. XỬ LÝ NÚT "THI LẠI" (RETRY)
    const retryBtn = document.querySelector('.retry-btn'); // Tìm class .retry-btn

    if (retryBtn) {
        if (albumId) {
            // Nếu có albumId, tạo link quay lại bài thi
            let practiceUrl = `practice.html?albumId=${albumId}`;
            if (mode) {
                practiceUrl += `&mode=${mode}`;
            }
            // Gán link vào nút
            retryBtn.href = practiceUrl;
        } else {
            // Nếu mất ID (do refresh hoặc lỗi), quay về danh sách bài tập
            retryBtn.href = 'practice_list.html';
            // Hoặc hiện thông báo lỗi nhẹ
            console.warn("Không tìm thấy albumId để thi lại");
        }
    }
});