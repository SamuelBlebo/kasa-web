import { logger } from 'firebase-functions/v2';
import { GRAPH_VERSION } from '../config';
import type { WhatsappCredentials } from '../types';

interface SendResult {
  ok: boolean;
  error?: string;
}

async function send(creds: WhatsappCredentials, payload: Record<string, unknown>): Promise<SendResult> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION.value()}/${creds.phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
  });

  if (!response.ok) {
    const detail = await response.text();
    logger.error('WhatsApp send failed', { status: response.status, detail });
    return { ok: false, error: detail };
  }
  return { ok: true };
}

export function sendText(creds: WhatsappCredentials, to: string, body: string) {
  return send(creds, { to, type: 'text', text: { preview_url: false, body } });
}

export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

export function sendList(
  creds: WhatsappCredentials,
  to: string,
  opts: { body: string; buttonLabel: string; sectionTitle: string; rows: ListRow[]; footer?: string },
) {
  return send(creds, {
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: truncate(opts.body, 1024) },
      ...(opts.footer ? { footer: { text: truncate(opts.footer, 60) } } : {}),
      action: {
        button: truncate(opts.buttonLabel, 20),
        sections: [
          {
            title: truncate(opts.sectionTitle, 24),
            rows: opts.rows.slice(0, 10).map((row) => ({
              id: row.id.slice(0, 200),
              title: truncate(row.title, 24),
              ...(row.description ? { description: truncate(row.description, 72) } : {}),
            })),
          },
        ],
      },
    },
  });
}

export function sendButtons(
  creds: WhatsappCredentials,
  to: string,
  opts: { body: string; buttons: Array<{ id: string; title: string }>; header?: string },
) {
  return send(creds, {
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      ...(opts.header ? { header: { type: 'text', text: truncate(opts.header, 60) } } : {}),
      body: { text: truncate(opts.body, 1024) },
      action: {
        buttons: opts.buttons.slice(0, 3).map((b) => ({
          type: 'reply',
          reply: { id: b.id.slice(0, 200), title: truncate(b.title, 20) },
        })),
      },
    },
  });
}

export function sendImage(creds: WhatsappCredentials, to: string, link: string, caption: string) {
  return send(creds, { to, type: 'image', image: { link, caption: truncate(caption, 1024) } });
}

export function markAsRead(creds: WhatsappCredentials, messageId: string) {
  return send(creds, { status: 'read', message_id: messageId });
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}
