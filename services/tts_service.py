import asyncio
import os

async def synthesize_speech(text: str, output_path: str, lang: str = "ar", voice: str = None) -> bool:
    """
    تحويل النص إلى صوت طبيعي باستخدام edge-tts مع توجيه الـ WebSocket المضمون (من مستودع shorts)
    أو عبر pyttsx3 / gTTS كخط دفاع ثانٍ
    """
    if not voice:
        voice = "ar-EG-ShakirNeural" if lang == "ar" else "en-US-GuyNeural"
        
    # 1. المحاولة عبر edge-tts مع توجيه السيرفر
    try:
        import edge_tts.communicate
        import edge_tts.constants
        
        # التوجيه المعتمد لمنع أخطاء 403 Forbidden
        edge_tts.communicate.WSS_URL = (
            "wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1"
            f"?Ocp-Apim-Subscription-Key={edge_tts.constants.TRUSTED_CLIENT_TOKEN}"
        )
        
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(output_path)
        if os.path.exists(output_path) and os.path.getsize(output_path) > 500:
            return True
    except Exception as e:
        print(f"Edge-TTS attempt failed: {e}")

    # 2. خط الدفاع الثاني: gTTS السريع والمجاني المضمون
    try:
        from gtts import gTTS
        tts = gTTS(text=text, lang="ar" if lang == "ar" else "en")
        tts.save(output_path)
        if os.path.exists(output_path) and os.path.getsize(output_path) > 500:
            return True
    except Exception as e_gtts:
        print(f"gTTS fallback failed: {e_gtts}")

    return False
