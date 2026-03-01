import os
from PIL import Image

# Paths
base_dir = r"d:\SAGE_Egypt_App_Production_v4\sage-app-mobile\android\app\src\main\res"
icon_master = r"C:\Users\ACCSEE\.gemini\antigravity\brain\00adce6a-1664-44f8-9159-607aa226790d\sage_app_icon_master_1772396833327.png"
splash_master = r"C:\Users\ACCSEE\.gemini\antigravity\brain\00adce6a-1664-44f8-9159-607aa226790d\sage_splash_screen_master_1772396845160.png"

# Icon Sizes (Android Mipmap)
icon_configs = [
    ("mipmap-mdpi", 48),
    ("mipmap-hdpi", 72),
    ("mipmap-xhdpi", 96),
    ("mipmap-xxhdpi", 144),
    ("mipmap-xxxhdpi", 192),
]

# Splash Sizes (Android Drawable)
splash_configs = [
    ("drawable-mdpi", (320, 480)),
    ("drawable-hdpi", (480, 800)),
    ("drawable-xhdpi", (720, 1280)),
    ("drawable-xxhdpi", (960, 1600)),
    ("drawable-xxxhdpi", (1280, 1920)),
]

def process_icons():
    img = Image.open(icon_master).convert("RGBA")
    for folder, size in icon_configs:
        target_path = os.path.join(base_dir, folder)
        if not os.path.exists(target_path): os.makedirs(target_path)
        
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(os.path.join(target_path, "ic_launcher.png"))
        resized.save(os.path.join(target_path, "ic_launcher_round.png"))
        resized.save(os.path.join(target_path, "ic_launcher_foreground.png"))
        print(f"Updated icons in {folder}")

def process_splash():
    img = Image.open(splash_master).convert("RGB")
    for folder, size in splash_configs:
        target_path = os.path.join(base_dir, folder)
        if not os.path.exists(target_path): os.makedirs(target_path)
        
        resized = img.resize(size, Image.Resampling.LANCZOS)
        resized.save(os.path.join(target_path, "splash.png"))
        print(f"Updated splash in {folder}")

if __name__ == "__main__":
    process_icons()
    process_splash()
    print("Branding update complete.")
