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

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useShop } from '../../hooks/useShop';
import { useToast } from '../../contexts/ToastContext';
import { CharacterGoldSelector } from './CharacterGoldSelector';
import { ShopFilters } from './ShopFilters';
import { ShopItemCard } from './ShopItemCard';
import { ItemDetailModal } from './ItemDetailModal';
import { SellInventoryView } from './SellInventoryView';
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
  /** Callback when character gold changes after a transaction */
  onCharacterGoldUpdate?: (characterId: string, newGold: number) => void;
}

export function CampaignShop({
  campaignId,
  characters,
  onClose,
  isModal = false,
  onCharacterGoldUpdate,
}: CampaignShopProps) {
  // Active tab (buy or sell)
  const [activeTab, setActiveTab] = useState<ShopTab>('buy');

  // Selected character
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    characters.length > 0 ? characters[0].id : null
  );

  // Item detail modal state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Toast notifications
  const { success, error: showError, info } = useToast();

  // Get selected character data
  const selectedCharacter = useMemo(
    () => characters.find((c) => c.id === selectedCharacterId),
    [characters, selectedCharacterId]
  );

  // Handlers for other player shop events
  const handleOtherPlayerPurchase = useCallback(
    ({ characterName, itemName }: { characterName: string; itemName: string }) => {
      info(`${characterName} purchased ${itemName}`);
    },
    [info]
  );

  const handleOtherPlayerSell = useCallback(
    ({ characterName, itemName }: { characterName: string; itemName: string }) => {
      info(`${characterName} sold ${itemName}`);
    },
    [info]
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
    onOtherPlayerPurchase: handleOtherPlayerPurchase,
    onOtherPlayerSell: handleOtherPlayerSell,
  });

  // Track last shown error to prevent duplicate toasts
  const lastShownErrorRef = useRef<string | null>(null);

  // Show error toast when error state changes (only once per unique error)
  // Then clear the error so shop view is restored (not replaced by error screen)
  useEffect(() => {
    if (error && error !== lastShownErrorRef.current) {
      lastShownErrorRef.current = error;
      showError(error);
      // Clear the error after showing toast by refreshing the shop
      // This restores the shop view instead of showing error screen
      refreshShop();
    } else if (!error) {
      // Reset when error is cleared
      lastShownErrorRef.current = null;
    }
  }, [error, showError, refreshShop]);

  // Find selected item for modal
  const shopInventory = shop?.inventory;
  const selectedShopItem = useMemo(() => {
    if (!selectedItemId || !shopInventory) return null;
    return shopInventory.find((item) => item.itemId === selectedItemId);
  }, [selectedItemId, shopInventory]);

  // Handle buy with toast notification
  const handleBuy = useCallback(
    async (itemId: string) => {
      const result = await purchaseItem(itemId);
      if (result) {
        success(`Purchased ${result.item.itemName} for ${result.goldSpent}g`);
        // Update character gold in parent state
        if (selectedCharacterId && onCharacterGoldUpdate) {
          onCharacterGoldUpdate(selectedCharacterId, result.characterGoldRemaining);
        }
      }
    },
    [purchaseItem, success, selectedCharacterId, onCharacterGoldUpdate]
  );

  // Handle sell with toast notification
  const handleSell = useCallback(
    async (itemId: string) => {
      const result = await sellItem(itemId);
      if (result) {
        success(`Sold ${result.itemName} for ${result.goldEarned}g`);
        // Update character gold in parent state
        if (selectedCharacterId && onCharacterGoldUpdate) {
          onCharacterGoldUpdate(selectedCharacterId, result.characterGoldRemaining);
        }
      }
    },
    [sellItem, success, selectedCharacterId, onCharacterGoldUpdate]
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
      {activeTab === 'sell' && selectedCharacterId && (
        <SellInventoryView
          characterId={selectedCharacterId}
          sellPriceMultiplier={shop?.config.sellPriceMultiplier || 0.5}
          onSell={handleSell}
          selling={selling}
          onViewDetails={handleViewDetails}
        />
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
