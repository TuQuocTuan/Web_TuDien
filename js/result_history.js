document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('history-table-body');
    const token = localStorage.getItem('token');
    const clearBtn = document.querySelector('.clear-history-btn');

    // === [MỚI] CÁC ELEMENT BỘ LỌC ===
    const btnAll = document.getElementById('btn-filter-all');
    const btnToday = document.getElementById('btn-filter-today');
    const datePicker = document.getElementById('date-picker');

    // Biến lưu trạng thái lọc hiện tại
    let currentFilterMode = 'all'; // 'all', 'today', hoặc 'date'
    let selectedDateValue = '';    // Lưu giá trị ngày nếu mode là 'date'

    // Biến toàn cục để lưu dữ liệu lịch sử tải về
    let currentHistoryData = [];

    // Các element của Modal
    const modal = document.getElementById('review-modal');
    const modalContent = document.getElementById('modal-review-content');
    const closeModalElements = document.querySelectorAll('.close-btn, .btn-close-modal');

    // ==========================================
    // 1. XỬ LÝ SỰ KIỆN BỘ LỌC (LOGIC MỚI)
    // ==========================================

    // Khi bấm "Tất cả"
    if (btnAll) {
        btnAll.addEventListener('click', () => {
            setActiveFilter('all');
            datePicker.value = ''; // Reset ô ngày
            fetchHistory();
        });
    }

    // Khi bấm "Hôm nay"
    if (btnToday) {
        btnToday.addEventListener('click', () => {
            setActiveFilter('today');
            datePicker.value = ''; // Reset ô ngày
            fetchHistory();
        });
    }

    // Khi người dùng chọn ngày trong ô input
    if (datePicker) {
        datePicker.addEventListener('change', (e) => {
            if (e.target.value) {
                selectedDateValue = e.target.value; // Format: YYYY-MM-DD
                setActiveFilter('date');
                fetchHistory();
            } else {
                // Nếu người dùng xóa ngày -> Về mặc định là Tất cả
                btnAll.click();
            }
        });
    }

    // Hàm phụ trợ: Đổi màu nút active
    function setActiveFilter(mode) {
        currentFilterMode = mode;

        // Reset class
        btnAll.classList.remove('active-filter');
        btnToday.classList.remove('active-filter');
        datePicker.style.border = '1px solid #ced4da';

        // Add class active
        if (mode === 'all') btnAll.classList.add('active-filter');
        if (mode === 'today') btnToday.classList.add('active-filter');
        if (mode === 'date') datePicker.style.border = '2px solid #007bff';
    }

    // ==========================================
    // 2. HÀM GỌI API (ĐÃ SỬA URL)
    // ==========================================
    async function fetchHistory() {
        if (!token) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Bạn cần đăng nhập để xem lịch sử.</td></tr>';
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">Đang tải lịch sử...</td></tr>';

        try {
            // XÂY DỰNG URL
            let url = `/api/quiz/history?type=${currentFilterMode}`;

            if (currentFilterMode === 'date' && selectedDateValue) {
                url += `&date=${selectedDateValue}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Không thể tải lịch sử');

            const results = await response.json();

            // --- [SỬA ĐOẠN NÀY] ---
            // Đảm bảo results luôn là một mảng (Array). 
            // Nếu API trả về null hoặc undefined thì gán bằng []
            const safeResults = Array.isArray(results) ? results : [];

            currentHistoryData = safeResults;
            renderHistory(safeResults);
            // -----------------------

        } catch (err) {
            console.error(err);
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">${err.message}</td></tr>`;
        }
    }

    // ==========================================
    // 3. HÀM "Vẽ" BẢNG (GIỮ NGUYÊN)
    // ==========================================
    function renderHistory(results) {
        // Xóa nội dung cũ (loading...)
        tableBody.innerHTML = '';

        // Kiểm tra nếu mảng rỗng hoặc không tồn tại
        if (!results || results.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 30px; color: #666;">
                        <i class="fas fa-search" style="font-size: 24px; margin-bottom: 10px; color: #ccc; display: block;"></i>
                        Không tìm thấy lịch sử làm bài nào trong thời gian này.
                    </td>
                </tr>
            `;
            return;
        }

        // Nếu có dữ liệu thì vẽ bảng như bình thường
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
                <td data-label="Điểm số" class="${scoreClass}">
                    ${score}
                </td>
                <td style="text-align: center;">
                    <button class="btn-view-detail" data-index="${index}">
                        <i class="fas fa-eye"></i> Xem
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Gắn lại sự kiện cho nút Xem
        document.querySelectorAll('.btn-view-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.target.closest('button').getAttribute('data-index');
                if (currentHistoryData[index]) {
                    openReviewModal(currentHistoryData[index]);
                }
            });
        });
    }

    // ==========================================
    // 4. MODAL & CÁC CHỨC NĂNG KHÁC (GIỮ NGUYÊN)
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
                        <div class="review-question">
                            <strong>Câu ${i + 1}:</strong> ${q.questionText || q.question}
                        </div>
                        <div class="review-options">
                            <div class="review-answer ${isCorrect ? 'correct' : 'wrong'}">
                                Bạn chọn: <strong>${userAns}</strong>
                                ${isCorrect ? '<i class="fas fa-check"></i>' : '<i class="fas fa-times"></i>'}
                            </div>
                            ${!isCorrect ? `
                                <div class="review-answer correct">
                                    Đáp án đúng: <strong>${correctAns}</strong> <i class="fas fa-check"></i>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<p style="text-align:center; color:#666;">Không có dữ liệu chi tiết từng câu hỏi cho bài thi này.</p>`;
        }

        modalContent.innerHTML = html;
        modal.style.display = "block";
    }

    closeModalElements.forEach(el => {
        el.addEventListener('click', () => modal.style.display = "none");
    });

    window.addEventListener('click', (event) => {
        if (event.target == modal) modal.style.display = "none";
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            const isConfirmed = confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ lịch sử không?');
            if (isConfirmed) {
                try {
                    clearBtn.textContent = 'Đang xóa...';
                    clearBtn.disabled = true;
                    const response = await fetch('/api/quiz/history', {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.message);
                    alert(data.message);

                    // Reset về "Tất cả" sau khi xóa
                    btnAll.click();

                } catch (err) {
                    alert('Lỗi: ' + err.message);
                } finally {
                    clearBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Xóa lịch sử';
                    clearBtn.disabled = false;
                }
            }
        });
    }

    // Chạy lần đầu (mặc định là Tất cả)
    fetchHistory();
});