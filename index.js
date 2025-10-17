
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import OpenAI from 'openai';

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) {
  console.warn("Warning: OPENAI_API_KEY is not set. Set it in environment variables.");
}
const client = new OpenAI({ apiKey: OPENAI_KEY });

// Simple seed fallback questions
const seed = {
  "math": {
    "Algebra": [
      {"text":"Solve for x: 2x + 3 = 11", "choices": ["3","4","5","6"], "answer":"4", "solution":"2x+3=11 => 2x=8 => x=4"}
    ]
  },
  "physics": {
    "Mechanics": [
      {"text":"A body starts from rest and accelerates uniformly at 2 m/s^2 for 5 s. What is its final velocity?","choices":["5 m/s","8 m/s","10 m/s","12 m/s"], "answer":"10 m/s", "solution":"v = u + at = 0 + 2*5 = 10 m/s"}
    ]
  },
  "chemistry": {
    "Stoichiometry":[
      {"text":"How many moles are in 36 g of water (H2O)? (Molar mass H2O=18 g/mol)","choices":["1","2","3","4"], "answer":"2","solution":"36/18 = 2 moles"}
    ]
  }
};

async function generateQuestion(subject, topic, language="English") {
  const system = `You are a friendly grade-level exam question generator for ${subject}. 
Generate one clear ${language} ${topic} question suitable for high-school students. 
Output JSON only with keys: text, choices (array of 4) and answer_index (0-3), difficulty ("easy"/"medium"/"hard").`;
  const user = `Generate one question for topic: ${topic}. Provide 4 choices and the correct index. Keep language: ${language}.`;

  try {
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      max_tokens: 500,
      temperature: 0.7
    });
    const content = resp.choices[0].message.content.trim();
    let jsonText = content;
    const first = content.indexOf('{');
    const last = content.lastIndexOf('}');
    if (first !== -1 && last !== -1) {
      jsonText = content.slice(first, last+1);
    }
    const parsed = JSON.parse(jsonText);
    return parsed;
  } catch (err) {
    console.error("OpenAI generateQuestion error:", err?.message || err);
    const subj = subject.toLowerCase();
    const fallback = (seed[subj] && seed[subj][topic] && seed[subj][topic][0]) ? seed[subj][topic][0] : null;
    if (fallback) {
      return {
        text: fallback.text,
        choices: fallback.choices,
        answer_index: fallback.choices.indexOf(fallback.answer),
        difficulty: "easy"
      };
    }
    return { text: "No question available", choices:["N/A","N/A","N/A","N/A"], answer_index:0, difficulty:"easy" };
  }
}

async function explainQuestion(questionText, language="English", hintOnly=false) {
  const system = `You are a friendly high-school tutor. Provide a ${hintOnly ? "short hint (no solution)" : "step-by-step solution"} for the question. Keep language: ${language}.`;
  const user = `Question: ${questionText} --- ${hintOnly ? "Give a concise hint only." : "Give a numbered step-by-step solution in simple language."}`;

  try {
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      max_tokens: 500,
      temperature: 0.2
    });
    return resp.choices[0].message.content.trim();
  } catch (err) {
    console.error("OpenAI explainQuestion error:", err?.message || err);
    return hintOnly ? "Try to identify the formula related to the topic and substitute known values." : "Solution unavailable. Try re-checking your method or use seed questions.";
  }
}

app.post('/generate', async (req, res) => {
  const { subject, topic, language } = req.body;
  if (!subject || !topic) return res.status(400).json({ error: "subject and topic required" });
  const lang = language || "English";
  const data = await generateQuestion(subject, topic, lang);
  res.json({ ok:true, question:data });
});

app.post('/explain', async (req, res) => {
  const { questionText, language, hint } = req.body;
  if (!questionText) return res.status(400).json({ error: "questionText required" });
  const lang = language || "English";
  const explanation = await explainQuestion(questionText, lang, hint===true);
  res.json({ ok:true, explanation });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`AI Exam Coach backend running on port ${PORT}`);
});
