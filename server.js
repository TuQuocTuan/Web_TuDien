// DO_AN/server.js

// 1. GỌI CÁC GÓI
require('dotenv').config();
const express = require('express');
const path = require('path');

// 2. KHỞI TẠO APP VÀ KẾT NỐI DB
const app = express();
const port = 3000;
require('./src/db/mongo.js'); // Kích hoạt kết nối DB

// 3. MIDDLEWARE (Xử lý dữ liệu JSON/Form)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. API ROUTES (Logic Backend)
const authRoutes = require('./src/routes/authRoutes.js');
app.use('/api/auth', authRoutes);

const userRoutes = require('./src/routes/userRoutes.js');
app.use('/api/user', userRoutes);

const wordRoutes = require('./src/routes/wordRoutes.js');
app.use('/api/words', wordRoutes); 

// 5. PHỤC VỤ FILE TĨNH (CSS, JS)
// (CSS và JS phải được phục vụ TRƯỚC các file HTML)
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// 6. PAGE ROUTES (Phục vụ file HTML)
// (Dòng này phải nằm SAU CÙNG)
app.use(express.static(path.join(__dirname, 'html')));

// 7. KHỞI ĐỘNG SERVER
app.listen(port, async () => { 
    console.log(`Server Wordee đang chạy tại http://localhost:${port}`);
    
    try {
        const open = (await import('open')).default; 
        open('http://localhost:3000/index.html'); // Mở trang chủ
    } catch (err) {
        console.error('Không thể tự động mở trình duyệt:', err.message);
    }
});