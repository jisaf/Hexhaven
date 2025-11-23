interface ScreenOrientation {
  lock(orientation: 'landscape'): Promise<void>;
  unlock(): void;
}
