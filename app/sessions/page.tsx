'use client';
export default function Exercises() {
  const startDay = async () => {
    const currentDate = new Date().toISOString();
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ date: currentDate }),
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
      <div className="bg-sky-950 flex top-0 left-0 h-20 w-screen">
        <input
          type="date"
          value={new Date().toISOString().substring(0, 10)}
          className="bg-sky-950 flex place-content-center w-screen"
        />
      </div>
      <div className="bg-sky-500/50 w-20 h-20 rounded place-content-center">
        <p className="bg-gray flex">Add Day</p>
        <button
          className="bg-gray flex centered top-20 left-0 w-20 h-20"
          onClick={startDay}
        >
          <p>+</p>
        </button>
      </div>
    </div>
  );
}
