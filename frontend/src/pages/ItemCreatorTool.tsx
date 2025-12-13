/**
 * ItemCreatorTool Page (Issue #205)
 *
 * A comprehensive form for users with the 'creator' role to create new items.
 * Items follow Gloomhaven-style equipment rules with slots, usage types, effects, and triggers.
 *
 * ## Item Slots (per Gloomhaven rules)
 * - HEAD: 1 head slot per character (helmets, crowns)
 * - BODY: 1 body slot per character (armor, robes)
 * - LEGS: 1 legs slot per character (boots, greaves)
 * - ONE_HAND: Up to 2 one-hand items OR 1 two-hand item (weapons, shields)
 * - TWO_HAND: Uses both hand slots (bows, staves)
 * - SMALL: ceil(level/2) small item slots (potions, rings, scrolls)
 *
 * ## Usage Types
 * - PERSISTENT: Always active, no usage limits (passive bonuses like +1 attack sword)
 * - SPENT: Rotated sideways after use, refreshes on long rest (once per rest items)
 * - CONSUMED: Flipped face-down after use, refreshes between scenarios (one-time use)
 *
 * ## Effects
 * Effects define WHAT the item does. See backend/src/types/item.types.ts for full reference.
 * Common effects: attack_modifier, defense, heal, shield, movement, condition, element
 *
 * ## Triggers
 * Triggers define WHEN effects activate automatically. Items without triggers are
 * activated manually by the player. See backend/src/types/item.types.ts for full reference.
 *
 * @see backend/src/types/item.types.ts for effect and trigger type documentation
 * @see shared/types/entities.ts for Item interface definitions
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ItemIcon } from '../components/inventory';
import { getApiUrl } from '../config/api';
import styles from './ItemCreatorTool.module.css';
import {
  ItemSlot,
  ItemUsageType,
  ItemRarity,
  type ItemEffect,
  type ItemEffectType,
  type ItemTrigger,
  type ItemTriggerEvent,
  Condition,
  ElementType,
} from '../../../shared/types/entities';

// Form state for a new item
interface ItemFormState {
  name: string;
  slot: ItemSlot;
  usageType: ItemUsageType;
  maxUses: number | null;
  rarity: ItemRarity;
  effects: ItemEffect[];
  triggers: ItemTrigger[];
  cost: number;
  description: string;
  imageUrl: string;
}

// Default form state
const DEFAULT_FORM_STATE: ItemFormState = {
  name: '',
  slot: ItemSlot.SMALL,
  usageType: ItemUsageType.CONSUMED,
  maxUses: null,
  rarity: ItemRarity.COMMON,
  effects: [],
  triggers: [],
  cost: 10,
  description: '',
  imageUrl: 'ra-potion',
};

/**
 * Effect type options for the item creator form.
 * Each effect type has different parameter requirements:
 * - Numeric types (attack_modifier, defense, heal, shield, retaliate, pierce, movement):
 *   Require a 'value' field with a number
 * - condition: Requires selecting a status condition (poison, stun, etc.)
 * - element: Requires selecting an element type (fire, ice, etc.)
 * - special: Requires a text description for custom effects
 */
const EFFECT_TYPES: { value: ItemEffectType; label: string }[] = [
  { value: 'attack_modifier', label: 'Attack Modifier' },  // +/- to attack damage
  { value: 'defense', label: 'Defense' },                  // Reduces incoming damage
  { value: 'heal', label: 'Heal' },                        // Restores HP
  { value: 'shield', label: 'Shield' },                    // Blocks damage for round
  { value: 'retaliate', label: 'Retaliate' },              // Damage back to attacker
  { value: 'pierce', label: 'Pierce' },                    // Ignore enemy shield
  { value: 'condition', label: 'Apply Condition' },        // Apply status effect
  { value: 'movement', label: 'Movement' },                // +/- to movement range
  { value: 'element', label: 'Element' },                  // Generate/consume element
  { value: 'special', label: 'Special (Custom)' },         // Custom text effect
];

/**
 * Trigger event options for reactive items.
 * Items without triggers are activated manually by the player.
 * Items WITH triggers activate automatically when the event occurs.
 * Triggers can have an optional 'condition' text for more specific activation.
 */
const TRIGGER_EVENTS: { value: ItemTriggerEvent; label: string }[] = [
  { value: 'on_attack', label: 'On Attack' },              // When performing an attack
  { value: 'when_attacked', label: 'When Attacked' },      // When targeted by attack
  { value: 'on_damage', label: 'On Damage Taken' },        // When HP is reduced
  { value: 'on_move', label: 'On Move' },                  // When performing move action
  { value: 'start_of_turn', label: 'Start of Turn' },      // Beginning of your turn
  { value: 'end_of_turn', label: 'End of Turn' },          // End of your turn
  { value: 'on_rest', label: 'On Rest' },                  // When resting (short/long)
];

// Common RPG Awesome icons for items
const COMMON_ICONS = [
  'ra-potion', 'ra-health', 'ra-shield', 'ra-sword', 'ra-axe',
  'ra-hammer', 'ra-dagger-knife', 'ra-crossed-swords', 'ra-helmet',
  'ra-vest', 'ra-boot-stomp', 'ra-gem', 'ra-ring', 'ra-scroll-unfurled',
  'ra-book', 'ra-bottle-vapors', 'ra-crystal-ball', 'ra-fire',
  'ra-snowflake', 'ra-lightning-bolt', 'ra-leaf', 'ra-sun', 'ra-moon-sun',
];

export function ItemCreatorTool() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ItemFormState>(DEFAULT_FORM_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasCreatorRole, setHasCreatorRole] = useState<boolean | null>(null);

  // Check if user has creator role
  useEffect(() => {
    const checkRole = async () => {
      const token = localStorage.getItem('hexhaven_access_token');
      if (!token) {
        setHasCreatorRole(false);
        return;
      }

      try {
        const response = await fetch(`${getApiUrl()}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          const roles = data.roles || [];
          setHasCreatorRole(roles.includes('creator'));
        } else {
          setHasCreatorRole(false);
        }
      } catch {
        setHasCreatorRole(false);
      }
    };

    checkRole();
  }, []);

  // Handle form field changes
  const handleChange = (field: keyof ItemFormState, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  // Add a new effect
  const addEffect = () => {
    const newEffect: ItemEffect = {
      type: 'attack_modifier',
      value: 1,
    };
    setForm((prev) => ({
      ...prev,
      effects: [...prev.effects, newEffect],
    }));
  };

  // Update an effect
  const updateEffect = (index: number, updates: Partial<ItemEffect>) => {
    setForm((prev) => ({
      ...prev,
      effects: prev.effects.map((e, i) =>
        i === index ? { ...e, ...updates } : e
      ),
    }));
  };

  // Remove an effect
  const removeEffect = (index: number) => {
    setForm((prev) => ({
      ...prev,
      effects: prev.effects.filter((_, i) => i !== index),
    }));
  };

  // Add a new trigger
  const addTrigger = () => {
    const newTrigger: ItemTrigger = {
      event: 'when_attacked',
    };
    setForm((prev) => ({
      ...prev,
      triggers: [...prev.triggers, newTrigger],
    }));
  };

  // Update a trigger
  const updateTrigger = (index: number, updates: Partial<ItemTrigger>) => {
    setForm((prev) => ({
      ...prev,
      triggers: prev.triggers.map((t, i) =>
        i === index ? { ...t, ...updates } : t
      ),
    }));
  };

  // Remove a trigger
  const removeTrigger = (index: number) => {
    setForm((prev) => ({
      ...prev,
      triggers: prev.triggers.filter((_, i) => i !== index),
    }));
  };

  // Submit the form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validate
    if (!form.name.trim()) {
      setError('Name is required');
      setLoading(false);
      return;
    }

    if (form.effects.length === 0) {
      setError('At least one effect is required');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('hexhaven_access_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const payload = {
        name: form.name.trim(),
        slot: form.slot,
        usageType: form.usageType,
        maxUses: form.maxUses,
        rarity: form.rarity,
        effects: form.effects,
        triggers: form.triggers.length > 0 ? form.triggers : undefined,
        cost: form.cost,
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
      };

      const response = await fetch(`${getApiUrl()}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create item');
      }

      const data = await response.json();
      setSuccess(`Item "${data.item.name}" created successfully!`);
      setForm(DEFAULT_FORM_STATE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking role
  if (hasCreatorRole === null) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Checking permissions...</div>
      </div>
    );
  }

  // Show access denied if not a creator
  if (!hasCreatorRole) {
    return (
      <div className={styles.container}>
        <div className={styles.accessDenied}>
          <h2>Access Denied</h2>
          <p>You need the Creator role to access this tool.</p>
          <button onClick={() => navigate('/')}>Return to Lobby</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>
          <ItemIcon icon="ra-anvil" size={28} />
          Item Creator Tool
        </h1>
        <button
          className={styles.backButton}
          onClick={() => navigate('/')}
        >
          Back to Lobby
        </button>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Preview */}
        <section className={styles.preview}>
          <h3>Preview</h3>
          <div className={styles.previewCard}>
            <ItemIcon icon={form.imageUrl} size={48} rarity={form.rarity} />
            <span className={styles.previewName}>{form.name || 'Item Name'}</span>
            <span className={styles.previewRarity}>{form.rarity}</span>
          </div>
        </section>

        {/* Basic Info */}
        <section className={styles.section}>
          <h3>Basic Info</h3>

          <div className={styles.field}>
            <label htmlFor="name">Name *</label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Healing Potion"
              required
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="slot">Slot *</label>
              <select
                id="slot"
                value={form.slot}
                onChange={(e) => handleChange('slot', e.target.value as ItemSlot)}
              >
                <option value={ItemSlot.HEAD}>Head</option>
                <option value={ItemSlot.BODY}>Body</option>
                <option value={ItemSlot.LEGS}>Legs</option>
                <option value={ItemSlot.ONE_HAND}>One Hand</option>
                <option value={ItemSlot.TWO_HAND}>Two Hands</option>
                <option value={ItemSlot.SMALL}>Small Item</option>
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="usageType">Usage Type *</label>
              <select
                id="usageType"
                value={form.usageType}
                onChange={(e) => handleChange('usageType', e.target.value as ItemUsageType)}
              >
                <option value={ItemUsageType.PERSISTENT}>Persistent (Always Active)</option>
                <option value={ItemUsageType.SPENT}>Spent (Refresh on Rest)</option>
                <option value={ItemUsageType.CONSUMED}>Consumed (Single Use)</option>
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="rarity">Rarity *</label>
              <select
                id="rarity"
                value={form.rarity}
                onChange={(e) => handleChange('rarity', e.target.value as ItemRarity)}
              >
                <option value={ItemRarity.COMMON}>Common</option>
                <option value={ItemRarity.UNCOMMON}>Uncommon</option>
                <option value={ItemRarity.RARE}>Rare</option>
                <option value={ItemRarity.EPIC}>Epic</option>
                <option value={ItemRarity.LEGENDARY}>Legendary</option>
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="cost">Cost (Gold) *</label>
              <input
                id="cost"
                type="number"
                min={0}
                value={form.cost}
                onChange={(e) => handleChange('cost', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {form.usageType !== ItemUsageType.PERSISTENT && (
            <div className={styles.field}>
              <label htmlFor="maxUses">Max Uses (optional)</label>
              <input
                id="maxUses"
                type="number"
                min={1}
                value={form.maxUses || ''}
                onChange={(e) =>
                  handleChange('maxUses', e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="Leave empty for single use"
              />
            </div>
          )}
        </section>

        {/* Icon Selection */}
        <section className={styles.section}>
          <h3>Icon</h3>
          <div className={styles.field}>
            <label htmlFor="imageUrl">Icon Class</label>
            <input
              id="imageUrl"
              type="text"
              value={form.imageUrl}
              onChange={(e) => handleChange('imageUrl', e.target.value)}
              placeholder="e.g., ra-sword"
            />
          </div>
          <div className={styles.iconGrid}>
            {COMMON_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                className={`${styles.iconOption} ${form.imageUrl === icon ? styles.selected : ''}`}
                onClick={() => handleChange('imageUrl', icon)}
                title={icon}
              >
                <ItemIcon icon={icon} size={24} />
              </button>
            ))}
          </div>
        </section>

        {/* Effects */}
        <section className={styles.section}>
          <h3>
            Effects *
            <button type="button" className={styles.addButton} onClick={addEffect}>
              + Add Effect
            </button>
          </h3>

          {form.effects.length === 0 && (
            <p className={styles.hint}>Add at least one effect to define what this item does.</p>
          )}

          {form.effects.map((effect, index) => (
            <div key={index} className={styles.effectRow}>
              <select
                value={effect.type}
                onChange={(e) => updateEffect(index, { type: e.target.value as ItemEffectType })}
              >
                {EFFECT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              {['attack_modifier', 'defense', 'heal', 'shield', 'retaliate', 'pierce', 'movement'].includes(effect.type) && (
                <input
                  type="number"
                  value={effect.value || 0}
                  onChange={(e) => updateEffect(index, { value: parseInt(e.target.value) || 0 })}
                  placeholder="Value"
                  className={styles.smallInput}
                />
              )}

              {effect.type === 'condition' && (
                <select
                  value={effect.condition || ''}
                  onChange={(e) => updateEffect(index, { condition: e.target.value as Condition })}
                >
                  <option value="">Select Condition</option>
                  {Object.values(Condition).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}

              {effect.type === 'element' && (
                <select
                  value={effect.element || ''}
                  onChange={(e) => updateEffect(index, { element: e.target.value as ElementType })}
                >
                  <option value="">Select Element</option>
                  {Object.values(ElementType).map((el) => (
                    <option key={el} value={el}>{el}</option>
                  ))}
                </select>
              )}

              {effect.type === 'special' && (
                <input
                  type="text"
                  value={effect.description || ''}
                  onChange={(e) => updateEffect(index, { description: e.target.value })}
                  placeholder="Effect description"
                  className={styles.wideInput}
                />
              )}

              <button
                type="button"
                className={styles.removeButton}
                onClick={() => removeEffect(index)}
              >
                Remove
              </button>
            </div>
          ))}
        </section>

        {/* Triggers */}
        <section className={styles.section}>
          <h3>
            Triggers (Optional)
            <button type="button" className={styles.addButton} onClick={addTrigger}>
              + Add Trigger
            </button>
          </h3>

          <p className={styles.hint}>
            Triggers define when effects activate automatically (e.g., &quot;when attacked&quot;).
          </p>

          {form.triggers.map((trigger, index) => (
            <div key={index} className={styles.effectRow}>
              <select
                value={trigger.event}
                onChange={(e) => updateTrigger(index, { event: e.target.value as ItemTriggerEvent })}
              >
                {TRIGGER_EVENTS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={trigger.condition || ''}
                onChange={(e) => updateTrigger(index, { condition: e.target.value || undefined })}
                placeholder="Condition (optional)"
                className={styles.wideInput}
              />

              <button
                type="button"
                className={styles.removeButton}
                onClick={() => removeTrigger(index)}
              >
                Remove
              </button>
            </div>
          ))}
        </section>

        {/* Description */}
        <section className={styles.section}>
          <h3>Description (Optional)</h3>
          <textarea
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe the item's lore or usage..."
            rows={3}
          />
        </section>

        {/* Error/Success Messages */}
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        {/* Submit */}
        <button
          type="submit"
          className={styles.submitButton}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Item'}
        </button>
      </form>
    </div>
  );
}

export default ItemCreatorTool;
