import os
from gtts import gTTS

# สร้างโฟลเดอร์ words หากยังไม่มี
os.makedirs('words', exist_ok=True)

# แปลงข้อความในตัวแปร text เป็นไฟล์เสียง MP3 ภาษาไทย
text = "รถยนต์"
tts = gTTS(text=text, lang='th')
tts.save(f"words/{text}.mp3")

print(f"สร้างไฟล์ words/{text}.mp3 สำเร็จ!")