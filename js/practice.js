
document.addEventListener('DOMContentLoaded', () => {
    // Lấy các phần tử
    const titleEl = document.getElementById('quiz-title');
    const questionTextEl = document.getElementById('question-text');
    const hintEl = document.getElementById('question-hint');
    const answerInputEl = document.getElementById('answer-input');
    const checkBtn = document.getElementById('check-answer-btn');
    const feedbackZone = document.getElementById('feedback-zone');
    const counterEl = document.getElementById('question-counter');
    const progressBar = document.getElementById('progress-bar');
    const submitBtn = document.getElementById('submit-btn');

    let quizQuestions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let category = '';

    // 1. Hàm khởi động: Lấy dữ liệu từ API (Giữ nguyên)
    async function startQuiz() {
        // ... (Code startQuiz của bạn y hệt như cũ) ...
        const urlParams = new URLSearchParams(window.location.search);
        category = urlParams.get('category');
        const token = localStorage.getItem('token');
        if (!category) { /* ... */ }
        titleEl.textContent = `Quiz Chủ đề: ${category}`;
        try {
            const response = await fetch(`/api/quiz/start?category=${category}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) { const err = await response.json(); throw new Error(err.message); }
            quizQuestions = await response.json();
            if (quizQuestions.length === 0) { throw new Error('Không có đủ từ vựng để tạo bài quiz.'); }
            currentQuestionIndex = 0; score = 0;
            renderQuestion();
        } catch (err) {
            questionTextEl.textContent = `Lỗi: ${err.message}`;
        }
    }

    // 2. Hàm hiển thị câu hỏi (Giữ nguyên)
    function renderQuestion() {
        if (currentQuestionIndex >= quizQuestions.length) {
            showResults();
            return;
        }
        const question = quizQuestions[currentQuestionIndex];
        questionTextEl.textContent = question.questionText;
        hintEl.textContent = `(Gợi ý: Từ này dài ${question.answerLength} ký tự)`;
        answerInputEl.value = '';
        answerInputEl.disabled = false;
        checkBtn.textContent = 'Kiểm tra';
        checkBtn.disabled = false;
        feedbackZone.innerHTML = '';
        counterEl.textContent = `Câu ${currentQuestionIndex + 1} / ${quizQuestions.length}`;
        const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;
        progressBar.style.width = `${progress}%`;

        // Tự động focus vào ô input
        answerInputEl.focus();
    }

    // =================================
    // ===== 3. HÀM KIỂM TRA ĐÁP ÁN (ĐÃ SỬA) =====
    // =================================
    function checkAnswer() {
        const userAnswer = answerInputEl.value.trim();

        // ===== THÊM KIỂM TRA Ô RỖNG =====
        if (userAnswer.length === 0) {
            feedbackZone.innerHTML = '<p class="feedback-incorrect">Bạn chưa điền câu trả lời!</p>';
            return; // Dừng hàm, không cho "Kiểm tra"
        }
        // ==================================

        const correctAnswer = quizQuestions[currentQuestionIndex].answer;

        answerInputEl.disabled = true;
        checkBtn.textContent = 'Tiếp theo'; // Đổi nút

        let feedbackHTML = '';
        if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
            score++;
            feedbackHTML = `<p class="feedback-correct">Chính xác! <strong>${correctAnswer}</strong></p>`;
        } else {
            feedbackHTML = `
                        <p class="feedback-incorrect">Sai rồi!</p>
                        <p>Đáp án đúng là: <strong>${correctAnswer}</strong></p>
                        <p><em>(Nghĩa là: ${quizQuestions[currentQuestionIndex].translation})</em></p>
                    `;
        }
        feedbackZone.innerHTML = feedbackHTML;

        // Chuyển sang câu tiếp theo
        currentQuestionIndex++;
    }

    // 4. Hàm kết thúc (Giữ nguyên)
    function showResults() {
        // ... (Code showResults của bạn y hệt như cũ) ...
        questionTextEl.textContent = 'Bạn đã hoàn thành bài quiz!';
        answerInputEl.style.display = 'none';
        hintEl.style.display = 'none'; // Ẩn luôn gợi ý
        checkBtn.style.display = 'none';
        submitBtn.style.display = 'inline-block';
        const percent = Math.round((score / quizQuestions.length) * 100);
        feedbackZone.innerHTML = `
                    <h2>Kết quả: ${score} / ${quizQuestions.length} (${percent}%)</h2>
                    <p>Nhấn "Nộp bài" để lưu kết quả.</p>
                `;
    }

    // 5. Gắn sự kiện cho nút "Kiểm tra / Tiếp theo" (Giữ nguyên)
    checkBtn.addEventListener('click', () => {
        if (checkBtn.textContent === 'Kiểm tra') {
            checkAnswer();
        } else {
            renderQuestion();
        }
    });

    // 6. Gắn sự kiện Enter cho ô input (SỬA LẠI)
    answerInputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            // Chỉ kích hoạt nếu nút đang là "Kiểm tra" hoặc "Tiếp theo"
            checkBtn.click();
        }
    });

    // 7. Logic Nộp bài (Giữ nguyên)
    submitBtn.addEventListener('click', async (e) => {
        // ... (Code submit của bạn y hệt như cũ) ...
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
        const token = localStorage.getItem('token');
        try {
            const response = await fetch('/api/quiz/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    category: category,
                    score: score,
                    totalQuestions: quizQuestions.length
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            window.location.href = `result.html?score=${data.score}&total=${data.total}`;
        } catch (err) {
            alert('Lỗi khi lưu kết quả: ' + err.message);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Nộp bài';
        }
    });

    // 8. Chạy
    startQuiz();
});
