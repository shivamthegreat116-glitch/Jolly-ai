from app.services.svi import ConversationSignals, VoiceSignals, compute_svi, risk_category_for


def test_low_score_neutral_text():
    r = compute_svi("Hello, I want to know how the helpline works.")
    assert r.svi_score <= 24
    assert r.risk_category == "Low"
    assert r.crisis_mode is False
    assert r.safety_override is False


def test_moderate_distress_without_violence():
    r = compute_svi(
        "I feel so scared and overwhelmed. Someone threatened me and I have been crying and I feel helpless."
    )
    assert 25 <= r.svi_score <= 74
    assert r.risk_category in {"Moderate", "High"}
    assert "distress" in r.indicator_keys


def test_critical_override_self_harm():
    r = compute_svi("I want to kill myself. There is no reason to live.")
    assert r.svi_score >= 75
    assert r.risk_category == "Critical"
    assert r.safety_override is True
    assert r.crisis_mode is True
    assert r.human_review_flag is True
    assert "self_harm" in r.indicator_keys


def test_critical_override_ongoing_violence():
    r = compute_svi(
        "He hit me and he is still here. I cannot leave. They will hurt me if I tell anyone.",
        user_says_unsafe=True,
    )
    assert r.svi_score >= 75
    assert r.risk_category == "Critical"
    assert r.safety_override is True


def test_hindi_self_harm_override():
    r = compute_svi("मैं आत्महत्या करना चाहती हूँ")
    assert r.risk_category == "Critical"
    assert r.safety_override is True


def test_hinglish_fear():
    r = compute_svi("Mujhe bahut darr lag raha hai, unhone dhamki di hai.")
    assert r.svi_score >= 25
    assert "fear" in r.indicator_keys or "distress" in r.indicator_keys


def test_missing_voice_does_not_penalize():
    with_voice_unavailable = compute_svi("I am a bit tense today about a complaint.")
    with_low_quality = compute_svi(
        "I am a bit tense today about a complaint.",
        voice=VoiceSignals(available=True, audio_quality=0.1, pause_ratio=0.9, speech_rate=0.5),
    )
    assert with_voice_unavailable.voice_signal_status == "unavailable"
    assert with_low_quality.voice_signal_status == "low_confidence"
    assert with_low_quality.svi_score <= with_voice_unavailable.svi_score + 1


def test_voice_only_never_creates_emotion_label():
    r = compute_svi(
        "I filed a request yesterday.",
        voice=VoiceSignals(
            available=True,
            audio_quality=0.9,
            pause_ratio=0.7,
            speech_rate=1.0,
            pitch_variability=0.8,
            volume_variability=0.8,
        ),
    )
    public = r.public_user_view()
    assert "emotion" not in str(public).lower()
    assert public["voice_signal_status"] == "available"
    assert r.svi_score < 75


def test_thin_input_is_conservative():
    r = compute_svi("help")
    assert r.confidence == "Low"
    assert r.human_review_flag is True
    assert r.svi_score <= 49
    assert r.risk_category != "Critical"


def test_risk_bands():
    assert risk_category_for(0) == "Low"
    assert risk_category_for(24) == "Low"
    assert risk_category_for(25) == "Moderate"
    assert risk_category_for(49) == "Moderate"
    assert risk_category_for(50) == "High"
    assert risk_category_for(74) == "High"
    assert risk_category_for(75) == "Critical"
    assert risk_category_for(100) == "Critical"


def test_user_view_hides_internal_components():
    r = compute_svi("I am scared. They threatened me.")
    public = r.public_user_view()
    assert "internal_components" not in public
    assert "hits" not in public
    assert "disclaimer" in public


def test_repeat_fear_conversation_signal():
    r = compute_svi(
        "They threatened me yesterday. I am still so afraid of the threat.",
        conversation=ConversationSignals(repeated_fear_or_threat=True, message_count=3),
    )
    assert "repeat_fear" in r.indicator_keys
