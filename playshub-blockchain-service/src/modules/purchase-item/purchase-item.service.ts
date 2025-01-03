import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EvmWsProvidersService } from '../evm-ws-providers/evm-ws-providers.service';
import { ethers } from 'ethers';
import { PurchaseItemAbi } from './abis/PurchaseItemAbi';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PurchaseItemService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PurchaseItemService.name);

  private readonly purchaseItemAddress: string;
  private provider: ethers.WebSocketProvider;
  private purchaseItemAddressContract: ethers.Contract;

  constructor(
    private readonly configService: ConfigService,
    private readonly evmWsProvidersService: EvmWsProvidersService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.purchaseItemAddress = this.configService.get<string>(
      'PURCHASE_ITEM_ADDRESS',
    );

    if (!this.purchaseItemAddress) {
      throw new Error('purchase-item address is not provided');
    }
  }

  async onApplicationBootstrap() {
    this.provider =
      await this.evmWsProvidersService.getCurrentWebSocketProvider(
        async (provider) => {
          this.provider = provider;
          await this.subscribeToPurchaseItem();
        },
      );

    await this.subscribeToPurchaseItem();
  }

  async onPurchaseItem(
    sender: string,
    id: string,
    name: string,
    price: string,
    userId: string,
  ) {
    this.logger.debug('Found 1 PurchasedItem event');
    this.eventEmitter.emit('bsc.transactions', {
      type: 'Purchase Item',
      userId,
      itemId: id.toString(),
    });
  }

  async subscribeToPurchaseItem() {
    this.purchaseItemAddressContract = new ethers.Contract(
      this.purchaseItemAddress,
      PurchaseItemAbi,
      this.provider,
    );

    this.purchaseItemAddressContract.on(
      'ItemPurchased',
      this.onPurchaseItem.bind(this),
    );
  }
}
