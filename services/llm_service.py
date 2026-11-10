import json
import requests
import re

# موجه النظام العام والمرن: لا يحدد عدداً معيناً للعناصر بل يعطي لغة أوامر عامة للسبورة
WHITEBOARD_DSL_SYSTEM_PROMPT = """
أنت محرك ذكاء اصطناعي تفاعلي لرسم وشرح الدروس على سبورة بيضاء (AI Whiteboard Engine).
مهمتك: عندما يطلب منك المستخدم شرح أي موضوع علمي أو تقني أو هندسي أو غيره:
1. أنت من يقرر بحرية كاملة عدد العناصر والمكونات التي يحتاجها الشرح (سواء كانت 2 أو 4 أو 6 أو 10 عناصر بحسب عمق الموضوع).
2. تكتب سكريبت الشرح الصوتي الكامل والمتواصل.
3. تخرج خطة السبورة على شكل قائمة ديناميكية من العناصر المرئية المتزامنة مع الصوت، دون أي تقييد بعدد محدد.

يجب أن يكون ردك كائن JSON خالص وصالح فقط، وفق هذا النموذج العام:
{
  "title": "عنوان الدرس الذي سيكتب في أعلى السبورة",
  "full_speech": "نص الشرح الصوتي الكامل الممتع الذي سيلقيه الأستاذ من أول ثانية لآخر ثانية...",
  "elements": [
    {
      "id": "معرف فريد للعنصر مثل elem1 أو engine",
      "type": "box | circle | note",
      "label": "النص أو العنوان المكتوب داخل العنصر",
      "subtitle": "نص توضيحي قصير أو دور ووظيفة هذا المكون يكتب تحته",
      "image_query": "كلمة بحث بالإنجليزية لجلب صورة توضيحية من النت لهذا العنصر، أو اتركه فارغاً",
      "color": "كود لون سداسي مثل #2563eb أو #10b981 أو #7c3aed أو #dc2626",
      "appearance_time": 3.5
    }
  ],
  "connections": [
    {
      "from": "معرف العنصر الأول",
      "to": "معرف العنصر الثاني",
      "label": "نص يكتب فوق السهم لتوضيح العلاقة أو التدفق",
      "color": "#f59e0b",
      "appearance_time": 5.0
    }
  ]
}

قواعد عامة للمحرك:
- "appearance_time": يجب أن يكون التوقيت دقيقاً جداً بالثانية (float)، ومطابقاً للحظة التي يبدأ فيها الأستاذ في نطق اسم هذا الجزء في full_speech تماماً.
- "subtitle": الوظيفة والدور تكون واضحة وموجزة ومباشرة لتناسب بطاقة الشرح.
- البرنامج سيقوم بحساب الإحداثيات وتوزيع العناصر وتوسيطها تلقائياً على السبورة أياً كان عددها.
- الرد يجب أن يكون JSON فقط، دون أي مقدمات أو علامات markdown مثل ```json.
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

    full_combined_prompt = f"""{WHITEBOARD_DSL_SYSTEM_PROMPT}

المطلوب منك الآن:
اشرح هذا الموضوع بالتفصيل على السبورة وفق نموذج الـ JSON أعلاه:
"{topic}"
"""

    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": full_combined_prompt}
        ],
        "temperature": 0.6
    }

    response = requests.post(api_url, headers=headers, json=payload, timeout=90)
    response.raise_for_status()
    raw_content = response.json()["choices"][0]["message"]["content"]

    import html
    # 1. تنظيف كيانات HTML مثل &#x20; و &quot; الناتجة عن نسخ متصفح ChatGPT
    content = html.unescape(raw_content).strip()

    # 2. إزالة أي مسافات أو شرطات مائلة مشوهة بعد القوس المباشر
    content = re.sub(r'\\&#x[0-9a-fA-F]+;', ' ', content)
    content = re.sub(r'&#x[0-9a-fA-F]+;', ' ', content)

    # 3. إزالة أسوار الماركداون
    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    # 4. استخراج كائن الـ JSON الدقيق بين أول { وآخر }
    first_brace = content.find('{')
    last_brace = content.rfind('}')
    if first_brace != -1 and last_brace != -1:
        content = content[first_brace:last_brace + 1]

    # 5. محاولة القراءة المباشرة، مع الإصلاح الذاتي عبر json_repair
    try:
        return json.loads(content)
    except Exception:
        import json_repair
        repaired = json_repair.repair_json(content, return_objects=True)
        if isinstance(repaired, dict):
            return repaired
        raise
