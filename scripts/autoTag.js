const mongoose = require('mongoose');
// Nhớ sửa đường dẫn này cho đúng với file wordModel của bạn
const Word = require('../src/models/wordModel'); 

// 1. Thay bằng chuỗi kết nối MongoDB của bạn
MONGO_URI='mongodb+srv://tuan:tuan38382343@tudien.s9oj6uy.mongodb.net/wordee?appName=TuDien'

// 2. Định nghĩa bộ từ khóa để tự động gắn tag
const topicRules = [
    { tag: 'medical', keywords: ['bác sĩ', 'y tá', 'thuốc', 'bệnh', 'viện', 'y tế', 'đau', 'surgery', 'doctor', 'nurse', 'pharmacy', 'clinic', 'health'] },
    { tag: 'tech', keywords: ['máy tính', 'phần mềm', 'lập trình', 'internet', 'mạng', 'web', 'dữ liệu', 'code', 'algorithm', 'app', 'bug', 'developer', 'screen'] },
    { tag: 'business', keywords: ['công ty', 'lương', 'giám đốc', 'tiền', 'doanh nghiệp', 'thị trường', 'bán', 'mua', 'profit', 'ceo', 'manager', 'sales', 'office'] },
    { tag: 'education', keywords: ['học', 'trường', 'giáo viên', 'sinh viên', 'bài thi', 'sách', 'university', 'student', 'exam', 'school', 'lesson'] },
    { tag: 'animal', keywords: ['con', 'chim', 'cá', 'chó', 'mèo', 'hổ', 'thú', 'bird', 'dog', 'cat', 'lion', 'fish'] },
    { tag: 'food', keywords: ['ăn', 'uống', 'bánh', 'kẹo', 'cơm', 'phở', 'nước', 'trà', 'cake', 'coffee', 'meal', 'drink', 'cook'] },
    { tag: 'politics', keywords: ['chính phủ', 'bầu cử', 'luật', 'tổng thống', 'government', 'law', 'vote', 'president'] },
    { tag: 'environment', keywords: ['môi trường', 'khí hậu', 'cây', 'rừng', 'biển', 'tree', 'forest', 'sea', 'nature'] }
];

const runAutoTag = async () => {
    console.time("⏱ Thời gian chạy");
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Đã kết nối DB. Đang làm sạch và gắn lại Tag chủ đề...");

        const words = await Word.find({}, '_id word translation tags').lean();
        
        let bulkOps = [];
        let count = 0;

        for (let word of words) {
            // [QUAN TRỌNG]: new Set() rỗng -> Xóa hết tag cũ (bao gồm cả tag rác)
            let newTags = new Set(); 
            let isModified = false;
            const textToCheck = (word.word + ' ' + word.translation).toLowerCase();

            // Chỉ chạy qua bộ lọc chủ đề
            topicRules.forEach(rule => {
                if (rule.keywords.some(k => textToCheck.includes(k))) {
                    newTags.add(rule.tag);
                    isModified = true;
                }
            });

            // [LƯU Ý]: Đã XÓA đoạn code tự động thêm word.type (danh từ/động từ) ở đây

            // Nếu từ này có tag chủ đề mới, hoặc trước đó nó có tag rác cần xóa đi
            // (So sánh độ dài tag mới và tag cũ để biết có thay đổi không)
            const currentTagsLen = word.tags ? word.tags.length : 0;
            
            // Logic cập nhật: Nếu tìm thấy tag chủ đề HOẶC cần xóa tag cũ đi (để mảng tag rỗng)
            if (isModified || (currentTagsLen > 0 && newTags.size === 0)) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: word._id },
                        update: { $set: { tags: Array.from(newTags) } }
                    }
                });
                count++;
            }

            if (bulkOps.length === 1000) {
                await Word.bulkWrite(bulkOps);
                bulkOps = [];
                process.stdout.write(`.`);
            }
        }

        if (bulkOps.length > 0) {
            await Word.bulkWrite(bulkOps);
        }

        console.log(`\n\n🎉 XONG! Đã cập nhật ${count} từ.`);
        console.log("👉 Các từ bây giờ chỉ còn Tag chủ đề (hoặc không có tag), sạch bóng 'danh từ'!");
        console.timeEnd("⏱ Thời gian chạy");
        process.exit();

    } catch (error) {
        console.error("❌ Lỗi:", error);
        process.exit(1);
    }
};

runAutoTag();