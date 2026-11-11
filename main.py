import os
import uuid
import asyncio
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

from config_manager import get_config, save_config
from services.llm_service import generate_whiteboard_plan
from services.tts_service import synthesize_speech
from services.image_service import scrape_bing_images, download_image

app = FastAPI(title="AI Interactive Whiteboard")

BASE_DIR = os.path.dirname(__file__)
STATIC_DIR = os.path.join(BASE_DIR, "static")
MEDIA_DIR = os.path.join(BASE_DIR, "media")

os.makedirs(MEDIA_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

class ExplainRequest(BaseModel):
    topic: str
    language: str = "ar"

class ConfigUpdateRequest(BaseModel):
    config: dict

@app.get("/", response_class=HTMLResponse)
async def index():
    html_file = os.path.join(STATIC_DIR, "index.html")
    with open(html_file, "r", encoding="utf-8") as f:
        return f.read()

@app.get("/api/config")
async def read_config():
    return get_config()

@app.post("/api/config")
async def update_config(req: ConfigUpdateRequest):
    success = save_config(req.config)
    return {"status": "success" if success else "error"}

@app.post("/api/explain")
async def create_explanation(req: ExplainRequest):
    topic = req.topic.strip()
    if not topic:
        return JSONResponse({"error": "الموضوع مطلوب"}, status_code=400)

    config = get_config()
    session_id = str(uuid.uuid4())[:8]

    # 1. استدعاء النموذج اللغوي بالهيكل الصارم (جمل وسكتشات)
    try:
        plan = generate_whiteboard_plan(topic, config)
    except Exception as e:
        print(f"API Error: {e}")
        return JSONResponse({"error": f"فشل الاتصال بالـ API: {str(e)}"}, status_code=500)

    sentences = plan.get("sentences", [])
    voice = config.get("tts", {}).get("voice_ar" if req.language == "ar" else "voice_en", "ar-EG-ShakirNeural")

    # 2. توليد ملف صوتي مستقل لكل جملة لضمان التزامن 100% بين نطق الجملة ورسم سكتشها
    for i, s in enumerate(sentences):
        text = s.get("sentence_text", "")
        audio_name = f"{session_id}_sent_{i}.mp3"
        audio_path = os.path.join(MEDIA_DIR, audio_name)
        ok = await synthesize_speech(text, audio_path, lang=req.language, voice=voice)
        if ok:
            s["audio_url"] = f"/media/{audio_name}"

        # تنزيل صورة توضيحية من الإنترنت بجانب الرسمة
        img_q = s.get("image_query", "")
        if img_q:
            urls = scrape_bing_images(img_q, max_results=2)
            img_done = False
            for u in urls:
                img_name = f"{session_id}_img_{i}_{str(uuid.uuid4())[:4]}.jpg"
                save_dest = os.path.join(MEDIA_DIR, img_name)
                if download_image(u, save_dest):
                    s["image_url"] = f"/media/{img_name}"
                    img_done = True
                    break
            if not img_done:
                s["image_url"] = ""

    return plan

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
