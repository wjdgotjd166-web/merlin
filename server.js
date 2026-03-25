require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));  // Serve static files like index.html

const sajuCalc = require('./saju-calc');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Convert a free-form date string to YYYY-MM-DD
 * Supported: "1990년 3월 15일", "1990.03.15", "1990/03/15", "1990-03-15", "19900315"
 */
function parseBirthDate(input) {
  if (!input) return null;
  const s = input.trim();

  // Already in YYYY-MM-DD format
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;

  // "1990년 3월 15일" format (Korean date input)
  m = s.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일?/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;

  // "1990.03.15" or "1990/03/15" format
  m = s.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;

  // "19900315" format
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  return null;
}

// Saju Reading API
app.post('/api/reading', async (req, res) => {
  const { birthDate: rawDate, birthTime, birthPlace, gender, timezone } = req.body;

  if (!rawDate) {
    return res.status(400).json({ error: 'Date of birth is required.' });
  }

  const birthDate = parseBirthDate(rawDate);
  if (!birthDate) {
    return res.status(400).json({ error: 'Unable to recognize the date format. Example: 1990-03-15' });
  }

  // Calculate the Four Pillars (四柱) deterministically on the server (convert to KST for overseas users)
  const pillars = sajuCalc.calculate(birthDate, birthTime, timezone);
  const elemDist = sajuCalc.getElementDistribution(pillars);

  const pillarsText = `[Pre-calculated Four Pillars — Use these values as-is. Never recalculate.]
Year Pillar (年柱): ${pillars.year.hanja} (${pillars.year.korean}) — Element: ${pillars.year.element}
Month Pillar (月柱): ${pillars.month.hanja} (${pillars.month.korean}) — Element: ${pillars.month.element}
Day Pillar (日柱/Day Master): ${pillars.day.hanja} (${pillars.day.korean}) — Element: ${pillars.day.element}
Hour Pillar (時柱): ${pillars.hour.hanja ? `${pillars.hour.hanja} (${pillars.hour.korean}) — Element: ${pillars.hour.element}` : 'Time unknown'}
Five Elements Distribution: Wood=${elemDist.목} Fire=${elemDist.화} Earth=${elemDist.토} Metal=${elemDist.금} Water=${elemDist.수}`;

  const systemPrompt = `You are "Merlin," a professional consultant specializing in Saju (Korean Four Pillars of Destiny / 사주팔자), rooted in traditional Korean fortune-telling (명리학).

## Role
A professional consultant who accurately interprets the Four Pillars of Destiny. Not a fortune teller, but someone who systematically analyzes the natal chart to read a person's innate tendencies and life patterns.

## Core Interpretation Principles
- Center all interpretation around the Day Master (日干)
- Determine the Ten Gods strictly based on the Day Master
- Accurately apply the Five Elements generating cycle (Wood→Fire→Earth→Metal→Water) and controlling cycle (Wood→Earth→Water→Fire→Metal→Wood)
- Check all Heavenly Stem combinations (甲己 combine to Earth, 乙庚 combine to Metal, 丙辛 combine to Water, 丁壬 combine to Wood, 戊癸 combine to Fire), Earthly Branch six harmonies, clashes, punishments, harms, and destructions without exception
- Always include Hidden Stems (지장간)
- Read fortune cycles in order: Major Luck Cycle → Annual Cycle → Monthly Cycle
- Saju reveals tendencies and flow, not fixed fate. Express as tendencies, not absolutes

## Style Rules
- Warm and intimate, like telling a story to an old friend by a campfire
- When using Saju terminology, include a simple explanation right beside it
- Instead of stiff expressions like 'inner conflict,' 'external pressure,' or 'psychological dynamics,' describe in terms of real-life scenes and emotions
- No vague statements like "good things will come." Be specific: which structural element in the chart causes which phenomenon
- No fear-mongering, scarcity tactics, or fatalistic assertions

## Four Pillars Usage Rules
The Four Pillars (四柱) have already been accurately calculated on the server and are provided below.
Never recalculate or alter them. Use the provided values as-is and focus only on interpretation.

## Free/Paid Boundary
This is a free basic reading. The goal is to accurately read "this person's innate structure" to build trust.
Detailed love fortune, detailed wealth fortune, marriage timing, precise Major Luck Cycle analysis beyond the 30s, job change/business timing belong to the paid deep reading — do not cover them here.

## Response Format
Respond ONLY in the JSON format below. No text outside the JSON.
{
  "dominantElement": "Dominant element (e.g., Wood (木))",
  "typeTitle": "Type name (e.g., The Visionary)",
  "reading": {
    "dayMaster": "Day Master interpretation (2500+ chars). What is this person's Day Master, what is their innate temperament. How they differ when energized vs exhausted. The gap between how others see them vs who they really are. Paint with specific situations and emotions.",
    "fiveElements": "Five Elements analysis (2500+ chars). How strong or weak each of Wood, Fire, Earth, Metal, Water is in this chart. How excess and deficiency manifest as real-life tendencies. Not 'Wood is strong' but 'because Wood is strong, when you do X, you tend to Y.'",
    "tenGods": "Ten Gods interpretation (2500+ chars). Judge whether each of the ten gods (Parallel, Output, Wealth, Authority, Resource) is strong or weak, and what real-life patterns emerge. Independence, expressiveness, financial sense, social role, learning style — be specific.",
    "relations": "Heavenly Stems, Earthly Branches, Hidden Stems relationships (2500+ chars). Check for combinations and clashes between Heavenly Stems, harmonies/clashes/punishments/harms/destructions between Earthly Branches, and what the Hidden Stems reveal. Describe specifically how each manifests in relationships, career, and emotions.",
    "personality": "Personality synthesis (2500+ chars). Top 3 strengths, top 3 weaknesses. How you react when emotions rise. Your style of making friends. Core patterns in work, money, and relationships. Recurring life themes.",
    "timing": "Changes across life stages (2500+ chars). From the perspective that innate tendencies manifest more strongly during certain Major Luck Cycles. State the Heavenly Stem and Earthly Branch of the Major Luck Cycle for teens, 20s, and present. Describe in specific scenes what experiences they likely had. Use past tense for elapsed periods, future tense for upcoming ones.",
    "advice": "Practical advice (2500+ chars). What environment lets your energy flow best, what recurring traps to watch for, how to supplement deficient elements, relationship tips. Focus on actionable steps."
  },
  "hook": "Deep reading teaser. Pick one structural trait discovered in the free reading, and naturally connect it to how that trait plays out in love/money/timing in the deep reading. Absolutely no fear-mongering or ad-like tone."
}`;

  const userMessage = `Date of birth: ${birthDate}
Time of birth: ${birthTime || 'Unknown'}
Place of birth: ${birthPlace || 'Unknown'}
Gender: ${gender || 'Not specified'}

${pillarsText}

Based on the pre-calculated Four Pillars above, provide your interpretation. The pillar values are already accurately calculated — never alter them, only write the interpretation (reading). Respond ONLY in the specified JSON format.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.8,
      max_tokens: 16000,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0].message.content;
    console.log('GPT response length:', content.length, 'chars');
    const parsed = JSON.parse(content);

    // Merge server-calculated pillar data into the response (prevents GPT from tampering)
    parsed.pillars = {
      year: { hanja: pillars.year.hanja, element: pillars.year.element },
      month: { hanja: pillars.month.hanja, element: pillars.month.element },
      day: { hanja: pillars.day.hanja, element: pillars.day.element },
      hour: { hanja: pillars.hour.hanja || null, element: pillars.hour.element || null }
    };

    res.json(parsed);
  } catch (error) {
    console.error('OpenAI API error:', error.message);
    console.error('Error details:', error);
    res.status(500).json({ error: 'An error occurred during the Saju reading.' });
  }
});

// Deep reading common system prompt base
const DEEP_SYSTEM_BASE = `You are "Merlin," a professional Saju (Korean Four Pillars) consultant.
You have already given the user their basic reading. Now they want a DEEP, focused reading on a specific topic.

Core rules:
- Analyze centered on the Day Master.
- Apply Five Elements generating/controlling logic accurately.
- Include Ten Gods, hidden stems, combinations, clashes as relevant to the topic.
- Consider 10-year luck cycles and annual flow.
- Never use fatalistic or fear-based language.
- Present everything as tendencies, patterns, and practical guidance.
- ALWAYS respond in English.
- Use a warm, mystical campfire tone.

**Respond ONLY in the JSON format below. No text outside the JSON:**
{
  "topicTitle": "Topic title (e.g., Love & Compatibility Deep Reading)",
  "sections": [
    { "title": "Section title", "content": "Detailed content for this section" }
  ],
  "advice": "Merlin's key advice (2-3 sentences)",
  "hook": "A line from Merlin to encourage exploring another topic reading (1-2 sentences)"
}

Important rules:
1. sections must have at least 4 entries, each content at least 500 characters.
2. No abstract descriptions. Use specific metaphors, everyday examples, and emotional depictions.
3. Warm and intimate, like telling a story to an old friend by a campfire.
4. Be so specific and immersive that the reader thinks "Wow, this is really me."`;

const TOPIC_PROMPTS = {
  love: `${DEEP_SYSTEM_BASE}

Topic: Love & Compatibility

**No duplication — this rule is mandatory:**
- General personality descriptions, basic Five Elements explanations, and overall fortune flow have already been covered in the basic reading — never repeat them.
- Career/work topics and money/wealth topics are unrelated to this subject — never mention them.
- Focus 100% exclusively on "love, romance, relationships, and compatibility."

You must cover the following in depth:
- This person's dating style and love language (based on Day Pillar and Ten Gods)
- The type of partner they're attracted to and why (based on Five Elements generating/controlling relationships)
- Recurring relationship patterns and traps in love
- Saju types with good compatibility and types to be cautious about
- ${new Date().getFullYear()} love fortune — when connections are likely to arrive, periods to be careful
- Merlin's specific advice for building better relationships`,

  career: `${DEEP_SYSTEM_BASE}

Topic: Career & Aptitude

**No duplication — this rule is mandatory:**
- General personality descriptions, basic Five Elements explanations, and overall fortune flow have already been covered in the basic reading — never repeat them.
- Love/romance/compatibility topics and money/wealth/investment topics are unrelated to this subject — never mention them.
- Focus 100% exclusively on "career, aptitude, professional growth, and workplace dynamics."

You must cover the following in depth:
- The ideal vocation and aptitude fields indicated by the chart (based on Day Pillar and Ten Gods)
- Work style — whether they're a leader type, specialist type, or creator type
- Strengths at work and recurring difficulty patterns
- The age ranges and Major Luck Cycle flows when success peaks
- ${new Date().getFullYear()} career fortune — timing for job changes, promotions, and business ventures
- Merlin's specific advice for career growth`,

  wealth: `${DEEP_SYSTEM_BASE}

Topic: Wealth & Timing

**No duplication — this rule is mandatory:**
- General personality descriptions, basic Five Elements explanations, and overall fortune flow have already been covered in the basic reading — never repeat them.
- Love/romance/compatibility topics and career/work/aptitude topics are unrelated to this subject — never mention them.
- Focus 100% exclusively on "money, wealth, investment, spending patterns, and financial timing."

You must cover the following in depth:
- This person's relationship with money (position and strength of Wealth stars)
- Money-making style — whether they're the steady income type, investor type, or entrepreneur type
- Patterns of when wealth flows in and when it leaks out
- Investment suitability and financial traps to watch for
- ${new Date().getFullYear()} wealth fortune — when money moves, when to hold tight
- Merlin's specific advice for growing wealth fortune`
};

// Deep Reading API
app.post('/api/reading/:topic', async (req, res) => {
  const { topic } = req.params;
  const { birthDate: rawDate, birthTime, birthPlace, gender, previousReadings } = req.body;

  if (!TOPIC_PROMPTS[topic]) {
    return res.status(400).json({ error: 'Unsupported topic.' });
  }

  if (!rawDate) {
    return res.status(400).json({ error: 'Date of birth is required.' });
  }

  const birthDate = parseBirthDate(rawDate);
  if (!birthDate) {
    return res.status(400).json({ error: 'Unable to recognize the date format.' });
  }

  // Inform about previously covered deep readings to prevent duplication
  let prevContext = '';
  if (previousReadings && Object.keys(previousReadings).length > 0) {
    const topicNames = { love: 'Love', career: 'Career', wealth: 'Wealth' };
    const lines = Object.entries(previousReadings)
      .map(([t, sections]) => `- ${topicNames[t] || t}: ${sections}`)
      .join('\n');
    prevContext = `\n\n⚠️ This user has already received other deep readings. The topics below have already been covered — never repeat the same content or similar expressions:\n${lines}\nEspecially avoid sentence patterns in introductions or conclusions that overlap with other readings (e.g., "Looking at your chart...", "Merlin's final word..."). Start with a narrative unique to this topic.`;
  }

  const userMessage = `Date of birth: ${birthDate}
Time of birth: ${birthTime || 'Unknown'}
Place of birth: ${birthPlace || 'Unknown'}
Gender: ${gender || 'Not specified'}${prevContext}

Based on this person's Saju, provide a deep reading on the topic "${topic}". Respond ONLY in the specified JSON format.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: TOPIC_PROMPTS[topic] },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.8,
      max_tokens: 6000,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0].message.content;
    console.log(`[${topic}] GPT response length:`, content.length, 'chars');
    const parsed = JSON.parse(content);
    res.json(parsed);
  } catch (error) {
    console.error(`[${topic}] OpenAI API error:`, error.message);
    res.status(500).json({ error: 'An error occurred during the deep reading.' });
  }
});

const PORT = 3000;
const server = app.listen(PORT, () => {
  console.log(`Merlin server is running at http://localhost:${PORT}`);
  console.log('Server is running... (Do not close this window!)');
  console.log('Press Ctrl+C to stop.');
});

server.on('error', (err) => {
  console.error('Server error:', err.message);
});

process.on('uncaughtException', (err) => {
  console.error('Unexpected error:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise error:', err);
});
