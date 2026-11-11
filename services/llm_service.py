import json
import requests
import re
import html

# البرومبت الصارم: تمييز تام بين الشرح الصوتي المنطوق والنقاط والملاحظات التوضيحية المكتوبة على السبورة
WHITEBOARD_TEACHER_PROMPT = """
أنت بروفيسور ومحاضر عبقري يشرح على سبورة بيضاء (Smart Whiteboard Professor).

قاعدة ذهبية حاسمة:
الأستاذ الحقيقي لا يكتب على السبورة نفس الجملة التي يقرأها بصوته! 
- بصوته (spoken_audio): يشرح، يفصل، ويسرد القصة بأسلوب حماسي ومفصل وسريع.
- على السبورة (whiteboard_note): يكتب فقط "نقاط مفتاحية موجزة، مصطلحات تقنية، أرقام، أسهم، وتلخيصات ذكية" تدعم كلامه ولا تكرره!

المطلوب منك:
عندما يسألك المستخدم عن أي موضوع (مثل: عمل الدبابة، كيف تعمل السيارة، نظام التشغيل، إلخ):
1. فصّل الموضوع بالكامل وبأكبر قدر ممكن من المشاهد المتسلسلة (scenes).
2. في كل مشهد، افصل تماماً بين ما يُقال وما يُكتب على السبورة.

يجب أن يكون ردك كائن JSON خالص وصالح فقط، وفق هذا النموذج الصارم:
{
  "title": "عنوان الدرس في أعلى السبورة",
  "scenes": [
    {
      "spoken_audio": "ما يقوله الأستاذ بصوته بالتفصيل والشرح السريع الممتع...",
      "whiteboard_note": "النقاط والمصطلحات التوضيحية التي يكتبها بقلم السبورة (مثلاً: 1. ضغط الاحتراق: 40 بار | توليد عزم دوراني | طاقة كيميائية ➔ ميكانيكية)",
      "sketch": "engine | piston | gear | tank_tread | armor | gun_barrel | missile | radar | wheel | fire | battery",
      "sketch_title": "اسم الجزء على السبورة (مثلاً: أسطوانة المحرك)",
      "arrow_to_next": "نص السهم الرابط إلى الخطوة القادمة (أو اتركه فارغاً في المشهد الأخير)",
      "image_query": "specific descriptive english query for transparent clipart image"
    }
  ]
}

قواعد أساسية:
- whiteboard_note: ممنوع تكرار الجملة المنطوقة! اجعلها ملاحظات ذكية، أرقام، مصطلحات إنجليزية/عربية مختصرة، وتلخيص رمزي.
- أنشئ أكبر عدد تحتاجه من المشاهد ليكون الشرح مفصلاً وشاملاً لكل جزء.
- الرد يجب أن يكون كود JSON فقط بدون أي مقدمات أو علامات markdown مثل ```json.
"""

def generate_whiteboard_plan(topic: str, config: dict) -> dict:
    llm_cfg = config.get("llm", {})
    api_url = llm_cfg.get("api_url", "http://127.0.0.1:8008/v1/chat/completions")
    api_key = llm_cfg.get("api_key", "sk-chatgpt-local-secret-key")
    model = llm_cfg.get("model", "gpt-4o")

    headers = {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    full_combined_prompt = f"""{WHITEBOARD_TEACHER_PROMPT}

المطلوب منك الآن:
اشرح هذا الموضوع بتفصيل واسع، وافصل تماماً بين الكلام المنطوق وملاحظات السبورة الذكية وفق نموذج الـ JSON:
"{topic}"
"""

    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": full_combined_prompt}
        ],
        "temperature": 0.5
    }

    response = requests.post(api_url, headers=headers, json=payload, timeout=90)
    response.raise_for_status()
    raw_content = response.json()["choices"][0]["message"]["content"]

    content = html.unescape(raw_content).strip()
    content = re.sub(r'\\&#x[0-9a-fA-F]+;', ' ', content)
    content = re.sub(r'&#x[0-9a-fA-F]+;', ' ', content)

    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    first_brace = content.find('{')
    last_brace = content.rfind('}')
    if first_brace != -1 and last_brace != -1:
        content = content[first_brace:last_brace + 1]

    try:
        return json.loads(content)
    except Exception:
        import json_repair
        repaired = json_repair.repair_json(content, return_objects=True)
        if isinstance(repaired, dict):
            return repaired
        raise
