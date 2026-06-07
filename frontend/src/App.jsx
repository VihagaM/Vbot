import { useState, useEffect } from 'react';

export default function MessageDashboard() {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState({ server: 'offline', whatsapp: 'disconnected' });
  const [qrSrc, setQrSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [pairingCode, setPairingCode] = useState(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingError, setPairingError] = useState(null);
  const [authMode, setAuthMode] = useState('qr'); // 'qr' or 'phone'

  const API_URL = 'http://localhost:3000/api';

  const fetchMessages = async () => {
    try {
      const response = await fetch(`${API_URL}/messages`);
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error("Error fetching message logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/status`);
      const data = await response.json();
      setStatus(data);
      if (data.whatsapp === 'connected') {
        setQrSrc(null);
        setPairingCode(null);
      } else {
        fetchQR();
      }
    } catch (error) {
      console.error("Error fetching server status:", error);
      setStatus({ server: 'offline', whatsapp: 'disconnected' });
    }
  };

  const fetchQR = async () => {
    try {
      const response = await fetch(`${API_URL}/qr`);
      if (response.ok) {
        const data = await response.json();
        setQrSrc(data.qr);
      } else {
        setQrSrc(null);
      }
    } catch (error) {
      console.error("Error fetching QR code:", error);
    }
  };

  const requestPairingCode = async () => {
    if (!phone.trim()) return;
    setPairingLoading(true);
    setPairingCode(null);
    setPairingError(null);

    try {
      const res = await fetch(`${API_URL}/request-pairing-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() })
      });
      const data = await res.json();
      if (data.pairingCode) {
        setPairingCode(data.pairingCode);
      } else {
        setPairingError(data.error || 'Failed to get pairing code.');
      }
    } catch (err) {
      setPairingError('Could not reach server.');
    } finally {
      setPairingLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchMessages();
    const statusInterval = setInterval(fetchStatus, 5000);
    const messageInterval = setInterval(fetchMessages, 3000);
    return () => {
      clearInterval(statusInterval);
      clearInterval(messageInterval);
    };
  }, []);

  return (
    <div style={styles.dashboardContainer}>
      <header style={styles.header}>
        <h1 style={styles.title}>
          <span style={styles.iconSpan}>📱</span> WhatsApp Bot Matrix
        </h1>
        <button onClick={() => { fetchStatus(); fetchMessages(); }} style={styles.refreshBtn}>
          🔄 Sync Dashboard
        </button>
      </header>

      <section style={styles.statusGrid}>
        <div style={styles.card}>
          <div style={styles.cardMeta}>System Control</div>
          <div style={styles.cardFlex}>
            <span style={styles.cardLabel}>API Server</span>
            <span style={{
              ...styles.badge,
              backgroundColor: status.server === 'online' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: status.server === 'online' ? '#10b981' : '#ef4444'
            }}>● {status.server.toUpperCase()}</span>
          </div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardMeta}>Bot Connection</div>
          <div style={styles.cardFlex}>
            <span style={styles.cardLabel}>WhatsApp Client</span>
            <span style={{
              ...styles.badge,
              backgroundColor: status.whatsapp === 'connected' ? 'rgba(37, 211, 102, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: status.whatsapp === 'connected' ? '#25D366' : '#f59e0b'
            }}>● {status.whatsapp.toUpperCase()}</span>
          </div>
        </div>
      </section>

      {/* DEVICE GATEWAY / QR + PHONE AUTH */}
      {status.whatsapp !== 'connected' && (
        <section style={styles.qrSection}>
          <div style={styles.qrCard}>

            {/* Toggle Tabs */}
            <div style={styles.tabRow}>
              <button
                onClick={() => { setAuthMode('qr'); setPairingCode(null); setPairingError(null); }}
                style={{ ...styles.tabBtn, ...(authMode === 'qr' ? styles.tabBtnActive : {}) }}
              >
                📷 Scan QR
              </button>
              <button
                onClick={() => { setAuthMode('phone'); }}
                style={{ ...styles.tabBtn, ...(authMode === 'phone' ? styles.tabBtnActive : {}) }}
              >
                📞 Phone Number
              </button>
            </div>

            {/* QR Mode */}
            {authMode === 'qr' && (
              qrSrc ? (
                <div style={styles.qrWrapper}>
                  <div style={styles.qrInfoFrame}>
                    <h3>🔒 Link Terminal Device</h3>
                    <p style={styles.qrSubText}>Open WhatsApp → Linked Devices → Link a Device.</p>
                  </div>
                  <div style={styles.qrImageContainer}>
                    <img src={qrSrc} alt="WhatsApp Auth QR" style={styles.qrCodeImage} />
                  </div>
                </div>
              ) : (
                <div style={styles.loaderWrapper}>
                  <div style={styles.spinner}></div>
                  <p style={styles.loadingText}>Synthesizing dynamic pairing tokens...</p>
                </div>
              )
            )}

            {/* Phone Mode */}
            {authMode === 'phone' && (
              <div style={styles.phoneWrapper}>
                <div style={styles.qrInfoFrame}>
                  <h3>📲 Link via Phone Number</h3>
                  <p style={styles.qrSubText}>
                    Enter the bot's WhatsApp number with country code (no + or spaces).<br />
                    Then open WhatsApp → Linked Devices → Link with phone number.
                  </p>
                </div>

                <div style={styles.phoneInputRow}>
                  <input
                    type="text"
                    placeholder="e.g. 94771234567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={styles.phoneInput}
                  />
                  <button
                    onClick={requestPairingCode}
                    disabled={pairingLoading || !phone.trim()}
                    style={{
                      ...styles.pairingBtn,
                      opacity: pairingLoading || !phone.trim() ? 0.5 : 1
                    }}
                  >
                    {pairingLoading ? '⏳ Getting...' : '🔑 Get Code'}
                  </button>
                </div>

                {pairingCode && (
                  <div style={styles.pairingCodeBox}>
                    <p style={styles.pairingCodeLabel}>Enter this code in WhatsApp:</p>
                    <div style={styles.pairingCodeText}>{pairingCode}</div>
                  </div>
                )}

                {pairingError && (
                  <p style={styles.pairingError}>❌ {pairingError}</p>
                )}
              </div>
            )}

          </div>
        </section>
      )}

      <section style={styles.logSection}>
        <h2 style={styles.sectionHeading}>📦 Live Message Stream</h2>
        {loading ? (
          <div style={styles.placeholderCard}>Stream buffering...</div>
        ) : messages.length === 0 ? (
          <div style={styles.placeholderCard}>No active logs transmission detected.</div>
        ) : (
          <div style={styles.feedStream}>
            {messages.map((msg) => {
              const isCommand = msg.body.startsWith('.');
              return (
                <div key={msg.id} style={{
                  ...styles.msgBubble,
                  borderLeft: isCommand ? '4px solid #3b82f6' : '4px solid #344054',
                  background: isCommand ? 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)' : '#1e293b'
                }}>
                  <div style={styles.msgHeader}>
                    <span style={styles.msgOrigin}>📍 {msg.from.split('@')[0]}</span>
                    <span style={styles.msgTime}>{msg.timestamp}</span>
                  </div>
                  <p style={styles.msgBody}>{msg.body}</p>
                  {isCommand && (
                    <div style={styles.commandAnchor}>
                      <span style={styles.cmdBadge}>⚡ Command Executed</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

const styles = {
  dashboardContainer: {
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    minHeight: '100vh',
    padding: '40px 24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    maxWidth: '800px',
    margin: '0 auto 32px auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #334155',
    paddingBottom: '20px'
  },
  title: { fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px', margin: 0, color: '#fff' },
  iconSpan: { marginRight: '8px' },
  refreshBtn: {
    backgroundColor: '#334155', color: '#f8fafc', border: 'none',
    padding: '8px 16px', borderRadius: '8px', fontSize: '13px',
    fontWeight: '600', cursor: 'pointer'
  },
  statusGrid: {
    maxWidth: '800px', margin: '0 auto 24px auto',
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px'
  },
  card: { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' },
  cardMeta: { fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '8px' },
  cardFlex: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: '16px', fontWeight: '600', color: '#f1f5f9' },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.3px' },
  qrSection: { maxWidth: '800px', margin: '0 auto 32px auto' },
  qrCard: {
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    border: '1px solid #334155', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
    borderRadius: '16px', padding: '32px'
  },
  // 👇 New styles
  tabRow: { display: 'flex', gap: '8px', marginBottom: '28px' },
  tabBtn: {
    padding: '8px 18px', borderRadius: '8px', border: '1px solid #334155',
    backgroundColor: 'transparent', color: '#94a3b8', fontSize: '13px',
    fontWeight: '600', cursor: 'pointer'
  },
  tabBtnActive: { backgroundColor: '#334155', color: '#f1f5f9', borderColor: '#475569' },
  phoneWrapper: { display: 'flex', flexDirection: 'column', gap: '20px' },
  phoneInputRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  phoneInput: {
    flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '8px',
    border: '1px solid #475569', backgroundColor: '#0f172a', color: '#f1f5f9',
    fontSize: '15px', outline: 'none'
  },
  pairingBtn: {
    padding: '10px 20px', borderRadius: '8px', border: 'none',
    backgroundColor: '#25D366', color: '#fff', fontWeight: '700',
    fontSize: '14px', cursor: 'pointer'
  },
  pairingCodeBox: {
    backgroundColor: '#0f172a', border: '1px solid #334155',
    borderRadius: '12px', padding: '20px', textAlign: 'center'
  },
  pairingCodeLabel: { color: '#94a3b8', fontSize: '13px', marginBottom: '10px' },
  pairingCodeText: {
    fontSize: '32px', fontWeight: '800', letterSpacing: '8px',
    color: '#25D366', fontFamily: 'monospace'
  },
  pairingError: { color: '#ef4444', fontSize: '13px', margin: 0 },
  // existing styles
  qrWrapper: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '32px', alignItems: 'center', justifyContent: 'center' },
  qrInfoFrame: { flex: '1', minWidth: '250px' },
  qrSubText: { color: '#94a3b8', fontSize: '14px', lineHeight: '1.5', marginTop: '8px' },
  qrImageContainer: { background: '#ffffff', padding: '12px', borderRadius: '16px', display: 'inline-flex' },
  qrCodeImage: { width: '180px', height: '180px', display: 'block' },
  loaderWrapper: { textAlign: 'center', padding: '20px' },
  spinner: {
    width: '32px', height: '32px', border: '3px solid #334155',
    borderTop: '3px solid #3b82f6', borderRadius: '50%',
    margin: '0 auto 16px auto', animation: 'spin 1s linear infinite'
  },
  loadingText: { color: '#94a3b8', fontSize: '14px' },
  logSection: { maxWidth: '800px', margin: '0 auto' },
  sectionHeading: { fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#f1f5f9' },
  placeholderCard: {
    backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px',
    padding: '32px', textAlign: 'center', color: '#64748b', fontStyle: 'italic'
  },
  feedStream: { display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' },
  msgBubble: { borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  msgHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  msgOrigin: { fontSize: '13px', fontWeight: '600', color: '#38bdf8' },
  msgTime: { fontSize: '11px', color: '#64748b' },
  msgBody: { margin: 0, fontSize: '14px', color: '#e2e8f0', lineHeight: '1.5', whiteSpace: 'pre-wrap' },
  commandAnchor: { marginTop: '10px', display: 'flex' },
  cmdBadge: { fontSize: '11px', fontWeight: '700', backgroundColor: '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: '4px' }
};