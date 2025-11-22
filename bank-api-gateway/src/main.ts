import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`API Gateway is running on: http://localhost:${port}`);
  console.log(`Connected to microservice at: ${process.env.MICROSERVICE_HOST || 'localhost'}:${process.env.MICROSERVICE_PORT || '3000'}`);
}
bootstrap();
