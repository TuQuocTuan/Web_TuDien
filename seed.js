// File: seed.js
// Nhiệm vụ: Đọc file .TXT, dùng MAP để lọc trùng lặp, và đẩy vào MongoDB

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Word = require('./src/models/wordModel.js');

// 1. CHỈ ĐỊNH FILE DỮ LIỆU TXT
const dataPath = path.join(__dirname, 'src', 'db', 'english-vietnamese.txt');

// 2. HÀM PHÂN TÍCH LOGIC (PARSE)
function parseTxtFile(filePath) {
    console.log('Đang đọc file english-vietnamese.txt...');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');

    const wordsMap = new Map();
    let currentWordObject = null;
    let currentWordKey = null;

    console.log(`Đang phân tích ${lines.length} dòng...`);

    lines.forEach(line => {
        line = line.trim();
        if (line.length === 0) return;

        // 1. Dòng TỪ VỰNG MỚI (bắt đầu bằng @)
        if (line.startsWith('@')) {
            // Lưu từ cũ
            if (currentWordObject && currentWordObject.word && currentWordObject.translation) {
                wordsMap.set(currentWordObject.word, currentWordObject);
            }

            let wordPart = line.substring(1).trim();
            let pronunciation = '';

            const pronunIndex = wordPart.indexOf('/');
            if (pronunIndex > -1) {
                pronunciation = wordPart.substring(pronunIndex).trim();
                wordPart = wordPart.substring(0, pronunIndex).trim();
            }

            currentWordKey = wordPart;

            // Tạo object mới và gán vào Map (nếu chưa có)
            if (!wordsMap.has(currentWordKey)) {
                currentWordObject = {
                    word: wordPart,
                    pronunciation: pronunciation,
                    type: '',
                    translation: '',
                    example_en: '',
                    example_vi: '',
                    tags: []
                };
                // Lưu tạm vào Map để tránh trùng lặp
                wordsMap.set(currentWordKey, currentWordObject);
            } else {
                currentWordObject = null; // Bỏ qua nếu là định nghĩa trùng
            }
            return; // Xong dòng @
        }

        // Chỉ xử lý các dòng định nghĩa nếu có từ đang hoạt động
        if (currentWordObject === null) {
            return;
        }

        // 2. Dòng LOẠI TỪ (BỊ THIẾU HOẶC KHÔNG CÓ DẤU CÁCH CHUẨN)
        // Chúng ta sẽ kiểm tra dòng * và cố gắng lấy loại từ
        if (line.startsWith('*')) {
            const potentialType = line.substring(1).split(',')[0].trim();
            // CHỈ LƯU NẾU CHƯA CÓ TYPE (Để tránh lấy loại từ phụ)
            if (potentialType && currentWordObject.type === '') {
                currentWordObject.type = potentialType;
            }
        }

        // 3. Dòng PHIÊN ÂM (Nếu chưa được lấy ở dòng @)
        else if (line.startsWith('/') && !currentWordObject.pronunciation) {
            currentWordObject.pronunciation = line;
        }

        // 4. Dòng NGHĨA
        else if (line.startsWith('-') && !currentWordObject.translation) {
            currentWordObject.translation = line.substring(1).trim();
        }

        // 5. Dòng VÍ DỤ
        else if (line.startsWith('=') && !currentWordObject.example_en) {
            const exampleLine = line.substring(1).trim();
            const parts = exampleLine.split('+');
            if (parts[0]) currentWordObject.example_en = parts[0].trim();
            if (parts[1]) currentWordObject.example_vi = parts[1].trim();
        }
    });

    // Cần lưu từ cuối cùng sau khi vòng lặp kết thúc
    if (currentWordObject && currentWordObject.word && currentWordObject.translation) {
        wordsMap.set(currentWordObject.word, currentWordObject);
    }

    const allWords = Array.from(wordsMap.values());

    // Lọc: Bắt buộc phải có 'word' VÀ 'translation'
    const validWords = allWords.filter(word => word.word && word.translation);

    console.log(`Đã phân tích ${allWords.length} từ duy nhất. Tìm thấy ${validWords.length} từ hợp lệ.`);
    return validWords;
}

// 3. HÀM CHÍNH ĐỂ IMPORT (Giữ nguyên)
const importData = async () => {
    try {
        const wordsData = parseTxtFile(dataPath);
        if (wordsData.length === 0) {
            console.log('Không tìm thấy từ nào hợp lệ.');
            process.exit();
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB đã kết nối (cho seeder)...');

        await Word.deleteMany({});
        console.log('Đã xóa dữ liệu cũ...');

        // Chèn dữ liệu
        const batchSize = 10000;
        for (let i = 0; i < wordsData.length; i += batchSize) {
            const batch = wordsData.slice(i, i + batchSize);
            await Word.insertMany(batch);
            console.log(`Đã import ${i + batch.length} / ${wordsData.length} từ...`);
        }

        console.log('Đã import dữ liệu mới thành công!');
        mongoose.disconnect();
        process.exit();

    } catch (err) {
        console.error('Lỗi khi import dữ liệu:', err.message);
        process.exit(1);
    }
};

// 4. GỌI HÀM
importData();