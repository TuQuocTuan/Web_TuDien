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
                <h3 class="card-title">${album.title}</h3>
                <p class="card-stats">
                    <i class="fas fa-list-ol"></i> ${wordCount} từ vựng
                </p>
            </div>
            <div class="card-actions">
                <div class="button-group">
                    <a href="album-detail.html?id=${album._id}" class="study-btn">Xem</a>
                    <a href="edit-album.html?id=${album._id}" class="edit-btn">Sửa</a>
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
});