import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DisclaimerBar } from "@/components/DisclaimerBar";

describe("DisclaimerBar", () => {
  it("states the tool is not a medical or emergency service", () => {
    render(<DisclaimerBar />);
    expect(screen.getByTestId("disclaimer-bar").textContent).toMatch(/not a medical, legal, or emergency service/i);
    expect(screen.getByTestId("disclaimer-bar").textContent).not.toMatch(/diagnos(e|is) trauma as a fact/i);
  });
});
