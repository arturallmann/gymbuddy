'use client';
export default function Exercises() {
  const createNewDay = async () => {
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
  const CheckForCurrentDay = async () => {
    const date: String = new Date().toISOString().substring(0, 10);
    const response = await fetch('/api/sessions', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const dates = await response.json();
    let exists: boolean = false;
    for (let i = 0; i <= dates.sessions.length; i++) {
      if (date === dates.sessions[i].date.substring(0, 10)) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      createNewDay();
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
      <div className="bg-sky-500/50 w-20 h-20 rounded">
        <p className="bg-gray flex">Add Day</p>
        <button
          className="bg-gray flex centered top-20 left-0 w-20 h-20"
          onClick={CheckForCurrentDay}
        >
          <p>+</p>
        </button>
      </div>
    </div>
  );
}
