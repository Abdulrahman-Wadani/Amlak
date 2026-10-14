import { useEffect, useState } from "react";

export default function App() {
  const [users, setUsers] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://localhost:3000/")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        setUsers(data);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <main style={{ padding: "24px", fontFamily: "sans-serif" }}>
      <h1>Users</h1>

      {loading && <p>Loading users...</p>}

      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {!loading && !error && (
        <pre
          style={{
            padding: "16px",
            background: "#f4f4f4",
            borderRadius: "8px",
            overflowX: "auto",
            color: "#222",
          }}
        >
          {JSON.stringify(users, null, 2)}
        </pre>
      )}
    </main>
  );
}
