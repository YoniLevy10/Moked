"use client";

import { useCallback, useEffect, useState } from "react";

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

type SessionInfo = {
  data?: Array<{
    phone_number_id?: string;
    waba_id?: string;
  }>;
};

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
            version: d.embeddedSignup.graphVersion || "v21.0",
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
    let session: SessionInfo | null = null;

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
        if (data?.type === "WA_EMBEDDED_SIGNUP") {
          session = data;
        }
      } catch {
        // ignore non-JSON
      }
    };
    window.addEventListener("message", onMessage);

    window.FB.login(
      async (response) => {
        window.removeEventListener("message", onMessage);
        try {
          const code = response.authResponse?.code;
          const phoneNumberId = session?.data?.[0]?.phone_number_id;
          const wabaId = session?.data?.[0]?.waba_id;
          if (!code || !phoneNumberId || !wabaId) {
            throw new Error(
              "Embedded Signup לא הושלם — חסרים code / waba / phone",
            );
          }
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
        extras: {
          setup: {},
          featureType: "",
          sessionInfoVersion: "3",
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
