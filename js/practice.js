document.addEventListener('DOMContentLoaded', () => {
    // Lấy các element từ DOM
    const titleEl = document.getElementById('quiz-title');
    const questionTextEl = document.getElementById('question-text');
    const questionIpaEl = document.getElementById('question-ipa');
    const optionsGrid = document.getElementById('options-grid');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');
    const counterEl = document.getElementById('question-counter');
    const progressBar = document.getElementById('progress-bar');

    // [MỚI] Thêm element hiển thị giải thích (cần thêm thẻ này vào HTML nếu chưa có)
    // Nếu trong HTML không có div id='explanation-area' thì code sẽ tự tạo
    let explanationEl = document.getElementById('explanation-area');
    if (!explanationEl) {
        explanationEl = document.createElement('div');
        explanationEl.id = 'explanation-area';
        explanationEl.style.marginTop = '15px';
        explanationEl.style.padding = '10px';
        explanationEl.style.borderRadius = '8px';
        explanationEl.style.display = 'none'; // Ẩn mặc định
        // Chèn vào sau optionsGrid
        optionsGrid.parentNode.insertBefore(explanationEl, optionsGrid.nextSibling);
    }

    let quizQuestions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let quizTitle = "";

    // Biến lưu lịch sử làm bài
    let userAnswersLog = [];

    // --- 1. HÀM CHUẨN HÓA DỮ LIỆU (Được làm gọn và an toàn hơn) ---
    function normalizeQuestion(raw) {
        const q = {};
        q.raw = raw;
        q.text = raw.questionText || raw.question || raw.prompt || 'Câu hỏi chưa có nội dung';
        q.pronunciation = raw.pronunciation || raw.ipa || '';
        q.explanation = raw.explanation || raw.explain || raw.explanationText || ''; // Lấy giải thích

        const letters = ['A', 'B', 'C', 'D'];
        const opts = [];

        // Xử lý options: Đảm bảo options luôn là mảng object {key, text, isCorrect}
        let rawOptions = raw.options || raw.choices || raw.optionTexts || [];

        // Nếu rawOptions là mảng chuỗi (["Cat", "Dog"]) hoặc mảng object
        if (Array.isArray(rawOptions) && rawOptions.length > 0) {
            rawOptions.forEach((o, i) => {
                let key = letters[i] || String(i);
                let text = '';
                let isCorrect = false;

                if (typeof o === 'string') {
                    text = o;
                } else if (typeof o === 'object') {
                    text = o.text || o.option || o.optionText || String(o);
                    key = o.key ? String(o.key) : key;
                    // Kiểm tra cờ isCorrect ngay trong object option
                    if (o.isCorrect === true || o.isCorrect === 'true') isCorrect = true;
                }
                opts.push({ key, text, isCorrect });
            });
        } else {
            // Fallback nếu không có options
            for (let i = 0; i < 4; i++) opts.push({ key: letters[i], text: `Option ${letters[i]}`, isCorrect: false });
        }

        // Xử lý Answer Key (Đáp án đúng)
        let answerKey = null;
        if (raw.answer !== undefined && raw.answer !== null) {
            answerKey = String(raw.answer);
        } else if (raw.correctAnswerText) {
            const found = opts.find(o => o.text.trim() === String(raw.correctAnswerText).trim());
            if (found) answerKey = found.key;
        }

        // Đồng bộ lại cờ isCorrect trong mảng opts dựa trên answerKey
        if (answerKey) {
            opts.forEach(o => {
                // So sánh lỏng lẻo (vd: key="A" và answer="A", hoặc key="0" và answer=0)
                if (String(o.key) === String(answerKey)) o.isCorrect = true;
                else o.isCorrect = false;
            });
        } else {
            // Nếu không có answerKey, thử tìm xem có option nào isCorrect=true không để gán ngược lại answerKey
            const foundCorrect = opts.find(o => o.isCorrect);
            if (foundCorrect) answerKey = foundCorrect.key;
        }

        q.options = opts;
        q.answer = answerKey;
        return q;
    }

    // --- 2. START QUIZ ---
    async function startQuiz() {
        const urlParams = new URLSearchParams(window.location.search);
        const albumId = urlParams.get('albumId');
        const mode = urlParams.get('mode');
        const token = localStorage.getItem('token');

        if (!albumId) {
            alert('Không tìm thấy ID bộ từ vựng!');
            return;
        }

        let apiUrl = mode === 'ai'
            ? `/api/quiz/ai-album?albumId=${albumId}`
            : `/api/quiz/from-album?albumId=${albumId}`;

        if (mode === 'ai') {
            titleEl.textContent = 'Đang nhờ AI soạn đề...';
            questionTextEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI đang đọc bộ từ của bạn...';
        } else {
            titleEl.textContent = "Đang tải dữ liệu...";
        }

        try {
            const response = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Lỗi tải câu hỏi');

            const rawQuestions = data.questions || (Array.isArray(data) ? data : []);
            if (rawQuestions.length === 0) throw new Error("Không có câu hỏi nào.");

            quizQuestions = rawQuestions.map(normalizeQuestion);
            quizTitle = data.albumTitle || data.title || 'Bài luyện tập';

            titleEl.textContent = `Ôn tập: ${quizTitle}`;

            // Reset trạng thái
            currentQuestionIndex = 0;
            score = 0;
            userAnswersLog = [];

            renderQuestion();
        } catch (err) {
            console.error(err);
            questionTextEl.innerHTML = `<span style="color:red;">Lỗi: ${err.message}</span>`;
            titleEl.textContent = "Có lỗi xảy ra";
            optionsGrid.innerHTML = ''; // Xóa nút cũ nếu lỗi
            if (nextBtn) nextBtn.style.display = 'none';
        }
    }

    // --- 3. RENDER CÂU HỎI ---
    function renderQuestion() {
        const q = quizQuestions[currentQuestionIndex];
        if (!q) return;

        // Reset UI giải thích
        explanationEl.style.display = 'none';
        explanationEl.className = '';
        explanationEl.innerHTML = '';

        questionTextEl.textContent = q.text;
        questionIpaEl.textContent = q.pronunciation ? `/${q.pronunciation}/` : ''; // Thêm dấu // cho đẹp

        counterEl.textContent = `Câu ${currentQuestionIndex + 1} / ${quizQuestions.length}`;
        progressBar.style.width = `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%`;

        optionsGrid.innerHTML = '';
        optionsGrid.dataset.answered = 'false'; // Reset trạng thái đã trả lời

        q.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.type = 'button';
            // Lưu key vào dataset
            btn.dataset.key = opt.key;
            btn.textContent = `${opt.key}. ${opt.text}`;
            btn.addEventListener('click', () => onOptionClick(btn, q, opt));
            optionsGrid.appendChild(btn);
        });

        // Ẩn nút Next khi mới load câu hỏi
        if (nextBtn) {
            nextBtn.style.display = 'none';
            // Đổi text nút nếu là câu cuối
            if (currentQuestionIndex === quizQuestions.length - 1) {
                nextBtn.textContent = 'Hoàn thành';
            } else {
                nextBtn.textContent = 'Câu tiếp'; // Hoặc icon mũi tên
            }
        }
        if (submitBtn) submitBtn.style.display = 'none';
    }

    // --- 4. XỬ LÝ CHỌN ĐÁP ÁN ---
    function onOptionClick(selectedBtn, question, selectedOpt) {
        // Nếu đã trả lời rồi thì không cho click nữa
        if (optionsGrid.dataset.answered === 'true') return;

        // Đánh dấu đã trả lời
        optionsGrid.dataset.answered = 'true';

        // 1. Highlight nút được chọn
        selectedBtn.classList.add('selected');

        // 2. Kiểm tra đúng sai
        const isCorrect = selectedOpt.isCorrect;

        // 3. UI Feedback (Màu sắc)
        if (isCorrect) {
            selectedBtn.classList.add('correct');
            score++;
        } else {
            selectedBtn.classList.add('wrong');
            // Tìm nút đúng để bôi xanh
            const correctOpt = question.options.find(o => o.isCorrect);
            if (correctOpt) {
                // Tìm button trong DOM có data-key trùng với key đáp án đúng
                const correctBtn = Array.from(optionsGrid.children).find(b => String(b.dataset.key) === String(correctOpt.key));
                if (correctBtn) correctBtn.classList.add('correct');
            }
        }

        // 4. HIỂN THỊ GIẢI THÍCH (NEW)
        if (question.explanation) {
            explanationEl.style.display = 'block';
            explanationEl.style.backgroundColor = isCorrect ? '#e8f5e9' : '#ffebee'; // Xanh nhạt hoặc đỏ nhạt
            explanationEl.style.color = isCorrect ? '#2e7d32' : '#c62828';
            explanationEl.innerHTML = `<strong>Giải thích:</strong> ${question.explanation}`;
        }

        // 5. LOGGING
        let correctText = "Không xác định";
        const correctOptObj = question.options.find(o => o.isCorrect);
        if (correctOptObj) correctText = correctOptObj.text;

        userAnswersLog.push({
            questionText: question.text,
            userAnswer: selectedOpt.text,
            correctAnswer: correctText,
            isCorrect: isCorrect,
            questionId: question.raw.id || null // Lưu thêm ID nếu có
        });

        // 6. Hiện nút Next
        if (nextBtn) {
            nextBtn.style.display = 'inline-block';
            nextBtn.disabled = false;
        }
    }

    // --- 5. NÚT NEXT / SUBMIT ---
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentQuestionIndex < quizQuestions.length - 1) {
                currentQuestionIndex++;
                renderQuestion();
            } else {
                // Nếu là câu cuối thì nộp bài
                submitResults();
            }
        });
    }

    // --- 6. GỬI KẾT QUẢ ---
    async function submitResults() {
        // 1. Khóa giao diện để tránh bấm lung tung
        if (nextBtn) nextBtn.disabled = true;
        if (submitBtn) submitBtn.disabled = true;
        
        const allOpts = document.querySelectorAll('.option-btn');
        allOpts.forEach(b => b.disabled = true);

        // 2. Tính điểm
        const totalCount = quizQuestions.length;
        const finalScore = totalCount > 0 ? Math.round((score / totalCount) * 10) : 0;

        const token = localStorage.getItem('token');
        const urlParams = new URLSearchParams(window.location.search);

        // --- [QUAN TRỌNG] LƯU LOG CHI TIẾT VÀO LOCALSTORAGE ---
        // Phải lưu ở đây thì sang trang result mới có dữ liệu để hiện nút "Xem chi tiết"
        if (userAnswersLog && userAnswersLog.length > 0) {
            localStorage.setItem('quizResultDetails', JSON.stringify(userAnswersLog));
        } else {
            console.warn("Không có dữ liệu chi tiết để lưu");
        }

        // 3. Gửi kết quả lên Server (API)
        try {
            await fetch('/api/quiz/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    category: quizTitle,
                    score: finalScore,
                    totalQuestions: totalCount,
                    correctCount: score, // Gửi thêm số câu đúng cụ thể
                    questions: userAnswersLog
                })
            });
        } catch (err) {
            console.error('Lỗi lưu kết quả (không chặn chuyển trang):', err);
        }

        // 4. Tạo URL chuyển trang
        let redirectUrl = `result.html?correct=${score}&total=${totalCount}&score=${finalScore}`;
        
        const albumId = urlParams.get('albumId');
        const mode = urlParams.get('mode');

        if (albumId) redirectUrl += `&albumId=${albumId}`;
        if (mode) redirectUrl += `&mode=${mode}`;

        // 5. Chuyển hướng
        window.location.href = redirectUrl;
    }
    // Bắt đầu
    startQuiz();
});