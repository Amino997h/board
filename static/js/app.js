document.addEventListener('DOMContentLoaded', () => {
  const whiteboard = new DoodleWhiteboard('whiteboardCanvas');
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
  let activeSentenceIdx = 0;

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
    submitBtn.querySelector('.btn-text').textContent = 'الرسام يجهز السكتشات...';
    submitBtn.querySelector('.spinner').style.display = 'inline-block';
    statusText.textContent = 'جاري التوليد وسحب الصور الصوتية...';

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
      if (!response.ok) throw new Error(data.error || 'فشل الاتصال بالـ API');

      currentPlan = data;
      startDoodleLecture(data);

    } catch (err) {
      console.error(err);
      addChatMessage(`⚠️ خطأ: ${err.message}`, 'system-msg');
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

  // تشغيل الدرس جملة بجملة: نطق الجملة ➔ في نفس اللحظة رسم السكتش الأسود + نص الجملة + الصورة
  function startDoodleLecture(plan) {
    whiteboard.clear();
    activeSentenceIdx = 0;

    const title = plan.title || 'شرح الدرس';
    lessonTitle.textContent = title;
    statusText.textContent = 'الأستاذ يرسم السكتشات ويشرح...';

    const sentences = plan.sentences || [];
    if (sentences.length === 0) return;

    // 1. حساب مواضع الجمل على السبورة
    whiteboard.computeSentencesLayout(sentences);

    // 2. كتابة العنوان في الأعلى
    whiteboard.drawTitleAnimated(title);

    // 3. بدء الجملة الأولى بعد كتابة العنوان
    setTimeout(() => {
      playSentence(0);
    }, 1200);
  }

  function playSentence(index) {
    if (!currentPlan || !currentPlan.sentences || index >= currentPlan.sentences.length) {
      statusText.textContent = 'اكتمل الدرس بنجاح!';
      progressBar.style.width = '100%';
      return;
    }

    activeSentenceIdx = index;
    const sent = currentPlan.sentences[index];
    const total = currentPlan.sentences.length;

    // تحديث النسبة والوقت
    const progressPercent = ((index) / total) * 100;
    progressBar.style.width = `${progressPercent}%`;
    timeDisplay.textContent = `جملة ${index + 1} من ${total}`;

    // تشغيل صوت هذه الجملة تحديداً
    if (sent.audio_url) {
      lectureAudio.src = sent.audio_url;
      lectureAudio.play().catch(e => console.warn('Audio play info:', e));
    }

    // في نفس اللحظة: رسم السكتش الأسود وكتابة الجملة تحته وظهور الصورة
    whiteboard.drawSentenceAnimated(sent, index, () => {
      // عند اكتمال الرسم، ننتظر انتهاء نطق الجملة ثم ننتقل للجملة التالية
      if (sent.audio_url && !lectureAudio.ended && !lectureAudio.paused) {
        lectureAudio.onended = () => {
          setTimeout(() => playSentence(index + 1), 500);
        };
      } else {
        setTimeout(() => playSentence(index + 1), 1000);
      }
    });
  }
});
