// DO_AN/server.js
require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());// để parse JSON body
app.use(express.urlencoded({ extended: true }));

const authRoutes = require('./src/routes/authRoutes.js');//import các routes xác thực
app.use('/api/auth', authRoutes);

// (Phần code phục vụ file tĩnh của bạn giữ nguyên)
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use(express.static(path.join(__dirname, 'html')));

// 1. GỌI FILE KẾT NỐI CỦA BẠN
// Khi file này được require, hàm connectDB() sẽ tự động chạy
require('./src/db/mongo.js'); 

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'index.html'));
});
// 2. KHỞI ĐỘNG MÁY CHỦ WEB
app.get('/', (req, res) => {
  res.send('Chào mừng đến với Wordee!');
});

// Khởi động server
app.listen(port, async () => { // 1. Thêm "async" vào đây
    console.log(`Server Wordee đang chạy tại http://localhost:${port}`);
    
    // 2. Sử dụng (await import(...)) để gọi gói "open"
    try {
        // Dynamically import gói 'open'
        const open = (await import('open')).default; 
        
        // 3. Chạy hàm open
        open('http://localhost:3000/index.html');
        
    } catch (err) {
        console.error('Không thể tự động mở trình duyệt:', err.message);
    }
});