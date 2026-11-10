import urllib.request
import urllib.parse
import re
import os
from PIL import Image

def scrape_bing_images(query: str, max_results: int = 5):
    """
    جلب روابط صور توضيحية من محرك بحث Bing دون الحاجة لمفتاح API
    مع إضافة كلمات بحث لطلب صور كرتونية أو أيقونات مفرغة (Whiteboard friendly)
    """
    search_query = f"{query} clipart png transparent"
    url = "https://www.bing.com/images/async?q=" + urllib.parse.quote(search_query) + "&first=1&count=15"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept-Language': 'ar,en-US;q=0.7,en;q=0.3'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        html = urllib.request.urlopen(req, timeout=8).read().decode('utf-8')
        urls = re.findall(r'murl&quot;:&quot;(.*?)&quot;', html)
        if not urls:
            urls = re.findall(r'murl\":\"(.*?)\"', html)
        return urls[:max_results]
    except Exception as e:
        print(f"Error scraping image for '{query}': {e}")
        return []

def download_image(url: str, save_path: str) -> bool:
    """
    تنزيل الصورة والتحقق من سلامتها
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    }
    safe_url = urllib.parse.quote(url, safe=':/&?=#+;@%')
    req = urllib.request.Request(safe_url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            with open(save_path, 'wb') as f:
                f.write(response.read())
                
        # التحقق من صحة الصورة
        with Image.open(save_path) as img:
            img.verify()
        return True
    except Exception:
        if os.path.exists(save_path):
            try:
                os.remove(save_path)
            except:
                pass
        return False
