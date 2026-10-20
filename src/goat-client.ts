import { EventEmitter } from "events";
import { Browser, BrowserContext, Page, chromium } from "playwright";
import * as fs from "fs";
import { logger } from "./logger";
import { GoatClientLike, GoatMessage } from "./goat-client-interface";

export type { GoatMessage } from "./goat-client-interface";

export interface GoatClientConfig {
  baseUrl: string;
  username: string;
  password: string;
  headless: boolean;
  storageStatePath: string;
}

/**
 * Browser-driven client for goat.computer.
 *
 * goat.computer has no public API, so we drive its web UI with Playwright.
 * The selectors and login flow below are placeholders — fill them in after
 * inspecting the real DOM. The public interface (sendMessage, "message"
 * event) is what bridge.ts depends on; keep it stable while changing the
 * scraping internals.
 */
export class GoatClient extends EventEmitter implements GoatClientLike {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private pollTimer?: NodeJS.Timeout;
  private seenIds = new Set<string>();

  constructor(private cfg: GoatClientConfig) {
    super();
  }

  async start(): Promise<void> {
    this.browser = await chromium.launch({ headless: this.cfg.headless });
    const hasState =
      this.cfg.storageStatePath && fs.existsSync(this.cfg.storageStatePath);
    this.context = await this.browser.newContext(
      hasState ? { storageState: this.cfg.storageStatePath } : {},
    );
    this.page = await this.context.newPage();

    await this.page.goto(this.cfg.baseUrl, { waitUntil: "domcontentloaded" });
    if (!(await this.isLoggedIn())) {
      await this.login();
      await this.context.storageState({ path: this.cfg.storageStatePath });
    }

    this.pollTimer = setInterval(() => {
      this.pollMessages().catch((err) =>
        logger.error("goat poll failed", { err: err.message }),
      );
    }, 3000);
    logger.info("GoatClient started");
  }

  async stop(): Promise<void> {
    if (this.pollTimer) clearInterval(this.pollTimer);
    await this.context?.close();
    await this.browser?.close();
  }

  async sendMessage(channel: string, msg: GoatMessage): Promise<void> {
    if (!this.page) throw new Error("GoatClient not started");
    await this.navigateToChannel(channel);

    // TODO: replace selector with the real composer on goat.computer
    const composer = this.page.locator('[data-testid="composer"], textarea').first();
    await composer.fill(`${msg.sender}: ${msg.body}`);
    await composer.press("Enter");
  }

  private async isLoggedIn(): Promise<boolean> {
    if (!this.page) return false;
    // TODO: replace with a selector that only exists when authed
    return (await this.page.locator('[data-testid="user-menu"]').count()) > 0;
  }

  private async login(): Promise<void> {
    if (!this.page) throw new Error("page missing");
    // TODO: replace selectors with goat.computer's login flow
    await this.page.goto(`${this.cfg.baseUrl}/login`);
    await this.page.fill('input[name="username"]', this.cfg.username);
    await this.page.fill('input[name="password"]', this.cfg.password);
    await this.page.click('button[type="submit"]');
    await this.page.waitForLoadState("networkidle");
    logger.info("Logged into goat.computer");
  }

  private async navigateToChannel(channel: string): Promise<void> {
    if (!this.page) throw new Error("page missing");
    const target = `${this.cfg.baseUrl}/channels/${encodeURIComponent(channel)}`;
    if (this.page.url() !== target) {
      await this.page.goto(target, { waitUntil: "domcontentloaded" });
    }
  }

  /**
   * Polls visible messages and emits "message" for unseen ones.
   * Replace with a websocket listener if you can intercept one.
   */
  private async pollMessages(): Promise<void> {
    if (!this.page) return;
    // TODO: scope to the active channel and use the real selectors
    const items = await this.page
      .locator('[data-testid="message"]')
      .evaluateAll((nodes) =>
        nodes.map((n) => ({
          id: n.getAttribute("data-message-id") ?? "",
          sender: n.querySelector('[data-testid="sender"]')?.textContent ?? "unknown",
          body: n.querySelector('[data-testid="body"]')?.textContent ?? "",
          channel: n.getAttribute("data-channel") ?? "",
        })),
      );

    for (const item of items) {
      if (!item.id || this.seenIds.has(item.id)) continue;
      this.seenIds.add(item.id);
      this.emit("message", item.channel, {
        sender: item.sender,
        body: item.body,
      } satisfies GoatMessage);
    }
  }
}
