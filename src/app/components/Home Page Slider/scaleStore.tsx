class ScaleStore {
  private scale = 1;
  private subs = new Set<() => void>();

  getScale = () => this.scale;
  getSnapshot = () => this.scale > 1.01;
  getServerSnapshot = () => false;

  subscribe = (cb: () => void) => {
    this.subs.add(cb);
    return () => void this.subs.delete(cb);
  };

  setScale = (newScale: number) => {
    const oldZoomed = this.scale > 1.01;
    this.scale = newScale;
    const newZoomed = this.scale > 1.01;
    if (newZoomed !== oldZoomed) {
      this.subs.forEach((cb) => cb());
    }
  };
}

// assign to a variable…
const scaleStore = new ScaleStore();

// …then export that named instance as the default
export default scaleStore;