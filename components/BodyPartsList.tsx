import { useEffect, useState } from 'react';
export default function BodyPartsList() {
  const [bodyParts, setBodyParts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getBodyParts = async () => {
      try {
        const response = await fetch('/api/bodyparts', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          throw new Error('failed to fetch bodyparts');
        }
        const data = await response.json();
        setBodyParts(data.bodyparts);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    getBodyParts();
  }, []);
  return (
    <div>
      {loading ? (
        <p>loading...</p>
      ) : (
        <ul>
          {bodyParts.map((bodyPart) => (
            <li key={bodyPart.id}>
              <p>{bodyPart.name}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
