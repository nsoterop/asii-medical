import { Module } from '@nestjs/common';
import { getEnv } from '../env';
import { SquareModule } from '../square/square.module';
import { MockPaymentsClient } from './mock-payments.client';
import { PAYMENTS_CLIENT } from './payments.constants';
import { SquarePaymentsClient } from './square-payments.client';

@Module({
  imports: [SquareModule],
  providers: [
    MockPaymentsClient,
    SquarePaymentsClient,
    {
      provide: PAYMENTS_CLIENT,
      useFactory: (squareClient: SquarePaymentsClient, mockClient: MockPaymentsClient) => {
        const env = getEnv();
        return env.PAYMENTS_PROVIDER === 'square' ? squareClient : mockClient;
      },
      inject: [SquarePaymentsClient, MockPaymentsClient],
    },
  ],
  exports: [PAYMENTS_CLIENT],
})
export class PaymentsModule {}
