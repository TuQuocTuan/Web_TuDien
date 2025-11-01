// Chờ cho toàn bộ trang HTML tải xong
document.addEventListener('DOMContentLoaded', () => {

    // === LẤY CÁC THÀNH PHẦN (ELEMENTS) ===
    const albumGrid = document.querySelector('.album-grid');
    const token = localStorage.getItem('token'); // Lấy token
    
    // Các thành phần của Modal
    const showModalBtn = document.getElementById('show-create-modal-btn');
    const modalOverlay = document.getElementById('create-album-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const createAlbumForm = document.getElementById('create-album-form');
    const modalErrorMsg = document.getElementById('modal-error-message');

    // === BIẾN MODAL XÓA ===
    const deleteModal = document.getElementById('delete-confirm-modal');
    const deleteModalMsg = document.getElementById('delete-confirm-message');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    // === THÊM MỚI: CÁC BIẾN MODAL SỬA ===
    const editModal = document.getElementById('edit-album-modal');
    const editForm = document.getElementById('edit-album-form');
    const editTitleInput = document.getElementById('edit-album-title');
    const editIdInput = document.getElementById('edit-album-id'); // Input ẩn
    const editErrorMsg = document.getElementById('edit-error-message');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    // === Biến tạm để lưu thông tin album sắp xóa ===
    let albumToDelete = {
        id: null,
        cardElement: null
    };

    // === KIỂM TRA ĐĂNG NHẬP ===
    if (!token) {
        albumGrid.innerHTML = '<p>Vui lòng <a href="login.html">đăng nhập</a> để xem bộ từ vựng.</p>';
        // Ẩn nút "Tạo bộ từ mới" nếu chưa đăng nhập
        if(showModalBtn) showModalBtn.style.display = 'none';
        return; 
    }

    // === GÁN SỰ KIỆN (EVENT LISTENERS) ===
    
    // 1. Nút "Tạo bộ từ mới" -> Mở Modal
    showModalBtn.addEventListener('click', () => {
        modalOverlay.style.display = 'flex';
    });

    // 2. Nút "Hủy" (X) trong Modal -> Đóng Modal
    closeModalBtn.addEventListener('click', () => {
        modalOverlay.style.display = 'none';
        resetModalForm();
    });

    // 3. Khi submit form trong Modal
    createAlbumForm.addEventListener('submit', handleCreateAlbum);

    // 4. Tải danh sách album ngay khi vào trang
    loadAlbums();

    // 5. Lắng nghe tất cả các cú click trên lưới (cho Xóa và Sửa)
    albumGrid.addEventListener('click', handleGridClick);

    // === SỰ KIỆN CHO MODAL XÓA ===
    // 6. Nút "Hủy" trên modal xóa
    cancelDeleteBtn.addEventListener('click', () => {
        deleteModal.style.display = 'none';
        albumToDelete = { id: null, cardElement: null }; // Reset
    });

    // 7. Nút "Xóa" (xác nhận) trên modal xóa
    confirmDeleteBtn.addEventListener('click', executeDelete);

    // 8. Nút "Hủy" trên modal sửa
    cancelEditBtn.addEventListener('click', () => {
        editModal.style.display = 'none';
        editErrorMsg.textContent = '';
        editForm.reset();
    });

    // 9. Khi submit form "Sửa"
    editForm.addEventListener('submit', handleUpdateAlbum);

    // === CÁC HÀM XỬ LÝ ===

    /**
     * Tải tất cả album từ API và hiển thị
     */
    async function loadAlbums() {
        try {
            const res = await fetch('/api/albums', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok) {
                renderAlbums(data.data, albumGrid);
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            albumGrid.innerHTML = `<p>Lỗi tải dữ liệu: ${err.message}</p>`;
        }
    }
    
    /**
     * Xử lý gửi form tạo album
     */
    async function handleCreateAlbum(e) {
        e.preventDefault(); 
        modalErrorMsg.textContent = ''; 

        // CHỈ LẤY TITLE
        const title = document.getElementById('modal-album-title').value;
        // (ĐÃ XÓA DÒNG LẤY DESCRIPTION)

        try {
            const res = await fetch('/api/albums', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                // CHỈ GỬI TITLE
                body: JSON.stringify({ title }) 
            });

            const data = await res.json();

            if (res.ok) {
                modalOverlay.style.display = 'none'; 
                resetModalForm();
                appendAlbumToGrid(data.data, albumGrid);
            } else {
                modalErrorMsg.textContent = data.message;
            }
        } catch (err) {
            modalErrorMsg.textContent = 'Lỗi kết nối. Vui lòng thử lại.';
        }
    }

    /**
     * Vẽ lại toàn bộ danh sách album
     */
    function renderAlbums(albums, gridElement) {
        gridElement.innerHTML = ''; // Xóa sạch lưới

        if (albums.length > 0) {
            albums.forEach(album => {
                appendAlbumToGrid(album, gridElement); // Thêm từng album
            });
        }

        // Thêm thẻ "Tạo bộ từ mới" (thẻ tĩnh) vào cuối
        const createCardHTML = `
            <div class="album-card create-card">
                <a href="#"> 
                    <i class="fas fa-plus"></i>
                    <span>Tạo bộ từ mới</span>
                </a>
            </div>
        `;
        gridElement.insertAdjacentHTML('beforeend', createCardHTML);

        // Gán sự kiện cho thẻ "Tạo mới" tĩnh này (vì nó vừa bị vẽ lại)
        const staticCreateBtn = gridElement.querySelector('.create-card a');
        if (staticCreateBtn) {
            staticCreateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                modalOverlay.style.display = 'flex';
            });
        }
    }

    /**
     * Thêm MỘT album vào lưới (chèn trước thẻ "Tạo mới")
     */
    function appendAlbumToGrid(album, gridElement) {
        const wordCount = album.words ? album.words.length : 0;
        
        const card = document.createElement('article');
        card.className = 'album-card';
        card.setAttribute('data-id', album._id);
        
        card.innerHTML = `
            <div class="card-content">
                <div class="card-title-container">
                    <h3 class="card-title">${album.title}</h3>
                    <i class="fas fa-pencil-alt edit-icon" title="Sửa tên"></i>
                </div>
                <p class="card-stats">
                    <i class="fas fa-list-ol"></i> ${wordCount} từ vựng
                </p>
            </div>
            <div class="card-actions">
                <div class="button-group">
                    <a href="album-detail.html?id=${album._id}" class="study-btn">Xem</a>
                    </div>
                <div class="action-links">
                    <a href="#" class="action-link delete" data-id="${album._id}">
                        <i class="fas fa-trash-alt"></i> Xóa
                    </a>
                </div>
            </div>
        `;
        
        // Chèn thẻ mới này vào *trước* thẻ "Tạo mới"
        const createCard = gridElement.querySelector('.create-card');
        if (createCard) {
            gridElement.insertBefore(card, createCard);
        } else {
            gridElement.appendChild(card);
        }
    }

    /**
     * Xóa trắng form trong modal
     */
    function resetModalForm() {
        createAlbumForm.reset(); // Cách reset form nhanh
        modalErrorMsg.textContent = '';
    }

    /**
     * Xử lý tất cả click trên lưới (Xóa và Sửa)
     */
    function handleGridClick(e) {
        // Kiểm tra xem có nhấn nút XÓA không
        const deleteButton = e.target.closest('.action-link.delete');
        if (deleteButton) {
            e.preventDefault(); 
            // Lấy thông tin
            const albumId = deleteButton.dataset.id;
            const albumCard = deleteButton.closest('.album-card');
            const albumTitle = albumCard.querySelector('.card-title').textContent;

            // Lưu thông tin vào biến tạm
            albumToDelete.id = albumId;
            albumToDelete.cardElement = albumCard;

            // Cập nhật text và hiển thị modal XÓA
            deleteModalMsg.textContent = `Bạn có chắc chắn muốn xóa bộ từ: "${albumTitle}" không?`;
            deleteModal.style.display = 'flex';
            return; // Dừng lại
        }

        // Kiểm tra xem có nhấn nút SỬA không
        const editButton = e.target.closest('.edit-icon');
        if (editButton) {
            e.preventDefault();
            const albumCard = editButton.closest('.album-card');
            const albumId = albumCard.dataset.id;
            const currentTitle = albumCard.querySelector('.card-title').textContent;

            // Điền thông tin vào modal SỬA
            editTitleInput.value = currentTitle;
            editIdInput.value = albumId; // Lưu ID vào input ẩn
            editErrorMsg.textContent = ''; // Xóa lỗi cũ
            
            // Hiển thị modal SỬA
            editModal.style.display = 'flex';
            editTitleInput.focus(); // Focus vào ô nhập liệu
            return; // Dừng lại
        }
    }
    
    /**
     * Hàm này thực thi việc xóa (được gọi bởi nút "Xóa" trên modal)
     */
    async function executeDelete() {
        const { id, cardElement } = albumToDelete;
        if (!id || !cardElement) return; // Không có gì để xóa

        try {
            const res = await fetch(`/api/albums/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}` 
                }
            });

            if (res.status === 204) {
                cardElement.remove(); // Xóa khỏi giao diện
            } else {
                const data = await res.json();
                throw new Error(data.message || 'Xóa thất bại');
            }
        } catch (err) {
            alert(`Có lỗi xảy ra: ${err.message}`);
        } finally {
            // Luôn ẩn modal và reset biến tạm sau khi xong
            deleteModal.style.display = 'none';
            albumToDelete = { id: null, cardElement: null };
        }
    }

    /**
     * Hàm này thực thi việc CẬP NHẬT (được gọi bởi form Sửa)
     */
    async function handleUpdateAlbum(e) {
        e.preventDefault(); // Ngăn reload
        editErrorMsg.textContent = '';

        const newTitle = editTitleInput.value;
        const albumId = editIdInput.value;

        try {
            const res = await fetch(`/api/albums/${albumId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title: newTitle })
            });

            const data = await res.json();

            if (res.ok) {
                // Cập nhật thành công!
                // 1. Tìm thẻ card trong DOM
                const cardToUpdate = albumGrid.querySelector(`.album-card[data-id="${albumId}"]`);
                if (cardToUpdate) {
                    // 2. Cập nhật tiêu đề
                    const titleElement = cardToUpdate.querySelector('.card-title');
                    if (titleElement) {
                        titleElement.textContent = data.data.title; // Lấy title mới nhất từ server
                    }
                }
                
                // 3. Ẩn modal và reset
                editModal.style.display = 'none';
                editForm.reset();
            } else {
                // Hiển thị lỗi
                editErrorMsg.textContent = data.message || 'Cập nhật thất bại';
            }
        } catch (err) {
            editErrorMsg.textContent = 'Lỗi kết nối. Vui lòng thử lại.';
        }
    }

});