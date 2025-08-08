type Listener = () => void;

const slideStore = {
  _slideIndex: 0,
  _listeners: new Set<Listener>(),

  getSnapshot(): number {
    return this._slideIndex;
  },

  subscribe(listener: Listener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  },

  setSlideIndex(newIndex: number): void {
    this._slideIndex = newIndex;
    for (const listener of this._listeners) {
      listener();
    }
  },
};

export default slideStore;