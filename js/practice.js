document.addEventListener('DOMContentLoaded', () => {
    const titleEl = document.getElementById('quiz-title');
    const questionTextEl = document.getElementById('question-text');
    const questionIpaEl = document.getElementById('question-ipa');
    const optionsGrid = document.getElementById('options-grid');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');
    const counterEl = document.getElementById('question-counter');
    const progressBar = document.getElementById('progress-bar');

    let quizQuestions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let quizTitle = "";

    // Normalize question from various possible server shapes into a consistent format
    function normalizeQuestion(raw) {
        const q = {};
        q.raw = raw;
        q.text = raw.questionText || raw.question || raw.question || raw.prompt || '';
        q.pronunciation = raw.pronunciation || raw.ipa || '';
        q.explanation = raw.explanation || raw.explain || raw.explaination || raw.explanationText || '';
        // Build options array: [{ key: 'A', text: '...', isCorrect: boolean }]
        const letters = ['A','B','C','D'];
        const opts = [];
        if (Array.isArray(raw.options) && raw.options.length) {
            raw.options.forEach((o, i) => {
                if (typeof o === 'string') {
                    opts.push({ key: letters[i] || String(i), text: o, isCorrect: false });
                } else if (typeof o === 'object') {
                    // common shapes: { key, text } or { text, isCorrect } or { optionText }
                    const text = o.text || o.option || o.optionText || String(o);
                    const key = o.key ?? letters[i] ?? String(i);
                    const isCorrect = !!(o.isCorrect || (raw.answer && String(raw.answer) === String(o.key)) || false);
                    opts.push({ key, text, isCorrect });
                }
            });
        } else if (raw.choices && Array.isArray(raw.choices)) {
            raw.choices.forEach((o,i) => {
                if (typeof o === 'string') opts.push({ key: letters[i]||String(i), text: o, isCorrect:false });
                else opts.push({ key: o.key ?? letters[i] ?? String(i), text: o.text || o, isCorrect: !!o.isCorrect });
            });
        }

        // If server provided correct answer key as raw.answer (e.g. 'A') or raw.correctAnswerText
        let answerKey = null;
        if (raw.answer) answerKey = String(raw.answer);
        else if (raw.correctAnswerText) {
            const found = opts.find(o => String(o.text).trim() === String(raw.correctAnswerText).trim());
            if (found) answerKey = found.key;
        } else {
            const found = opts.find(o => !!o.isCorrect);
            if (found) answerKey = found.key;
        }

        // If no options from server, but raw may be like local generator (question/options as objects)
        if (opts.length === 0 && raw.optionTexts && Array.isArray(raw.optionTexts)) {
            raw.optionTexts.forEach((t,i) => opts.push({ key: letters[i]||String(i), text: t, isCorrect: false }));
        }

        // Fallback: if still empty, create placeholders to avoid crash
        if (opts.length === 0) {
            for (let i=0;i<4;i++) opts.push({ key: letters[i], text: `Option ${letters[i]}`, isCorrect: false });
        }

        q.options = opts;
        q.answer = answerKey; // may be null
        return q;
    }

    // Start quiz: fetch questions
    async function startQuiz() {
        const urlParams = new URLSearchParams(window.location.search);
        const albumId = urlParams.get('albumId');
        const mode = urlParams.get('mode'); // 'ai' or undefined
        const token = localStorage.getItem('token');

        if (!albumId) {
            alert('Không tìm thấy ID bộ từ vựng!');
            return;
        }

        let apiUrl = '';
        if (mode === 'ai') {
            apiUrl = `/api/quiz/ai-album?albumId=${albumId}`;
            titleEl.textContent = 'Đang nhờ AI soạn đề (chờ vài giây nhé !!!)';
            questionTextEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI đang đọc bộ từ của bạn...';
        } else {
            apiUrl = `/api/quiz/from-album?albumId=${albumId}`;
            titleEl.textContent = "Đang tải bộ từ...";
        }

        try {
            const response = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || JSON.stringify(data));

            // Normalize questions
            const rawQuestions = data.questions || data || [];
            quizQuestions = rawQuestions.map(normalizeQuestion);
            quizTitle = data.albumTitle || data.title || 'Bài luyện';

            titleEl.textContent = `Ôn tập: ${quizTitle} ${mode === 'ai' ? '' : ''}`;
            currentQuestionIndex = 0;
            score = 0;
            renderQuestion();
        } catch (err) {
            questionTextEl.innerHTML = `<span style="color:red; font-size: 1.2rem">Lỗi: ${err.message}</span>`;
            titleEl.textContent = "Có lỗi xảy ra";
        }
    }

    // Render current question
    function renderQuestion() {
        const q = quizQuestions[currentQuestionIndex];
        if (!q) return;

        questionTextEl.textContent = q.text || '';
        questionIpaEl.textContent = q.pronunciation || '';

        counterEl.textContent = `Câu ${currentQuestionIndex + 1} / ${quizQuestions.length}`;
        progressBar.style.width = `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%`;

        optionsGrid.innerHTML = '';
        q.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.type = 'button';
            btn.dataset.key = opt.key;
            btn.textContent = `${opt.key}. ${opt.text}`;
            btn.addEventListener('click', () => onOptionClick(btn, q, opt));
            optionsGrid.appendChild(btn);
        });

        if (nextBtn) nextBtn.style.display = 'none';
        if (submitBtn) submitBtn.style.display = 'none'; // <--- QUAN TRỌNG: Luôn ẩn nút Nộp trước
    }

    // Handle option click
    function onOptionClick(btn, question, opt) {
        // prevent multiple clicks after answered
        if (optionsGrid.dataset.answered === 'true') return;

        // mark selection visually
        Array.from(optionsGrid.querySelectorAll('.option-btn')).forEach(b => b.classList.remove('selected', 'correct', 'wrong'));
        btn.classList.add('selected');

        // Determine correctness
        const correctKey = question.answer;
        let isCorrect = false;
        if (correctKey) {
            isCorrect = String(opt.key) === String(correctKey);
        } else {
            // fallback to opt.isCorrect flag
            isCorrect = !!opt.isCorrect;
        }

        // Show feedback
        btn.classList.add(isCorrect ? 'correct' : 'wrong');
        if (!isCorrect) {
            // highlight the correct button if known
            if (correctKey) {
                const correctBtn = optionsGrid.querySelector(`button[data-key="${String(correctKey)}"]`);
                if (correctBtn) correctBtn.classList.add('correct');
            } else {
                // try find option with isCorrect true
                const found = optionsGrid.querySelectorAll('.option-btn');
                for (const b of found) {
                    const k = b.dataset.key;
                    const optObj = question.options.find(o => String(o.key) === String(k));
                    if (optObj && optObj.isCorrect) { b.classList.add('correct'); break; }
                }
            }
        } else {
            score++;
        }

        // lock options
        optionsGrid.dataset.answered = 'true';
        // show next
        nextBtn.style.display = 'inline-block';
        nextBtn.disabled = false;
    }

    nextBtn.addEventListener('click', () => {
        // reset answered flag
        optionsGrid.dataset.answered = 'false';
        if (currentQuestionIndex < quizQuestions.length - 1) {
            currentQuestionIndex++;
            renderQuestion();
        } else {
            submitResults();
        }
    });

    async function submitResults() {
        // 1. Khóa giao diện
        nextBtn.disabled = true;
        submitBtn.disabled = true;
        optionsGrid.querySelectorAll('.option-btn').forEach(b => b.disabled = true);

        // 2. Lấy dữ liệu điểm số (Biến global score và quizQuestions)
        const correctCount = score;
        const totalCount = quizQuestions.length;
        // Điểm thang 10 (làm tròn)
        const finalScore = totalCount > 0 ? Math.round((correctCount / totalCount) * 10) : 0;

        // 3. Lấy thông tin Album/Mode từ URL HIỆN TẠI (để gửi sang trang kia)
        const currentUrlParams = new URLSearchParams(window.location.search);
        const currentAlbumId = currentUrlParams.get('albumId');
        const currentMode = currentUrlParams.get('mode');

        // 4. Lưu lịch sử lên Server (Giữ nguyên)
        const token = localStorage.getItem('token');
        try {
            await fetch('/api/quiz/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    category: quizTitle, 
                    score: finalScore, 
                    totalQuestions: totalCount 
                })
            });
        } catch (err) {
            console.error('Lỗi lưu history:', err);
        }

        // 5. CHUYỂN TRANG (QUAN TRỌNG NHẤT)
        // Tạo URL đích: result.html
        let redirectUrl = `result.html?correct=${correctCount}&total=${totalCount}&score=${finalScore}`;
        
        // Gắn thêm ID và Mode để trang kết quả biết đường quay lại
        if (currentAlbumId) {
            redirectUrl += `&albumId=${currentAlbumId}`;
        }
        if (currentMode) {
            redirectUrl += `&mode=${currentMode}`;
        }

        // Thực hiện chuyển trang
        window.location.href = redirectUrl;
    }

    startQuiz();
});