/**
 * テスト環境のストレージを揃えるセットアップ。
 *
 * Node 26 は localStorage / sessionStorage / Storage をグローバルに持つ。
 * ただし --localstorage-file を渡さない限り localStorage は undefined のままで、
 * それが jsdom の実装を覆い隠してしまう（sessionStorage は Node が提供しない
 * ため jsdom のものが残る、という食い違いも起きる）。
 * さらにグローバルの Storage も Node のクラスになるため、jsdom のストレージは
 * `instanceof Storage` が false になり、Storage.prototype への spy が効かない。
 *
 * テストに必要なのは Web Storage の挙動だけなので、最小の実装に統一する。
 * localStorage / sessionStorage / Storage をすべてこのクラス由来にすることで、
 * `vi.spyOn(Storage.prototype, 'setItem')` のような spy も期待どおり効く。
 */
class MemoryStorage {
  private items = new Map<string, string>();

  get length(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }

  setItem(key: string, value: string): void {
    this.items.set(key, String(value));
  }
}

function define(name: string, value: unknown): void {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

define('Storage', MemoryStorage);
define('localStorage', new MemoryStorage() as unknown as Storage);
define('sessionStorage', new MemoryStorage() as unknown as Storage);
