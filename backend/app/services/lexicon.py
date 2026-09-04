"""Multilingual distress lexicons. Identity attributes are never used as risk predictors."""

from __future__ import annotations

# Normalized lowercase matching. Includes English, Hindi (Devanagari), and Hinglish.
DISTRESS = [
    "scared", "afraid", "terrified", "panic", "anxious", "helpless", "hopeless",
    "overwhelmed", "crying", "cannot cope", "breaking down", "shaking",
    "dar", "darr", "ghabra", "pareshan", "tension", "dukhi", "udaas", "ro raha",
    "ro rahi", "himmat nahi", "thak gaya", "thak gayi",
    # Hindi / Marathi
    "डर", "घबरा", "परेशान", "तनाव", "दुखी", "उदास", "रो", "हिम्मत नहीं", "टूट",
    "भीती", "घाबरलो", "घाबरले", "त्रास", "रडतो", "रडते",
    # Bengali
    "ভয়", "ভীত", "কান্না", "অসহায়", "হতাশ", "উদ্বিগ্ন",
    # Tamil
    "பயம்", "பயப்படுகிறேன்", "அழுகை", "மன அழுத்தம்", "தவிப்பு",
    # Telugu
    "భయం", "భయపడుతున్నాను", "ఏడుపు", "ఆందోళన", "బాధ",
]

FEAR_THREAT = [
    "threat", "threatened", " intimidat", "blackmail", "warning", "they will hurt",
    "if i tell", "don't tell anyone", "they are watching", "follow me", "stalk",
    "dhamki", "dhamki di", "blackmail", "daraya", "daraya dhamkaya",
    # Hindi / Marathi
    "धमक", "ब्लैकमेल", "डराने", "पीछा", "देख रहे",
    "धमकी", "धमकावले",
    # Bengali
    "হুমকি", "ভয় দেখাচ্ছে", "পিছু নিচ্ছে",
    # Tamil
    "மிரட்டல்", "பயமுறுத்துகிறார்கள்", "துரத்துகிறார்கள்",
    # Telugu
    "బెదిరింపు", "భయపెడుతున్నారు",
]

ISOLATION = [
    "boycott", "no one talks", "alone", "isolated", "kicked out", "not allowed out",
    "family cut off", "social boycott", "locked in",
    "akela", "akeli", "kisi se baat nahi", "bahar nahi", "ghar se nikal",
    # Hindi / Marathi
    "एकांत", "बहिष्कार", "अकेला", "अकेली", "बाहर नहीं", "बात नहीं",
    "एकटे", "एकटी", "घरात डांबले",
    # Bengali
    "একা", "আলাদা", "বন্দী", "একঘরে",
    # Tamil
    "தனிமை", "யாரும் பேசவில்லை", "பூட்டி வைத்துள்ளனர்",
    # Telugu
    "ఒంటరిగా", "ఎవరూ మాట్లాడరు", "బంధించారు",
]

VIOLENCE_MEDICAL = [
    "hit me", "beat me", "beaten", "bleeding", "injury", "injured", "weapon",
    "knife", "gun", "burn", "rape", "assault", "attacked", "hospital",
    "unconscious", "fracture", "choke", "strangle",
    "maara", "maarte", "khoon", "chot", "zabardasti", "balatkar", "hamla",
    # Hindi / Marathi
    "मारा", "मारते", "खून", "चोट", "जबर्दस्ती", "बलात्कार", "हमला", "घायल",
    "हथियार", "चाकू", "मारहाण", "जखमी", "रक्त",
    # Bengali
    "মারধর", "আঘাত", "রক্তপাত", "হাসপাতাল", "হামলা", "অত্যাচার",
    # Tamil
    "அடித்தார்கள்", "தாக்குதல்", "ரத்தம்", "காயம்", "மருத்துவமனை",
    # Telugu
    "కొట్టారు", "దాడి", "రక్తం", "గాయం", "ఆసుపత్రి",
]

SELF_HARM = [
    "kill myself", "suicide", "suicidal", "end my life", "want to die",
    "better off dead", "self harm", "self-harm", "cut myself", "no reason to live",
    "i will jump", "take my life",
    "marna chahta", "marna chahti", "khudkushi", "jaan de dunga", "jaan de dungi",
    "zinda nahi", "jeena nahi", "khud ko maar",
    # Hindi / Marathi
    "आत्महत्या", "खुदकुशी", "मरना चाहत", "जान दे", "जीना नहीं", "खुद को मार",
    "जीव देणे", "मरायचे आहे",
    # Bengali
    "আত্মহত্যা", "মরতে চাই", "বেঁচে থাকার ইচ্ছা নেই",
    # Tamil
    "தற்கொலை", "சாக வேண்டும்", "உயிரை மாய்த்துக்",
    # Telugu
    "ఆత్మహత్య", "చనిపోవాలని ఉంది", "ప్రాణం తీసుకుంటా",
]

ONGOING_DANGER = [
    "still here", "he is here", "she is here", "they are outside", "cannot leave",
    "locked", "right now they", "coming back", "still hurting", "not safe",
    "abhi yahin", "bahar khade", "ghar mein hai", "ja nahi sakta", "ja nahi sakti",
    # Hindi / Marathi
    "अभी यहाँ", "बाहर खड़े", "निकल नहीं", "सुरक्षित नहीं", "अभी मार",
    "अजून इथेच", "बाहेर उभे",
    # Bengali
    "এখনো এখানে", "বাইরে দাঁড়িয়ে", "বেরোতে পারছি না", "বিপদ",
    # Tamil
    "இன்னும் இங்கே இருக்கிறார்கள்", "வெளியே நிற்கிறார்கள்", "வெளியே போக முடியவில்லை",
    # Telugu
    "ఇంకా ఇక్కడే ఉన్నారు", "బయట ఉన్నారు", "వెళ్లలేను",
]

ASSISTANCE_REQUEST = [
    "need a lawyer", "legal help", "police complaint", "fir", "medical help",
    "doctor", "counselor", "counselling", "counseling", "helpline", "shelter",
    "protection", "witness", "how to complain", "nhaa", "14566",
    "vakil", "shikayat", "complaint", "ilaj", "salah",
    # Hindi / Marathi
    "वकील", "शिकायत", "पुलिस", "डॉक्टर", "परामर्श", "हेल्पलाइन",
    "कायदा", "तक्रार", "मदत",
    # Bengali
    "আইনজীবী", "অভিযোগ", "পুলিশ", "ডাক্তার", "পরামর্শ", "সাহায্য",
    # Tamil
    "வழக்கறிஞர்", "புகார்", "காவல்துறை", "மருத்துவர்", "உதவி", "ஆலோசனை",
    # Telugu
    "న్యాయవాది", "ఫిర్యాదు", "పోలీస్", "డాక్టర్", "సహాయం", "సలహా",
]

IMMEDIATE_SAFETY_NO = [
    "not safe", "i am not safe", "unsafe", "in danger", "they can hear",
    "main safe nahi", "khatra", "danger mein",
    # Hindi / Marathi
    "सुरक्षित नहीं", "खतरे", "सहेज नहीं",
    "सुरक्षित नाही", "धोक्यात",
    # Bengali
    "নিরাপদ নই", "বিপদে আছি",
    # Tamil
    "பாதுகாப்பற்ற", "ஆபத்தில் இருக்கிறேன்", "பாதுகாப்பாக இல்லை",
    # Telugu
    "సురక్షితంగా లేను", "ప్రమాదంలో ఉన్నాను",
]


def normalize(text: str) -> str:
    return (text or "").lower().replace("’", "'")


def count_hits(text: str, phrases: list[str]) -> list[str]:
    n = normalize(text)
    found: list[str] = []
    for p in phrases:
        token = p.strip().lower()
        if token and token in n:
            found.append(token)
    return found
