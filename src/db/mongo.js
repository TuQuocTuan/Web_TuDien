const mongoose = require('mongoose');

const uri = process.env.MONGO_URI || 'mongodb+srv://tuan:<db_password>@tudien.s9oj6uy.mongodb.net/?appName=TuDien';

mongoose.set('strictQuery', false);

async function connectDB() {
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

// tự kết nối khi file được require
connectDB();

// lắng nghe lỗi kết nối runtime
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error (runtime):', err);
});

// đóng kết nối khi process dừng
process.on('SIGINT', async () => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected (SIGINT)');
    process.exit(0);
  } catch {
    process.exit(1);
  }
});

module.exports = { mongoose, connectDB };