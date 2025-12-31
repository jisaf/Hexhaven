/**
 * Create Character Page (002)
 * Standalone page for creating a new character
 */

import { useNavigate } from 'react-router-dom';
import { CharacterCreationForm } from '../components/CharacterCreationForm';
import './CreateCharacter.css';

export function CreateCharacter() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    // Redirect to characters list after successful creation
    navigate('/characters');
  };

  const handleCancel = () => {
    navigate('/characters');
  };

  return (
    <div className="create-character-page">
      <div className="create-character-container">
        <h1>Create New Character</h1>
        <CharacterCreationForm
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          isModal={false}
        />
      </div>
    </div>
  );
}
