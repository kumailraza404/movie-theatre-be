import "dotenv/config";

import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthService } from "./auth.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private authService: AuthService) {
    const secret = process.env.JWT_SECRET;
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
    if (!process.env.JWT_SECRET) {
      this.logger.warn(
        "JWT_SECRET not set in environment, using default. This is insecure!",
      );
    }
  }

  async validate(payload: any) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException("Invalid token payload");
    }
    return { userId: payload.sub, email: payload.email };
  }
}
