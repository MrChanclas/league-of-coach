import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should build a valid Riot authorization URL for the active user', () => {
    const url = service.getRiotAuthorizationUrl('user-123');

    expect(url).toContain('https://auth.riotgames.com/oauth2/authorize');
    expect(url).toContain('client_id=');
    expect(url).toContain('state=user-123');
    expect(url).toContain('redirect_uri=');
    expect(url).toContain('scope=openid+offline_access');
  });

  it('should default the Riot region to LAS for local testing', () => {
    expect((service as any).getDefaultRiotServer()).toBe('LAS');
  });
});
