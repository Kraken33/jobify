import { IJobProvider } from './JobProvider';
import { JustJoinProvider } from './JustJoinProvider';
import { ArbeitsagenturProvider } from './ArbeitsagenturProvider';
import { ArbeitnowProvider } from './ArbeitnowProvider';

export * from './JobProvider';
export * from './JustJoinProvider';
export * from './ArbeitsagenturProvider';
export * from './ArbeitnowProvider';

class ProviderRegistry {
  private providers: Map<string, IJobProvider> = new Map();

  constructor() {
    this.register(new JustJoinProvider());
    this.register(new ArbeitsagenturProvider());
    this.register(new ArbeitnowProvider());
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
