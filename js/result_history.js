document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('history-table-body');
    const paginationContainer = document.getElementById('pagination'); // Element mới
    const token = localStorage.getItem('token');
    const clearBtn = document.querySelector('.clear-history-btn');

    // === CÁC ELEMENT BỘ LỌC ===
    const btnAll = document.getElementById('btn-filter-all');
    const btnToday = document.getElementById('btn-filter-today');
    const datePicker = document.getElementById('date-picker');

    // === BIẾN TRẠNG THÁI ===
    let currentFilterMode = 'all';
    let selectedDateValue = '';
    let currentPage = 1;       // Trang hiện tại
    const LIMIT = 5;          // Số dòng mỗi trang

    let currentHistoryData = [];

    // Modal elements
    const modal = document.getElementById('review-modal');
    const modalContent = document.getElementById('modal-review-content');
    const closeModalElements = document.querySelectorAll('.close-btn, .btn-close-modal');

    // ==========================================
    // 1. XỬ LÝ SỰ KIỆN BỘ LỌC
    // ==========================================
    if (btnAll) {
        btnAll.addEventListener('click', () => {
            setActiveFilter('all');
            datePicker.value = '';
            currentPage = 1; // Reset về trang 1 khi đổi bộ lọc
            fetchHistory();
        });
    }

    if (btnToday) {
        btnToday.addEventListener('click', () => {
            setActiveFilter('today');
            datePicker.value = '';
            currentPage = 1; // Reset về trang 1
            fetchHistory();
        });
    }

    if (datePicker) {
        datePicker.addEventListener('change', (e) => {
            if (e.target.value) {
                selectedDateValue = e.target.value;
                setActiveFilter('date');
                currentPage = 1; // Reset về trang 1
                fetchHistory();
            } else {
                btnAll.click();
            }
        });
    }

    function setActiveFilter(mode) {
        currentFilterMode = mode;
        btnAll.classList.remove('active-filter');
        btnToday.classList.remove('active-filter');
        datePicker.classList.remove('active-date'); // Xóa class css active cũ

        if (mode === 'all') btnAll.classList.add('active-filter');
        if (mode === 'today') btnToday.classList.add('active-filter');
        if (mode === 'date') datePicker.classList.add('active-date');
    }

    // ==========================================
    // 2. GỌI API (ĐÃ THÊM PHÂN TRANG)
    // ==========================================
    async function fetchHistory() {
        if (!token) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Bạn cần đăng nhập.</td></tr>';
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">Đang tải...</td></tr>';
        
        try {
            // Thêm params page và limit vào URL
            let url = `/api/quiz/history?type=${currentFilterMode}&page=${currentPage}&limit=${LIMIT}`;
            
            if (currentFilterMode === 'date' && selectedDateValue) {
                url += `&date=${selectedDateValue}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Không thể tải lịch sử');
            
            const data = await response.json();
            
            // Backend trả về: { data: [], totalPages: 5, currentPage: 1 }
            const results = data.data || []; 
            currentHistoryData = results; 
            
            renderHistory(results);
            renderPagination(data.totalPages, data.currentPage); // Vẽ phân trang

        } catch (err) {
            console.error(err);
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">${err.message}</td></tr>`;
            paginationContainer.innerHTML = ''; // Xóa phân trang nếu lỗi
        }
    }

    // ==========================================
    // 3. VẼ BẢNG
    // ==========================================
    function renderHistory(results) {
        tableBody.innerHTML = '';
        
        if (!results || results.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 30px; color: #666;">
                        <i class="fas fa-search" style="font-size: 24px; margin-bottom: 10px; color: #ccc; display: block;"></i>
                        Không tìm thấy kết quả.
                    </td>
                </tr>
            `;
            return;
        }

        results.forEach((result, index) => {
            const row = document.createElement('tr');
            
            const score = result.score || 0;
            const total = result.totalQuestions || 10;
            const percent = Math.round((score / total) * 100);
            const scoreClass = percent >= 50 ? 'score passed' : 'score failed';
            
            const date = new Date(result.createdAt).toLocaleDateString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            row.innerHTML = `
                <td data-label="Tên bài thi">${result.category || 'Bài tập trắc nghiệm'}</td>
                <td data-label="Ngày làm">${date}</td>
                <td data-label="Điểm số" class="${scoreClass}">${score}</td>
                <td style="text-align: center;">
                    <button class="btn-view-detail" data-index="${index}">
                        <i class="fas fa-eye"></i> Xem
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        document.querySelectorAll('.btn-view-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.target.closest('button').getAttribute('data-index');
                if (currentHistoryData[index]) openReviewModal(currentHistoryData[index]);
            });
        });
    }

    // ==========================================
    // 4. HÀM VẼ PHÂN TRANG (CHUẨN KHÔNG LỖI)
    // ==========================================
    function renderPagination(totalPages, page) {
        paginationContainer.innerHTML = '';
        
        let total = parseInt(totalPages) || 0;
        let current = parseInt(page) || 1;

        if (total <= 1) return; // Nếu chỉ có 1 trang thì ẩn đi

        // Nút Previous
        const prevBtn = createPageBtn('<', current - 1);
        if (current === 1) prevBtn.classList.add('disabled');
        paginationContainer.appendChild(prevBtn);

        // Logic hiển thị các số trang (1 ... 4 5 6 ... 10)
        const pagesToShow = new Set([1, total, current]);
        if (current > 1) pagesToShow.add(current - 1);
        if (current < total) pagesToShow.add(current + 1);
        if (current > 3) pagesToShow.add(current - 2);
        if (current < total - 2) pagesToShow.add(current + 2);

        const sortedPages = Array.from(pagesToShow).filter(p => p > 0 && p <= total).sort((a, b) => a - b);

        let lastPage = 0;
        sortedPages.forEach(p => {
            if (lastPage !== 0 && p - lastPage > 1) {
                paginationContainer.appendChild(createPageBtn('...', null, true));
            }
            paginationContainer.appendChild(createPageBtn(p, p, false, current));
            lastPage = p;
        });

        // Nút Next
        const nextBtn = createPageBtn('>', current + 1);
        if (current === total) nextBtn.classList.add('disabled');
        paginationContainer.appendChild(nextBtn);
    }

    function createPageBtn(text, pageNum, isDots = false, current = 0) {
        const btn = document.createElement('button');
        btn.innerHTML = text;
        btn.className = 'pagination-btn'; // Class để CSS

        if (isDots) {
            btn.disabled = true;
            btn.style.border = 'none';
            btn.style.background = 'transparent';
        } else {
            if (pageNum === current) btn.classList.add('active');
            if (!pageNum) btn.disabled = true;

            btn.addEventListener('click', () => {
                if (pageNum && !btn.classList.contains('disabled') && !btn.classList.contains('active')) {
                    currentPage = pageNum; // Cập nhật trang hiện tại
                    fetchHistory();        // Gọi lại API
                }
            });
        }
        return btn;
    }

    // ==========================================
    // 5. MODAL & DELETE (GIỮ NGUYÊN)
    // ==========================================
    function openReviewModal(data) {
        if (!data) return;
        modalContent.innerHTML = '';
        
        let html = `
            <div style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                <h3>${data.category || 'Chi tiết bài thi'}</h3>
                <p>Ngày làm: ${new Date(data.createdAt).toLocaleString('vi-VN')}</p>
                <p>Điểm số: <b>${data.score}</b></p>
            </div>
        `;
        const questionsList = data.questions || data.details || []; 
        if (questionsList.length > 0) {
            questionsList.forEach((q, i) => {
                const userAns = q.userAnswer || q.selectedAnswer || 'Chưa chọn';
                const correctAns = q.correctAnswer || q.rightAnswer;
                const isCorrect = userAns === correctAns;
                html += `
                    <div class="review-item">
                        <div class="review-question"><strong>Câu ${i + 1}:</strong> ${q.questionText || q.question}</div>
                        <div class="review-options">
                            <div class="review-answer ${isCorrect ? 'correct' : 'wrong'}">
                                Bạn chọn: <strong>${userAns}</strong> ${isCorrect ? '<i class="fas fa-check"></i>' : '<i class="fas fa-times"></i>'}
                            </div>
                            ${!isCorrect ? `<div class="review-answer correct">Đáp án đúng: <strong>${correctAns}</strong> <i class="fas fa-check"></i></div>` : ''}
                        </div>
                    </div>`;
            });
        } else {
            html += `<p style="text-align:center; color:#666;">Không có chi tiết câu hỏi.</p>`;
        }
        modalContent.innerHTML = html;
        modal.style.display = "block";
    }

    closeModalElements.forEach(el => el.addEventListener('click', () => modal.style.display = "none"));
    window.addEventListener('click', (event) => { if (event.target == modal) modal.style.display = "none"; });

    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            if (confirm('Xóa TOÀN BỘ lịch sử?')) {
                try {
                    await fetch('/api/quiz/history', { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                    alert('Đã xóa!');
                    btnAll.click();
                } catch (err) { alert(err.message); }
            }
        });
    }

    // Chạy lần đầu
    fetchHistory();
});