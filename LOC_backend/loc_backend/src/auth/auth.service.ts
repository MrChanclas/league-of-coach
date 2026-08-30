import { Injectable, UnauthorizedException } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(name: string, email: string, password: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new UnauthorizedException('El correo ya está registrado');
    }

    const passwordHash = await hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        clerkId: `internal-${Date.now()}`,
        role: 'user',
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: this.generateToken(user.id, user.email, user.role),
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isValidPassword = await compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: this.generateToken(user.id, user.email, user.role),
    };
  }

  private generateToken(userId: string, email: string, role: string) {
    return sign(
      { sub: userId, email, role },
      process.env.JWT_SECRET ?? 'leagueofcoach-secret',
      {
        expiresIn: '7d',
      },
    );
  }
}
