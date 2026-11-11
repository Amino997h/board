import json
import requests
import re
import html

# البرومبت الصارم: جمل متسلسلة، لكل جملة رسمة سكتش بالقلم الأسود + صورة
WHITEBOARD_DOODLE_PROMPT = """
أنت فنان ومعلم سبورة بيضاء يرسم سكتشات بسيطة وجميلة بقلم أسود متزامنة مع كل جملة ينطقها (Real Hand-Drawn Whiteboard Doodler).

مهمتك:
عندما يطلب منك المستخدم شرح موضوع:
1. تقسم الشرح إلى جمل قصيرة ومتسلسلة (بين 3 إلى 6 جمل متتالية).
2. لكل جملة، تحدد بالضبط ما الذي سيرسمه القلم الأسود على السبورة ليمثل هذه الجملة (رسمة سكتش بسيطة ومباشرة).
3. تحدد كلمة بحث بالإنجليزية لجلب صورة توضيحية من الإنترنت بجانب الرسمة.
4. تحدد نص السهم الأسود الذي سينطلق من هذه الرسمة إلى الرسمة التالية.

يجب أن يكون ردك كائن JSON خالص وصالح فقط، وفق هذا النموذج الصارم والمحدد:
{
  "title": "عنوان الدرس في أعلى السبورة",
  "sentences": [
    {
      "sentence_text": "نص الجملة الأولى التي ينطقها الأستاذ بصوته...",
      "doodle_type": "piston | gear | fire | car | wheel | cloud | atom | battery | wire | computer | server | bulb",
      "doodle_label": "عنوان السكتش البسيط بخط القلم (مثلاً: احتراق الوقود في المكبس)",
      "arrow_to_next": "نص يكتب فوق السهم المتجه للجملة التالية (أو اتركه null إذا كانت الجملة الأخيرة)",
      "image_query": "search query in english for transparent clipart image"
    }
  ]
}

قواعد أساسية:
- "sentences": مصفوفة متتابعة، كل عنصر فيها يمثل جملة واحدة منطوقة ورسمة سكتش واحدة مقابلة لها.
- "sentence_text": جمل واضحة وجميلة وسلسة بالفصحى.
- "doodle_type": اختر أقرب رمز تعبيري أو ميكانيكي (مثل: piston, gear, fire, car, wheel, cloud, atom, battery, bulb, computer, server).
- الرد يجب أن يكون كود JSON فقط، بدون أي مقدمات أو علامات markdown مثل ```json.
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

    full_combined_prompt = f"""{WHITEBOARD_DOODLE_PROMPT}

المطلوب منك الآن:
اشرح هذا الموضوع بحيث يكون لكل جملة رسمة سكتش مقابلة لها وفق نموذج الـ JSON الصارم أعلاه:
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
