/** The shell. Mostly one thing: the sidebar is navigation now, not decoration. */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Route, Routes } from "react-router-dom";
import App from "./App";
import { renderWithProviders } from "./test/render";

function renderShell(route = "/review") {
  return renderWithProviders(
    <Routes>
      <Route element={<App />}>
        <Route path="/intake" element={<p>Intake screen</p>} />
        <Route path="/review" element={<p>Review screen</p>} />
        <Route path="/batches" element={<p>Batches screen</p>} />
        <Route path="/published" element={<p>Published screen</p>} />
      </Route>
    </Routes>,
    { route },
  );
}

describe("App shell", () => {
  it("navigates rather than just looking like it does", async () => {
    const user = userEvent.setup();
    renderShell();
    expect(screen.getByText("Review screen")).toBeInTheDocument();

    await user.click(screen.getAllByRole("link", { name: /batch intake/i })[0]);

    expect(await screen.findByText("Intake screen")).toBeInTheDocument();
  });

  it("marks the current section from the URL, not from a hardcoded flag", () => {
    renderShell("/published");

    const current = screen
      .getAllByRole("link", { name: /published/i })
      .find((link) => link.getAttribute("aria-current") === "page");
    expect(current).toBeDefined();

    const intake = screen
      .getAllByRole("link", { name: /batch intake/i })
      .find((link) => link.getAttribute("aria-current") === "page");
    expect(intake).toBeUndefined();
  });

  it("names the service it is talking to, so a misconfigured base URL is visible", () => {
    renderShell();

    expect(screen.getByText("http://localhost:8001")).toBeInTheDocument();
  });
});
