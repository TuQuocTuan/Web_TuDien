document.addEventListener('DOMContentLoaded', () => {
    // 1. Đọc điểm số từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const score = urlParams.get('score');
    const total = urlParams.get('total');
    const username = localStorage.getItem('username');

    // 2. Điền thông tin
    if (score !== null && total !== null) {
        const scoreNum = parseInt(score);
        const totalNum = parseInt(total);
        const percent = Math.round((scoreNum / totalNum) * 100);

        document.getElementById('username-display').textContent = username || 'bạn';
        document.getElementById('score-number').textContent = percent; // Hiển thị %
        document.getElementById('correct-count').textContent = scoreNum;
        document.getElementById('total-count').textContent = totalNum;
        document.getElementById('incorrect-count').textContent = totalNum - scoreNum;
    } else {
        // Xử lý nếu ai đó vào thẳng trang result.html
        document.querySelector('.result-container h1').textContent = 'Không có dữ liệu';
        document.getElementById('score-number').textContent = '?';
    }
});