// src/routes/quizRoutes.js

// 1. QUAN TRỌNG: Nạp biến môi trường ngay dòng đầu tiên
require('dotenv').config(); 

const express = require('express');
const router = express.Router();
const Word = require('../models/wordModel.js');
const Album = require('../models/albumModel.js');
const Result = require('../models/resultModel.js');
const User = require('../models/userModel.js');
const { protect } = require('../middleware/authMiddleware.js');

const { CohereClient } = require("cohere-ai");

// 2. DEBUG: Kiểm tra xem Key có tồn tại không
const apiKey = process.env.COHERE_API_KEY;

if (!apiKey) {
    console.error("❌ LỖI NGHIÊM TRỌNG: Không tìm thấy COHERE_API_KEY.");
    console.error("-> Hãy kiểm tra file .env nằm ở thư mục gốc dự án.");
    console.error("-> Nội dung file .env phải có dòng: COHERE_API_KEY=...");
} else {
    // Chỉ in 4 ký tự đầu để bảo mật
    console.log("✅ Đã tìm thấy API Key:", apiKey.substring(0, 4) + "****************");
}

// 3. Khởi tạo Client với 'token'
const cohere = new CohereClient({ 
    token: apiKey 
});

// ==========================================
// CẤU HÌNH CHUNG
// ==========================================
const COHERE_MODEL = "command-r7b-12-2024"; // Model ổn định, ít lỗi quyền hơn
const MAX_QUESTIONS = 10;

// ==========================================
// HỖ TRỢ AI
// ==========================================
function getSafeFallback(word, trans) {
  const templates = [
    `The English word for "${trans}" is ______.`,
    `Definition: ______ means "${trans}".`,
    `Please complete: The word ______ is defined as "${trans}".`
  ];
  const t = templates[Math.floor(Math.random() * templates.length)];
  return `${t} (Gợi ý: ${trans})`;
}

function detectWordType(word, trans) {
  const w = word.toLowerCase();
  const t = trans.toLowerCase();

  if (/^(làm|ăn|chơi|chạy|đi|ngủ|nói|viết|đọc|học|nghe|nhìn|uống|mặc|đánh|vẽ|hát|múa|tập|giúp|mua|bán|thuê|mượn|trả|lấy|bỏ|đặt|để)\b/i.test(t)) {
    return 'verb';
  }
  const adjSuffixes = ['ful', 'ous', 'ive', 'ble', 'ant', 'ent', 'less', 'al', 'ic', 'y', 'ish'];
  if (adjSuffixes.some(s => w.endsWith(s)) || /^(rất|khá|hơi|có tính|thuộc|bị|được|màu|to|nhỏ|đẹp|xấu|cao|thấp)\b/i.test(t)) {
    return 'adjective';
  }
  return 'noun';
}

// ==========================================
// Hàm gọi Cohere v2 chat (ĐÃ FIX LỖI MESSAGE)
// ==========================================
const getSentenceFromAI = async (word, trans) => {
  // Nếu không có Key thì fallback ngay lập tức, không gọi API để tránh crash
  if (!process.env.COHERE_API_KEY) return getSafeFallback(word, trans);

  const type = detectWordType(word, trans);
  let specificRule = "";

  if (type === 'verb') {
    specificRule = `- This word is a VERB.\n- Write a sentence showing someone doing this action.`;
  } else if (type === 'adjective') {
    specificRule = `- This word is an ADJECTIVE.\n- Use it to describe something.`;
  } else {
    specificRule = `- This word is a NOUN.\n- Use it as a subject or object.`;
  }

  const prompt = `
Target Word: "${word}"
Meaning: "${trans}"

Write 1 short English sentence containing the target word.
${specificRule}
Output ONLY the sentence.
`;

  try {
    // Gọi API V2
    const response = await cohere.v2.chat({
      model: COHERE_MODEL, 
      messages: [{ role: "user", content: prompt }],
      max_tokens: 60,
      temperature: 0.6
    });

    let sentence = "";
    if (response.message && response.message.content && response.message.content.length > 0) {
        sentence = response.message.content[0].text.trim();
    }

    if (!sentence) return getSafeFallback(word, trans);

    sentence = sentence.replace(/^["':\s]+|["':\s]+$/g, "");

    const regex = new RegExp(`\\b${word}[a-z]*`, "gi");
    if (regex.test(sentence)) {
      sentence = sentence.replace(regex, "______");
      return `${sentence} (Gợi ý: ${trans})`;
    }

    return getSafeFallback(word, trans);

  } catch (err) {
    console.error("COHERE API ERROR:", err.message); // In lỗi gọn hơn
    return getSafeFallback(word, trans);
  }
};

// ==========================================
// Tạo quiz hybrid
// ==========================================
async function generateQuizHybrid(promptData) {
  console.log(`[Quiz] Dang goi AI (Cohere) tao cau hoi cho ${promptData.length} tu...`);

  const letters = ['A', 'B', 'C', 'D'];
  const allWords = promptData.map(p => p.word);
  const backupDistractors = ['Thing', 'Object', 'Item', 'Place', 'Time', 'Way'];

  const promises = promptData.map(async (item) => {
    let questionText = await getSentenceFromAI(item.word, item.trans);
    
    // Fallback bổ sung
    if (!questionText) questionText = `______ (Gợi ý: ${item.trans})`;

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
      question: questionText,
      type: 'cloze',
      options: optionsMapped,
      answer: answerKey,
      explanation: `Nghĩa: ${item.word} = ${item.trans}`
    };
  });

  let results = await Promise.all(promises);
  results = results.sort(() => 0.5 - Math.random());
  results = results.map((q, index) => ({ ...q, id: index + 1 }));

  console.log("[Quiz] Hoan thanh!");
  return JSON.stringify(results);
}

// ==========================================
// ROUTES
// ==========================================
router.get('/ai-album', protect, async (req, res) => {
  try {
    const { albumId } = req.query;
    if (!albumId) return res.status(400).json({ message: 'Thiếu ID.' });

    const album = await Album.findOne({ _id: albumId, user: req.user.id }).populate('words');
    if (!album || !album.words.length) return res.status(404).json({ message: 'Album trống.' });

    let wordsToLearn = album.words;
    const uniqueWords = [];
    const seen = new Set();
    for (const w of wordsToLearn) {
      if(w.word) {
        const txt = w.word.toLowerCase().trim();
        if (!seen.has(txt)) {
            seen.add(txt);
            uniqueWords.push(w);
        }
      }
    }
    wordsToLearn = uniqueWords;

    if (wordsToLearn.length > MAX_QUESTIONS) {
      wordsToLearn = wordsToLearn.sort(() => 0.5 - Math.random()).slice(0, MAX_QUESTIONS);
    } else {
      wordsToLearn = wordsToLearn.sort(() => 0.5 - Math.random());
    }

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

    const uniqueWords = [];
    const seen = new Set();
    for (const w of wordsToLearn) {
      if(w.word) {
        const txt = w.word.toLowerCase().trim();
        if (!seen.has(txt)) {
            seen.add(txt);
            uniqueWords.push(w);
        }
      }
    }
    wordsToLearn = uniqueWords;

    if (wordsToLearn.length === 0) {
      wordsToLearn = await Word.aggregate([{ $sample: { size: MAX_QUESTIONS } }]);
    } else {
      if (wordsToLearn.length > MAX_QUESTIONS) wordsToLearn = wordsToLearn.sort(() => 0.5 - Math.random()).slice(0, MAX_QUESTIONS);
      else wordsToLearn = wordsToLearn.sort(() => 0.5 - Math.random());
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

router.post('/submit', protect, async (req, res) => {
  try {
    const { category, score, totalQuestions } = req.body;
    const newResult = new Result({ user: req.user.id, category, score, totalQuestions });
    await newResult.save();
    res.status(201).json({ message: 'Đã lưu!', score: newResult.score });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi lưu.' });
  }
});

router.get('/history', protect, async (req, res) => {
  try {
    const results = await Result.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

router.delete('/history', protect, async (req, res) => {
  try {
    await Result.deleteMany({ user: req.user.id });
    res.status(200).json({ message: 'Đã xóa history.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

module.exports = router;