import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, CardBody } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { disconnectWhatsapp, exchangeEmbeddedSignupCode, sendTestMessage } from '@/services';
import type { WhatsAppAccount } from '@/types';
import { cn } from '@/utils/cn';
import { env } from '@/utils/env';
import { toMessage } from '@/utils/errors';
import { formatDate } from '@/utils/format';

/**
 * A merchant never sees a technical field here — no phone number ID, no
 * WABA ID, no access token. The only way in is Meta's Embedded Signup
 * (see worker/src/whatsappConnect.ts for what happens after the popup
 * closes); a lower-level manual-entry path still exists server-side for
 * support/scripted use (functions/src/http/organizations.ts's
 * connectWhatsapp) but nothing in this page calls it.
 */
const embeddedSignupConfigured = Boolean(env.meta.appId && env.meta.configId && env.whatsappWorkerUrl);

export function WhatsAppPage() {
  const { org } = useAuth();
  const whatsapp = org!.whatsapp;

  return (
    <>
      <PageHeader title="WhatsApp" description="The number this business takes orders on." />
      <Card>
        <CardBody className="p-6">
          {whatsapp.connected ? <ConnectedState whatsapp={whatsapp} /> : <NotConnectedState orgId={org!.id} />}
        </CardBody>
      </Card>
    </>
  );
}

/* -------------------------------- Connected -------------------------------- */

function ConnectedState({ whatsapp }: { whatsapp: WhatsAppAccount }) {
  const toast = useToast();
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const runTest = async () => {
    if (!whatsapp.displayPhoneNumber) return;
    setTesting(true);
    try {
      await sendTestMessage(whatsapp.displayPhoneNumber);
      toast.success('Test message sent — check your WhatsApp.');
    } catch (err) {
      toast.error(toMessage(err));
    } finally {
      setTesting(false);
    }
  };

  const disconnect = async () => {
    const confirmed = window.confirm(
      "Disconnect this WhatsApp number? Customers won't be able to order until you connect again.",
    );
    if (!confirmed) return;
    setDisconnecting(true);
    try {
      await disconnectWhatsapp();
      toast.success('WhatsApp disconnected.');
    } catch (err) {
      toast.error(toMessage(err));
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm text-center">
      <Badge className="bg-brand/10 text-brand">🟢 WhatsApp Connected</Badge>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Connected Number</p>
      <p className="text-2xl font-bold text-ink">{whatsapp.displayPhoneNumber}</p>
      {whatsapp.connectedAt && (
        <p className="mt-1 text-xs text-muted">Since {formatDate(whatsapp.connectedAt)}</p>
      )}

      <div className="mt-6 space-y-3 text-left">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
          <div>
            <p className="text-sm font-semibold text-ink">Test Connection</p>
            <p className="text-xs text-muted">Sends a message to your own number.</p>
          </div>
          <Button type="button" size="sm" loading={testing} onClick={runTest}>
            Test
          </Button>
        </div>

        <div className="rounded-xl border border-line p-3">
          <p className="text-sm font-semibold text-ink">Quality Rating</p>
          <p className="mt-1 text-xs text-muted">
            {whatsapp.qualityRating
              ? qualityRatingLabel(whatsapp.qualityRating)
              : 'Not available yet — Meta rates a number after it sends a few messages.'}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/5 p-3">
          <div>
            <p className="text-sm font-semibold text-ink">Disconnect</p>
            <p className="text-xs text-muted">Orders already placed stay in your dashboard.</p>
          </div>
          <Button type="button" variant="danger" size="sm" loading={disconnecting} onClick={disconnect}>
            Disconnect
          </Button>
        </div>
      </div>
    </div>
  );
}

function qualityRatingLabel(rating: string): string {
  const labels: Record<string, string> = {
    GREEN: 'Good standing',
    YELLOW: 'Needs attention — messaging limits may apply',
    RED: 'At risk — review your recent messages',
    UNKNOWN: 'Not rated yet',
  };
  return labels[rating] ?? rating;
}

/* ------------------------------ Not connected ------------------------------ */

type ConnectStep = 'account' | 'verify' | 'finalizing';

function NotConnectedState({ orgId }: { orgId: string }) {
  const toast = useToast();
  const [step, setStep] = useState<ConnectStep | null>(null);

  const finish = async (code: string, payload: EmbeddedSignupPayload) => {
    setStep('finalizing');
    try {
      await exchangeEmbeddedSignupCode({ code, organizationId: orgId, ...payload });
      toast.success('WhatsApp connected.');
      // Deliberately no local "done" state — org.whatsapp.connected flips via
      // the live Firestore listener in useAuth, which swaps this whole
      // component out for ConnectedState on its own.
    } catch (err) {
      toast.error(toMessage(err));
      setStep(null);
    }
  };

  // Meta's postMessage (merchant picked/verified a number inside the popup)
  // and FB.login's own callback (the auth code) arrive independently — this
  // is the closest honest mapping from those two real signals to the
  // 3-step UI: "Verify Number" starts the moment we have the phone/WABA id,
  // "Finalizing" once both are ready and we call our own backend.
  const registerCode = useEmbeddedSignupPayload((code, payload) => {
    setStep((current) => current ?? 'verify');
    void finish(code, payload);
  });

  const start = async () => {
    if (!embeddedSignupConfigured) {
      toast.error('WhatsApp connect is not set up yet — contact support.');
      return;
    }
    setStep('account');
    try {
      await loadFacebookSdk(env.meta.appId);
      window.FB?.login(
        (response) => {
          const code = response.authResponse?.code;
          if (code) registerCode(code);
          else setStep(null);
        },
        {
          config_id: env.meta.configId,
          response_type: 'code',
          override_default_response_type: true,
          extras: { feature: 'whatsapp_embedded_signup', sessionInfoVersion: '3' },
        },
      );
    } catch (err) {
      toast.error(toMessage(err));
      setStep(null);
    }
  };

  if (step) return <ConnectingProgress step={step} />;

  return (
    <div className="mx-auto max-w-sm text-center">
      <h2 className="text-xl font-bold text-ink">Connect Your WhatsApp</h2>
      <p className="mt-2 text-sm text-muted">
        Start receiving customer orders on your own WhatsApp number in about 2 minutes.
      </p>

      <ul className="mt-5 space-y-2 text-left text-sm text-ink">
        <li className="flex items-center gap-2">
          <span className="text-brand" aria-hidden>✓</span> WhatsApp Business number
        </li>
        <li className="flex items-center gap-2">
          <span className="text-brand" aria-hidden>✓</span> Facebook account
        </li>
        <li className="flex items-center gap-2">
          <span className="text-brand" aria-hidden>✓</span> Phone nearby for OTP verification
        </li>
      </ul>

      {embeddedSignupConfigured ? (
        <Button type="button" fullWidth className="mt-6" onClick={start}>
          Connect WhatsApp
        </Button>
      ) : (
        <p className="mt-6 rounded-xl bg-raised px-3 py-2 text-sm text-muted">
          WhatsApp connect isn't set up yet — check back soon.
        </p>
      )}

      <p className="mt-3 text-xs text-muted">We never ask you to copy API keys or tokens.</p>
    </div>
  );
}

function ConnectingProgress({ step }: { step: ConnectStep }) {
  const steps: { id: ConnectStep; label: string }[] = [
    { id: 'account', label: 'Connect Account' },
    { id: 'verify', label: 'Verify Number' },
    { id: 'finalizing', label: 'Finalizing' },
  ];
  const currentIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="mx-auto max-w-sm text-center">
      <h2 className="text-xl font-bold text-ink">Connecting…</h2>
      <p className="mt-2 text-sm text-muted">Finish inside the Facebook window that just opened.</p>
      <ol className="mt-6 space-y-3 text-left">
        {steps.map((s, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li key={s.id} className="flex items-center gap-3">
              <span
                aria-hidden
                className={cn(
                  'grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold',
                  done && 'bg-brand text-white',
                  active && !done && 'border-2 border-brand text-brand',
                  !active && !done && 'border border-line text-muted',
                )}
              >
                {done ? '✓' : index + 1}
              </span>
              <span className={cn('text-sm', active ? 'font-semibold text-ink' : 'text-muted')}>{s.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------- Meta Embedded Signup SDK ------------------------ */

interface FacebookLoginResponse {
  authResponse?: { code?: string } | null;
}

declare global {
  interface Window {
    FB?: {
      init: (options: { appId: string; autoLogAppEvents: boolean; xfbml: boolean; version: string }) => void;
      login: (
        callback: (response: FacebookLoginResponse) => void,
        options: { config_id: string; response_type: string; override_default_response_type: boolean; extras: Record<string, unknown> },
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

let sdkLoadPromise: Promise<void> | null = null;

/** Loads Meta's JS SDK exactly once, however many components ask for it. */
function loadFacebookSdk(appId: string): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise((resolve) => {
    window.fbAsyncInit = () => {
      window.FB?.init({ appId, autoLogAppEvents: true, xfbml: false, version: 'v21.0' });
      resolve();
    };
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  });
  return sdkLoadPromise;
}

interface EmbeddedSignupPayload {
  phoneNumberId: string;
  businessAccountId: string;
}

/**
 * Meta's flow hands back two things, from two different places: the login
 * `code` from FB.login's own callback, and the phone/WABA id the merchant
 * actually picked (or created) inside the popup, via a postMessage event.
 * The exchange can't run until both have arrived.
 */
function useEmbeddedSignupPayload(onReady: (code: string, payload: EmbeddedSignupPayload) => void) {
  const codeRef = useRef<string | null>(null);
  const payloadRef = useRef<EmbeddedSignupPayload | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') return;
      try {
        const data = JSON.parse(event.data as string) as {
          type?: string;
          event?: string;
          data?: { phone_number_id?: string; waba_id?: string };
        };
        if (data.type !== 'WA_EMBEDDED_SIGNUP' || data.event !== 'FINISH') return;
        const phoneNumberId = data.data?.phone_number_id;
        const businessAccountId = data.data?.waba_id;
        if (!phoneNumberId || !businessAccountId) return;
        payloadRef.current = { phoneNumberId, businessAccountId };
        if (codeRef.current) onReady(codeRef.current, payloadRef.current);
      } catch {
        // Not JSON, or not the message we're listening for — ignore.
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onReady]);

  return (code: string) => {
    codeRef.current = code;
    if (payloadRef.current) onReady(code, payloadRef.current);
  };
}
