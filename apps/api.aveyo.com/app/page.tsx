export default function HomePage() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>Ava API</h1>
      <p>API scaffold ready. Available mock endpoints:</p>
      <ul>
        <li>/api/health</li>
        <li>/api/auth/session</li>
        <li>/api/conversations</li>
        <li>/api/conversations/:id</li>
        <li>/api/messages (POST)</li>
        <li>/api/handoff/request (POST)</li>
        <li>/api/handoff/queue</li>
        <li>/api/handoff/claim (POST)</li>
        <li>/api/handoff/resolve (POST)</li>
        <li>/api/realtime/events</li>
        <li>/api/realtime/typing (POST)</li>
      </ul>
    </main>
  );
}
