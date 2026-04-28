import './style.css'
import { buildCharacterDictionary } from './appearanceChart.js'

// =========================
// CSV (code = key)
// =========================

async function loadCharacterCSV() {
  const res = await fetch('/data/characters.csv')
  const text = await res.text()

  const [, ...rows] = text.trim().split('\n')

  const map = new Map()

  rows.forEach(row => {
    const [character, code, image] = row.split(',')
    if (!code) return

    map.set(code.trim(), {
      character: character?.trim(),
      image: image?.trim()
    })
  })

  return map
}

// =========================
// SAFE DOM
// =========================

function ensureDOM() {
  let app = document.getElementById("app")

  if (!app) {
    app = document.createElement("div")
    app.id = "app"
    document.body.appendChild(app)
  }

  let wrapper = document.querySelector(".heatmap-wrapper")
  if (!wrapper) {
    wrapper = document.createElement("div")
    wrapper.className = "heatmap-wrapper"
    app.appendChild(wrapper)
  }

  let container = document.querySelector(".heatmap-container")
  if (!container) {
    container = document.createElement("div")
    container.className = "heatmap-container"
    wrapper.appendChild(container)
  }

  let grid = document.getElementById("heatmap")
  if (!grid) {
    grid = document.createElement("div")
    grid.id = "heatmap"
    grid.className = "heatmap"
    container.appendChild(grid)
  }

  let panel = document.getElementById("info-panel")
  if (!panel) {
    panel = document.createElement("div")
    panel.id = "info-panel"
    panel.className = "info-panel"
    wrapper.appendChild(panel)
  }

  return { grid, panel }
}

// =========================
// INIT
// =========================

async function init() {
  const [res, characterMap] = await Promise.all([
    fetch('/data/script_data.json'),
    loadCharacterCSV()
  ])

  const data = await res.json()

  const { characterDict } = buildCharacterDictionary(data, characterMap)

  const { grid, panel } = ensureDOM()

  render(grid, panel, characterDict, characterMap)
}

// =========================
// RENDER
// =========================

function render(grid, panel, data, characterMap) {
  grid.innerHTML = ""

  const codes = Object.keys(data)
    .sort((a, b) =>
      data[a].firstAppearanceIndex - data[b].firstAppearanceIndex
    )

  const episodes = Object.keys(data[codes[0]].appearances)

  grid.style.display = "grid"
  grid.style.gridTemplateColumns = `150px repeat(${episodes.length}, 20px)`
  grid.style.gap = "2px"

  function updatePanel(code, ep, cell) {
    const meta = characterMap.get(code)

    panel.innerHTML = `
      <h3>${meta?.character ?? code}</h3>
      ${meta?.image ? `<img src="${meta.image}" style="width:100%;border-radius:6px;margin-bottom:10px;">` : ""}
      <p><strong>${ep}</strong></p>
      <p><strong>${cell.count}</strong> words</p>
    `
  }

  grid.appendChild(document.createElement("div"))

  episodes.forEach(ep => {
    const el = document.createElement("div")
    el.textContent = ep
    el.style.fontSize = "10px"
    el.style.writingMode = "vertical-rl"
    el.style.transform = "rotate(180deg)"
    grid.appendChild(el)
  })

  codes.forEach(code => {
    const meta = characterMap.get(code)

    const label = document.createElement("div")
    label.textContent = meta?.character ?? code
    label.style.fontSize = "12px"
    label.style.display = "flex"
    label.style.alignItems = "center"

    grid.appendChild(label)

    episodes.forEach(ep => {
      const cell = document.createElement("div")
      cell.style.width = "20px"
      cell.style.height = "20px"
      cell.style.borderRadius = "3px"

      const cellData = data[code].appearances[ep] ?? {
        color: "hsl(30,20%,95%)",
        count: 0
      }

      cell.style.background = cellData.color

      cell.addEventListener("mouseenter", () => {
        updatePanel(code, ep, cellData)
      })

      grid.appendChild(cell)
    })
  })
}

window.addEventListener("DOMContentLoaded", init)