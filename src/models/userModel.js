const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true, // Không cho 2 người trùng tên
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true, // Không cho 2 người trùng email
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    // Đã xóa: isNewbie
    // Đã xóa: favoriteCategories

    passwordResetToken: {
        type: String
    },
    passwordResetExpires: {
        type: Date
    },
    
    // Đã xóa: dailyWords
    // Đã xóa: dailyWordsTimestamp

    // === PHẦN THÊM MỚI BẮT ĐẦU TỪ ĐÂY ===
    searchHistory: [{
        wordId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Word', // Liên kết (join) với bảng Word để lấy chi tiết từ
            required: true
        },
        searchedAt: {
            type: Date,
            default: Date.now // Tự động lưu thời gian lúc tra cứu
        }
    }]
    // === KẾT THÚC PHẦN THÊM MỚI ===

}, {
    // Tự động thêm dấu thời gian (created_at, updated_at)
    timestamps: true
});

// Tạo model tên 'User' (MongoDB sẽ tự động đổi thành 'users' trong CSDL)
const User = mongoose.model('User', userSchema);

module.exports = User;