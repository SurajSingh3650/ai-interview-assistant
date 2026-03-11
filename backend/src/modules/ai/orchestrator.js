async function orchestrateTranscript({ transcript, roleFocus, levelFocus }) {
  const normalized = String(transcript || "").trim();

  // Placeholder orchestration logic; replace with real provider routing and guardrails.
  if (!normalized) {
    return {
      hint: "Please provide a response so I can coach your answer quality.",
      followupQuestion: "Can you walk me through a concrete example?",
      confidenceDelta: 0
    };
  }

  const concise = normalized.length < 200;

  return {
    hint: concise
      ? "Good brevity. Add one measurable impact to strengthen credibility."
      : "Try tightening this to a structured STAR answer in under 90 seconds.",
    followupQuestion: `What specific outcome did you achieve in that ${roleFocus} scenario?`,
    confidenceDelta: levelFocus.toLowerCase().includes("senior") ? 3 : 2
  };
}

module.exports = {
  orchestrateTranscript
};
