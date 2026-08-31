import './styles/base.css';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('APP_ROOT_MISSING');
root.innerHTML = `
  <main class="vc-shell">
    <section class="vc-card">
      <div class="vc-tag">DESAPLICAXI IDENTITY CORE</div>
      <h1>VIVA CUBA</h1>
      <p>NEXT CORE · preview aislada</p>
      <span class="vc-status">GATE 1 FOUNDATION</span>
    </section>
  </main>`;
