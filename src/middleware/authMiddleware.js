// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/userModel.js');

const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // SỬA DÒNG NÀY (Bỏ .select('-password'))
            req.user = await User.findById(decoded.id);
            
            next(); 
        } catch (error) {
            console.error('Lỗi xác thực token:', error);
            res.status(401).json({ message: 'Token không hợp lệ, truy cập bị từ chối' });
        }
    }
    if (!token) {
        res.status(401).json({ message: 'Không có token, truy cập bị từ chối' });
    }
};

module.exports = { protect };