export class MemoryManager {
  private static instance: MemoryManager;
  private readonly maxMemory: number;
  private allocated: number = 0;

  private constructor(maxMemoryMB: number = 500) {
    this.maxMemory = maxMemoryMB * 1024 * 1024;
  }

  static getInstance(maxMemoryMB?: number): MemoryManager {
    if (!this.instance) {
      this.instance = new MemoryManager(maxMemoryMB);
    }
    return this.instance;
  }

  canAllocate(size: number): boolean {
    return this.allocated + size <= this.maxMemory;
  }

  allocate(size: number): boolean {
    if (!this.canAllocate(size)) return false;
    this.allocated += size;
    return true;
  }

  free(size: number): void {
    this.allocated = Math.max(0, this.allocated - size);
  }

  getUsage(): string {
    return `${(this.allocated / (1024 * 1024)).toFixed(2)}MB`;
  }
}
