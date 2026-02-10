import "dotenv/config";
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { MoviesModule } from "./movies/movies.module";
import { ShowtimesModule } from "./showtimes/showtimes.module";
import { ReservationsModule } from "./reservations/reservations.module";
import { RedisService } from "./config/redis.config";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || "mongodb://localhost:27017/movietheatre",
    ),
    AuthModule,
    MoviesModule,
    ShowtimesModule,
    ReservationsModule,
  ],
  controllers: [HealthController],
  providers: [RedisService],
  exports: [RedisService],
})
export class AppModule {}
