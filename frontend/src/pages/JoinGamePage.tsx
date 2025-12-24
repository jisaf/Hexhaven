import { useParams, useLocation } from 'react-router-dom';

export const JoinGamePage: React.FC = () => {
  const params = useParams();
  const location = useLocation();

  return (
    <div style={{ padding: '20px' }}>
      <h1>Join Game - Placeholder</h1>
      <pre>{JSON.stringify({ params, pathname: location.pathname }, null, 2)}</pre>
      <p>This page is under development. Route params and location shown above.</p>
    </div>
  );
};
