"""Structured Question Registry for NHAA (14566) Assessment Module.

Defines unique Question IDs, purposes, assessment dimensions, expected response types,
partitioned indicator categories (stress, trauma, risk), clarification prompts,
and multilingual question copy.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

ResponseType = Literal[
    "boolean_safety",
    "categorical_need",
    "narrative_incident",
    "frequency_recency",
    "functional_impact",
]


@dataclass(frozen=True)
class AssessmentQuestion:
    question_id: str
    purpose: str
    assessment_dimension: str
    expected_response_type: ResponseType
    allowed_indicators: list[str]
    allowed_stress_indicators: list[str]
    allowed_trauma_indicators: list[str]
    allowed_risk_indicators: list[str]
    next_question_default: str | None
    text: dict[str, str]
    clarification_prompt: dict[str, str]


QUESTIONS: dict[str, AssessmentQuestion] = {
    "Q01_SAFETY": AssessmentQuestion(
        question_id="Q01_SAFETY",
        purpose="Assess immediate physical safety and active danger in current environment.",
        assessment_dimension="immediate_safety",
        expected_response_type="boolean_safety",
        allowed_indicators=[
            "safe_confirmed",
            "immediate_danger",
            "physical_threat_present",
            "unsafe_environment",
            "emergency_help_needed",
        ],
        allowed_stress_indicators=[],
        allowed_trauma_indicators=[],
        allowed_risk_indicators=[
            "safe_confirmed",
            "immediate_danger",
            "physical_threat_present",
            "unsafe_environment",
            "emergency_help_needed",
        ],
        next_question_default="Q02_SUPPORT_NEED",
        text={
            "en": "First, are you in a safe place right now? 🛡️",
            "hi": "सबसे पहले: क्या आप इस समय जहाँ हैं, वहाँ सुरक्षित महसूस कर रहे हैं? 🛡️",
            "hinglish": "Pehle ek zaroori check: kya aap abhi jahan hain, wahan safe feel kar rahe hain? 🛡️",
            "mr": "प्रथम: आपण सध्या सुरक्षित ठिकाणी आहात का? 🛡️",
            "bn": "প্রথমে: আপনি কি এই মুহূর্তে একটি নিরাপদ স্থানে আছেন? 🛡️",
            "ta": "முதலில்: நீங்கள் இப்போது பாதுகாப்பான இடத்தில் இருக்கிறீர்களா? 🛡️",
            "te": "మొదట: మీరు ప్రస్తుతం సురక్షితమైన ప్రదేశంలో ఉన్నారా? 🛡️",
        },
        clarification_prompt={
            "en": "To make sure you are secure, could you please confirm: are you physically safe right now, or is someone threatening your safety?",
            "hi": "आपकी सुरक्षा सुनिश्चित करने के लिए, क्या आप स्पष्ट कर सकते हैं: क्या आप अभी सुरक्षित हैं या कोई आपके लिए खतरा बना हुआ है?",
            "hinglish": "Aapki safety confirm karne ke liye: kya aap abhi physically safe hain, ya koi aapko threaten ya harm kar raha hai?",
            "mr": "आपल्या सुरक्षिततेसाठी, कृपया स्पष्ट करा: आपण सध्या सुरक्षित आहात की कोणी आपल्यासाठी धोका निर्माण करत आहे?",
            "bn": "আপনার সুরক্ষার স্বার্থে, অনুগ্রহ করে নিশ্চিত করুন: আপনি কি এই মুহূর্তে নিরাপদে আছেন, নাকি কেউ আপনাকে হুমকি দিচ্ছে?",
            "ta": "உங்கள் பாதுகாப்பை உறுதிப்படுத்த, தயவுசெய்து உறுதிப்படுத்தவும்: நீங்கள் இப்போது பாதுகாப்பாக இருக்கிறீர்களா அல்லது யாராவது அச்சுறுத்துகிறார்களா?",
            "te": "మీ భద్రతను నిర్ధారించడానికి, దయచేసి స్పష్టం చేయండి: మీరు ప్రస్తుతం సురక్షితంగా ఉన్నారా లేదా ఎవరైనా మిమ్మల్ని బెదిరిస్తున్నారా?",
        },
    ),
    "Q02_SUPPORT_NEED": AssessmentQuestion(
        question_id="Q02_SUPPORT_NEED",
        purpose="Identify the complainant's primary support domain and needed assistance pathway.",
        assessment_dimension="support_pathway",
        expected_response_type="categorical_need",
        allowed_indicators=[
            "emotional_support_requested",
            "legal_guidance_requested",
            "medical_help_requested",
            "complaint_nhaa_pathway_requested",
            "general_counseling_requested",
        ],
        allowed_stress_indicators=[
            "emotional_support_requested",
            "general_counseling_requested",
        ],
        allowed_trauma_indicators=[
            "legal_guidance_requested",
            "complaint_nhaa_pathway_requested",
        ],
        allowed_risk_indicators=[
            "medical_help_requested",
        ],
        next_question_default="Q03_INCIDENT_CONTEXT",
        text={
            "en": (
                "How can I best support you today? 🤝\n"
                "• Emotional support 💬\n"
                "• Legal guidance ⚖️\n"
                "• Medical help 🏥\n"
                "• Complaint pathway (NHAA 14566) 📋\n\n"
                "Or feel free to tell me in your own words."
            ),
            "hi": (
                "आज मैं आपकी किस प्रकार सहायता कर सकता हूँ? 🤝\n"
                "• भावनात्मक सहारा 💬\n"
                "• कानूनी मार्गदर्शन ⚖️\n"
                "• चिकित्सा सहायता 🏥\n"
                "• शिकायत प्रक्रिया (NHAA 14566) 📋\n\n"
                "या आप अपने शब्दों में भी बता सकते हैं।"
            ),
            "hinglish": (
                "Main aaj aapki kaise madad kar sakta hoon? 🤝\n"
                "• Emotional support 💬\n"
                "• Legal guidance ⚖️\n"
                "• Medical help 🏥\n"
                "• Complaint pathway (NHAA 14566) 📋\n\n"
                "Ya fir aap apne words mein bata sakte hain."
            ),
            "mr": (
                "मी आज आपल्याला कशी मदत करू शकेन? 🤝\n"
                "• भावनिक आधार 💬\n"
                "• कायदेशीर मार्गदर्शन ⚖️\n"
                "• वैद्यकीय मदत 🏥\n"
                "• तक्रार प्रक्रिया (NHAA 14566) 📋"
            ),
            "bn": (
                "আমি আজ আপনাকে কীভাবে সাহায্য করতে পারি? 🤝\n"
                "• মানসিক সমর্থন 💬\n"
                "• আইনি পরামর্শ ⚖️\n"
                "• চিকিৎসা সহায়তা 🏥\n"
                "• অভিযোগ প্রক্রিয়া (NHAA 14566) 📋"
            ),
            "ta": (
                "நான் உங்களுக்கு எவ்வாறு உதவ முடியும்? 🤝\n"
                "• உணர்ச்சிபூர்வ ஆதரவு 💬\n"
                "• சட்ட வழிகாட்டுதல் ⚖️\n"
                "• மருத்துவ உதவி 🏥\n"
                "• புகார் செயல்முறை (NHAA 14566) 📋"
            ),
            "te": (
                "నేను మీకు ఎలా సహాయపడగలను? 🤝\n"
                "• మానసిక మద్దతు 💬\n"
                "• చట్టపరమైన సలహా ⚖️\n"
                "• వైద్య సహాయం 🏥\n"
                "• ఫిర్యాదు ప్రక్రియ (NHAA 14566) 📋"
            ),
        },
        clarification_prompt={
            "en": "To connect you with the right resource, could you specify if you are looking for emotional support, legal guidance, medical assistance, or filing an NHAA complaint?",
            "hi": "सही संसाधन से जोड़ने के लिए, कृपया बताएं कि क्या आप भावनात्मक सहारा, कानूनी सलाह, चिकित्सा सहायता या NHAA शिकायत दर्ज करना चाहते हैं?",
            "hinglish": "Sahi help provide karne ke liye: kya aapko emotional support, legal guidance, medical help, ya NHAA 14566 complaint file karni hai?",
            "mr": "योग्य मदत देण्यासाठी, कृपया स्पष्ट करा की आपल्याला भावनिक आधार, कायदेशीर मार्गदर्शन, वैद्यकीय मदत किंवा तक्रार नोंदवायची आहे?",
            "bn": "সঠিক সহায়তা দিতে, অনুগ্রহ করে জানান আপনি মানসিক সমর্থন, আইনি পরামর্শ, চিকিৎসা সাহায্য নাকি অভিযোগ জানাতে চান?",
            "ta": "சரியான ஆதரவை வழங்க, நீங்கள் உணர்ச்சிபூர்வ ஆதரவு, சட்ட ஆலோசனை, மருத்துவ உதவி அல்லது புகார் செய்ய விரும்புகிறீர்களா?",
            "te": "సరైన సహాయం అందించడానికి, మీరు మానసిక మద్దతు, చట్టపరమైన సలహా, వైద్య సహాయం లేదా ఫిర్యాదు చేయాలనుకుంటున్నారా?",
        },
    ),
    "Q03_INCIDENT_CONTEXT": AssessmentQuestion(
        question_id="Q03_INCIDENT_CONTEXT",
        purpose="Understand the nature of the incident, threat, atrocity, or unfair treatment experienced.",
        assessment_dimension="incident_nature",
        expected_response_type="narrative_incident",
        allowed_indicators=[
            "verbal_harassment",
            "social_boycott_discrimination",
            "physical_violence_reported",
            "intimidation_threat",
            "property_livelihood_damage",
            "caste_based_atrocity",
            "academic_exam_distress",
        ],
        allowed_stress_indicators=[
            "verbal_harassment",
            "property_livelihood_damage",
            "academic_exam_distress",
        ],
        allowed_trauma_indicators=[
            "social_boycott_discrimination",
            "intimidation_threat",
            "caste_based_atrocity",
        ],
        allowed_risk_indicators=[
            "physical_violence_reported",
        ],
        next_question_default="Q04_RECENCY_FREQUENCY",
        text={
            "en": "Please tell me a little about what you have been experiencing, or what brings you to seek support today. 💬 Take all the time you need.",
            "hi": "कृपया मुझे थोड़ा बताएं कि आप क्या अनुभव कर रहे हैं, या किस कारण से आज सहायता की आवश्यकता महसूस हुई। 💬 पूरा समय लें।",
            "hinglish": "Aap thoda bata sakte hain ki kya hua ya kis wajah se aaj aap support chahte hain? 💬 Aaram se batayein, koi jaldi nahi hai.",
            "mr": "आपण कशाचा सामना करत आहात किंवा आज कशामुळे मदतीची गरज भासली याबद्दल थोडे सांगा. 💬",
            "bn": "আপনি কী পরিস্থিতির সম্মুখীন হচ্ছেন বা কী কারণে আজ সাহায্যের প্রয়োজন অনুভব করছেন, দয়া করে কিছুটা বলুন। 💬",
            "ta": "நீங்கள் என்ன அனுபவிக்கிறீர்கள் அல்லது இன்று உதவி பெற என்ன காரணம் என்பதைப் பற்றி சிறிது சொல்லுங்கள். 💬",
            "te": "మీరు ఏమి ఎదుర్కొంటున్నారు లేదా ఈరోజు సహాయం కోరడానికి గల కారణాన్ని కొద్దిగా చెప్పండి. 💬",
        },
        clarification_prompt={
            "en": "Could you describe what happened or what unfair treatment you experienced in a few words?",
            "hi": "क्या आप कुछ शब्दों में बता सकते हैं कि वास्तव में क्या घटना घटी या आपके साथ क्या अनुचित हुआ?",
            "hinglish": "Kya aap short mein bata sakte hain ki exact kya incident hua ya kya pareshani aayi?",
            "mr": "नेमकी काय घटना घडली किंवा काय त्रास झाला हे थोडक्यात सांगू शकाल का?",
            "bn": "ঠিক কী ঘটনা ঘটেছে বা কী অন্যায় হয়েছে তা কি সংক্ষেপে বলতে পারেন?",
            "ta": "என்ன நடந்தது அல்லது என்ன அநீதி நடந்தது என்பதை சில வார்த்தைகளில் விவரிக்க முடியுமா?",
            "te": "ఖచ్చితంగా ఏమి జరిగిందో లేదా ఎలాంటి అన్యాయం జరిగిందో కొన్ని మాటల్లో చెప్పగలరా?",
        },
    ),
    "Q04_RECENCY_FREQUENCY": AssessmentQuestion(
        question_id="Q04_RECENCY_FREQUENCY",
        purpose="Assess chronicity, repeated exposure, and ongoing threat status.",
        assessment_dimension="chronicity_recency",
        expected_response_type="frequency_recency",
        allowed_indicators=[
            "single_isolated_event",
            "repeated_ongoing_harassment",
            "recent_acute_event",
            "long_term_systemic_issue",
            "escalating_threat_pattern",
        ],
        allowed_stress_indicators=[
            "single_isolated_event",
            "recent_acute_event",
        ],
        allowed_trauma_indicators=[
            "repeated_ongoing_harassment",
            "long_term_systemic_issue",
        ],
        allowed_risk_indicators=[
            "escalating_threat_pattern",
        ],
        next_question_default="Q05_IMPACT_COPING",
        text={
            "en": "Is this something that happened recently, or has it been happening repeatedly over time? 📋",
            "hi": "क्या यह हाल ही में घटी कोई घटना है, या यह समय के साथ बार-बार हो रहा है? 📋",
            "hinglish": "Kya yeh abhi haal hi mein hua hai, ya kaafi time se baar-baar ho raha hai? 📋",
            "mr": "ही घटना नुकतीच घडली आहे की बऱ्याच काळापासून वारंवार घडत आहे? 📋",
            "bn": "এটি কি সম্প্রতি ঘটেছে, নাকি দীর্ঘদিন ধরে বারবার ঘটছে? 📋",
            "ta": "இது சமீபத்தில் நடந்ததா அல்லது நீண்ட காலமாக மீண்டும் மீண்டும் நடக்கிறதா? 📋",
            "te": "ఇది ఇటీవల జరిగిందా, లేక చాలా కాలంగా పదే పదే జరుగుతోందా? 📋",
        },
        clarification_prompt={
            "en": "Please clarify whether this was a single one-time event or an ongoing repeated situation.",
            "hi": "कृपया स्पष्ट करें कि क्या यह केवल एक बार हुआ या लगातार बार-बार हो रहा है?",
            "hinglish": "Please clear karein: kya yeh ek baar ka incident tha ya lagatar repeat ho raha hai?",
            "mr": "कृपया स्पष्ट करा: ही एक वेळची घटना होती की वारंवार घडत आहे?",
            "bn": "দয়া করে স্পষ্ট করুন: এটি কি একবারের ঘটনা ছিল নাকি বারবার ঘটছে?",
            "ta": "தயவுசெய்து தெளிவுபடுத்துங்கள்: ఇది ఒక முறை நடந்த நிகழ்வா அல்லது தொடர்ந்து நடக்கும் ஒன்றா?",
            "te": "దయచేసి స్పష్టం చేయండి: ఇది ఒక్కసారి జరిగిన సంఘటనా లేక నిరంతరం జరుగుతున్నదా?",
        },
    ),
    "Q05_IMPACT_COPING": AssessmentQuestion(
        question_id="Q05_IMPACT_COPING",
        purpose="Assess emotional distress, functional disruption, and acute coping strain without medical diagnosis.",
        assessment_dimension="distress_impact",
        expected_response_type="functional_impact",
        allowed_indicators=[
            "acute_fear_distress",
            "sleep_or_appetite_disruption",
            "social_isolation_withdrawal",
            "helplessness_overwhelm",
            "suicidal_ideation_risk",
            "resilient_coping_present",
        ],
        allowed_stress_indicators=[
            "sleep_or_appetite_disruption",
            "social_isolation_withdrawal",
            "helplessness_overwhelm",
            "resilient_coping_present",
        ],
        allowed_trauma_indicators=[
            "acute_fear_distress",
        ],
        allowed_risk_indicators=[
            "suicidal_ideation_risk",
        ],
        next_question_default=None,
        text={
            "en": "How is this situation affecting you right now (for example, feeling overwhelmed, fearful, unable to sleep, or feeling alone)? 💙",
            "hi": "यह स्थिति इस समय आप पर क्या प्रभाव डाल रही है (जैसे बहुत परेशान महसूस होना, डर लगना, नींद न आना या अकेलापन महसूस होना)? 💙",
            "hinglish": "Is situation ka aap par abhi kya asar pad raha hai (jaise bohot overwhelmed feel hona, darr lagna, neend na aana, ya akele feel hona)? 💙",
            "mr": "या परिस्थितीचा सध्या आपल्यावर काय परिणाम होत आहे (उदा. अस्वस्थता, भीती, झोप न येणे किंवा एकटेपणा वाटणे)? 💙",
            "bn": "এই পরিস্থিতি বর্তমানে আপনার ওপর কী প্রভাব ফেলছে (যেমন অতিরিক্ত অস্বস্তি, ভয়, ঘুমে সমস্যা বা একাকীত্ব বোধ)? 💙",
            "ta": "இந்த நிலைமை தற்போது உங்களை எவ்வாறு பாதிக்கிறது (எ.கா. அதிக அழுத்தம், பயம், தூக்கமின்மை அல்லது தனிமை உணர்வு)? 💙",
            "te": "ఈ పరిస్థితి ప్రస్తుతం మీపై ఎలాంటి ప్రభావం చూపుతోంది (ఉదా. తీవ్ర ఆందోళన, భయం, నిద్రలేమి లేదా ఒంటరితనం)? 💙",
        },
        clarification_prompt={
            "en": "Could you share in a sentence how you are feeling right now or how this is impacting your daily life?",
            "hi": "क्या आप एक वाक्य में बता सकते हैं कि आप अभी कैसा महसूस कर रहे हैं या इसका आपके दैनिक जीवन पर क्या असर पड़ रहा है?",
            "hinglish": "Kya aap ek sentence mein bata sakte hain ki aap abhi kaisa feel kar rahe hain aur daily life par kya asar hai?",
            "mr": "सध्या आपल्याला कसे वाटत आहे किंवा दैनंदिन जीवनावर काय परिणाम झाला आहे हे एका वाक्यात सांगू शकाल का?",
            "bn": "আপনি বর্তমানে কেমন অনুভব করছেন বা দৈনন্দিন জীবনে কী প্রভাব পড়ছে তা কি একটি বাক্যে জানাতে পারেন?",
            "ta": "நீங்கள் இப்போது எப்படி உணர்கிறீர்கள் அல்லது அன்றாட வாழ்க்கையில் என்ன தாக்கம் ஏற்பட்டுள்ளது என்பதை ஒரு வாக்கியத்தில் பகிர்ந்து கொள்ள முடியுமா?",
            "te": "మీరు ప్రస్తుతం ఎలా భావిస్తున్నారు లేదా రోజువారీ జీవితంపై ఎలాంటి ప్రభావం పడిందో ఒక వాక్యంలో చెప్పగలరా?",
        },
    ),
}

QUESTION_ORDER: list[str] = [
    "Q01_SAFETY",
    "Q02_SUPPORT_NEED",
    "Q03_INCIDENT_CONTEXT",
    "Q04_RECENCY_FREQUENCY",
    "Q05_IMPACT_COPING",
]


def get_question(question_id: str) -> AssessmentQuestion | None:
    return QUESTIONS.get(question_id)


def get_initial_question_id() -> str:
    return QUESTION_ORDER[0]


def get_question_text(question_id: str, language: str = "en") -> str:
    q = get_question(question_id)
    if not q:
        return ""
    return q.text.get(language) or q.text.get("en", "")


def get_clarification_text(question_id: str, language: str = "en") -> str:
    q = get_question(question_id)
    if not q:
        return ""
    return q.clarification_prompt.get(language) or q.clarification_prompt.get("en", "")


def get_next_question_id(current_id: str) -> str | None:
    q = get_question(current_id)
    if not q:
        return None
    return q.next_question_default
