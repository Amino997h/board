document.addEventListener('DOMContentLoaded', () => {
  const whiteboard = new InfiniteWhiteboard('whiteboardCanvas');
  const explainForm = document.getElementById('explainForm');
  const topicInput = document.getElementById('topicInput');
  const langSelect = document.getElementById('langSelect');
  const submitBtn = document.getElementById('submitBtn');
  const chatHistory = document.getElementById('chatHistory');
  const lessonTitle = document.getElementById('lessonTitle');
  const statusText = document.getElementById('statusText');
  const lectureAudio = document.getElementById('lectureAudio');
  const timeDisplay = document.getElementById('timeDisplay');
  const progressBar = document.getElementById('progressBar');
  const clearBtn = document.getElementById('clearBtn');

  // Modal elements
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const saveConfigBtn = document.getElementById('saveConfigBtn');
  const cfgApiUrl = document.getElementById('cfgApiUrl');
  const cfgApiKey = document.getElementById('cfgApiKey');
  const cfgModel = document.getElementById('cfgModel');
  const cfgVoiceAr = document.getElementById('cfgVoiceAr');

  let currentPlan = null;
  let drawnElements = new Set();
  let drawnConnections = new Set();

  async function loadConfig() {
    try {
      const res = await fetch('/api/config');
      const cfg = await res.json();
      if (cfg.llm) {
        cfgApiUrl.value = cfg.llm.api_url || '';
        cfgApiKey.value = cfg.llm.api_key || '';
        cfgModel.value = cfg.llm.model || '';
      }
      if (cfg.tts) {
        cfgVoiceAr.value = cfg.tts.voice_ar || 'ar-EG-ShakirNeural';
      }
    } catch (e) {
      console.error(e);
    }
  }
  loadConfig();

  settingsBtn.addEventListener('click', () => settingsModal.style.display = 'flex');
  closeSettingsBtn.addEventListener('click', () => settingsModal.style.display = 'none');
  window.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.style.display = 'none';
  });

  saveConfigBtn.addEventListener('click', async () => {
    const payload = {
      config: {
        llm: {
          provider: "custom",
          api_url: cfgApiUrl.value.trim(),
          api_key: cfgApiKey.value.trim(),
          model: cfgModel.value.trim()
        },
        tts: {
          engine: "edge-tts",
          voice_ar: cfgVoiceAr.value,
          voice_en: "en-US-GuyNeural"
        }
      }
    };
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('تم حفظ الإعدادات بنجاح!');
        settingsModal.style.display = 'none';
      }
    } catch (e) {
      alert('خطأ أثناء حفظ الإعدادات');
    }
  });

  clearBtn.addEventListener('click', () => {
    whiteboard.clear();
    lectureAudio.pause();
    drawnElements.clear();
    drawnConnections.clear();
    lessonTitle.textContent = 'جاهز للشرح... اكتب موضوعك في الشات';
    statusText.textContent = 'مستعد';
    progressBar.style.width = '0%';
    timeDisplay.textContent = '⏱️ 00:00 / 00:00';
  });

  explainForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const topic = topicInput.value.trim();
    if (!topic) return;

    addChatMessage(topic, 'user-msg');
    topicInput.value = '';

    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').textContent = 'جاري سؤال الـ API والتوليد...';
    submitBtn.querySelector('.spinner').style.display = 'inline-block';
    statusText.textContent = 'جاري الاتصال بنموذج الذكاء الاصطناعي...';

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic,
          language: langSelect.value
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'فشل الاتصال بالـ API');
      }

      currentPlan = data;
      startLecture(currentPlan);

    } catch (err) {
      console.error(err);
      addChatMessage(`⚠️ خطأ من السيرفر: ${err.message}`, 'system-msg');
      statusText.textContent = 'حدث خطأ في الاتصال';
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('.btn-text').textContent = 'ابدأ الدرس';
      submitBtn.querySelector('.spinner').style.display = 'none';
    }
  });

  function addChatMessage(text, className) {
    const div = document.createElement('div');
    div.className = `message ${className}`;
    div.textContent = text;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  function startLecture(plan) {
    whiteboard.clear();
    drawnElements.clear();
    drawnConnections.clear();

    const title = plan.title || 'شرح الدرس';
    lessonTitle.textContent = title;
    statusText.textContent = 'الأستاذ يشرح على السبورة...';

    // 1. حساب الإحداثيات وتوزيع العناصر اللانهائي المريح
    const elements = plan.elements || [];
    whiteboard.computeInfiniteLayout(elements);

    // 2. رسم العنوان بأنيميشن القلم
    whiteboard.drawTitleAnimated(title);

    // 3. تشغيل الصوت المتواصل
    if (plan.audio_url) {
      lectureAudio.src = plan.audio_url;
      lectureAudio.play().catch(e => console.log('Autoplay info:', e));
    }
  }

  // مزامنة دقيقة مع ثواني الصوت لظهور كل عنصر في وقته
  lectureAudio.addEventListener('timeupdate', () => {
    if (!currentPlan) return;

    const currentTime = lectureAudio.currentTime;
    const duration = lectureAudio.duration || 1;

    progressBar.style.width = `${(currentTime / duration) * 100}%`;

    const formatTime = (s) => {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`;
    };
    timeDisplay.textContent = `⏱️ ${formatTime(currentTime)} / ${formatTime(duration)}`;

    // فحص العناصر المطلوب رسمها بأنيميشن عند هذه الثانية
    (currentPlan.elements || []).forEach(elem => {
      const t = elem.appearance_time ?? 0;
      if (currentTime >= t && !drawnElements.has(elem)) {
        drawnElements.add(elem);
        whiteboard.drawElementAnimated(elem);
      }
    });

    // فحص الأسهم الرابطة بأنيميشن عند هذه الثانية
    (currentPlan.connections || []).forEach(conn => {
      const t = conn.appearance_time ?? 0;
      if (currentTime >= t && !drawnConnections.has(conn)) {
        drawnConnections.add(conn);
        whiteboard.drawConnectionAnimated(conn);
      }
    });
  });

  lectureAudio.addEventListener('ended', () => {
    statusText.textContent = 'اكتمل الشرح بنجاح!';
  });
});
