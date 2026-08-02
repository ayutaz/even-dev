import './styles.css'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) {
  throw new Error('Missing #app element')
}

app.innerHTML = `
  <header class="hero card">
    <div>
      <p class="eyebrow">Even G2 · 展示会巡回HUD</p>
      <h1 class="page-title">EventLens</h1>
      <p class="page-subtitle">次に行くブースを、メガネで一目確認</p>
    </div>
    <div id="hero-pill" class="hero-pill is-ready" aria-live="polite">準備完了</div>
  </header>
`
