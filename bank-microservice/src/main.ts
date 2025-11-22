import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.HOST || 'localhost',
        port: parseInt(process.env.PORT || '3000', 10),
      },
    },
  );
  await app.listen();
  console.log(`Microservice is listening on ${process.env.HOST || 'localhost'}:${process.env.PORT || '3000'}`);
}
bootstrap();
