const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Vui lòng nhập tiêu đề cho bộ từ vựng'],
        trim: true,
        lowercase: true // (Tự động đổi "Sports" -> "sports" để làm tag)
    },
    // (ĐÃ XÓA KHỐI DESCRIPTION)
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User', 
        required: true
    },
    words: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Word' 
    }]
}, {
    timestamps: true 
});
// Ngăn một user tạo 2 album trùng tên
albumSchema.index({ user: 1, title: 1 }, { unique: true });

const Album = mongoose.model('Album', albumSchema);
module.exports = Album;