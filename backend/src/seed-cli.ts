import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/** 独立执行种子写入：启动应用（onApplicationBootstrap 自动 seed）后退出 */
async function run() {
  process.env.SEED_ON_BOOT = 'true';
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  // eslint-disable-next-line no-console
  console.log('Seed finished.');
  await app.close();
  process.exit(0);
}
run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
