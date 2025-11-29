// src/routes/quizRoutes.js
const express = require('express');
const router = express.Router();
const Word = require('../models/wordModel.js');
const Album = require('../models/albumModel.js');
const Result = require('../models/resultModel.js');
const User = require('../models/userModel.js');
const { protect } = require('../middleware/authMiddleware.js');

// ==========================================
// CẤU HÌNH CHUNG
// ==========================================
const MODEL_NAME = 'qwen2.5:3b'; // Model nhẹ
const MAX_QUESTIONS = 10;        // <--- ĐÃ TĂNG LÊN 10

// ==========================================
// 1. CÁC HÀM HỖ TRỢ AI (FALLBACK & GENERATE)
// ==========================================

function getSafeFallback(word, trans) {
  const templates = [
    `The English word for "${trans}" is ______.`,
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

const getSentenceFromAI = async (word, trans) => {
  const type = detectWordType(word, trans);
  let specificRule = "";

  // --- PROMPT "TỰ DO NHƯNG CÓ KỶ LUẬT" ---
  // Không ép cấu trúc (Structure), chỉ ép Vai trò (Role)
  
  if (type === 'verb') {
      specificRule = `
      - Grammar Role: This word is a VERB (action).
      - Instruction: Write a sentence showing someone doing this action.
      - Freedom: You can use any tense (past, present, future) or form (${word}ing, ${word}s).`;
  } else if (type === 'adjective') {
      specificRule = `
      - Grammar Role: This word is an ADJECTIVE (describing word).
      - Instruction: Write a creative sentence describing a person, object, or feeling using "${word}".
      - Constraint: Use the word exactly as an adjective. Do NOT turn it into a noun (e.g., do NOT change "happy" to "happiness").`;
  } else {
      specificRule = `
      - Grammar Role: This word is a NOUN (thing/person/idea).
      - Instruction: Write a natural sentence where "${word}" is the subject or object.`;
  }

  const prompt = `
[INST]
Target Word: "${word}"
Meaning context: "${trans}"

Task: Write a short, natural English sentence containing the Target Word.
Rules:
${specificRule}
- Output ONLY the sentence.
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
          temperature: 0.6, // Tăng lên 0.6 để AI sáng tạo hơn, bớt lặp lại
          top_p: 0.9,
          num_predict: 50,
          stop: ["\n", "Input", "Output"] 
        }
      }),
    });

    const data = await response.json();
    let sentence = data.response.trim();

    // --- DỌN RÁC ---
    const junkPrefixes = ["Sentence:", "Output:", "Answer:", "Here is", "Sure", "Example:", "The sentence is"];
    junkPrefixes.forEach(p => {
      if (sentence.toLowerCase().startsWith(p.toLowerCase())) {
        sentence = sentence.substring(p.length).trim();
      }
    });
    sentence = sentence.replace(/^["':\s]+|["':\s]+$/g, '');

    // --- LOGIC TÌM & THAY THẾ ---
    // 1. Tìm chính xác từ gốc
    if (new RegExp(`\\b${word}\\b`, 'gi').test(sentence)) {
        sentence = sentence.replace(new RegExp(`\\b${word}\\b`, 'gi'), '______');
        return `${sentence} (Gợi ý: ${trans})`;
    }

    // 2. Tìm biến thể (Cho phép sáng tạo: happy -> happier, run -> running)
    const smartRegex = new RegExp(`\\b${word}[a-z]*`, 'gi');
    if (smartRegex.test(sentence)) {
        sentence = sentence.replace(smartRegex, '______');
        return `${sentence} (Gợi ý: ${trans})`;
    } 
    
    return getSafeFallback(word, trans);

  } catch (err) {
    return getSafeFallback(word, trans);
  }
};

// ==========================================
// 2. HÀM XỬ LÝ CHÍNH (HYBRID LOGIC)
// ==========================================
async function generateQuizHybrid(promptData) {
  // promptData: [{word: 'ceillist', ...}, {word: 'able', ...}]
  
  console.log(`[Quiz] Dang goi AI tao cau hoi cho ${promptData.length} tu...`);
  
  const letters = ['A', 'B', 'C', 'D'];
  const allWords = promptData.map(p => p.word);
  const backupDistractors = ['Thing', 'Object', 'Item', 'Place', 'Time', 'Way'];

  const promises = promptData.map(async (item, index) => {
    
    // BƯỚC 1: Gọi AI
    let questionText = await getSentenceFromAI(item.word, item.trans);

    // BƯỚC 2: Fallback (Chống cháy nếu hàm AI trả về null/undefined - dù đã có safe fallback ở trên)
    if (!questionText) {
        questionText = `______ (Gợi ý: ${item.trans})`;
    }

    // BƯỚC 3: Tạo Options (Đáp án)
    // Lọc bỏ từ đúng khỏi danh sách đáp án sai
    let distractors = allWords.filter(w => w.toLowerCase() !== item.word.toLowerCase());
    
    // Trộn và lấy 3 từ làm nhiễu
    distractors = distractors.sort(() => 0.5 - Math.random()).slice(0, 3);
    
    // Nếu thiếu từ (do danh sách đầu vào < 4 từ), lấy thêm từ dự phòng
    let k = 0;
    while (distractors.length < 3) {
        distractors.push(backupDistractors[k++] || 'Option');
    }

    const fullOptions = [
        { text: item.word, correct: true }, 
        ...distractors.map(d => ({ text: d, correct: false }))
    ];
    
    // Xáo trộn vị trí A, B, C, D
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

  // Chờ tất cả kết quả
  let results = await Promise.all(promises);

  // --- XÁO TRỘN THỨ TỰ CÂU HỎI VÀ GÁN ID ---
  results = results.sort(() => 0.5 - Math.random());
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

// --- Route 1: Tạo Quiz từ Album ---
router.get('/ai-album', protect, async (req, res) => {
  try {
    const { albumId } = req.query;
    if (!albumId) return res.status(400).json({ message: 'Thiếu ID.' });

    const album = await Album.findOne({ _id: albumId, user: req.user.id }).populate('words');
    if (!album || !album.words.length) return res.status(404).json({ message: 'Album trống.' });

    let wordsToLearn = album.words;

    // --- 1. LỌC TRÙNG LẶP (Deduplication) ---
    // Sử dụng Set để đảm bảo mỗi từ (word text) chỉ xuất hiện 1 lần
    const uniqueWords = [];
    const seen = new Set();
    
    for (const w of wordsToLearn) {
        const txt = w.word.toLowerCase().trim();
        if (!seen.has(txt)) {
            seen.add(txt);
            uniqueWords.push(w);
        }
    }
    wordsToLearn = uniqueWords;

    // --- 2. XÁO TRỘN VÀ CẮT LẤY MAX_QUESTIONS (10) ---
    if (wordsToLearn.length > MAX_QUESTIONS) {
        wordsToLearn = wordsToLearn.sort(() => 0.5 - Math.random()).slice(0, MAX_QUESTIONS);
    } else {
        // Nếu ít hơn 10 thì xáo trộn thôi
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

// --- Route 2: Tạo Quiz từ Saved Words ---
router.get('/ai-generate', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('savedWords');
    let wordsToLearn = user.savedWords || [];

    // --- 1. LỌC TRÙNG LẶP CHO SAVED WORDS ---
    const uniqueWords = [];
    const seen = new Set();
    for (const w of wordsToLearn) {
        const txt = w.word.toLowerCase().trim();
        if (!seen.has(txt)) {
            seen.add(txt);
            uniqueWords.push(w);
        }
    }
    wordsToLearn = uniqueWords;

    if (wordsToLearn.length === 0) {
        // Nếu user không có từ nào, lấy random từ DB
        wordsToLearn = await Word.aggregate([{ $sample: { size: MAX_QUESTIONS } }]);
    } else {
        // Nếu có từ, xáo trộn và lấy max 10
        wordsToLearn = wordsToLearn.sort(() => 0.5 - Math.random()).slice(0, MAX_QUESTIONS);
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

// Các route khác giữ nguyên
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