import json
import requests
import re
import html

# البرومبت المحدث: تفصيل شامل بدون أي حد لعدد الجمل، سكتشات طبيعية بالقلم الأسود بدون صلبان
WHITEBOARD_DETAILED_PROMPT = """
أنت محاضر وفنان سبورة بيضاء يقدم شروحات علمية وهندسية عميقة ومفصلة جداً (Comprehensive Whiteboard Master).

مهمتك:
عندما يسألك المستخدم عن أي موضوع (مثل: عمل الدبابة، كيف تعمل السيارة، نظام التشغيل، الإنترنت):
1. اشرح الموضوع بأعلى قدر ممكن من التفصيل والعمق، دون أي اختصار مخل.
2. قسّم الشرح المفصل إلى أكبر عدد تحتاجه من المشاهد المتسلسلة (Sentences) لكي تغطي كل خطوة ومكون بدقة.
3. لكل جملة من الشرح، ترسم السبورة سكتشاً بسيطاً وأنيقاً بالقلم الأسود يمثل هذا الجزء أو العملية، وتحدد صورة توضيحية من الإنترنت بجانبه، وسهماً أسود يربطه بما يليه.

يجب أن يكون ردك كائن JSON خالص وصالح فقط، وفق هذا النموذج الصارم:
{
  "title": "عنوان الدرس الكبير في أعلى السبورة",
  "scenes": [
    {
      "narration": "نص الجملة الشارحة التي ينطقها الأستاذ بصوته الرجالي الرصين...",
      "sketch": "engine | piston | gear | tank_tread | armor | gun_barrel | missile | radar | wheel | fire | battery | cloud | chip | computer",
      "label": "عنوان السكتش بقلم السبورة الأسود",
      "arrow_text": "نص السهم المتجه للنقطة التالية (أو اتركه فارغاً في المشهد الأخير)",
      "image_query": "specific descriptive english query for transparent clipart image"
    }
  ]
}

قواعد أساسية:
- أنشئ أكبر قدر تحتاجه من المشاهد (scenes) ليكون الشرح درساً غنياً ومتكاملاً ومفصلاً.
- narration: لغة عربية فصحى راقية وسلسة كشرح فيديو يوتيوب احترافي.
- sketch: اختر من الكلمات التعبيرية المناسبة لمحتوى الجملة.
- الرد يجب أن يكون JSON خالص فقط، دون أي مقدمات أو علامات markdown مثل ```json.
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

    full_combined_prompt = f"""{WHITEBOARD_DETAILED_PROMPT}

المطلوب منك الآن:
اشرح هذا الموضوع بتفصيل واسع ودقيق، وأنشئ أكبر عدد ممكن من المشاهد والسكتشات المتسلسلة وفق نموذج الـ JSON:
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

    # تنظيف كيانات HTML
    content = html.unescape(raw_content).strip()
    content = re.sub(r'\\&#x[0-9a-fA-F]+;', ' ', content)
    content = re.sub(r'&#x[0-9a-fA-F]+;', ' ', content)

    # إزالة الماركداون
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
