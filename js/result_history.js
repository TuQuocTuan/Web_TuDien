document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('history-table-body');
    const token = localStorage.getItem('token');
    const filterRadios = document.querySelectorAll('.filter-sidebar input[name="filter-date"]');

    // 1. LẤY NÚT XÓA (MỚI)
    const clearBtn = document.querySelector('.clear-history-btn');

    // 2. HÀM GỌI API (Giữ nguyên)
    async function fetchHistory() {
        if (!token) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Bạn cần đăng nhập để xem lịch sử.</td></tr>';
            return;
        }
        // ... (Code fetchHistory của bạn y hệt như cũ) ...
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
            renderHistory(results);
        } catch (err) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">${err.message}</td></tr>`;
        }
    }

    // 3. HÀM "Vẽ" BẢNG (Giữ nguyên)
    function renderHistory(results) {
        // ... (Code renderHistory của bạn y hệt như cũ) ...
        tableBody.innerHTML = '';
        if (results.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Không tìm thấy kết quả nào.</td></tr>';
            return;
        }
        results.forEach(result => {
            const row = document.createElement('tr');
            const percent = Math.round((result.score / result.totalQuestions) * 100);
            const scoreClass = percent >= 50 ? 'score passed' : 'score failed';
            const date = new Date(result.createdAt).toLocaleDateString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
            row.innerHTML = `
                        <td data-label="Tên bài thi">${result.category}</td>
                        <td data-label="Ngày làm">${date}</td>
                        <td data-label="Điểm số" class="${scoreClass}">
                            ${result.score} / ${result.totalQuestions}
                        </td>
                    `;
            tableBody.appendChild(row);
        });
    }

    // 4. GẮN SỰ KIỆN "NGHE" CHO FILTER (Giữ nguyên)
    filterRadios.forEach(radio => {
        radio.addEventListener('change', fetchHistory);
    });

    // =================================
    // ===== 5. GẮN SỰ KIỆN CHO NÚT XÓA (MỚI) =====
    // =================================
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            // A. Hỏi xác nhận
            const isConfirmed = confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ lịch sử làm bài không? Hành động này không thể hoàn tác.');

            if (isConfirmed) {
                try {
                    clearBtn.textContent = 'Đang xóa...';
                    clearBtn.disabled = true;

                    // B. Gọi API XÓA (DELETE)
                    const response = await fetch('/api/quiz/history', {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.message || 'Lỗi không xác định');
                    }

                    // C. Xóa thành công, tải lại bảng (bây giờ sẽ rỗng)
                    alert(data.message);
                    fetchHistory(); // Tải lại

                } catch (err) {
                    alert('Lỗi: ' + err.message);
                } finally {
                    clearBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Xóa lịch sử';
                    clearBtn.disabled = false;
                }
            }
        });
    }

    // 6. Chạy
    fetchHistory(); // Tải lần đầu
});