/* ═══════ STARS ═══════ */
const canvas = document.getElementById('star-canvas');
const ctx = canvas.getContext('2d');
let stars = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function initStars() {
  stars = [];
  for (let i = 0; i < 160; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.6,
      r: Math.random() * 1.6 + 0.3,
      a: Math.random(),
      speed: Math.random() * 0.003 + 0.001
    });
  }
}

function drawStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  stars.forEach(s => {
    s.a += s.speed;
    const opacity = 0.4 + Math.sin(s.a) * 0.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,248,230,${opacity})`;
    ctx.fill();
  });
  requestAnimationFrame(drawStars);
}

resizeCanvas();
initStars();
drawStars();
window.addEventListener('resize', () => { resizeCanvas(); initStars(); });

/* ═══════ PAGE SYSTEM ═══════ */
// Main flow: page-0 ~ page-6 (7 pages)
// Famous: page-famous (separate)
const TOTAL_FLOW = 7; // 0~6
let currentIdx = 0;
let onFamous = false;
let famousFrom = 0; // return position from famous page

function goToPage(idx) {
  onFamous = false;
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Show target page
  const el = document.getElementById('page-' + idx);
  if (el) {
    el.classList.add('active');
    currentIdx = idx;
  }
  window.scrollTo(0, 0);
  updateNav();
}

function showFamousPage(who) {
  famousFrom = currentIdx;
  onFamous = true;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.fd-person').forEach(p => p.style.display = 'none');
  document.getElementById('fd-' + who).style.display = 'block';
  document.getElementById('page-famous').classList.add('active');
  window.scrollTo(0, 0);
  updateNav();
}

function nextPage() {
  if (onFamous) {
    goToPage(famousFrom);
  } else if (currentIdx < TOTAL_FLOW - 1) {
    goToPage(currentIdx + 1);
  }
}

function prevPage() {
  if (onFamous) {
    goToPage(famousFrom);
  } else if (currentIdx > 0) {
    goToPage(currentIdx - 1);
  }
}

function updateNav() {
  const footer = document.getElementById('flow-footer');
  const prev = document.getElementById('btn-prev');
  const next = document.getElementById('btn-next');
  const dots = document.getElementById('progress-dots');

  // Hide footer on reading result (page-6) and famous page
  if (currentIdx === 6 || onFamous) {
    footer.style.display = 'none';
    return;
  }
  footer.style.display = 'flex';

  // Previous button
  if (currentIdx === 0) {
    prev.style.visibility = 'hidden';
  } else {
    prev.style.visibility = 'visible';
    prev.textContent = '← Back';
  }

  // Next button
  if (currentIdx === 5) {
    // Input page: hide footer
    footer.style.display = 'none';
    return;
  } else if (currentIdx === 4) {
    next.textContent = 'Get My Reading ✦';
    next.className = 'btn btn-primary';
  } else {
    next.textContent = 'Next →';
    next.className = 'btn btn-outline';
  }

  // Progress dots (6: tutorial 5 + input 1)
  let dotsHTML = '';
  for (let i = 0; i < 6; i++) {
    let cls = 'prog-dot';
    if (i < currentIdx) cls += ' done';
    else if (i === currentIdx) cls += ' active';
    dotsHTML += '<div class="' + cls + '"></div>';
  }
  dots.innerHTML = dotsHTML;
}

/* ═══════ GENDER SELECT ═══════ */
function selectGender(btn) {
  btn.closest('.gender-row').querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

/* ═══════ SAJU READING — API CALL ═══════ */
let savedBirthData = null; // Reuse for deep readings

async function submitReading() {
  const birthDate = document.getElementById('input-birth').value.trim();
  const birthTime = document.getElementById('input-time').value.trim();
  const birthPlace = document.getElementById('input-place').value.trim();
  const activeGender = document.querySelector('.gender-btn.active');
  const gender = activeGender ? activeGender.textContent : '';

  // Auto-detect browser timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Save for deep readings
  savedBirthData = { birthDate, birthTime, birthPlace, gender, timezone };

  if (!birthDate) {
    alert('Please enter your date of birth!');
    return;
  }

  // loading state
  const submitBtn = document.getElementById('btn-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = '✦ Merlin is reading the stars...';

  try {
    const bodyData = JSON.stringify({ birthDate, birthTime, birthPlace, gender, timezone });
    const resp = await fetch('/api/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyData
    });

    if (!resp.ok) throw new Error('Server error');

    const data = await resp.json();
    renderReading(data);
    goToPage(6);
  } catch (err) {
    console.error(err);
    alert('An error occurred during the reading. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '✦ Get My Reading — Free';
  }
}

function renderReading(data) {
  // Four Pillars
  const pillarsEl = document.getElementById('reading-pillars');
  const p = data.pillars;
  pillarsEl.innerHTML = `
    <div class="p-card"><div class="p-han">${p.year.hanja}</div><div class="p-label">Year (${p.year.element})</div></div>
    <div class="p-card"><div class="p-han">${p.month.hanja}</div><div class="p-label">Month (${p.month.element})</div></div>
    <div class="p-card me"><div class="p-han">${p.day.hanja}</div><div class="p-label">Day (${p.day.element}) ★</div></div>
    <div class="p-card"><div class="p-han">${p.hour.hanja || '?'}</div><div class="p-label">Hour (${p.hour.element || 'Unknown'})</div></div>
  `;

  // Type
  document.getElementById('reading-identity').textContent =
    `${data.dominantElement} 기운 · ${data.typeTitle}`;

  const sectionsEl = document.getElementById('reading-sections');

  const elemColors = {
    '목': '#7DC87D', '화': '#E87050', '토': '#C9A84C', '금': '#9090D8', '수': '#6090D8'
  };

  // check if reading is object (new structure) or string (legacy compatibility)
  const r = data.reading;
  let readingHTML = '';

  if (r && typeof r === 'object') {
    const sections = [
      { key: 'dayMaster', icon: '🧙', label: '✦ Your Essence', sub: 'Your innate temperament according to the Day Master' },
      { key: 'fiveElements', icon: '🔥', label: '✦ Balance of Five Elements', sub: 'Your energy shaped by Wood, Fire, Earth, Metal, and Water' },
      { key: 'tenGods', icon: '⚖️', label: '✦ Ten Gods Interpretation', sub: 'The ten forces that drive your life' },
      { key: 'relations', icon: '🔮', label: '✦ Hidden Relationships & Inner World', sub: 'What the Heavenly Stems, Earthly Branches, and Hidden Stems reveal' },
      { key: 'personality', icon: '🪞', label: '✦ Personality & Life Patterns', sub: 'Emotions, relationships, work, money, and recurring themes' },
      { key: 'timing', icon: '🌊', label: '✦ Changes Across Life Stages', sub: 'Who you become through the Major Luck Cycles' },
      { key: 'advice', icon: '⭐', label: '✦ Merlin\'s Advice', sub: 'A practical guide for you' }
    ];

    readingHTML = sections.map(({ key, icon, label, sub }) => {
      const text = r[key];
      if (!text) return '';
      const paragraphs = text.split('\n\n').filter(p => p.trim());
      return `
      <div class="life-narrative-section" style="margin-bottom:24px;">
        <div class="ln-header">
          <div class="r-avatar">${icon}</div>
          <div>
            <span class="ln-header-title">${label}</span>
            <span class="ln-header-sub">${sub}</span>
          </div>
        </div>
        <div class="ln-story-body">
          ${paragraphs.map((p, i) => `<p class="ln-paragraph" style="animation-delay:${i * 0.08}s;">${p.trim()}</p>`).join('')}
        </div>
      </div>`;
    }).join('');
  } else if (r && typeof r === 'string') {
    // legacy compatibility (string)
    const paragraphs = r.split('\n\n').filter(p => p.trim());
    readingHTML = `
    <div class="r-section">
      <div class="r-avatar">🧙</div>
      <div class="r-speech">
        <span class="r-label">✦ Merlin's Four Pillars Reading</span>
        ${paragraphs.map(p => '<p style="margin:14px 0;line-height:1.8;">' + p.trim() + '</p>').join('')}
      </div>
    </div>`;
  }

  sectionsEl.innerHTML = readingHTML;

  // hook message
  document.getElementById('reading-hook').textContent = data.hook;
}

/* ═══════ DEEP READING ═══════ */
const TOPIC_NAMES = {
  love: 'Love & Compatibility',
  career: 'Career & Aptitude',
  wealth: 'Wealth & Timing',
  bundle: 'Full Reading'
};

const loadedTopics = {}; // cache for loaded deep readings

async function purchaseReading(topic) {
  if (!savedBirthData) {
    alert('Please get your basic reading first!');
    return;
  }

  // bundle = load all 3
  if (topic === 'bundle') {
    await Promise.all(['love', 'career', 'wealth'].map(t => loadDeepReading(t)));
    return;
  }

  await loadDeepReading(topic);
}

async function loadDeepReading(topic) {
  // if already loaded, just scroll
  if (loadedTopics[topic]) {
    scrollToDeepReading(topic);
    return;
  }

  // card loading state
  const card = document.querySelector(`.upsell-card[data-topic="${topic}"]`);
  const origHTML = card ? card.innerHTML : '';
  if (card) {
    card.style.pointerEvents = 'none';
    card.style.opacity = '0.6';
    const nameEl = card.querySelector('.upsell-name');
    if (nameEl) nameEl.textContent = '✦ Reading the stars...';
  }

  try {
    // pass summaries of already-completed deep readings to avoid duplication
    const previousReadings = {};
    for (const [t, data] of Object.entries(loadedTopics)) {
      if (t !== topic) {
        previousReadings[t] = data.sections.map(s => s.title).join(', ');
      }
    }

    const resp = await fetch(`/api/reading/${topic}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...savedBirthData, previousReadings })
    });

    if (!resp.ok) throw new Error('Server error');

    const data = await resp.json();
    loadedTopics[topic] = data;
    renderDeepReading(topic, data);

    // mark card as "complete"
    if (card) {
      card.style.opacity = '1';
      card.style.pointerEvents = 'auto';
      const nameEl = card.querySelector('.upsell-name');
      if (nameEl) nameEl.textContent = TOPIC_NAMES[topic] + ' ✓';
      const priceEl = card.querySelector('.upsell-price');
      if (priceEl) priceEl.textContent = 'Complete';
    }

    scrollToDeepReading(topic);
  } catch (err) {
    console.error(err);
    alert('An error occurred during the deep reading. Please try again.');
    if (card) {
      card.innerHTML = origHTML;
      card.style.pointerEvents = 'auto';
      card.style.opacity = '1';
    }
  }
}

function renderDeepReading(topic, data) {
  const container = document.getElementById('paid-readings-container');
  container.style.display = 'block';

  const topicIcons = { love: '💛', career: '⚡', wealth: '💰' };
  const icon = topicIcons[topic] || '✦';

  const sectionsHTML = data.sections.map(s =>
    `<div class="deep-section">
      <div class="deep-section-title">${s.title}</div>
      <div class="deep-section-body">${s.content.split('\n\n').map(p => '<p>' + p.trim() + '</p>').join('')}</div>
    </div>`
  ).join('');

  const html = `
    <div class="deep-reading" id="deep-${topic}">
      <div class="deep-header">
        <span class="deep-icon">${icon}</span>
        <span class="deep-title">${data.topicTitle || TOPIC_NAMES[topic]}</span>
      </div>
      <div class="deep-body">
        <div class="r-section">
          <div class="r-avatar">🧙</div>
          <div class="r-speech">
            <span class="r-label">✦ Merlin's Deep Reading</span>
            ${sectionsHTML}
          </div>
        </div>
      </div>
      <div class="deep-advice">
        <div class="r-avatar">🧙</div>
        <div class="deep-advice-text">${data.advice}</div>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', html);
}

function scrollToDeepReading(topic) {
  const el = document.getElementById('deep-' + topic);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ═══════ EVENT LISTENERS ═══════ */
document.getElementById('btn-prev').addEventListener('click', prevPage);
document.getElementById('btn-next').addEventListener('click', nextPage);
document.getElementById('btn-submit').addEventListener('click', submitReading);

/* ═══════ INIT ═══════ */
updateNav();