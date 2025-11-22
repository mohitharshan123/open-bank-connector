import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BankController } from './controllers/bank.controller';
import { BankClientService } from './services/bank-client.service';

@Module({
  imports: [],
  controllers: [AppController, BankController],
  providers: [AppService, BankClientService],
})
export class AppModule { }
