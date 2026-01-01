document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('history-table-body');
    const token = localStorage.getItem('token');
    const filterRadios = document.querySelectorAll('.filter-sidebar input[name="filter-date"]');
    const clearBtn = document.querySelector('.clear-history-btn');

    // [MỚI] Biến toàn cục để lưu dữ liệu lịch sử tải về
    let currentHistoryData = [];

    // [MỚI] Các element của Modal
    const modal = document.getElementById('review-modal');
    const modalContent = document.getElementById('modal-review-content');
    const closeModalElements = document.querySelectorAll('.close-btn, .btn-close-modal');

    // 1. HÀM GỌI API
    async function fetchHistory() {
        if (!token) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Bạn cần đăng nhập để xem lịch sử.</td></tr>';
            return;
        }

        let selectedDuration = 'all';
        filterRadios.forEach(radio => {
            if (radio.checked) selectedDuration = radio.value;
        });

        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">Đang tải lịch sử...</td></tr>';
        
        try {
            const response = await fetch(`/api/quiz/history?duration=${selectedDuration}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Không thể tải lịch sử');
            
            const results = await response.json();
            
            // [MỚI] Lưu dữ liệu vào biến toàn cục để dùng cho Modal
            currentHistoryData = results; 

            renderHistory(results);

        } catch (err) {
            console.error(err);
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">${err.message}</td></tr>`;
        }
    }

    // 2. HÀM "Vẽ" BẢNG
    function renderHistory(results) {
        tableBody.innerHTML = '';
        
        if (!results || results.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Không tìm thấy kết quả nào.</td></tr>';
            return;
        }

        // [CẬP NHẬT] Thêm tham số index để xác định bài thi nào được click
        results.forEach((result, index) => {
            const row = document.createElement('tr');
            
            // Tính toán điểm số (đề phòng API trả về null)
            const score = result.score || 0;
            const total = result.totalQuestions || 10;
            const percent = Math.round((score / total) * 100);
            const scoreClass = percent >= 50 ? 'score passed' : 'score failed';
            
            const date = new Date(result.createdAt).toLocaleDateString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            // [CẬP NHẬT] Thêm cột nút "Xem" (cột thứ 4)
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

        // [MỚI] Gắn sự kiện click cho các nút "Xem" vừa tạo
        document.querySelectorAll('.btn-view-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Lấy index từ data-index để tìm bài thi tương ứng trong mảng currentHistoryData
                const index = e.target.closest('button').getAttribute('data-index');
                openReviewModal(currentHistoryData[index]);
            });
        });
    }

    // 3. [MỚI] HÀM MỞ MODAL VÀ HIỂN THỊ CHI TIẾT
    function openReviewModal(data) {
        if (!data) return;

        // Reset nội dung cũ
        modalContent.innerHTML = '';

        // Header của phần nội dung
        let html = `
            <div style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                <h3>${data.category || 'Chi tiết bài thi'}</h3>
                <p>Ngày làm: ${new Date(data.createdAt).toLocaleString('vi-VN')}</p>
                <p>Điểm số: <b>${data.score}</b></p>
            </div>
        `;

        // Kiểm tra xem dữ liệu có chứa chi tiết câu hỏi không (questions hoặc details)
        // LƯU Ý: Bạn cần đảm bảo API trả về mảng chi tiết câu hỏi (ví dụ: data.questions)
        const questionsList = data.questions || data.details || []; 

        if (questionsList.length > 0) {
            questionsList.forEach((q, i) => {
                // Logic kiểm tra đúng sai (tùy thuộc vào cấu trúc JSON của bạn)
                // Giả sử: q.userAnswer là đáp án user chọn, q.correctAnswer là đáp án đúng
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
        modal.style.display = "block"; // Hiện modal
    }

    // 4. [MỚI] SỰ KIỆN ĐÓNG MODAL
    closeModalElements.forEach(el => {
        el.addEventListener('click', () => {
            modal.style.display = "none";
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    });

    // 5. SỰ KIỆN FILTER (Giữ nguyên)
    filterRadios.forEach(radio => {
        radio.addEventListener('change', fetchHistory);
    });

    // 6. SỰ KIỆN XÓA LỊCH SỬ (Giữ nguyên logic của bạn)
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            const isConfirmed = confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ lịch sử làm bài không? Hành động này không thể hoàn tác.');

            if (isConfirmed) {
                try {
                    clearBtn.textContent = 'Đang xóa...';
                    clearBtn.disabled = true;

                    const response = await fetch('/api/quiz/history', {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    const data = await response.json();

                    if (!response.ok) throw new Error(data.message || 'Lỗi không xác định');

                    alert(data.message);
                    fetchHistory(); 

                } catch (err) {
                    alert('Lỗi: ' + err.message);
                } finally {
                    clearBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Xóa lịch sử';
                    clearBtn.disabled = false;
                }
            }
        });
    }

    // Chạy lần đầu
    fetchHistory();
});