import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
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

  it('should reject registration when the email is already taken', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'existing-user' });

    await expect(
      service.register('Nombre', 'ya@existe.com', 'password123'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject login with invalid credentials', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login('nadie@existe.com', 'password123'),
    ).rejects.toThrow(UnauthorizedException);
  });
});
