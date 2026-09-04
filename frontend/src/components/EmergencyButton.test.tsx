import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmergencyButton } from "@/components/EmergencyButton";

describe("EmergencyButton", () => {
  it("renders the emergency help button", () => {
    render(<EmergencyButton />);
    const button = screen.getByRole("button", { name: /emergency help/i });
    expect(button).toBeDefined();
  });
});
