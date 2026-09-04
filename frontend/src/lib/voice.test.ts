import { describe, expect, it } from "vitest";
import {
  estimateFeaturesFromAnalyser,
  getSpeechRecognitionLang,
  LANG_SPEECH_MAP,
} from "./voice";

describe("Voice Utilities", () => {
  it("maps language codes to appropriate regional speech recognition tags", () => {
    expect(getSpeechRecognitionLang("en")).toBe("en-IN");
    expect(getSpeechRecognitionLang("hi")).toBe("hi-IN");
    expect(getSpeechRecognitionLang("hinglish")).toBe("hi-IN");
    expect(getSpeechRecognitionLang("mr")).toBe("mr-IN");
    expect(getSpeechRecognitionLang("bn")).toBe("bn-IN");
    expect(getSpeechRecognitionLang("ta")).toBe("ta-IN");
    expect(getSpeechRecognitionLang("te")).toBe("te-IN");
    expect(getSpeechRecognitionLang("unknown")).toBe("en-IN");
  });

  it("handles empty volumes gracefully", () => {
    const features = estimateFeaturesFromAnalyser([], 0, 0);
    expect(features.speech_rate).toBeNull();
    expect(features.pause_ratio).toBeNull();
    expect(features.audio_quality).toBe(0.2);
  });

  it("calculates speech rate and pause ratio correctly with active audio", () => {
    const sampleVolumes = [2, 3, 25, 30, 28, 22, 18, 4, 3, 2];
    const duration = 5; // 5 seconds
    const wordCount = 10; // 10 words
    
    const features = estimateFeaturesFromAnalyser(sampleVolumes, duration, wordCount);
    expect(features.speech_rate).toBe(2); // 10 words / 5s = 2 wps
    expect(features.pause_ratio).toBeGreaterThan(0);
    expect(features.audio_quality).toBeGreaterThan(0.2);
  });
});
