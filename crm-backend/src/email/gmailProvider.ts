import { SendMailOptions, SendMailResult, MailboxMessage } from './types';

export interface GmailProvider {
  sendEmail(options: SendMailOptions): Promise<SendMailResult>;
  listMessages(query: string): Promise<MailboxMessage[]>;
  getMessage(messageId: string): Promise<MailboxMessage | null>;
  checkHistory(startHistoryId: string): Promise<{ historyId: string; messages: MailboxMessage[] }>;
}

/**
 * Encode a string to URL-safe base64 without padding (required by Gmail API)
 */
export function base64UrlEncode(str: string): string {
  const buff = Buffer.from(str, 'utf-8');
  return buff.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Constructs an RFC 5322 MIME message for Gmail API
 */
export function createMimeMessage(options: SendMailOptions): string {
  const lines: string[] = [];
  lines.push(`From: =?UTF-8?B?${Buffer.from(options.fromName || 'CAVENTRA').toString('base64')}?= <${options.from}>`);
  lines.push(`To: <${options.to}>`);
  lines.push(`Subject: =?UTF-8?B?${Buffer.from(options.subject).toString('base64')}?=`);
  lines.push(`Date: ${new Date().toUTCString()}`);
  lines.push(`MIME-Version: 1.0`);
  lines.push(`Content-Type: text/plain; charset=UTF-8; format=flowed`);
  lines.push(`Content-Transfer-Encoding: 8bit`);
  
  if (options.optOutUrl) {
    lines.push(`List-Unsubscribe: <${options.optOutUrl}>`);
    lines.push(`List-Unsubscribe-Post: List-Unsubscribe=One-Click`);
  }

  if (options.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      lines.push(`${k}: ${v}`);
    }
  }

  lines.push('');
  lines.push(options.textBody);

  return lines.join('\r\n');
}

/**
 * Mock Gmail Provider for zero-cost automated tests and development.
 * Guarantees NO REAL EMAILS ARE EVER SENT during automated verification.
 */
export class MockGmailProvider implements GmailProvider {
  public sentMessages: Array<SendMailOptions & { id: string; threadId: string; sentAt: number }> = [];
  public incomingMessages: MailboxMessage[] = [];
  public nextError: Error | null = null;
  public simulateTimeout: boolean = false;
  public historyIdCounter: number = 1000;

  async sendEmail(options: SendMailOptions): Promise<SendMailResult> {
    if (this.nextError) {
      const err = this.nextError;
      this.nextError = null;
      throw err;
    }

    if (this.simulateTimeout) {
      this.simulateTimeout = false;
      const timeoutErr: any = new Error('Gateway Timeout (Simulated ambiguity)');
      timeoutErr.code = 'ETIMEDOUT';
      timeoutErr.isAmbiguous = true;
      // Note: in ambiguous timeouts, the network response was lost, but the provider might or might not have processed it.
      // We do not add to sentMessages here to simulate ambiguous network disconnect.
      throw timeoutErr;
    }

    const id = `msg_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const threadId = `th_${Math.random().toString(36).substring(2, 8)}`;

    this.sentMessages.push({
      ...options,
      id,
      threadId,
      sentAt: Date.now(),
    });

    return { messageId: id, threadId };
  }

  async listMessages(query: string): Promise<MailboxMessage[]> {
    return this.incomingMessages.filter(m => {
      if (query.includes(m.from) || query.includes(m.to) || (m.subject && query.includes(m.subject))) {
        return true;
      }
      return false;
    });
  }

  async getMessage(messageId: string): Promise<MailboxMessage | null> {
    const foundIncoming = this.incomingMessages.find(m => m.id === messageId);
    if (foundIncoming) return foundIncoming;

    const foundSent = this.sentMessages.find(m => m.id === messageId);
    if (foundSent) {
      return {
        id: foundSent.id,
        threadId: foundSent.threadId,
        from: foundSent.from,
        to: foundSent.to,
        subject: foundSent.subject,
        body: foundSent.textBody,
        headers: foundSent.headers || {},
      };
    }

    return null;
  }

  async checkHistory(startHistoryId: string): Promise<{ historyId: string; messages: MailboxMessage[] }> {
    this.historyIdCounter += 10;
    return {
      historyId: String(this.historyIdCounter),
      messages: [...this.incomingMessages],
    };
  }

  // Test simulation helpers
  simulatePermanentBounce(recipientEmail: string, outreachMessageId: string, threadId: string) {
    this.incomingMessages.push({
      id: `bounce_perm_${Date.now()}`,
      threadId,
      from: 'mailer-daemon@googlemail.com',
      to: 'outreach@caventra.com',
      subject: `Delivery Status Notification (Failure): ${recipientEmail}`,
      body: `550 5.1.1 The email account that you tried to reach does not exist: ${recipientEmail}`,
      headers: {
        'Content-Type': 'multipart/report; report-type=delivery-status',
        'Action': 'failed',
        'Status': '5.1.1',
        'Diagnostic-Code': `smtp; 550-5.1.1 The email account does not exist`,
        'In-Reply-To': outreachMessageId,
      },
      isBounce: true,
      bounceType: 'PERMANENT',
    });
  }

  simulateTemporaryBounce(recipientEmail: string, outreachMessageId: string, threadId: string) {
    this.incomingMessages.push({
      id: `bounce_temp_${Date.now()}`,
      threadId,
      from: 'mailer-daemon@googlemail.com',
      to: 'outreach@caventra.com',
      subject: `Delivery Status Notification (Delay): ${recipientEmail}`,
      body: `452 4.2.2 The recipient mailbox is full or over quota: ${recipientEmail}`,
      headers: {
        'Content-Type': 'multipart/report; report-type=delivery-status',
        'Action': 'delayed',
        'Status': '4.2.2',
        'Diagnostic-Code': `smtp; 452 4.2.2 Mailbox full`,
        'In-Reply-To': outreachMessageId,
      },
      isBounce: true,
      bounceType: 'TEMPORARY',
    });
  }

  simulateReply(senderEmail: string, recipientEmail: string, threadId: string, outreachMessageId: string, bodyText: string) {
    this.incomingMessages.push({
      id: `reply_${Date.now()}`,
      threadId,
      from: senderEmail,
      to: recipientEmail,
      subject: `Re: A quick idea`,
      body: bodyText,
      headers: {
        'In-Reply-To': outreachMessageId,
        'References': outreachMessageId,
      },
      inReplyTo: outreachMessageId,
    });
  }
}

/**
 * Production Gmail Provider using official Google OAuth2 & Gmail REST API v1.
 * Requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.
 */
export class GoogleGmailProvider implements GmailProvider {
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: { clientId: string; clientSecret: string; refreshToken: string }) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.refreshToken = config.refreshToken;
  }

  private async getValidAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.tokenExpiresAt > now + 60000) {
      return this.accessToken;
    }

    // Refresh token exchange via Google OAuth2 endpoint
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Google OAuth2 Token Refresh Failed (${response.status}): ${errBody}`);
    }

    const data: any = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = now + ((data.expires_in || 3600) * 1000);
    return this.accessToken!;
  }

  async sendEmail(options: SendMailOptions): Promise<SendMailResult> {
    const token = await this.getValidAccessToken();
    const rawMime = createMimeMessage(options);
    const rawBase64 = base64UrlEncode(rawMime);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: rawBase64 }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        const err: any = new Error(`Gmail API send failure (${response.status}): ${errText}`);
        err.statusCode = response.status;
        err.isRetryable = response.status === 429 || response.status >= 500;
        throw err;
      }

      const result: any = await response.json();
      return {
        messageId: result.id,
        threadId: result.threadId,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        const timeoutErr: any = new Error('Gmail API request timed out after 15000ms');
        timeoutErr.isAmbiguous = true;
        throw timeoutErr;
      }
      throw err;
    }
  }

  async listMessages(query: string): Promise<MailboxMessage[]> {
    const token = await this.getValidAccessToken();
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) return [];
    const data: any = await res.json();
    if (!data.messages) return [];

    const details = await Promise.all(
      data.messages.slice(0, 10).map((m: any) => this.getMessage(m.id))
    );

    return details.filter((m): m is MailboxMessage => m !== null);
  }

  async getMessage(messageId: string): Promise<MailboxMessage | null> {
    const token = await this.getValidAccessToken();
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) return null;
    const item: any = await res.json();

    const headers: Record<string, string> = {};
    if (item.payload?.headers) {
      for (const h of item.payload.headers) {
        headers[h.name.toLowerCase()] = h.value;
      }
    }

    return {
      id: item.id,
      threadId: item.threadId,
      from: headers['from'] || '',
      to: headers['to'] || '',
      subject: headers['subject'] || '',
      body: item.snippet || '',
      headers,
      inReplyTo: headers['in-reply-to'],
      references: headers['references'],
    };
  }

  async checkHistory(startHistoryId: string): Promise<{ historyId: string; messages: MailboxMessage[] }> {
    const token = await this.getValidAccessToken();
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${startHistoryId}&historyTypes=messageAdded`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      return { historyId: startHistoryId, messages: [] };
    }

    const data: any = await res.json();
    const messageIds: string[] = [];
    if (data.history) {
      for (const h of data.history) {
        if (h.messagesAdded) {
          for (const ma of h.messagesAdded) {
            if (ma.message?.id) messageIds.push(ma.message.id);
          }
        }
      }
    }

    const messages = await Promise.all(
      messageIds.slice(0, 10).map(id => this.getMessage(id))
    );

    return {
      historyId: data.historyId || startHistoryId,
      messages: messages.filter((m): m is MailboxMessage => m !== null),
    };
  }
}
