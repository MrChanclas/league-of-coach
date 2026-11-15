import { Test, TestingModule } from '@nestjs/testing';
import { buildPoolConfig, PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

describe('buildPoolConfig', () => {
  const url = 'postgresql://user:pass@db.example.com:6543/postgres';

  it('uses the URL as is and no ssl when there is no CA (local dev)', () => {
    const config = buildPoolConfig({ DATABASE_URL: url });

    expect(config.connectionString).toBe(url);
    expect(config.ssl).toBeUndefined();
    expect(config.max).toBe(8);
  });

  it('honors DATABASE_POOL_MAX', () => {
    expect(
      buildPoolConfig({ DATABASE_URL: url, DATABASE_POOL_MAX: '3' }).max,
    ).toBe(3);
  });

  it('verifies the server against the given CA and drops sslmode from the URL', () => {
    const config = buildPoolConfig({
      DATABASE_URL: `${url}?sslmode=require&application_name=loc`,
      DATABASE_SSL_CA:
        '  -----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----\n',
    });

    expect(config.ssl).toEqual({
      ca: '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----',
      rejectUnauthorized: true,
    });
    const parsed = new URL(config.connectionString ?? '');
    expect(parsed.searchParams.has('sslmode')).toBe(false);
    expect(parsed.searchParams.get('application_name')).toBe('loc');
  });

  it('ignores a blank CA', () => {
    const config = buildPoolConfig({ DATABASE_URL: url, DATABASE_SSL_CA: ' ' });

    expect(config.ssl).toBeUndefined();
  });
});
