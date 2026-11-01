import { DiscordService } from './discord.service';

describe('DiscordService', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.DISCORD_FEEDBACK_WEBHOOK_URL = 'https://discord.test/webhook';
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 204 });
    global.fetch = fetchMock;
  });

  afterEach(() => {
    delete process.env.DISCORD_FEEDBACK_WEBHOOK_URL;
    global.fetch = originalFetch;
  });

  function sentBody() {
    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    return JSON.parse(init.body) as {
      content: string;
      allowed_mentions: { parse: string[] };
    };
  }

  it('never lets a message ping anybody', async () => {
    await new DiscordService().notifyFeedback('@everyone hola');

    expect(sentBody().allowed_mentions).toEqual({ parse: [] });
  });

  it('cuts messages down to what Discord accepts', async () => {
    await new DiscordService().notifyFeedback('x'.repeat(5000));

    expect(sentBody().content.length).toBeLessThanOrEqual(2000);
  });

  it('reports whether Discord took the message', async () => {
    const service = new DiscordService();
    await expect(service.notifyFeedback('ok')).resolves.toBe(true);

    fetchMock.mockResolvedValue({ ok: false, status: 400 });
    await expect(service.notifyFeedback('mal')).resolves.toBe(false);

    fetchMock.mockRejectedValue(new Error('network'));
    await expect(service.notifyFeedback('caído')).resolves.toBe(false);
  });
});
