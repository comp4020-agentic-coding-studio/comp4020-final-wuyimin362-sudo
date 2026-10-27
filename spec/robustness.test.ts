import { describe, expect, it } from "vitest";
import { gameWith, join, live, member, openPage, postGame, stranger, visit } from "./helpers.ts";

// What a page has to survive that it wasn't designed for: a button pressed
// twice on a slow connection, a page left and come back to through the
// browser's back button, and a live stream the server drops and refuses to
// reopen for a while, as Fly does while a machine restarts. Each check opens
// the page with its own scripts running, as a visitor's browser would.

const SECOND = 1000;

describe.skipIf(live)("holding up", () => {
  it("sends a form once, however many times its button is pressed", async () => {
    const host = await join(`Spec twice ${crypto.randomUUID().slice(0, 8)}`);
    const page = await openPage("/", host);
    const form = page.document.querySelector('form[action="/games"]') as HTMLFormElement | null;
    if (!form) throw new Error("no form to post a game");
    // filled in as a person would, so the browser's own checks let it through
    for (const select of form.querySelectorAll("select")) {
      const option = [...select.options].find((o) => o.value !== "");
      if (option) select.value = option.value;
    }
    const button = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    // a slow connection: the first press is still on its way when the second comes
    const sent: string[] = [];
    form.addEventListener("submit", (e) => {
      if (!e.defaultPrevented) sent.push("sent");
      e.preventDefault();
    });
    for (let press = 0; press < 3; press++) button.click();
    expect(sent, "a second press sent the form again").toHaveLength(1);
    expect(button.disabled || button.getAttribute("aria-disabled") === "true", "the button doesn't say it's busy").toBe(
      true,
    );
    page.close();
  });

  it("closes a live page's streams when it's left, and catches up when it's come back to", async () => {
    const watcher = await member("bfcache");
    const page = await openPage("/", watcher.who);
    const window = page.document.defaultView!;
    expect(page.openStreams(), "the board opened no stream").toBeGreaterThan(0);

    // the browser keeps the page for its back button, and the page lets its streams go
    window.dispatchEvent(new window.PageTransitionEvent("pagehide", { persisted: true }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(page.openStreams(), "a page kept for the back button still holds its streams").toBe(0);

    // a game is posted while the page is away; coming back shows it
    const note = `spec came back ${crypto.randomUUID().slice(0, 8)}`;
    await postGame(await join("Spec while away"), note);
    window.dispatchEvent(new window.PageTransitionEvent("pageshow", { persisted: true }));
    expect(await page.shows(note, 2 * SECOND), "a page come back to didn't catch up").toBeDefined();
    expect(page.openStreams(), "a page come back to didn't listen again").toBeGreaterThan(0);
    page.close();
  });

  it("keeps trying when a live stream is refused, says so, and catches up when it's back", async () => {
    const page = await openPage("/", stranger, { refuseReconnects: 2 });
    page.dropStreams();
    // the stream is refused twice, as by a proxy while the machine restarts
    expect(await page.shows("Reconnecting", 3 * SECOND), "the page didn't say it lost its live updates").toBeDefined();
    const note = `spec reconnected ${crypto.randomUUID().slice(0, 8)}`;
    await postGame(await join("Spec while down"), note);
    expect(await page.shows(note, 15 * SECOND), "the page never caught up after its stream came back").toBeDefined();
    const notice = [...page.document.querySelectorAll("[role=status], [hidden]")].find((el) =>
      el.textContent?.includes("Reconnecting"),
    );
    expect(notice?.hasAttribute("hidden"), "the page still says it's reconnecting").toBe(true);
    page.close();
  });

  it("keeps a guest's games on the board after the guest's browser forgets them", async () => {
    const id = crypto.randomUUID().slice(0, 8);
    const guest = await join(`Spec forgetful ${id}`);
    const note = `spec forgotten ${id}`;
    await postGame(guest, note);
    // the board says, before they join, what a guest's games are tied to
    expect((await visit("/", stranger)).body.textContent).toMatch(/clear.*cookies|this browser/i);
    expect(gameWith(await visit("/", stranger), note), "a guest's game left with their cookie").toBeDefined();
  });
});
