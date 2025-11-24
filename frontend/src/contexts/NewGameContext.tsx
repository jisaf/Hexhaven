import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Player } from '../components/PlayerList';
import type { CharacterClass } from '../components/CharacterSelect';

interface NewGameContextType {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  selectedScenario?: string;
  selectScenario: (scenarioId: string) => void;
  selectedCharacter?: CharacterClass;
  selectCharacter: (characterClass: CharacterClass) => void;
  // Add more state and actions as needed
}

const NewGameContext = createContext<NewGameContextType | undefined>(undefined);

export const NewGameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string | undefined>();
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterClass | undefined>();

  const selectScenario = useCallback((scenarioId: string) => {
    setSelectedScenario(scenarioId);
  }, []);

  const selectCharacter = useCallback((characterClass: CharacterClass) => {
    setSelectedCharacter(characterClass);
  }, []);

  const value = {
    players,
    setPlayers,
    selectedScenario,
    selectScenario,
    selectedCharacter,
    selectCharacter,
  };

  return (
    <NewGameContext.Provider value={value}>
      {children}
    </NewGameContext.Provider>
  );
};

export const useNewGame = () => {
  const context = useContext(NewGameContext);
  if (context === undefined) {
    throw new Error('useNewGame must be used within a NewGameProvider');
  }
  return context;
};
