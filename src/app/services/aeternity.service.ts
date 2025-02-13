import { Injectable } from '@angular/core';
import {
  AeSdkAepp,
  Node,
  walletDetector,
  BrowserWindowMessageConnection,
  Encoded,
  SUBSCRIPTION_TYPES,
} from '@aeternity/aepp-sdk';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AeternityService {
  aeSdk: AeSdkAepp;
  address$ = new BehaviorSubject<Encoded.AccountAddress | undefined>(undefined);
  networkId$ = new BehaviorSubject<string | undefined>(undefined);

  constructor() {
    this.aeSdk = new AeSdkAepp({
      name: environment.projectName,
      nodes: [{
        name: environment.networkId,
        instance: new Node(environment.nodeUrl)
      }],
      onAddressChange: ({ current }) => {
        this.address$.next(Object.keys(current)[0] as Encoded.AccountAddress);
      },
      onNetworkChange: ({ networkId }) => {
        this.networkId$.next(networkId);
      },
      onDisconnect: () => console.log('Wallet disconnected'),
    });
  }

  async connectToWallet(): Promise<void> {
    type HandleWallets = Parameters<typeof walletDetector>[1];
    // TODO: remove NonNullable after releasing https://github.com/aeternity/aepp-sdk-js/pull/1801
    type Wallet = NonNullable<Parameters<HandleWallets>[0]['newWallet']>;

    const wallet = await new Promise<Wallet>((resolve) => {
      let stopScan: ReturnType<typeof walletDetector>;
      const handleWallets: HandleWallets = async ({ wallets, newWallet }) => {
        newWallet = newWallet || Object.values(wallets)[0];
        stopScan();
        resolve(newWallet);
      };
      const scannerConnection = new BrowserWindowMessageConnection();
      stopScan = walletDetector(scannerConnection, handleWallets);
    });

    await this.aeSdk.connectToWallet(await wallet.getConnection());
    await this.aeSdk.subscribeAddress(SUBSCRIPTION_TYPES.subscribe, 'current');
    // TODO: remove after releasing https://github.com/aeternity/aepp-sdk-js/issues/1802
    this.aeSdk.onAddressChange({ current: { [this.aeSdk.address]: {} }, connected: {} });
  }
}
