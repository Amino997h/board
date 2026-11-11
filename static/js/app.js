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
  let activeSceneIdx = 0;
  let totalVideoDuration = 0;
  let elapsedVideoTime = 0;
  let videoTimer = null;

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
        cfgVoiceAr.value = "ar-SA-HamedNeural"; // تثبيت صوت الرجل تلقائياً
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
          voice_ar: "ar-SA-HamedNeural", // صوت الرجل دائماً
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
    clearInterval(videoTimer);
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
    submitBtn.querySelector('.btn-text').textContent = 'تحضير الفيديو الشامل...';
    submitBtn.querySelector('.spinner').style.display = 'inline-block';
    statusText.textContent = 'جاري التوليد وسحب الصور والشرح المفصل...';

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
      startFullVideoLecture(data);

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

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // تشغيل الفيديو المستمر للأستاذ (بدون أي تقطيع أو تفريد لجمل)
  function startFullVideoLecture(plan) {
    whiteboard.clear();
    activeSceneIdx = 0;
    clearInterval(videoTimer);
    elapsedVideoTime = 0;

    const title = plan.title || 'شرح الدرس';
    lessonTitle.textContent = title;
    statusText.textContent = 'الأستاذ يشرح ويرسم على السبورة...';

    const scenes = plan.scenes || [];
    if (scenes.length === 0) return;

    // تقدير إجمالي وقت الفيديو بناءً على طول الكلمات
    totalVideoDuration = scenes.reduce((acc, sc) => acc + Math.max(5, (sc.narration || '').length * 0.12), 0);

    // 1. حساب مواضع المشاهد
    whiteboard.computeScenesLayout(scenes);

    // 2. كتابة العنوان في الأعلى بالقلم
    whiteboard.drawTitleAnimated(title);

    // عداد الوقت المستمر للفيديو ككل (مثل مشغل يوتيوب بالضبط)
    videoTimer = setInterval(() => {
      elapsedVideoTime += 0.25;
      const progress = Math.min(100, (elapsedVideoTime / totalVideoDuration) * 100);
      progressBar.style.width = `${progress}%`;
      timeDisplay.textContent = `⏱️ ${formatTime(elapsedVideoTime)} / ${formatTime(totalVideoDuration)}`;
    }, 250);

    // 3. انطلاق المشهد الأول
    setTimeout(() => {
      playNextScene(0);
    }, 1200);
  }

  function playNextScene(index) {
    if (!currentPlan || !currentPlan.scenes || index >= currentPlan.scenes.length) {
      clearInterval(videoTimer);
      statusText.textContent = 'اكتمل الشرح بنجاح!';
      progressBar.style.width = '100%';
      timeDisplay.textContent = `⏱️ ${formatTime(totalVideoDuration)} / ${formatTime(totalVideoDuration)}`;
      return;
    }

    activeSceneIdx = index;
    const scene = currentPlan.scenes[index];

    // تشغيل صوت الأستاذ الرصين
    if (scene.audio_url) {
      lectureAudio.src = scene.audio_url;
      lectureAudio.play().catch(e => console.warn('Audio play info:', e));
    }

    // رسم السكتش الأسود المتناسق مع الصوت وكتابة الشرح تحته والصورة بجانبه
    whiteboard.drawSceneAnimated(scene, () => {
      if (scene.audio_url && !lectureAudio.ended && !lectureAudio.paused) {
        lectureAudio.onended = () => {
          setTimeout(() => playNextScene(index + 1), 500);
        };
      } else {
        setTimeout(() => playNextScene(index + 1), 900);
      }
    });
  }
});
