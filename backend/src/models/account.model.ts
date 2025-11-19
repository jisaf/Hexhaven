/**
 * T199 [US7] Create Account model
 *
 * Account represents a registered or anonymous user in the system.
 * MVP: UUID-based anonymous accounts (no email)
 * Production: Email + magic link authentication
 */

export interface Account {
  id: string;
  uuid: string; // Unique identifier for anonymous or registered accounts
  email: string | null; // Nullable in MVP, required in production
  createdAt: Date;
}

export interface CreateAccountDto {
  uuid: string;
  email?: string | null;
  anonymousProgress?: AnonymousProgress | null;
}

export interface AnonymousProgress {
  scenariosCompleted: number;
  totalExperience: number;
  charactersPlayed: string[];
  completedScenarioIds: string[];
  characterExperience?: Record<string, CharacterProgressData>;
}

export interface CharacterProgressData {
  level: number;
  xp: number;
  perksUnlocked: string[];
}

export class AccountModel {
  /**
   * Validates UUID format
   */
  static isValidUuid(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validates email format (for production)
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Creates account DTO with validation
   */
  static createAccountDto(data: Partial<CreateAccountDto>): CreateAccountDto {
    if (!data.uuid) {
      throw new Error('UUID is required');
    }

    if (!this.isValidUuid(data.uuid)) {
      throw new Error('Invalid UUID format');
    }

    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    return {
      uuid: data.uuid,
      email: data.email || null,
      anonymousProgress: data.anonymousProgress || null,
    };
  }

  /**
   * Converts database Account to domain model
   */
  static fromDatabase(dbAccount: any): Account {
    return {
      id: dbAccount.id,
      uuid: dbAccount.uuid,
      email: dbAccount.email,
      createdAt: new Date(dbAccount.createdAt),
    };
  }
}
