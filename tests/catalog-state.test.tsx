import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CatalogErrorState, EmptyCatalogState } from "@/components/CatalogState";
import { cleanup } from "@testing-library/react";

/**
 * The two catalogue states that a visitor reaches when something has gone
 * wrong. They are covered here rather than in the browser because neither is
 * reachable against the live database without breaking it: the empty state
 * needs an empty table, and the error state needs the database to fail.
 *
 * Unreachable-in-normal-use is exactly why they rot: nothing in the app's own
 * happy path would notice if they stopped rendering or lost their wording.
 */

afterEach(cleanup);

describe("catalogue states", () => {
  it("the error state announces itself as an alert", () => {
    render(<CatalogErrorState />);
    // role=alert is what makes a screen reader hear the failure at all.
    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByRole("heading", { name: /didn't load/i })).toBeDefined();
  });

  it("the error state says what happened and what to do next", () => {
    render(<CatalogErrorState />);
    expect(screen.getByText(/did not load/i)).toBeDefined();
    expect(screen.getByText(/nothing was changed/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /try again/i })).toBeDefined();
  });

  it("the error state does not claim the failure was the visitor's fault", () => {
    const { container } = render(<CatalogErrorState />);
    const text = container.textContent ?? "";
    // Vague or apologetic copy is banned by DESIGN_GUIDELINES product language.
    expect(text).not.toMatch(/oops|sorry|something went wrong|unexpected error/i);
    // A customer cannot act on this, so it must not be shown to one.
    expect(text).not.toMatch(/env|database connection|supabase|api key/i);
  });

  it("the empty state explains the cause and offers a way out", () => {
    render(<EmptyCatalogState />);
    expect(screen.getByRole("heading", { name: /no products yet/i })).toBeDefined();
    expect(screen.getByText(/catalogue is empty/i)).toBeDefined();
    // No jest-dom in this project, so assert the attribute directly.
    expect(
      screen.getByRole("link", { name: /back to home/i }).getAttribute("href"),
    ).toBe("/");
  });

  it("the empty state is not an alert", () => {
    // An empty catalogue is not an error; announcing it as one would be wrong.
    const { container } = render(<EmptyCatalogState />);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
