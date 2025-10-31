// File: seed.js
// Nhiệm vụ: Đọc file .JSON (đã phân loại) và đẩy vào MongoDB

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Word = require('./src/models/wordModel.js');

// 1. CHỈ ĐỊNH FILE DỮ LIỆU JSON MỚI
const dataPath = path.join(__dirname, 'src', 'db', 'data-wordee.json');

// 2. HÀM CHÍNH ĐỂ IMPORT
const importData = async () => {
    try {
        // A. Đọc file JSON
        console.log('Đang đọc file data-wordee.json...');
        const fileContent = fs.readFileSync(dataPath, 'utf-8');
        const wordsData = JSON.parse(fileContent); // Chuyển từ text sang JSON
        console.log(`Đã đọc ${wordsData.length} từ từ file JSON.`);

        if (wordsData.length === 0) {
            console.log('File dữ liệu rỗng.');
            process.exit();
        }

        // B. Kết nối tới DB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB đã kết nối (cho seeder)...');

        // C. Xóa dữ liệu cũ
        await Word.deleteMany({});
        console.log('Đã xóa dữ liệu cũ...');

        // D. Chèn dữ liệu mới
        await Word.insertMany(wordsData);
        
        console.log(`Đã import thành công ${wordsData.length} từ vựng mới!`);
        mongoose.disconnect();
        process.exit();

    } catch (err) {
        console.error('Lỗi khi import dữ liệu:', err.message);
        process.exit(1);
    }
};

// 3. GỌI HÀM
importData();