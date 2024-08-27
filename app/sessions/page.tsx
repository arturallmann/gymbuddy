'use client';
export default function Exercises() {
  const startDay = async () => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ date: new Date().toISOString() }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div className="top-0 left-0 w-screen h-screen">
      <div className="bg-sky-950 fixed top-0 left-0 h-20 w-screen">
        <p>Andres räägi välja</p>
        <p>prill raisk</p>
      </div>
      <button
        className="bg-gray fixed top-20 left-0 w-20 h-20"
        onClick={startDay}
      >
        <p>+</p>
      </button>
    </div>
  );
}
