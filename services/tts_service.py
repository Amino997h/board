import asyncio
import os

async def synthesize_speech(text: str, output_path: str, lang: str = "ar", voice: str = None, rate: str = "+30%") -> bool:
    """
    تحويل النص إلى صوت طبيعي باستخدام edge-tts مع ضبط سرعة الكلام 1.3x (+30%)
    """
    if not voice:
        voice = "ar-SA-HamedNeural" if lang == "ar" else "en-US-GuyNeural"
        
    try:
        import edge_tts.communicate
        import edge_tts.constants
        
        edge_tts.communicate.WSS_URL = (
            "wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1"
            f"?Ocp-Apim-Subscription-Key={edge_tts.constants.TRUSTED_CLIENT_TOKEN}"
        )
        
        # تمرير rate=+30% لزيادة السرعة إلى 1.3
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        await communicate.save(output_path)
        if os.path.exists(output_path) and os.path.getsize(output_path) > 500:
            return True
    except Exception as e:
        print(f"Edge-TTS attempt failed: {e}")

    # خط الدفاع الثاني gTTS
    try:
        from gtts import gTTS
        tts = gTTS(text=text, lang="ar" if lang == "ar" else "en")
        tts.save(output_path)
        if os.path.exists(output_path) and os.path.getsize(output_path) > 500:
            return True
    except Exception as e_gtts:
        print(f"gTTS fallback failed: {e_gtts}")

    return False
