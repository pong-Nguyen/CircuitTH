export class UnionFind {
  parent = new Map<string, string>();

  find(x: string): string {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
    }

    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!));
    }

    return this.parent.get(x)!;
  }

  union(a: string, b: string) {
    const pa = this.find(a);
    const pb = this.find(b);

    if (pa !== pb) {
      this.parent.set(pa, pb);
    }
  }
}