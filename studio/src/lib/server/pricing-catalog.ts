/**
 * Public API list prices — one table to audit and update when a provider changes prices, each row citing
 * where it came from and when. A stale or invented number here quietly mis-prices every run that hits it, so
 * an unlisted model must leave cost unavailable, never fall back to a guess (`voice-cost.ts` enforces this).
 *
 * Only providers with NO other way to know the true cost belong here. Claude and Codex already report or
 * derive a real cost per request (Claude Code's own `total_cost_usd`; 9router's per-request ledger for Codex).
 * Claude's was cross-checked once (26/09/2026, see COST-COMPARISON) against these same published Anthropic
 * rates and matched to 4 decimal places — recomputing it here would only add a second, harder-to-keep-current
 * source of truth for a number the provider already gives us directly. ElevenLabs has no such per-request
 * signal (the account credit meter needs a permission most keys lack), so its cost is priced from the
 * character count Studio already knows, at the model actually used that run's own published rate.
 */
export interface PriceEntry {
  usdPer1kChars: number;
  source: string;
}

// Thêm model mới: tra elevenlabs.io/pricing/api, ghi rõ ngày tra. Model không có ở đây → chi phí để trống,
// không suy ra giá của model khác, kể cả model "họ hàng" nghe giống tên.
export const ELEVENLABS_PRICING: Record<string, PriceEntry> = {
  eleven_v3: { usdPer1kChars: 0.10, source: "elevenlabs.io/pricing/api, tra 26/09/2026" },
  eleven_turbo_v2_5: { usdPer1kChars: 0.05, source: "elevenlabs.io/pricing/api, tra 26/09/2026" },
  // Trang giá xếp Flash v2.5 cùng bậc với Turbo v2.5.
  eleven_flash_v2_5: { usdPer1kChars: 0.05, source: "elevenlabs.io/pricing/api, tra 26/09/2026 — cùng bậc giá với Turbo v2.5" },
};
