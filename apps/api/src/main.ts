import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

function getDatabaseName(databaseUrl: string | undefined) {
  if (!databaseUrl) {
    return 'inconnue';
  }

  try {
    const parsed = new URL(databaseUrl);
    return parsed.pathname.replace(/^\//, '') || 'inconnue';
  } catch {
    return 'inconnue';
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
  });

  const config = new DocumentBuilder()
    .setTitle('MoneyBack API')
    .setDescription('API de gestion financière et patrimoniale MoneyBack')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env['API_PORT'] ?? 3001;
  const environmentLabel = process.env['APP_ENV_LABEL'] ?? 'dev';
  const databaseName = getDatabaseName(process.env['DATABASE_URL']);
  await app.listen(port);
  console.log(`API démarrée sur http://localhost:${port}`);
  console.log(`Swagger disponible sur http://localhost:${port}/api/docs`);
  console.log(`Environnement actif : ${environmentLabel} (base ${databaseName})`);
}

bootstrap();
