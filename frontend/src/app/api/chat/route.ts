import { NextResponse } from "next/server";
import crypto from "crypto";

interface ChatRequest {
  interaction_id?: string;
  session_id: string;
  message?: string;
  phase?: string;
  transcript_override?: string;
  voice?: Record<string, unknown>;
  user_says_unsafe?: boolean | null;
  image_base64?: string;
  question_id?: string;
  clarification_count?: number;
  mode?: string;
  age_group?: string;
  medical_history?: string;
  camera_fatigue?: {
    score: number;
    level: string;
    level_label?: string;
    blinks_per_min?: number;
    eyelid_droop?: string;
    motion_stability?: string;
    status_message?: string;
    expression?: string;
    expression_label?: string;
    expression_emoji?: string;
    vitality_status?: string;
    mouth_state?: string;
    brow_tension?: string;
    smile_score?: number;
  };
}

const CRISIS_KEYWORDS = [
  "suicide",
  "kill myself",
  "end my life",
  "die tonight",
  "want to die",
  "jump off",
  "end it all",
  "better off dead",
  "slit my wrist",
  "take all pills",
  "hang myself",
  "self-harm",
  "cut myself",
];

const LISTENING_KEYWORDS = [
  "stop giving me solutions",
  "stop giving solutions",
  "just want someone to listen",
  "just listen",
  "no advice",
  "listen to me",
  "stay and talk with me",
  "stay here and talk",
  "talk for a while",
];

// Trauma analysis keyword categories
const DOMESTIC_KEYWORDS = ["beat me", "hit me", "husband", "partner", "in-laws", "locked inside", "slapped", "abused at home", "dowry"];
const WORKPLACE_KEYWORDS = ["boss", "manager", "fired", "demoted", "office", "colleague", "posh", "workplace", "salary withheld"];
const RETALIATION_KEYWORDS = ["threatened to kill", "retaliat", "police complaint", "follow me", "warned me", "stalk"];
const IDENTITY_KEYWORDS = ["caste", "dalit", "tribal", "sc/st", "slur", "atrocity", "untouchable", "discriminated"];
const ACUTE_KEYWORDS = ["just happened", "today", "yesterday", "sudden", "shock", "attacked", "assault", "terrified", "shaking", "panic"];

function calculateStressIndex(
  text: string,
  ageGroup?: string,
  medicalNotes?: string,
  cameraFatigue?: {
    score: number;
    level: string;
    level_label?: string;
    blinks_per_min?: number;
    expression?: string;
    vitality_status?: string;
    mouth_state?: string;
    brow_tension?: string;
    smile_score?: number;
  }
) {
  const lower = (text + " " + (medicalNotes || "")).toLowerCase();

  // 1. Emotional Strain (0-100)
  const emotionalMatches = ["fear", "scared", "sad", "cry", "crying", "depressed", "hopeless", "helpless", "anxious", "anxiety", "pain", "broken", "terrif"]
    .filter((w) => lower.includes(w)).length;
  let emotionalStrain = Math.min(100, 30 + emotionalMatches * 15);
  // Brow tension / furrow adds emotional tension
  if (cameraFatigue?.brow_tension === "furrowed") {
    emotionalStrain = Math.min(100, emotionalStrain + 10);
  }

  // 2. Cognitive Overwhelm (0-100)
  const cognitiveMatches = ["confus", "overwhelm", "racing", "cannot think", "can't focus", "numb", "flashback", "nightmare", "freeze", "blank"]
    .filter((w) => lower.includes(w)).length;
  const cognitiveStrain = Math.min(100, 25 + cognitiveMatches * 18);

  // 3. Somatic / Physiological Load (0-100)
  const somaticMatches = ["sleep", "insomnia", "tired", "exhaust", "headache", "stomach", "eating", "appetite", "heart", "chest", "breath", "dizzi", "nausea", "pain"]
    .filter((w) => lower.includes(w)).length;
  const hasMedical = Boolean(medicalNotes && medicalNotes.trim().length > 3);
  let somaticLoad = Math.min(100, (hasMedical ? 35 : 20) + somaticMatches * 16);

  // Calibrate with live camera fatigue & active expression sensor if available
  if (cameraFatigue && typeof cameraFatigue.score === "number") {
    let fatigueInfluence = cameraFatigue.score;
    if (cameraFatigue.expression === "smiling") {
      // Positive engagement drops somatic burden
      fatigueInfluence = Math.max(5, fatigueInfluence - 8);
    } else if (cameraFatigue.expression === "yawning" || cameraFatigue.expression === "eyes_closed") {
      // Acute fatigue indicators increase somatic load
      fatigueInfluence = Math.min(100, fatigueInfluence + 10);
    }
    somaticLoad = Math.min(100, Math.round(somaticLoad * 0.45 + fatigueInfluence * 0.55));
  }

  // 4. Relational / Social Isolation (0-100)
  const relationalMatches = ["alone", "nobody", "no one", "isolated", "hide", "ashamed", "first time", "secret", "abandon"]
    .filter((w) => lower.includes(w)).length;
  const relationalIsolation = Math.min(100, 25 + relationalMatches * 20);

  // 5. Environmental & Safety Risk (0-100)
  const safetyMatches = ["retaliat", "threat", "unsafe", "danger", "watching", "stalk", "violence", "kill", "harm", "door", "follow"]
    .filter((w) => lower.includes(w)).length;
  const environmentalRisk = Math.min(100, 20 + safetyMatches * 22);

  // Age group vulnerability factor
  let ageWeight = 0;
  if (ageGroup === "under_18" || ageGroup === "60_plus") {
    ageWeight = 5;
  }

  const overall = Math.min(
    100,
    Math.round(
      emotionalStrain * 0.25 +
      cognitiveStrain * 0.20 +
      somaticLoad * 0.20 +
      relationalIsolation * 0.15 +
      environmentalRisk * 0.20 +
      ageWeight
    )
  );

  let category: "Low Strain" | "Moderate Strain" | "High Strain" | "Severe Crisis Strain" = "Low Strain";
  if (overall >= 80) category = "Severe Crisis Strain";
  else if (overall >= 60) category = "High Strain";
  else if (overall >= 30) category = "Moderate Strain";

  return {
    overall_score: overall,
    risk_category: category,
    emotional_strain: emotionalStrain,
    cognitive_strain: cognitiveStrain,
    somatic_load: somaticLoad,
    relational_isolation: relationalIsolation,
    environmental_risk: environmentalRisk,
    camera_fatigue: cameraFatigue,
  };
}

function identifyTraumaTypology(text: string, stressScore: number) {
  const lower = text.toLowerCase();
  let name = "Cumulative Emotional Strain & Situational Distress";
  let category = "Situational Stress Profile";
  let description = "Persistent psychological strain resulting from compounded personal distress, requiring supportive emotional grounding and triage.";
  const quotes: string[] = [];

  if (DOMESTIC_KEYWORDS.some((kw) => lower.includes(kw))) {
    name = "Interpersonal & Domestic Violence Trauma";
    category = "Relational & Household Safety";
    description = "Reported indicators associated with physical, verbal, or emotional coercion and distress within a domestic or intimate relationship.";
  } else if (WORKPLACE_KEYWORDS.some((kw) => lower.includes(kw))) {
    name = "Workplace & Institutional Harassment Trauma";
    category = "Occupational & Institutional Triage";
    description = "Reported indicators resulting from power asymmetry, professional retaliation, systemic hostility, or workplace intimidation.";
  } else if (RETALIATION_KEYWORDS.some((kw) => lower.includes(kw))) {
    name = "Retaliatory Harassment & Coercion Trauma";
    category = "Safety & Protective Triage";
    description = "Acute distress driven by fear of retribution, intimidation, or secondary harm following grievance filing or whistleblowing.";
  } else if (IDENTITY_KEYWORDS.some((kw) => lower.includes(kw))) {
    name = "Identity-Based Atrocity & Discrimination Trauma";
    category = "Atrocity & Human Rights Protections";
    description = "Psychological and social trauma stemming from identity-based discrimination, caste atrocities, or community marginalization under statutory protection scopes.";
  } else if (ACUTE_KEYWORDS.some((kw) => lower.includes(kw))) {
    name = "Acute Situational Trauma / Shock";
    category = "Acute Psychological Stabilization";
    description = "Immediate shock, nervous system hyperarousal, and disorientation following a sudden, distressing violation.";
  }

  const sentences = text.split(/[.!?\n]+/).map((s) => s.trim()).filter((s) => s.length > 5);
  for (const s of sentences.slice(0, 3)) {
    quotes.push(`"${s}"`);
  }

  let severity: "Mild" | "Moderate" | "Severe" | "Acute / Crisis" = "Moderate";
  if (stressScore >= 80) severity = "Acute / Crisis";
  else if (stressScore >= 60) severity = "Severe";
  else if (stressScore < 30) severity = "Mild";

  return {
    name,
    category,
    description,
    severity,
    evidence_quotes: quotes,
    recommended_interventions: [
      "Trauma-informed somatic grounding & emotional validation",
      "Confidential NHAA (14566) and National Portal (https://www.dosje.gov.in/organisation/national-helpline-against-atrocities/) guidance",
      "Optional 1-on-1 human counselor consultation via Jitsi video bridge",
      "Local legal aid & protective shelter coordination if requested",
    ],
    disclaimer: "Identified strictly from reported situational and behavioral indicators to assist triage and counselor preparation. This is NOT a medical or psychiatric diagnosis.",
  };
}

export async function POST(request: Request) {
  try {
    const payload: ChatRequest = await request.json();
    const sessionId = payload.session_id || crypto.randomUUID();
    const interactionId = payload.interaction_id || crypto.randomUUID();
    const userText = (payload.transcript_override || payload.message || "").trim();
    const phase = payload.phase || "start";
    const currentQid = payload.question_id || "Q01_SAFETY";
    const ageGroup = payload.age_group || "";
    const medicalHistory = payload.medical_history || "";
    const cameraFatigue = payload.camera_fatigue;
    const lower = userText.toLowerCase();

    // 1. Initial Greeting / Phase Start (Inquires Age Group & Safe Space)
    if (phase === "start" && !userText) {
      return NextResponse.json({
        interaction_id: interactionId,
        reply:
          "Hello! 👋 I am Jolly AI, here to listen and help you find support at your own pace. " +
          "(Note: I am an emotional support and triage tool, not a medical or emergency service 🛡️). " +
          "Feel free to skip anything you don't wish to share. 💙\n\n" +
          "To ensure our conversation is safe and attuned to your needs, could you share who is speaking with me today and your approximate age group? " +
          "Also, are you in a safe, private space right now?",
        next_phase: "safety",
        question_id: "Q01_AGE_SAFETY",
        next_question_id: "Q01_AGE_SAFETY",
        interpretation: null,
        citations: [],
        assessment: null,
        assessment_id: null,
        draft_summary: "",
        crisis_mode: false,
        voice_signal_status: "available",
        conversation_mode: "assessment",
        crisis_level: "none",
        resources: {
          nhaa_helpline: "14566",
          nhaa_portal: "https://www.dosje.gov.in/organisation/national-helpline-against-atrocities/",
          tele_manas: "14416",
          emergency: "112",
        },
        escalation_event_id: null,
        video_room_url: null,
      });
    }

    // 2. High-Severity Crisis Check (Always includes 14566 & https://www.dosje.gov.in/organisation/national-helpline-against-atrocities/)
    const isCrisis = CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
    if (isCrisis) {
      const roomToken = crypto.randomBytes(4).toString("hex");
      const videoRoomUrl = `https://meet.jit.si/nhaa-consultation-${sessionId.slice(0, 8)}-${roomToken}`;

      return NextResponse.json({
        interaction_id: interactionId,
        reply:
          "I hear how painful and difficult things are right now, and I want you to be safe. 💙 Please know that you are not alone.\n\n" +
          "Free, confidential help and official protection are standing by right now:\n" +
          "• Tele-MANAS (Mental Health): 14416 or 1800-891-4416\n" +
          "• National Emergency Services: 112\n" +
          "• National Helpline Against Atrocities (NHAA): 14566\n" +
          "• NHAA Official Digital Portal: https://www.dosje.gov.in/organisation/national-helpline-against-atrocities/\n" +
          "• KIRAN Psychosocial Support: 1800-599-0019\n\n" +
          "Are you in a safe place right now, or is there someone nearby who can stay with you?",
        next_phase: "crisis",
        conversation_mode: "crisis_support",
        crisis_level: "suicidal_ideation",
        question_id: currentQid,
        next_question_id: currentQid,
        interpretation: null,
        citations: [],
        assessment: {
          svi_score: 95,
          risk_category: "Severe Crisis Strain",
          confidence: "high",
          risk_reasons: ["Self-harm or severe crisis indicators detected in conversation"],
          recommended_action: "Immediate connection with Tele-MANAS (14416), Emergency (112), or NHAA (14566 / https://www.dosje.gov.in/organisation/national-helpline-against-atrocities/).",
          human_review_recommended: true,
          voice_signal_status: "available",
          disclaimer: "Support & triage guidance only — not a clinical diagnosis.",
          crisis_mode: true,
          stress_index: calculateStressIndex(userText, ageGroup, medicalHistory, cameraFatigue),
          trauma_typology: identifyTraumaTypology(userText, 95),
        },
        draft_summary: `Safety crisis noted: User expressed critical distress. Reassurance and emergency helplines (14416, 112, 14566, https://www.dosje.gov.in/organisation/national-helpline-against-atrocities/) provided.`,
        crisis_mode: true,
        voice_signal_status: "available",
        video_room_url: videoRoomUrl,
        escalation_event_id: crypto.randomUUID(),
      });
    }

    // 3. Active Listening / Supportive Intent Check
    const isListening = LISTENING_KEYWORDS.some((kw) => lower.includes(kw));
    if (isListening) {
      return NextResponse.json({
        interaction_id: interactionId,
        reply:
          "I hear you completely. 💙 I will not give you any checklists, solutions, or unsolicited advice. " +
          "I am right here with you, and I am listening. Take all the time you need — speak or type whatever is on your mind.",
        next_phase: "ongoing_support",
        conversation_mode: "listening",
        crisis_level: "emotional_distress",
        question_id: currentQid,
        next_question_id: currentQid,
        interpretation: null,
        citations: [],
        assessment: null,
        draft_summary: `Active listening requested. AI in pure listening mode holding space for complainant.`,
        crisis_mode: false,
        voice_signal_status: "available",
        video_room_url: null,
        escalation_event_id: null,
      });
    }

    // 4. Determine Question Progression & Flow
    let nextPhase = phase;
    let nextQid: string | null = currentQid;
    let baseReply = "";
    let draftSummary = `User input: ${userText}`;

    if (phase === "safety" || currentQid === "Q01_AGE_SAFETY" || currentQid === "Q01_SAFETY") {
      nextPhase = "need";
      nextQid = "Q02_SUPPORT_NEED";
      baseReply =
        "Thank you for letting me know. 💙 How can I best support you today?\n" +
        "• Emotional support & active listening 💬\n" +
        "• Legal & rights guidance ⚖️\n" +
        "• Medical / physical health support 🏥\n" +
        "• Official complaint pathway (NHAA Helpline 14566 & https://www.dosje.gov.in/organisation/national-helpline-against-atrocities/) 📋\n\n" +
        "Feel free to select an option or share in your own words.";
      draftSummary = `Safety and age context established. Proceeding to explore primary support needs.`;
    } else if (phase === "need" || currentQid === "Q02_SUPPORT_NEED") {
      nextPhase = "incident";
      nextQid = "Q03_INCIDENT_CONTEXT";
      baseReply =
        "I understand. 🤝 Take your time and share whatever you feel comfortable with about what happened or what brought you here today. There is no rush.";
      draftSummary = `Complainant identified support needs. Exploring background context at user's pace.`;
    } else if (phase === "incident" || currentQid === "Q03_INCIDENT_CONTEXT") {
      nextPhase = "frequency";
      nextQid = "Q04_RECENCY_FREQUENCY";
      baseReply =
        "Thank you for sharing that with me. 💙 Has this happened recently, or is this an ongoing situation you have been dealing with? Do you have fears of retaliation?";
      draftSummary = `Incident background shared. Reviewing recency, frequency, and retaliation factors.`;
    } else if (phase === "frequency" || currentQid === "Q04_RECENCY_FREQUENCY") {
      // Sensitive inquiry into physical impact AND medical history
      nextPhase = "impact_medical";
      nextQid = "Q05_IMPACT_MEDICAL";
      baseReply =
        "I hear you. How has this been impacting you emotionally, physically, or in your daily routine? " +
        "Also, if you feel comfortable sharing, do you have any relevant medical conditions, ongoing medications, or physical health factors that might be interacting with your stress right now? (This is completely optional and safe to skip).";
      draftSummary = `Recency recorded. Inquiring into personal impact, somatic symptoms, and medical history context.`;
    } else if (phase === "impact_medical" || currentQid === "Q05_IMPACT_MEDICAL" || currentQid === "Q05_IMPACT_COPING") {
      nextPhase = "ongoing_support";
      nextQid = null;
      baseReply =
        "Thank you for trusting me and sharing your experience. 🙏 You have carried a great deal. " +
        "Your initial check-in is complete, and your comprehensive stress assessment is prepared. " +
        "I am here with you for as long as you wish to talk. What else would you like to share?";
      draftSummary = `Assessment turns completed. Complainant reviewed medical context and coping impact. Ready for ongoing support and summary review.`;
    } else {
      // Ongoing open emotional support mode - never forcibly ends!
      nextPhase = "ongoing_support";
      nextQid = null;
      baseReply =
        "I am right here with you. Take all the time you need to breathe, reflect, and share whatever feels comfortable.";
      draftSummary = `Ongoing support conversation turn recorded.`;
    }

    // 5. Try calling NVIDIA NIM LLM if API Key is available
    const apiKey =
      process.env.NVIDIA_API_KEY ||
      "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";
    const baseUrl =
      process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
    const model =
      process.env.NVIDIA_MODEL || "meta/llama-3.2-11b-vision-instruct";

    let aiReply = baseReply;

    if (apiKey && userText.length > 2) {
      try {
        const systemPrompt =
          "You are Jolly AI, an empathetic, trauma-informed support and triage companion for complainants accessing the National Helpline Against Atrocities (NHAA 14566 & https://www.dosje.gov.in/organisation/national-helpline-against-atrocities/) in India. " +
          "Provide genuine emotional validation, warmth, and active listening. " +
          "Never give unsolicited pushy advice or checklists when the user expresses sadness or grief. " +
          "If the user mentions medical history or physical symptoms, acknowledge how trauma impacts the body compassionately. " +
          "Keep your responses concise (2 to 4 sentences), gentle, and human. " +
          (baseReply
            ? `Supportively guide the dialogue and naturally touch upon: "${baseReply}".`
            : "Respond empathetically and keep holding space for the user.");

        const messages: Array<{ role: string; content: unknown }> = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userText },
        ];

        // If camera snapshot is attached, pass vision format
        if (payload.image_base64 && payload.image_base64.startsWith("data:image")) {
          messages[1] = {
            role: "user",
            content: [
              { type: "text", text: userText },
              {
                type: "image_url",
                image_url: { url: payload.image_base64 },
              },
            ],
          };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const llmRes = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.5,
            max_tokens: 300,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (llmRes.ok) {
          const llmData = await llmRes.json();
          const generated = llmData.choices?.[0]?.message?.content?.trim();
          if (generated) {
            aiReply = generated;
          }
        }
      } catch {
        // Graceful fallback to empathetic rule-based reply
        aiReply = baseReply;
      }
    }

    const stressIndex = calculateStressIndex(userText, ageGroup, medicalHistory, cameraFatigue);
    const traumaTypology = identifyTraumaTypology(userText, stressIndex.overall_score);

    return NextResponse.json({
      interaction_id: interactionId,
      reply: aiReply,
      next_phase: nextPhase,
      question_id: currentQid,
      next_question_id: nextQid,
      interpretation: { intent: "support_inquiry", confidence: 0.9 },
      citations: [],
      assessment: {
        svi_score: stressIndex.overall_score,
        risk_category: stressIndex.risk_category,
        confidence: "medium",
        risk_reasons: [
          `Emotional Strain: ${stressIndex.emotional_strain}/100`,
          `Somatic Load: ${stressIndex.somatic_load}/100`,
          `Environmental & Safety Risk: ${stressIndex.environmental_risk}/100`,
          ...(cameraFatigue && cameraFatigue.expression && cameraFatigue.expression !== "neutral"
            ? [`Active Facial Expression: ${cameraFatigue.expression_emoji || ""} ${cameraFatigue.expression_label || cameraFatigue.expression}${typeof cameraFatigue.smile_score === "number" ? ` (Smile: ${cameraFatigue.smile_score}%)` : ""} • Vitality: ${cameraFatigue.vitality_status || "Active"}`]
            : []),
          ...(cameraFatigue && typeof cameraFatigue.score === "number"
            ? [`Camera Fatigue Telemetry: ${cameraFatigue.score}% (${cameraFatigue.level_label || cameraFatigue.level}) • ${cameraFatigue.status_message || ""}`]
            : []),
        ],
        recommended_action:
          "Confidential guidance, psychosocial listening, and optional NHAA reporting (Helpline: 14566 | Portal: https://www.dosje.gov.in/organisation/national-helpline-against-atrocities/).",
        human_review_recommended: stressIndex.overall_score >= 60,
        voice_signal_status: "available",
        disclaimer: "Support and triage tool only — not a clinical or legal diagnosis.",
        crisis_mode: stressIndex.overall_score >= 80,
        stress_index: stressIndex,
        trauma_typology: traumaTypology,
        age_group: ageGroup || "Unspecified",
        medical_history: medicalHistory || "None reported",
      },
      draft_summary: draftSummary,
      crisis_mode: false,
      voice_signal_status: "available",
      conversation_mode: nextPhase === "ongoing_support" ? "ongoing_support" : "assessment",
      crisis_level: "none",
      resources: {
        nhaa_helpline: "14566",
        nhaa_portal: "https://www.dosje.gov.in/organisation/national-helpline-against-atrocities/",
        tele_manas: "14416",
        emergency: "112",
      },
      video_room_url: null,
      escalation_event_id: null,
    });
  } catch {
    // Return graceful recovery rather than 500
    return NextResponse.json(
      {
        reply: "I hear you, and I am right here with you. Please take your time, and continue whenever you feel ready.",
        next_phase: "ongoing_support",
        question_id: "Q01_SAFETY",
        next_question_id: null,
        crisis_mode: false,
        voice_signal_status: "available",
        conversation_mode: "ongoing_support",
        draft_summary: "Session preserved during transient network recovery.",
      },
      { status: 200 }
    );
  }
}
