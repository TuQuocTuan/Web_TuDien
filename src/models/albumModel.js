const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Vui lòng nhập tiêu đề cho bộ từ vựng'],
        trim: true
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

const Album = mongoose.model('Album', albumSchema);
module.exports = Album;