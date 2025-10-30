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
    isNewbie: {
        type: Boolean,
        default: true
    },
    favoriteCategories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Word' // Tham chiếu đến model Word
    }]
}, {
    // Tự động thêm dấu thời gian (created_at, updated_at)
    timestamps: true 
});

// Tạo model tên 'User' (MongoDB sẽ tự động đổi thành 'users' trong CSDL)
const User = mongoose.model('User', userSchema);

module.exports = User;