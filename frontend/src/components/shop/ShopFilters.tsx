/**
 * ShopFilters Component (Issue #337)
 *
 * Filter and sort controls for the shop:
 * - Slot filter (Head, Body, etc.)
 * - Rarity filter
 * - Search by name
 * - Sort options (price, name, rarity, quantity)
 * - Show/hide sold out and unaffordable items
 */

import { useState, useEffect } from 'react';
import { ItemSlot, ItemRarity } from '../../../../shared/types/entities';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { ShopFilters as ShopFiltersType, ShopSortOption } from '../../hooks/useShop';
import styles from './ShopFilters.module.css';

// Slot options
const SLOT_OPTIONS: { value: ItemSlot | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Slots' },
  { value: ItemSlot.HEAD, label: 'Head' },
  { value: ItemSlot.BODY, label: 'Body' },
  { value: ItemSlot.LEGS, label: 'Legs' },
  { value: ItemSlot.ONE_HAND, label: 'Hand' },
  { value: ItemSlot.TWO_HAND, label: '2-Hand' },
  { value: ItemSlot.SMALL, label: 'Small' },
];

// Rarity options
const RARITY_OPTIONS: { value: ItemRarity | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Rarities' },
  { value: ItemRarity.COMMON, label: 'Common' },
  { value: ItemRarity.UNCOMMON, label: 'Uncommon' },
  { value: ItemRarity.RARE, label: 'Rare' },
  { value: ItemRarity.EPIC, label: 'Epic' },
  { value: ItemRarity.LEGENDARY, label: 'Legendary' },
];

// Sort options
const SORT_OPTIONS: { field: ShopSortOption['field']; label: string }[] = [
  { field: 'cost', label: 'Price' },
  { field: 'name', label: 'Name' },
  { field: 'rarity', label: 'Rarity' },
  { field: 'quantity', label: 'Stock' },
];

interface ShopFiltersProps {
  /** Current filter values */
  filters: ShopFiltersType;
  /** Current sort option */
  sort: ShopSortOption;
  /** Callback to update filters */
  onFiltersChange: (filters: ShopFiltersType) => void;
  /** Callback to update sort */
  onSortChange: (sort: ShopSortOption) => void;
  /** Total item count (for display) */
  totalItems?: number;
  /** Filtered item count (for display) */
  filteredCount?: number;
}

export function ShopFilters({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  totalItems = 0,
  filteredCount = 0,
}: ShopFiltersProps) {
  // Local search input state for immediate feedback
  const [searchInput, setSearchInput] = useState(filters.searchQuery || '');

  // Debounce search input (300ms delay)
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  // Sync debounced search to filters - only when debounced value actually changes
  useEffect(() => {
    // Only update if the value actually changed from the current filter value
    if (debouncedSearch !== filters.searchQuery) {
      onFiltersChange({ ...filters, searchQuery: debouncedSearch });
    }
    // Note: We intentionally omit 'filters' from deps to avoid re-render loop.
    // The comparison check prevents unnecessary updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, onFiltersChange, filters.searchQuery]);

  // Sync filters.searchQuery to local state when cleared externally
  useEffect(() => {
    if (filters.searchQuery === '' && searchInput !== '') {
      setSearchInput('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.searchQuery]);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  // Handle slot filter change
  const handleSlotChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, slot: e.target.value as ItemSlot | 'ALL' });
  };

  // Handle rarity filter change
  const handleRarityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, rarity: e.target.value as ItemRarity | 'ALL' });
  };

  // Handle sort field change
  const handleSortFieldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSortChange({ ...sort, field: e.target.value as ShopSortOption['field'] });
  };

  // Toggle sort direction
  const toggleSortDirection = () => {
    onSortChange({ ...sort, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
  };

  // Toggle show sold out
  const toggleShowSoldOut = () => {
    onFiltersChange({ ...filters, showSoldOut: !filters.showSoldOut });
  };

  // Toggle show unaffordable
  const toggleShowUnaffordable = () => {
    onFiltersChange({ ...filters, showUnaffordable: !filters.showUnaffordable });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchInput('');
    onFiltersChange({
      slot: 'ALL',
      rarity: 'ALL',
      searchQuery: '',
      showSoldOut: false,
      showUnaffordable: true,
    });
  };

  const hasActiveFilters =
    filters.slot !== 'ALL' ||
    filters.rarity !== 'ALL' ||
    searchInput.length > 0 ||
    filters.showSoldOut ||
    !filters.showUnaffordable;

  return (
    <div className={styles.container}>
      {/* Search */}
      <div className={styles.searchRow}>
        <input
          type="text"
          placeholder="Search items..."
          value={searchInput}
          onChange={handleSearchChange}
          className={styles.searchInput}
        />
        {hasActiveFilters && (
          <button className={styles.clearButton} onClick={clearFilters}>
            Clear
          </button>
        )}
      </div>

      {/* Filter dropdowns */}
      <div className={styles.filterRow}>
        <select
          value={filters.slot || 'ALL'}
          onChange={handleSlotChange}
          className={styles.select}
        >
          {SLOT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={filters.rarity || 'ALL'}
          onChange={handleRarityChange}
          className={styles.select}
        >
          {RARITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className={styles.sortGroup}>
          <select
            value={sort.field}
            onChange={handleSortFieldChange}
            className={styles.select}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.field} value={opt.field}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            className={styles.sortDirection}
            onClick={toggleSortDirection}
            aria-label={`Sort ${sort.direction === 'asc' ? 'ascending' : 'descending'}`}
          >
            {sort.direction === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Toggle options */}
      <div className={styles.toggleRow}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={filters.showSoldOut || false}
            onChange={toggleShowSoldOut}
          />
          <span>Show sold out</span>
        </label>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={filters.showUnaffordable !== false}
            onChange={toggleShowUnaffordable}
          />
          <span>Show unaffordable</span>
        </label>
      </div>

      {/* Results count */}
      <div className={styles.resultsCount}>
        Showing {filteredCount} of {totalItems} items
      </div>
    </div>
  );
}

export default ShopFilters;
