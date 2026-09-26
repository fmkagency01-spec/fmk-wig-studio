import { afterEach, describe, expect, mock, test } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();
const success = mock(() => {});
const error = mock(() => {});
mock.module('sonner', () => ({ toast: { success, error } }));
let accessToken = null;
mock.module('../src/lib/auth.ts', () => ({ getAccessToken: async () => accessToken }));
const { createElement } = await import('react');
const { render, fireEvent, screen, waitFor, cleanup } = await import('@testing-library/react');
const { default: ContactPage } = await import('../src/app/contact/page.tsx');
const originalFetch = globalThis.fetch;

afterEach(() => {
  cleanup();
  accessToken = null;
  globalThis.fetch = originalFetch;
  success.mockClear();
  error.mockClear();
});

const message = 'Please help with my order. '.repeat(30);
function fill(subject = 'general') {
  render(createElement(ContactPage));
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test Customer' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'customer@example.invalid' } });
  fireEvent.change(screen.getByLabelText('Phone (optional)'), { target: { value: '0123456789' } });
  fireEvent.change(screen.getByLabelText('Topic'), { target: { value: subject } });
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: message } });
  fireEvent.submit(screen.getByRole('button', { name: 'Send message' }).closest('form'));
}
function retained() {
  expect(screen.getByLabelText('Name').value).toBe('Test Customer');
  expect(screen.getByLabelText('Email').value).toBe('customer@example.invalid');
  expect(screen.getByLabelText('Message').value).toBe(message);
  expect(success).not.toHaveBeenCalled();
}

describe('contact submission receipts', () => {
  test('signed-in inquiry carries the existing bearer token', async () => {
    accessToken = 'test-session-token';
    globalThis.fetch = mock(async () => Response.json({ ok: true, inquiry_id: 'saved-id' }, { status: 201 }));
    fill();
    await waitFor(() => expect(success).toHaveBeenCalledTimes(1));
    expect(globalThis.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer test-session-token');
  });
  for (const status of [400, 503, 500]) {
    test('HTTP ' + status + ' displays backend error and retains the message', async () => {
      globalThis.fetch = mock(async () => Response.json({ ok: false, error: 'Message was not saved' }, { status }));
      fill();
      await waitFor(() => expect(error).toHaveBeenCalledWith('Message was not saved'));
      retained();
      expect(globalThis.fetch.mock.calls[0][0]).toBe('/api/b2b/inquiries');
    });
  }
  for (const body of [{}, { ok: false }, { ok: true }, { ok: true, inquiry_id: '' }]) {
    test('HTTP 200 without a saved inquiry receipt is not success: ' + JSON.stringify(body), async () => {
      globalThis.fetch = mock(async () => Response.json(body));
      fill();
      await waitFor(() => expect(error).toHaveBeenCalled());
      retained();
    });
  }
  test('network failure retains the message', async () => {
    globalThis.fetch = mock(async () => { throw new Error('Connection lost'); });
    fill();
    await waitFor(() => expect(error).toHaveBeenCalledWith('Connection lost'));
    retained();
  });
  for (const subject of ['general', 'order', 'wholesale', 'press']) {
    test(subject + ' clears only after the saved inquiry acknowledgement', async () => {
      let finish;
      globalThis.fetch = mock(() => new Promise((resolve) => { finish = resolve; }));
      fill(subject);
      await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
      retained();
      expect(screen.getByRole('button', { name: 'Sending…' }).disabled).toBe(true);
      const [url, options] = globalThis.fetch.mock.calls[0];
      expect(url).toBe('/api/b2b/inquiries');
      expect(options.method).toBe('POST');
      const payload = JSON.parse(options.body);
      expect(payload.notes).toBe('Topic: ' + subject + '\n\n' + message);
      expect(payload.contact_name).toBe('Test Customer');
      expect(payload.email).toBe('customer@example.invalid');
      finish(Response.json({ ok: true, inquiry_id: 'saved-inquiry-id' }, { status: 201 }));
      await waitFor(() => expect(success).toHaveBeenCalledTimes(1));
      expect(screen.getByLabelText('Message').value).toBe('');
      expect(screen.getByLabelText('Email').value).toBe('');
      expect(error).not.toHaveBeenCalled();
    });
  }
});
