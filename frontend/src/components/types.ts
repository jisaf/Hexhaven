
export interface ContextMenuOption {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

export interface ContextMenuConfig {
  x: number;
  y: number;
  options: ContextMenuOption[];
}
