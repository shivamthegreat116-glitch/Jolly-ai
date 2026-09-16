export function DisclaimerBar() {
  return (
    <div
      className="disclaimer-bar bg-surface-container-low text-text-secondary text-center text-xs py-1.5 px-3 border-b border-border-subtle/50 leading-normal select-none relative z-50"
      data-testid="disclaimer-bar"
    >
      This AI is a support and triage tool, not a medical, legal, or emergency service. It does not
      diagnose trauma, depression, anxiety, or any mental-health condition.
    </div>
  );
}
