// src/routes/quizRoutes.js
const express = require('express');
const router = express.Router();
const Word = require('../models/wordModel.js');
const Album = require('../models/albumModel.js');
const Result = require('../models/resultModel.js');
const User = require('../models/userModel.js');
const { protect } = require('../middleware/authMiddleware.js');

// ==========================================
// 1. CẤU HÌNH & HÀM GỌI AI
// ==========================================
const MODEL_NAME = 'qwen2:0.5b'; // Model nhẹ

// Hàm gọi AI lấy câu văn (Đã tối ưu Prompt để tránh nói nhiều)
// Hàm gọi AI lấy câu văn (Phiên bản An toàn & Ổn định nhất)
// Hàm gọi AI lấy câu văn (Phiên bản "Bất tử" - Không bao giờ trả về null)
function getSafeFallback(word, trans) {
    const templates = [
        `The English word for "${trans}" is ______.`,
        `Please fill in the blank: "I learned the word ______ today."`,
        `In this context, the word ______ fits best.`,
        `Do not forget the meaning of ______: ${trans}.`,
        `Can you spell the word ______?`,
        `The word ______ is very common in English.`,
        `Definition: ______ means "${trans}".`,
        `Example: Please write the word ______ on the paper.`,
        `Teacher: "What is the English word for ${trans}?" Student: "It is ______."`,
        `Remember: ______ = ${trans}.`
    ];
    // Chọn ngẫu nhiên
    const t = templates[Math.floor(Math.random() * templates.length)];
    return `${t} (Gợi ý: ${trans})`;
}

// ==========================================
// HÀM GỌI AI (ĐÃ TỐI ƯU CONTEXT)
// ==========================================
const getSentenceFromAI = async (word, trans) => {
  // 1. PROMPT THÔNG MINH HƠN:
  // - Cung cấp nghĩa (Meaning) để AI đặt câu đúng ngữ cảnh (ví dụ: bank = ngân hàng vs bờ sông)
  // - Cấm các mẫu câu lười (It is a...)
  const prompt = `
[INST]
Target Word: "${word}"
Meaning: "${trans}"
Task: Write a simple English sentence (8-15 words) using the Target Word correctly based on the Meaning.
Rules:
1. Do NOT define the word (e.g. "Apple is a fruit" -> NO).
2. Do NOT start with "It is", "This is", "There is".
3. Show an action or a situation.
4. Output ONLY the sentence.
[/INST]
`;

  try {
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3, // Tăng nhẹ lên 0.3 để AI viết câu mượt hơn chút
          top_p: 0.9,
          num_predict: 50,
          stop: ["\n", "Input", "Output", "Target"] 
        }
      }),
    });

    const data = await response.json();
    let sentence = data.response.trim();

    // --- DỌN RÁC (CLEANING) ---
    const junkPrefixes = ["Sentence:", "Output:", "Answer:", "Here is", "Sure", "Example:"];
    junkPrefixes.forEach(p => {
        if (sentence.toLowerCase().startsWith(p.toLowerCase())) {
            sentence = sentence.substring(p.length).trim();
        }
    });
    sentence = sentence.replace(/^"|"$/g, '').trim(); // Bỏ ngoặc kép

    // --- LOGIC THAY THẾ TỪ ---
    const regexWord = new RegExp(`\\b${word}\\b`, 'gi');
    
    // Kiểm tra xem AI có dùng đúng từ không
    if (regexWord.test(sentence)) {
        // Thay thế từ bằng ______
        sentence = sentence.replace(regexWord, '______');
        
        // --- BỘ LỌC CHẤT LƯỢNG (QUALITY CHECK) ---
        // 1. Nếu câu quá ngắn (< 15 ký tự) -> Dễ là câu vô tri -> Fallback
        if (sentence.length < 15) return getSafeFallback(word, trans);

        // 2. Nếu câu bắt đầu bằng "It is a..." (dù đã cấm nhưng AI lì) -> Fallback
        if (/^(It|This|That) is a/i.test(sentence)) return getSafeFallback(word, trans);

        // Đạt chuẩn -> Trả về câu xịn
        return `${sentence} (Gợi ý: ${trans})`;
    } 
    
    // Nếu AI không dùng từ khóa -> Fallback
    return getSafeFallback(word, trans);

  } catch (err) {
    // Lỗi mạng -> Fallback
    return getSafeFallback(word, trans);
  }
};
// ==========================================
// 2. HÀM XỬ LÝ CHÍNH (CHỈ DÙNG AI)
// ==========================================
// ==========================================
// 3. HÀM XỬ LÝ CHÍNH (HYBRID LOGIC)
// ==========================================
async function generateQuizHybrid(promptData) {
  // promptData: [{word: 'ceillist', ...}, {word: 'able', ...}, {word: 'adventure', ...}]
  
  console.log(`[Quiz] Dang goi AI tao cau hoi cho ${promptData.length} tu...`);
  
  const letters = ['A', 'B', 'C', 'D'];
  const allWords = promptData.map(p => p.word);
  const backupDistractors = ['Thing', 'Object', 'Item', 'Place', 'Time', 'Way'];

  const promises = promptData.map(async (item, index) => {
    // ... (Giữ nguyên logic gọi AI và tạo options như cũ) ...
    // BƯỚC 1: Gọi AI
    let questionText = await getSentenceFromAI(item.word, item.trans);

    // BƯỚC 2: Fallback
    if (!questionText) {
        questionText = `______ (Gợi ý: ${item.trans})`;
    }

    // BƯỚC 3: Tạo Options
    let distractors = allWords.filter(w => w.toLowerCase() !== item.word.toLowerCase());
    distractors = distractors.sort(() => 0.5 - Math.random()).slice(0, 3);
    
    let k = 0;
    while (distractors.length < 3) {
        distractors.push(backupDistractors[k++] || 'Option');
    }

    const fullOptions = [
        { text: item.word, correct: true }, 
        ...distractors.map(d => ({ text: d, correct: false }))
    ];
    
    const shuffledOptions = fullOptions.sort(() => 0.5 - Math.random());
    const optionsMapped = shuffledOptions.map((opt, i) => ({ 
        key: letters[i], 
        text: opt.text 
    }));
    const answerKey = optionsMapped.find((o, i) => shuffledOptions[i].correct).key;

    return {
      // Lưu ý: Tạm thời chưa gán ID ở đây, hoặc gán tạm cũng được
      question: questionText,
      type: 'cloze',
      options: optionsMapped,
      answer: answerKey,
      explanation: `Nghĩa: ${item.word} = ${item.trans}`
    };
  });

  // Chờ tất cả kết quả
  let results = await Promise.all(promises);

  // --- BƯỚC MỚI: XÁO TRỘN THỨ TỰ CÂU HỎI ---
  // 1. Xáo trộn mảng kết quả
  results = results.sort(() => 0.5 - Math.random());

  // 2. Đánh số lại ID (1, 2, 3...) cho đẹp đội hình
  // Để tránh việc câu đầu tiên lại có id: 3
  results = results.map((q, index) => ({
    ...q,
    id: index + 1
  }));

  console.log("[Quiz] Hoan thanh!");
  return JSON.stringify(results);
}

// ==========================================
// 3. ROUTES
// ==========================================

router.get('/ai-album', protect, async (req, res) => {
  try {
    const { albumId } = req.query;
    if (!albumId) return res.status(400).json({ message: 'Thiếu ID.' });

    const album = await Album.findOne({ _id: albumId, user: req.user.id }).populate('words');
    if (!album || !album.words.length) return res.status(404).json({ message: 'Album trống.' });

    let wordsToLearn = album.words;
    if (wordsToLearn.length > 5) wordsToLearn = wordsToLearn.sort(() => 0.5 - Math.random()).slice(0, 5);

    const pairs = wordsToLearn.map(w => ({ word: w.word, trans: w.translation || '...' }));

    const rawJson = await generateQuizHybrid(pairs);
    const quizData = JSON.parse(rawJson);

    res.status(200).json({ albumTitle: album.title, questions: quizData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

router.get('/ai-generate', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('savedWords');
    let wordsToLearn = user.savedWords || [];

    if (wordsToLearn.length === 0) {
        wordsToLearn = await Word.aggregate([{ $sample: { size: 5 } }]);
    } else {
        wordsToLearn = wordsToLearn.sort(() => 0.5 - Math.random()).slice(0, 5);
    }

    const pairs = wordsToLearn.map(w => ({ 
        word: w.word, 
        trans: w.translation || w.meaning || 'nghĩa' 
    }));

    const rawJson = await generateQuizHybrid(pairs);
    const quizData = JSON.parse(rawJson);

    res.status(200).json(quizData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// Các route cũ giữ nguyên
router.post('/submit', protect, async (req, res) => {
  try {
    const { category, score, totalQuestions } = req.body;
    const newResult = new Result({ user: req.user.id, category, score, totalQuestions });
    await newResult.save();
    res.status(201).json({ message: 'Đã lưu!', score: newResult.score });
  } catch (err) { res.status(500).json({ message: 'Lỗi lưu.' }); }
});

router.get('/history', protect, async (req, res) => {
  try {
    const results = await Result.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(results);
  } catch (err) { res.status(500).json({ message: 'Lỗi server.' }); }
});

router.delete('/history', protect, async (req, res) => {
  try {
    await Result.deleteMany({ user: req.user.id });
    res.status(200).json({ message: 'Đã xóa history.' });
  } catch (err) { res.status(500).json({ message: 'Lỗi server.' }); }
});

module.exports = router;