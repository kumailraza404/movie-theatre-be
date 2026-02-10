import "dotenv/config";

import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    
    // Parse Redis URL to check if TLS is needed
    const isUpstash = redisUrl.includes('upstash.io');
    const needsTLS = isUpstash || redisUrl.startsWith('rediss://');
    
    // Convert redis:// to rediss:// for Upstash if needed
    const finalUrl = isUpstash && redisUrl.startsWith('redis://') 
      ? redisUrl.replace('redis://', 'rediss://')
      : redisUrl;
    
    const options: any = {
      retryStrategy: (times) => {
        if (times > 10) {
          console.error(`[Redis] Max retry attempts (${times}) reached. Stopping.`);
          return null; // Stop retrying after 10 attempts
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    };

    // Add TLS options for Upstash
    if (needsTLS || isUpstash) {
      options.tls = {
        rejectUnauthorized: true, // Verify SSL certificate
      };
      console.log('[Redis] Configuring TLS connection for Upstash...');
    }

    this.client = new Redis(finalUrl, options);

    this.client.on("error", (err) => {
      console.error("[Redis] Client Error:", err.message);
      if (err.message.includes('TLS') || err.message.includes('SSL')) {
        console.error("[Redis] TLS Error - Make sure your REDIS_URL uses rediss:// for Upstash");
      }
    });

    this.client.on("connect", () => {
      console.log("[Redis] Client Connected (initial connection)");
    });

    this.client.on("ready", () => {
      console.log("[Redis] ✅ Client Ready - Connection stable");
    });

    this.client.on("close", () => {
      console.log("[Redis] Connection closed");
    });

    this.client.on("reconnecting", (delay) => {
      console.log(`[Redis] Reconnecting in ${delay}ms...`);
    });

    this.client.on("end", () => {
      console.log("[Redis] Connection ended");
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async setLock(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    // Use SET with NX (only if not exists) and EX (expiration)
    const result = await this.client.set(key, value, "EX", ttlSeconds, "NX");
    return result === "OK";
  }
}
