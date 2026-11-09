"use client";

import { useCallback, useEffect, useState } from "react";
import { parseEmbeddedSignupSession } from "@/lib/whatsapp/embedded-signup-session";
import {
  META_EMBEDDED_SIGNUP_VERSION,
  META_GRAPH_VERSION,
} from "@/lib/whatsapp/graph";

type Props = {
  onConnected: () => void;
  onError: (message: string) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
};

declare global {
  interface Window {
    FB?: {
      init: (opts: Record<string, unknown>) => void;
      login: (
        cb: (response: {
          authResponse?: { code?: string };
          status?: string;
        }) => void,
        opts: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

type SessionCapture = ReturnType<typeof parseEmbeddedSignupSession> | null;

export function EmbeddedSignupButton({
  onConnected,
  onError,
  disabled,
  className,
  label = "חבר WhatsApp חי (Meta)",
}: Props) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<{
    appId: string;
    configId: string;
    graphVersion: string;
    embeddedSignupVersion: string;
    ready: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/whatsapp/connect")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setConfig(d.embeddedSignup);
        if (!d.embeddedSignup?.ready) return;

        window.fbAsyncInit = () => {
          window.FB?.init({
            appId: d.embeddedSignup.appId,
            autoLogAppEvents: true,
            xfbml: true,
            version: d.embeddedSignup.graphVersion || META_GRAPH_VERSION,
          });
          if (!cancelled) setReady(true);
        };

        if (document.getElementById("facebook-jssdk")) {
          window.fbAsyncInit();
          return;
        }
        const script = document.createElement("script");
        script.id = "facebook-jssdk";
        script.async = true;
        script.defer = true;
        script.src = "https://connect.facebook.net/en_US/sdk.js";
        document.body.appendChild(script);
      })
      .catch(() => {
        if (!cancelled) onError("לא ניתן לטעון הגדרות Meta");
      });

    return () => {
      cancelled = true;
    };
  }, [onError]);

  const launch = useCallback(() => {
    if (!window.FB || !config?.ready) {
      onError(
        "Meta לא מוגדר. הגדירו META_APP_ID, META_APP_SECRET, META_EMBEDDED_SIGNUP_CONFIG_ID",
      );
      return;
    }

    setLoading(true);
    let session: SessionCapture = null;

    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
        return;
      }
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type !== "WA_EMBEDDED_SIGNUP") return;
        // Always capture — CANCEL/ERROR must block connect even if FB.login returns a code.
        session = parseEmbeddedSignupSession(data);
      } catch {
        // ignore non-JSON
      }
    };
    window.addEventListener("message", onMessage);

    const embeddedVersion =
      config.embeddedSignupVersion || META_EMBEDDED_SIGNUP_VERSION;

    window.FB.login(
      async (response) => {
        window.removeEventListener("message", onMessage);
        try {
          const code = response.authResponse?.code;
          if (!code) {
            throw new Error(
              "Embedded Signup לא הושלם — חסר code (ייתכן שסגרתם לפני Finish)",
            );
          }
          if (!session) {
            throw new Error(
              "Embedded Signup לא הושלם — לא התקבלה הודעת session מ-Meta",
            );
          }
          if (!session.ok) {
            const map: Record<string, string> = {
              cancelled: "ביטלתם את חיבור Meta",
              error: session.detail ?? "שגיאה ב-Embedded Signup",
              incomplete_no_phone:
                "החיבור הסתיים בלי מספר טלפון — בחרו מספר WhatsApp והשלימו שוב",
              missing_ids: "חסרים waba_id / phone_number_id מה-session",
              unexpected_event: `אירוע Embedded Signup לא נתמך: ${session.detail ?? session.event}`,
            };
            throw new Error(
              map[session.reason] ??
                `Embedded Signup נכשל (${session.reason})`,
            );
          }

          const { phoneNumberId, wabaId } = session.ids;
          const res = await fetch("/api/whatsapp/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: "live",
              code,
              wabaId,
              phoneNumberId,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message ?? data.error ?? "חיבור נכשל");
          }
          onConnected();
        } catch (e) {
          onError(e instanceof Error ? e.message : "שגיאת חיבור Meta");
        } finally {
          setLoading(false);
        }
      },
      {
        config_id: config.configId,
        response_type: "code",
        override_default_response_type: true,
        // v4: version in extras; do NOT send deprecated sessionInfoVersion (v2-era).
        extras: {
          setup: {},
          version: embeddedVersion,
        },
      },
    );
  }, [config, onConnected, onError]);

  if (config && !config.ready) {
    return (
      <p className="text-sm text-muted">
        חיבור חי דורש משתני סביבה:{" "}
        <code>META_APP_ID</code>, <code>META_APP_SECRET</code>,{" "}
        <code>META_EMBEDDED_SIGNUP_CONFIG_ID</code>
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || loading || !ready}
      onClick={launch}
      className={
        className ??
        "w-full rounded-full border border-line bg-white/70 py-3.5 font-semibold hover:bg-white disabled:opacity-60"
      }
    >
      {loading ? "מחבר ל-Meta…" : ready ? label : "טוען SDK…"}
    </button>
  );
}
