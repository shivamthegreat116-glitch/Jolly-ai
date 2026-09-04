"""Empathetic, non-interrogative conversation policy."""

from __future__ import annotations

from app.services.nlp import detect_language, detect_support_intent
from app.services.rag import retrieve
from app.services.svi import SVIResult

COPY = {
    "en": {
        "greet": (
            "Hello! 👋 I am Jolly AI, here to listen and help you find support at your own pace. "
            "(Note: I am a support and triage tool, not a medical or emergency service 🛡️). "
            "Feel free to skip anything you don't wish to share. 💙"
        ),
        "ask_safe": "First, are you in a safe place right now? 🛡️",
        "unsafe": (
            "Thank you for telling me. 💙 If you are in immediate danger, please reach out to local emergency services (112) right away. 🚨 "
            "I will not contact anyone unless you clearly choose to. Are you in immediate danger right now?"
        ),
        "ask_need": (
            "How can I best support you today? 🤝\n"
            "• Emotional support 💬\n"
            "• Legal guidance ⚖️\n"
            "• Medical help 🏥\n"
            "• Complaint pathway (NHAA 14566) 📋\n\n"
            "Or feel free to tell me in your own words."
        ),
        "narrate": (
            "I'm here and listening. 💬 Please take your time and share as much or as little as you feel comfortable with — there is no rush or pressure."
        ),
        "crisis": (
            "I hear how painful and difficult things are right now. Please know that you are not alone. 💙 "
            "If you are in immediate danger or need urgent help, please reach out to emergency services (112) or the National Helpline (14566). 🛡️ "
            "I will never contact anyone without your explicit confirmation."
        ),
        "closing": (
            "Thank you for trusting this space. 🙏 Next, you can review a brief summary and adjust anything you wish before choosing whether to share it."
        ),
    },
    "hi": {
        "greet": (
            "नमस्ते! 👋 मैं Jolly AI हूँ। मैं आपकी बात सुनने और आपकी गति से सहायता पाने में मदद करने के लिए यहाँ हूँ। "
            "(ध्यान दें: यह एक सहायता और ट्राइएज साधन है, चिकित्सा या आपातकालीन सेवा नहीं 🛡️)। "
            "जो बात आप साझा नहीं करना चाहते, उसे छोड़ सकते हैं। 💙"
        ),
        "ask_safe": "सबसे पहले: क्या आप इस समय जहाँ हैं, वहाँ सुरक्षित महसूस कर रहे हैं? 🛡️",
        "unsafe": (
            "बताने के लिए धन्यवाद। 💙 यदि आप तुरंत खतरे में हैं, तो कृपया आपातकालीन सेवा (112) से संपर्क करें। 🚨 "
            "आपकी स्पष्ट सहमति के बिना मैं किसी से संपर्क नहीं करूँगा। क्या आप अभी तत्काल खतरे में हैं?"
        ),
        "ask_need": (
            "आज मैं आपकी किस प्रकार सहायता कर सकता हूँ? 🤝\n"
            "• भावनात्मक सहारा 💬\n"
            "• कानूनी मार्गदर्शन ⚖️\n"
            "• चिकित्सा सहायता 🏥\n"
            "• शिकायत प्रक्रिया (NHAA 14566) 📋\n\n"
            "या आप अपने शब्दों में भी बता सकते हैं।"
        ),
        "narrate": "मैं सुन रहा/रही हूँ। 💬 आप जितना सहज महसूस करें उतना ही साझा करें — कोई दबाव या जल्दबाज़ी नहीं है।",
        "crisis": (
            "मैं समझ सकता/सकती हूँ कि यह समय आपके लिए बहुत कठिन है। आप अकेले नहीं हैं। 💙 "
            "तत्काल खतरे में कृपया आपातकालीन सेवा (112) या राष्ट्रीय हेल्पलाइन (14566) पर संपर्क करें। 🛡️ "
            "आपकी स्पष्ट पुष्टि के बिना किसी को भी सूचित नहीं किया जाएगा।"
        ),
        "closing": "मुझ पर विश्वास करने के लिए धन्यवाद। 🙏 आगे आप एक छोटा सारांश देख सकते हैं और साझा करने से पहले बदलाव कर सकते हैं।",
    },
    "hinglish": {
        "greet": (
            "Hello! 👋 Main Jolly AI hoon. Main yahan aapki baat sunne aur aapki pace par support dhundhne ke liye hoon. "
            "(Note: Yeh ek support aur triage tool hai, medical ya emergency service nahi 🛡️). "
            "Jo share nahi karna chahte, skip kar sakte hain. 💙"
        ),
        "ask_safe": "Pehle ek zaroori check: kya aap abhi jahan hain, wahan safe feel kar rahe hain? 🛡️",
        "unsafe": (
            "Batane ke liye thank you. 💙 Agar turant koi khatra hai, toh emergency help (112) par contact karein. 🚨 "
            "Main aapki permission ke bina kisi ko contact nahi karunga. Kya aap abhi immediate danger mein hain?"
        ),
        "ask_need": (
            "Main aaj aapki kaise madad kar sakta hoon? 🤝\n"
            "• Emotional support 💬\n"
            "• Legal guidance ⚖️\n"
            "• Medical help 🏥\n"
            "• Complaint pathway (NHAA 14566) 📋\n\n"
            "Ya fir aap apne words mein bata sakte hain."
        ),
        "narrate": "Main sun raha hoon. 💬 Jitna comfortable feel karein utna hi share karein — koi pressure nahi hai.",
        "crisis": (
            "Lagta hai aap bahut mushkil waqt se guzar rahe hain. Aap akele nahi hain. 💙 "
            "Urgent help ke liye please emergency (112) ya National Helpline (14566) par contact karein. 🛡️ "
            "Aapke confirm kiye bina kisi ko bhi contact nahi kiya jayega."
        ),
        "closing": "Trust karne ke liye thank you. 🙏 Aage aap short summary dekh kar change kar sakte hain, share karne se pehle.",
    },
    "mr": {
        "greet": (
            "नमस्कार! 👋 मी Jolly AI आहे, आपले म्हणणे ऐकण्यासाठी आणि आपल्या गतीने मदत मिळवण्यासाठी मी येथे आहे. "
            "(सूचना: हे एक साहाय्य साधन आहे, वैद्यकीय किंवा आपत्कालीन सेवा नाही 🛡️). "
            "आपण जे सांगू इच्छित नाही ते सोडू शकता. 💙"
        ),
        "ask_safe": "प्रथम: आपण सध्या जिथे आहात तिथे सुरक्षित आहात का? 🛡️",
        "unsafe": (
            "सांगितल्याबद्दल धन्यवाद. 💙 तत्काळ धोका असल्यास कृपया स्थानिक आपत्कालीन सेवेशी (112) संपर्क साधा. 🚨 "
            "आपल्या स्पष्ट निवडीशिवाय कोणाशीही संपर्क साधला जाणार नाही. आपण आता तातडीच्या धोक्यात आहात का?"
        ),
        "ask_need": (
            "मी आपल्याला कशी मदत करू शकतो? 🤝\n"
            "• भावनिक आधार 💬\n"
            "• कायदेशीर मार्गदर्शन ⚖️\n"
            "• वैद्यकीय मदत 🏥\n"
            "• तक्रार मार्ग (NHAA 14566) 📋\n\n"
            "किंवा आपण आपल्या शब्दांतही सांगू शकता."
        ),
        "narrate": "मी ऐकत आहे. 💬 आपल्या सोयीनुसार माहिती सामायिक करा — कोणताही दबाव नाही.",
        "crisis": (
            "आपण अत्यंत कठीण परिस्थितीतून जात आहात हे समजते. आपण एकटे नाही आहात. 💙 "
            "तत्काळ धोक्यात कृपया आपत्कालीन मदत (112) किंवा हेल्पलाईन 14566 चा विचार करा. 🛡️ "
            "आपण पुष्टी करेपर्यंत कोणाशीही संपर्क साधला जाणार नाही."
        ),
        "closing": "विश्वासाबद्दल धन्यवाद. 🙏 आपण पुढील सारांश तपासून शेअर करण्यापूर्वी बदलू शकता.",
    },
    "bn": {
        "greet": (
            "নমস্কার! 👋 আমি Jolly AI, আপনার কথা শুনতে এবং আপনার সুবিধামতো সহায়তা খুঁজে পেতে এখানে আছি। "
            "(এটি একটি সহায়তা ও ট্রায়াজ টুল, কোনো চিকিৎসা বা জরুরি পরিষেবা নয় 🛡️)। "
            "আপনি যা ভাগ করতে চান না তা এড়িয়ে যেতে পারেন। 💙"
        ),
        "ask_safe": "প্রথমে জানতে চাই: আপনি এখন যেখানে আছেন সেখানে কি সুরক্ষিত বোধ করছেন? 🛡️",
        "unsafe": (
            "জানানোর জন্য ধন্যবাদ। 💙 তাৎক্ষণিক বিপদ হলে অনুগ্রহ করে স্থানীয় জরুরি পরিষেবায় (১১২) যোগাযোগ করুন। 🚨 "
            "আপনার অনুমতি ছাড়া কাউকে যোগাযোগ করা হবে না। আপনি কি এখন তাৎক্ষণিক বিপদে আছেন?"
        ),
        "ask_need": (
            "আমি কীভাবে আপনাকে সাহায্য করতে পারি? 🤝\n"
            "• মানসিক সমর্থন 💬\n"
            "• আইনি পরামর্শ ⚖️\n"
            "• চিকিৎসা সহায়তা 🏥\n"
            "• অভিযোগের নির্দেশিকা (NHAA 14566) 📋\n\n"
            "অথবা নিজের ভাষায়ও বলতে পারেন।"
        ),
        "narrate": "আমি শুনছি। 💬 যতটা স্বাচ্ছন্দ্য বোধ করেন ততটা বলুন — কোনো চাপ নেই।",
        "crisis": (
            "বুঝতে পারছি আপনি খুব কঠিন সময়ের মধ্য দিয়ে যাচ্ছেন। আপনি একা নন। 💙 "
            "জরুরি বিপদে অনুগ্রহ করে ১১২ অথবা জাতীয় হেল্পলাইন ১৪৫৬৬-এ যোগাযোগ করুন। 🛡️ "
            "আপনি নিশ্চিত না করা পর্যন্ত কোনো কর্তৃপক্ষকে জানানো হবে না।"
        ),
        "closing": "ভরোসা রাখার জন্য ধন্যবাদ। 🙏 আপনি শেয়ার করার আগে সারসংক্ষেপটি দেখে সম্পাদনা করতে পারেন।",
    },
    "ta": {
        "greet": (
            "வணக்கம்! 👋 நான் Jolly AI, உங்கள் குரலைக் கேட்கவும் உங்களுக்கு உதவவும் இங்கே இருக்கிறேன். "
            "(குறிப்பு: இது ஒரு உதவி சாதனம், மருத்துவ அல்லது அவசர சேவை அல்ல 🛡️). "
            "நீங்கள் பகிர விரும்பாததை தவிர்க்கலாம். 💙"
        ),
        "ask_safe": "முதலில்: நீங்கள் இப்போது இருக்கும் இடத்தில் பாதுகாப்பாக உணர்கிறீர்களா? 🛡️",
        "unsafe": (
            "தெரிவித்ததற்கு நன்றி. 💙 உடனடி ஆபத்து இருந்தால் அவசர சேவையை (112) தொடர்பு கொள்ளவும். 🚨 "
            "உங்கள் அனுமதியின்றி யாரும் தொடர்பு கொள்ளப்பட மாட்டார்கள். இப்போது உடனடி ஆபத்தில் இருக்கிறீர்களா?"
        ),
        "ask_need": (
            "நான் உங்களுக்கு எவ்வாறு உதவ முடியும்? 🤝\n"
            "• உணர்ச்சிபூர்வ ஆதரவு 💬\n"
            "• சட்ட ஆலோசனை ⚖️\n"
            "• மருத்துவ உதவி 🏥\n"
            "• புகார் வழிகாட்டல் (NHAA 14566) 📋\n\n"
            "அல்லது உங்கள் சொந்த வார்த்தைகளிலும் கூறலாம்."
        ),
        "narrate": "நான் கேட்கிறேன். 💬 உங்களுக்கு வசதியான அளவு பகிருங்கள் — எந்த அழுத்தமும் இல்லை.",
        "crisis": (
            "நீங்கள் கடினமான சூழ்நிலையில் உள்ளீர்கள் என்பதை உணர்கிறேன். நீங்கள் தனியாக இல்லை. 💙 "
            "அவசர உதவி தேவைப்பட்டால் 112 அல்லது 14566 என்ற எண்ணை அணுகவும். 🛡️ "
            "உங்கள் அனுமதியின்றி யாரும் தொடர்பு கொள்ளப்பட மாட்டார்கள்."
        ),
        "closing": "நம்பிக்கைக்கு நன்றி. 🙏 பகிர்வதற்கு முன் நீங்கள் சுருக்கத்தைப் பார்த்து மாற்றங்களைச் செய்யலாம்.",
    },
    "te": {
        "greet": (
            "నమస్కారం! 👋 నేను Jolly AI, మీ మాట వినడానికి మరియు సహాయం అందించడానికి ఇక్కడ ఉన్నాను. "
            "(గమనిక: ఇది సహాయ సాధనం మాత్రమే, వైద్య లేదా అత్యవసర సేవ కాదు 🛡️). "
            "మీరు చెప్పకూడదనుకునే వివరాలను దాటవేయవచ్చు. 💙"
        ),
        "ask_safe": "ముందుగా: మీరు ప్రస్తుతం ఉన్న చోట సురక్షితంగా ఉన్నారా? 🛡️",
        "unsafe": (
            "తెలిపినందుకు ధన్యవాదాలు. 💙 అత్యవసర ప్రమాదం ఉంటే దయచేసి అత్యవసర సేవలను (112) సంప్రదించండి. 🚨 "
            "మీ అనుమతి లేకుండా ఎవరినీ సంప్రదించము. మీరు ప్రస్తుతం ప్రమాదంలో ఉన్నారా?"
        ),
        "ask_need": (
            "నేను మీకు ఎలా సహాయపడగలను? 🤝\n"
            "• మానసిక మద్దతు 💬\n"
            "• చట్టపరమైన సలహా ⚖️\n"
            "• వైద్య సహాయం 🏥\n"
            "• ఫిర్యాదు ప్రక్రియ (NHAA 14566) 📋\n\n"
            "లేదా మీ మాటల్లోనే చెప్పవచ్చు."
        ),
        "narrate": "నేను వింటున్నాను. 💬 మీకు సౌకర్యంగా ఉన్నంతవరకు పంచుకోండి — ఎటువంటి ఒత్తిడి లేదు.",
        "crisis": (
            "మీరు చాలా కష్ట సమయంలో ఉన్నారని అర్థం చేసుకోగలను. మీరు ఒంటరిగా లేరు. 💙 "
            "తక్షణ సహాయం కోసం 112 లేదా 14566 ను సంప్రదించండి. 🛡️ "
            "మీరు నిర్ధారించే వరకు ఎవరికీ సమాచారం అందించబడదు."
        ),
        "closing": "నమ్మకానికి ధన్యవాదాలు. 🙏 భాగస్వామ్యం చేయడానికి ముందు మీరు సారాంశాన్ని సరిచూసుకోవచ్చు.",
    },
}


def locale(lang: str) -> dict:
    return COPY.get(lang) or COPY["en"]


def next_assistant_reply(
    *,
    language: str,
    user_text: str,
    phase: str,
    svi: SVIResult | None,
) -> tuple[str, str, list[dict]]:
    """Returns (reply, next_phase, rag_citations)."""
    lang = language if language in COPY else detect_language(user_text) or "en"
    t = locale(lang)
    citations: list[dict] = []
    low = (user_text or "").lower()

    crisis = bool(svi and svi.crisis_mode)

    if crisis:
        citations = retrieve(user_text or "emergency helpline", k=3)
        if any(w in low for w in ["theek", "thik", "fine", "better", "safe", "ok", "okay", "हाँ", "ठीक", "hello", "हैलो", "hear me", "sun rahe"]):
            return t["narrate"], "narrate", citations
        return t["crisis"], "crisis", citations

    if phase in {"start", "greet"}:
        return t["greet"] + "\n\n" + t["ask_safe"], "safety", citations

    if phase == "safety":
        if any(x in low for x in ["no", "not safe", "unsafe", "nahi", "नहीं", "नाही", "না", "இல்லை", "లేదు", "खतरा", "danger", "ஆபத்து"]):
            citations = retrieve("emergency 112 danger", k=2)
            return t["unsafe"], "danger_check", citations
        return t["ask_need"], "need", citations

    if phase == "danger_check":
        citations = retrieve("emergency helpline", k=3)
        return t["ask_need"], "need", citations

    if phase == "need":
        intent = detect_support_intent(user_text)
        q = user_text if user_text.strip() else "support helpline"
        if intent == "legal":
            q = "legal aid NALSA complaint"
        elif intent == "medical":
            q = "medical ambulance hospital"
        elif intent == "complaint":
            q = "NHAA 14566 complaint"
        elif intent == "emotional":
            q = "counselling helpline"
        citations = retrieve(q, k=3)
        return t["narrate"], "narrate", citations

    if phase in {"narrate", "crisis"}:
        citations = retrieve(user_text, k=3)
        return t["closing"], "summary", citations

    citations = retrieve(user_text, k=2)
    return t["closing"], phase, citations
