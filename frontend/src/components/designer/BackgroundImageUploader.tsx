
import React, { useState } from 'react';

interface BackgroundImageUploaderProps {
  onImageChange: (imageUrl: string | null) => void;
}

const BackgroundImageUploader: React.FC<BackgroundImageUploaderProps> = ({ onImageChange }) => {
  const [image, setImage] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImage(result);
        onImageChange(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClear = () => {
    setImage(null);
    onImageChange(null);
  };

  return (
    <div style={{ padding: '1rem', borderTop: '1px solid #4a5568' }}>
      <h4>Background Image</h4>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      {image && <button onClick={handleClear} style={{marginTop: '0.5rem'}}>Clear</button>}
    </div>
  );
};

export default BackgroundImageUploader;
