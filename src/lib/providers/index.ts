import { IJobProvider } from './JobProvider';
import { JustJoinProvider } from './JustJoinProvider';

export * from './JobProvider';
export * from './JustJoinProvider';

class ProviderRegistry {
  private providers: Map<string, IJobProvider> = new Map();

  constructor() {
    this.register(new JustJoinProvider());
  }

  register(provider: IJobProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): IJobProvider | undefined {
    return this.providers.get(id);
  }

  getAll(): IJobProvider[] {
    return Array.from(this.providers.values());
  }
}

export const providerRegistry = new ProviderRegistry();
