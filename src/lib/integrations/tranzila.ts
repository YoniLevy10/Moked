import { createHmac } from "crypto";
import {
  ChargeTokenInput,
  ChargeTokenResult,
  CreateHostedChargeInput,
  CreateHostedChargeResult,
  hmacHex,
  parseSignedWebhookBody,
  PspClient,
  PspProvider,
  pspWebhookSecret,
  safeEqualHex,
  VerifiedPspWebhook,
} from "@/lib/integrations/psp";

function tranzilaConfig() {
  const apiUrl = process.env.TRANZILA_API_URL?.trim();
  const terminal = process.env.TRANZILA_TERMINAL?.trim();
  const apiKey = process.env.TRANZILA_API_KEY?.trim();
  const apiSecret = process.env.TRANZILA_API_SECRET?.trim();
  const hostedBase =
    process.env.TRANZILA_HOSTED_BASE_URL?.trim() ||
    "https://direct.tranzila.com";
  const tokenUrl = process.env.TRANZILA_TOKEN_URL?.trim();
  if (!apiUrl || !terminal || !apiKey) {
    throw new Error("tranzila_not_configured");
  }
  return { apiUrl, terminal, apiKey, apiSecret, hostedBase, tokenUrl };
}

function tranzilaV2Headers(
  apiKey: string,
  apiSecret: string | undefined,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-tranzila-api-app-key": apiKey,
  };
  if (apiSecret) {
    const ts = Math.floor(Date.now() / 1000).toString();
    const nonce = `${ts}${Math.random().toString(36).slice(2, 10)}`;
    const accessToken = createHmac("sha256", apiSecret)
      .update(apiKey + ts + nonce)
      .digest("hex");
    headers["X-tranzila-api-request-time"] = ts;
    headers["X-tranzila-api-nonce"] = nonce;
    headers["X-tranzila-api-access-token"] = accessToken;
  }
  return headers;
}

/**
 * First live PspClient adapter. Other PSPs (Grow/PayPlus/Cardcom) get their own files.
 * TRANZILA_* env vars stay scoped to this adapter.
 */
export class TranzilaClient implements PspClient {
  readonly provider: PspProvider = "tranzila";

  async createHostedCharge(
    input: CreateHostedChargeInput,
  ): Promise<CreateHostedChargeResult> {
    const cfg = tranzilaConfig();
    const body = JSON.stringify({
      terminal_name: cfg.terminal,
      sum: input.amountIls,
      currency_code: "ILS",
      handshake_key: input.conversationId ?? input.tenantId,
      response_language: "hebrew",
      success_url: input.successUrl,
      fail_url: input.cancelUrl,
      notify_url_address:
        process.env.TRANZILA_NOTIFY_URL?.trim() || undefined,
    });
    const res = await fetch(
      `${cfg.apiUrl.replace(/\/$/, "")}/v2/handshake/create`,
      {
        method: "POST",
        headers: tranzilaV2Headers(cfg.apiKey, cfg.apiSecret),
        body,
      },
    );
    if (!res.ok) {
      throw new Error(`tranzila_handshake_failed:${res.status}`);
    }
    const data = (await res.json()) as {
      thtk?: string;
      handshake_token?: string;
      transaction_id?: string;
    };
    const token = data.thtk || data.handshake_token;
    if (!token) throw new Error("tranzila_handshake_missing_token");
    const externalId =
      data.transaction_id || `tranzila_${input.tenantId}_${Date.now()}`;
    const hostedUrl = `${cfg.hostedBase.replace(/\/$/, "")}/${cfg.terminal}/iframenew.php?sum=${input.amountIls}&currency=1&tranmode=AK&thtk=${encodeURIComponent(token)}`;
    return { hostedUrl, externalId, provider: "tranzila" };
  }

  async chargeToken(input: ChargeTokenInput): Promise<ChargeTokenResult> {
    const cfg = tranzilaConfig();
    const endpoint =
      cfg.tokenUrl ||
      `${cfg.apiUrl.replace(/\/$/, "")}/v1/transaction/credit_card/create`;
    const body = JSON.stringify({
      terminal_name: cfg.terminal,
      amount: input.amountIls,
      currency_code: "ILS",
      card_token: input.token,
      description: input.description,
    });
    const res = await fetch(endpoint, {
      method: "POST",
      headers: tranzilaV2Headers(cfg.apiKey, cfg.apiSecret),
      body,
    });
    if (!res.ok) {
      return {
        success: false,
        externalId: `tranzila_token_fail_${Date.now()}`,
        provider: "tranzila",
      };
    }
    const data = (await res.json()) as {
      transaction_id?: string;
      success?: boolean;
      error_code?: number | string;
    };
    const success =
      data.success === true ||
      data.error_code === 0 ||
      data.error_code === "0";
    return {
      success,
      externalId: data.transaction_id || `tranzila_token_${Date.now()}`,
      provider: "tranzila",
    };
  }

  verifyWebhook(
    rawBody: string,
    signatureHeader: string | null,
  ): VerifiedPspWebhook | null {
    const secret = pspWebhookSecret();
    if (!secret) return null;

    if (signatureHeader) {
      const expected = hmacHex(secret, rawBody);
      if (!safeEqualHex(expected, signatureHeader)) return null;
      const signed = parseSignedWebhookBody(rawBody);
      if (signed) return signed;
    }

    try {
      const body = JSON.parse(rawBody) as Record<string, unknown>;
      const responseHash =
        typeof body.response_hash === "string"
          ? body.response_hash
          : typeof body.ResponseHash === "string"
            ? body.ResponseHash
            : null;
      const externalId =
        (typeof body.index === "string" && body.index) ||
        (typeof body.transaction_id === "string" && body.transaction_id) ||
        (typeof body.ConfirmationCode === "string" &&
          body.ConfirmationCode) ||
        null;
      if (!externalId) return null;

      if (responseHash) {
        const material =
          String(body.sum ?? body.Sum ?? "") +
          String(body.currency ?? body.Currency ?? "") +
          String(body.Response ?? body.response ?? "") +
          String(externalId);
        const expected = createHmac("sha256", secret)
          .update(material)
          .digest("hex");
        if (!safeEqualHex(expected, responseHash) && responseHash !== secret) {
          return null;
        }
      } else if (!signatureHeader) {
        return null;
      }

      const responseCode = String(
        body.Response ?? body.response ?? body.status ?? "",
      );
      const paid =
        responseCode === "000" ||
        responseCode === "0" ||
        responseCode === "paid" ||
        responseCode === "active";
      const failed =
        responseCode === "failed" ||
        responseCode === "canceled" ||
        responseCode === "past_due";
      const kind =
        body.kind === "billing" ||
        String(body.handshake_key ?? "").startsWith("tenant:")
          ? "billing"
          : "payment";
      const status: VerifiedPspWebhook["status"] = paid
        ? kind === "billing"
          ? "active"
          : "paid"
        : failed
          ? responseCode === "past_due"
            ? "past_due"
            : responseCode === "canceled"
              ? "canceled"
              : "failed"
          : kind === "billing"
            ? "active"
            : "paid";
      const eventId =
        (typeof body.event_id === "string" && body.event_id) ||
        (typeof body.Tempref === "string" && body.Tempref) ||
        `tranzila_${externalId}`;
      return {
        eventId,
        externalId,
        status,
        invoiceId:
          typeof body.invoiceId === "string" ? body.invoiceId : undefined,
        amountIls:
          typeof body.sum === "number"
            ? body.sum
            : typeof body.Sum === "string"
              ? Number(body.Sum)
              : undefined,
        kind,
      };
    } catch {
      return null;
    }
  }
}
