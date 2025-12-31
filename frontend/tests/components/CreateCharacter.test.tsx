/**
 * Unit Test: CreateCharacter Component - Name Validation
 *
 * Tests character name validation for:
 * - Length enforcement (1-30 characters)
 * - HTML tag rejection (XSS prevention)
 * - Whitespace handling
 *
 * Issue #292 - Character name validation not enforced
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CreateCharacter } from '../../src/pages/CreateCharacter';
import { characterService } from '../../src/services/character.service';

// Mock the character service
jest.mock('../../src/services/character.service', () => ({
  characterService: {
    createCharacter: jest.fn(),
  },
}));

// Mock the API URL config
jest.mock('../../src/config/api', () => ({
  getApiUrl: () => 'http://localhost:3001/api',
}));

// Mock navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockedCharacterService = characterService as jest.Mocked<
  typeof characterService
>;

// Mock character classes response
const mockCharacterClasses = [
  {
    id: 'class-brute',
    name: 'Brute',
    startingHealth: 10,
    handSize: 10,
    description: 'A strong warrior',
    perks: ['Perk 1', 'Perk 2'],
  },
  {
    id: 'class-spellweaver',
    name: 'Spellweaver',
    startingHealth: 6,
    handSize: 8,
    description: 'A powerful mage',
    perks: ['Perk A', 'Perk B'],
  },
];

/**
 * Helper to render the CreateCharacter component in a router context
 */
function renderCreateCharacter() {
  // Mock the fetch for character classes
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => mockCharacterClasses,
  });

  return render(
    <MemoryRouter>
      <CreateCharacter />
    </MemoryRouter>
  );
}

describe('CreateCharacter - Name Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('length validation', () => {
    it('should accept a valid name within 1-30 characters', async () => {
      const user = userEvent.setup();
      renderCreateCharacter();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/character name/i);
      await user.type(nameInput, 'Thorgar');

      // Select a class
      const bruteCard = screen.getByText('Brute');
      await user.click(bruteCard);

      // Mock successful creation
      mockedCharacterService.createCharacter.mockResolvedValueOnce({
        id: 'char-1',
        name: 'Thorgar',
        userId: 'user-1',
        classId: 'class-brute',
        className: 'Brute',
        level: 1,
        experience: 0,
        gold: 0,
        health: 10,
        perks: [],
        inventory: [],
        currentGameId: null,
        campaignId: null,
        retired: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Submit the form
      const submitButton = screen.getByRole('button', {
        name: /create character/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockedCharacterService.createCharacter).toHaveBeenCalledWith({
          name: 'Thorgar',
          classId: 'class-brute',
        });
      });
    });

    it('should enforce maxLength attribute on input (browser-level)', async () => {
      const user = userEvent.setup();
      renderCreateCharacter();

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/character name/i) as HTMLInputElement;

      // Verify the input has maxLength attribute set to 30
      expect(nameInput).toHaveAttribute('maxLength', '30');

      // Type a long name - the HTML input will truncate to 30 characters
      const longName = 'A'.repeat(35);
      await user.type(nameInput, longName);

      // The input value should be truncated to 30 characters by the browser
      expect(nameInput.value.length).toBeLessThanOrEqual(30);
    });

    it('should show error when name is empty', async () => {
      const user = userEvent.setup();
      renderCreateCharacter();

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Select a class without entering a name
      const bruteCard = screen.getByText('Brute');
      await user.click(bruteCard);

      // The submit button should be disabled when name is empty
      const submitButton = screen.getByRole('button', {
        name: /create character/i,
      });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('HTML tag validation (XSS prevention)', () => {
    it('should show error when name contains script tags', async () => {
      const user = userEvent.setup();
      renderCreateCharacter();

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/character name/i);
      await user.type(nameInput, "<script>alert('xss')");

      // Select a class
      const bruteCard = screen.getByText('Brute');
      await user.click(bruteCard);

      // Submit the form
      const submitButton = screen.getByRole('button', {
        name: /create character/i,
      });
      await user.click(submitButton);

      // Should show validation error about special characters
      await waitFor(() => {
        expect(
          screen.getByText(/cannot contain.*special characters/i)
        ).toBeInTheDocument();
      });

      // Should NOT call the service
      expect(mockedCharacterService.createCharacter).not.toHaveBeenCalled();
    });

    it('should show error when name contains HTML tags', async () => {
      const user = userEvent.setup();
      renderCreateCharacter();

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/character name/i);
      await user.type(nameInput, '<b>Bold</b>');

      // Select a class
      const bruteCard = screen.getByText('Brute');
      await user.click(bruteCard);

      // Submit the form
      const submitButton = screen.getByRole('button', {
        name: /create character/i,
      });
      await user.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(
          screen.getByText(/cannot contain.*special characters/i)
        ).toBeInTheDocument();
      });

      expect(mockedCharacterService.createCharacter).not.toHaveBeenCalled();
    });

    it('should show error when name contains angle brackets', async () => {
      const user = userEvent.setup();
      renderCreateCharacter();

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/character name/i);
      await user.type(nameInput, 'Test < Name');

      // Select a class
      const bruteCard = screen.getByText('Brute');
      await user.click(bruteCard);

      // Submit the form
      const submitButton = screen.getByRole('button', {
        name: /create character/i,
      });
      await user.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(
          screen.getByText(/cannot contain.*special characters/i)
        ).toBeInTheDocument();
      });

      expect(mockedCharacterService.createCharacter).not.toHaveBeenCalled();
    });
  });

  describe('whitespace handling', () => {
    it('should trim whitespace from name', async () => {
      const user = userEvent.setup();
      renderCreateCharacter();

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/character name/i);
      await user.type(nameInput, '  Thorgar  ');

      // Select a class
      const bruteCard = screen.getByText('Brute');
      await user.click(bruteCard);

      // Mock successful creation
      mockedCharacterService.createCharacter.mockResolvedValueOnce({
        id: 'char-1',
        name: 'Thorgar',
        userId: 'user-1',
        classId: 'class-brute',
        className: 'Brute',
        level: 1,
        experience: 0,
        gold: 0,
        health: 10,
        perks: [],
        inventory: [],
        currentGameId: null,
        campaignId: null,
        retired: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Submit the form
      const submitButton = screen.getByRole('button', {
        name: /create character/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockedCharacterService.createCharacter).toHaveBeenCalledWith({
          name: 'Thorgar', // Should be trimmed
          classId: 'class-brute',
        });
      });
    });

    it('should disable submit button when name is only whitespace', async () => {
      const user = userEvent.setup();
      renderCreateCharacter();

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/character name/i);
      await user.type(nameInput, '   ');

      // Select a class
      const bruteCard = screen.getByText('Brute');
      await user.click(bruteCard);

      // Submit button should be disabled because trimmed name is empty
      const submitButton = screen.getByRole('button', {
        name: /create character/i,
      });
      expect(submitButton).toBeDisabled();

      // Should NOT call the service
      expect(mockedCharacterService.createCharacter).not.toHaveBeenCalled();
    });
  });
});
