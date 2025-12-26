/**
 * CampaignShop Component (Issue #334)
 *
 * Main shop container that integrates:
 * - Character selector for gold/shopping context
 * - Filters and search
 * - Item grid with buy functionality
 * - Item detail modal
 * - Sell view for owned items
 */

import { useState, useMemo, useCallback } from 'react';
import { useShop } from '../../hooks/useShop';
import { CharacterGoldSelector } from './CharacterGoldSelector';
import { ShopFilters } from './ShopFilters';
import { ShopItemCard } from './ShopItemCard';
import { ItemDetailModal } from './ItemDetailModal';
import type { CampaignCharacterSummary } from '../../../../shared/types/campaign';
import styles from './CampaignShop.module.css';

type ShopTab = 'buy' | 'sell';

interface CampaignShopProps {
  /** Campaign ID */
  campaignId: string;
  /** Characters in the campaign (for the current user) */
  characters: CampaignCharacterSummary[];
  /** Callback when shop should close */
  onClose?: () => void;
  /** Whether to show as modal or inline */
  isModal?: boolean;
}

export function CampaignShop({
  campaignId,
  characters,
  onClose,
  isModal = false,
}: CampaignShopProps) {
  // Active tab (buy or sell)
  const [activeTab, setActiveTab] = useState<ShopTab>('buy');

  // Selected character
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    characters.length > 0 ? characters[0].id : null
  );

  // Item detail modal state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Get selected character data
  const selectedCharacter = useMemo(
    () => characters.find((c) => c.id === selectedCharacterId),
    [characters, selectedCharacterId]
  );

  // Shop hook
  const {
    shop,
    filteredItems,
    loading,
    error,
    filters,
    sort,
    setFilters,
    setSort,
    purchaseItem,
    sellItem,
    calculateSellPrice,
    canAfford,
    purchasing,
    selling,
    refreshShop,
  } = useShop({
    campaignId,
    characterId: selectedCharacterId,
    characterGold: selectedCharacter?.gold || 0,
    enabled: true,
  });

  // Find selected item for modal
  const shopInventory = shop?.inventory;
  const selectedShopItem = useMemo(() => {
    if (!selectedItemId || !shopInventory) return null;
    return shopInventory.find((item) => item.itemId === selectedItemId);
  }, [selectedItemId, shopInventory]);

  // Handle buy
  const handleBuy = useCallback(
    async (itemId: string) => {
      const result = await purchaseItem(itemId);
      if (result) {
        // Could show toast notification here
        console.log('[CampaignShop] Purchase successful:', result);
      }
    },
    [purchaseItem]
  );

  // Handle sell
  const handleSell = useCallback(
    async (itemId: string) => {
      const result = await sellItem(itemId);
      if (result) {
        console.log('[CampaignShop] Sell successful:', result);
      }
    },
    [sellItem]
  );

  // Handle view details
  const handleViewDetails = useCallback((itemId: string) => {
    setSelectedItemId(itemId);
  }, []);

  // Close detail modal
  const handleCloseDetails = useCallback(() => {
    setSelectedItemId(null);
  }, []);

  // Modal buy handler
  const handleModalBuy = useCallback(async () => {
    if (selectedItemId) {
      await handleBuy(selectedItemId);
      handleCloseDetails();
    }
  }, [selectedItemId, handleBuy, handleCloseDetails]);

  // Modal sell handler
  const handleModalSell = useCallback(async () => {
    if (selectedItemId) {
      await handleSell(selectedItemId);
      handleCloseDetails();
    }
  }, [selectedItemId, handleSell, handleCloseDetails]);

  // Loading state
  if (loading && !shop) {
    return (
      <div className={`${styles.container} ${isModal ? styles.modal : ''}`}>
        <div className={styles.loading}>Loading shop...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${styles.container} ${isModal ? styles.modal : ''}`}>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={refreshShop} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${isModal ? styles.modal : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Campaign Shop</h2>
        {onClose && (
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        )}
      </div>

      {/* Character Selector */}
      <CharacterGoldSelector
        characters={characters}
        selectedCharacterId={selectedCharacterId}
        onSelectCharacter={setSelectedCharacterId}
        disabled={purchasing || selling}
      />

      {/* Tab navigation */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'buy' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('buy')}
        >
          Buy Items
          {shop && (
            <span className={styles.tabCount}>
              {shop.availableItems}
            </span>
          )}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'sell' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('sell')}
          disabled={!shop?.config.allowSelling}
        >
          Sell Items
        </button>
      </div>

      {/* Buy Tab */}
      {activeTab === 'buy' && (
        <>
          {/* Filters */}
          <ShopFilters
            filters={filters}
            sort={sort}
            onFiltersChange={setFilters}
            onSortChange={setSort}
            totalItems={shop?.inventory.length || 0}
            filteredCount={filteredItems.length}
          />

          {/* Item Grid */}
          <div className={styles.itemGrid}>
            {filteredItems.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No items match your filters.</p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  canAfford={canAfford(item.cost)}
                  purchasing={purchasing}
                  onBuy={handleBuy}
                  onViewDetails={handleViewDetails}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Sell Tab */}
      {activeTab === 'sell' && (
        <div className={styles.sellSection}>
          <p className={styles.sellInfo}>
            Sell items from your inventory to get gold back. Items are sold at{' '}
            {Math.round((shop?.config.sellPriceMultiplier || 0.5) * 100)}% of their
            purchase price.
          </p>
          {/* TODO: Implement SellInventoryView with character's owned items */}
          <div className={styles.emptyState}>
            <p>Select items from your inventory to sell.</p>
            <p className={styles.hint}>
              (Sell view will show your character's owned items)
            </p>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedShopItem && (
        <ItemDetailModal
          shopItem={selectedShopItem}
          isOpen={!!selectedItemId}
          onClose={handleCloseDetails}
          characterGold={selectedCharacter?.gold || 0}
          canBuy={activeTab === 'buy' && selectedShopItem.isAvailable && selectedShopItem.quantity > 0}
          canSell={activeTab === 'sell'}
          sellPrice={calculateSellPrice(selectedShopItem.cost)}
          onBuy={handleModalBuy}
          onSell={handleModalSell}
          actionInProgress={purchasing || selling}
        />
      )}
    </div>
  );
}

export default CampaignShop;
