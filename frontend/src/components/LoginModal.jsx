export function LoginModal({ busy, onLogin, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" aria-label="Close login" onClick={onClose}>×</button>
        <p className="eyebrow">Seeded demo accounts</p>
        <h2 id="login-title">Choose a role</h2>
        <p className="muted">Both accounts use <code>password123</code>. Role-based access is enforced by the API.</p>
        <div className="role-grid">
          <button disabled={busy} className="role-card" onClick={() => onLogin("guest@stayfinder.dev")}>
            <span className="role-icon">✈</span>
            <strong>Continue as guest</strong>
            <small>Search, reserve, and cancel trips</small>
          </button>
          <button disabled={busy} className="role-card" onClick={() => onLogin("host@stayfinder.dev")}>
            <span className="role-icon">⌂</span>
            <strong>Continue as host</strong>
            <small>Create, edit, and remove properties</small>
          </button>
        </div>
      </section>
    </div>
  );
}
