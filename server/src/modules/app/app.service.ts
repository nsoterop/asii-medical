import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return 'ASii Medical server is up and running!';
  }
}
