import json
import os

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.json")

DEFAULT_CONFIG = {
    "llm": {
        "provider": "openai",
        "api_url": "https://api.openai.com/v1/chat/completions",
        "api_key": "",
        "model": "gpt-4o-mini"
    },
    "tts": {
        "engine": "edge-tts",
        "voice_ar": "ar-EG-ShakirNeural",
        "voice_en": "en-US-GuyNeural",
        "rate": "+0%"
    },
    "whiteboard": {
        "theme": "light",
        "auto_play": True
    }
}

def get_config():
    if not os.path.exists(CONFIG_PATH):
        save_config(DEFAULT_CONFIG)
        return DEFAULT_CONFIG
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            cfg = json.load(f)
            # دمج القيم الافتراضية
            for k, v in DEFAULT_CONFIG.items():
                if k not in cfg:
                    cfg[k] = v
            return cfg
    except Exception as e:
        print(f"Error reading config: {e}")
        return DEFAULT_CONFIG

def save_config(new_config):
    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(new_config, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving config: {e}")
        return False
