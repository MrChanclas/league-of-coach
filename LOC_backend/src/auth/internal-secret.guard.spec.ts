import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import {
  INTERNAL_SECRET_HEADER,
  InternalSecretGuard,
} from './internal-secret.guard';

function contextWithHeader(value?: string): ExecutionContext {
  const request = {
    header: (name: string) =>
      name === INTERNAL_SECRET_HEADER ? value : undefined,
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('InternalSecretGuard', () => {
  const guard = new InternalSecretGuard();
  const originalSecret = process.env.INTERNAL_POLL_SECRET;

  afterEach(() => {
    // Assigning undefined to process.env stores the string "undefined".
    if (originalSecret === undefined) delete process.env.INTERNAL_POLL_SECRET;
    else process.env.INTERNAL_POLL_SECRET = originalSecret;
  });

  it('lets the request through with the right secret', () => {
    process.env.INTERNAL_POLL_SECRET = 'scheduler-secret';
    expect(guard.canActivate(contextWithHeader('scheduler-secret'))).toBe(true);
  });

  it.each([
    ['a wrong secret', 'scheduler-secreT'],
    ['a secret of a different length', 'short'],
    ['no header', undefined],
  ])('rejects %s', (_label, provided) => {
    process.env.INTERNAL_POLL_SECRET = 'scheduler-secret';
    expect(() => guard.canActivate(contextWithHeader(provided))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects everything when the secret is not configured', () => {
    delete process.env.INTERNAL_POLL_SECRET;
    expect(() => guard.canActivate(contextWithHeader(''))).toThrow(
      ForbiddenException,
    );
  });
});
