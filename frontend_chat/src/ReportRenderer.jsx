import React from 'react'
import './report.css'

function cleanMarkdown(text) {
  if (!text) return ''
  return String(text)
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#+\s/g, '')
    .replace(/`/g, '')
    .trim()
}

function isValidRecipeArray(content) {
  // Check if content is a JSON string representing an array of recipes
  if (typeof content !== 'string') return false
  try {
    const parsed = JSON.parse(content)
    return Array.isArray(parsed) && parsed.length > 0 && parsed[0] && typeof parsed[0] === 'object' && 'name' in parsed[0]
  } catch {
    return false
  }
}

function RecipeCard({ recipe }) {
  return (
    <div className="recipe-card">
      <h4 className="recipe-name">{recipe.name}</h4>
      <p className="recipe-purpose"><strong>Purpose:</strong> {recipe.purpose}</p>
      <div className="recipe-ingredients">
        <strong>Ingredients:</strong>
        <ul>
          {recipe.ingredients && recipe.ingredients.map((ing, i) => (
            <li key={i}>{ing}</li>
          ))}
        </ul>
      </div>
      <div className="recipe-steps">
        <strong>Steps:</strong>
        <ol>
          {recipe.steps && recipe.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>
      {recipe.safety && (
        <p className="recipe-safety"><strong>Safety:</strong> {recipe.safety}</p>
      )}
    </div>
  )
}

function RecipesSection({ content }) {
  let recipes = []
  try {
    recipes = typeof content === 'string' ? JSON.parse(content) : content
  } catch {
    return null
  }
  
  if (!Array.isArray(recipes) || recipes.length === 0) return null
  
  return (
    <div className="diagnosis-section recipes-section">
      <div className="section-title">
        <h3 className="accent-title">Ayurvedic Preparations</h3>
      </div>
      <div className="recipe-grid">
        {recipes.map((recipe, idx) => (
          <RecipeCard key={idx} recipe={recipe} />
        ))}
      </div>
    </div>
  )
}

function renderDiagnosisSections(text) {
  if (!text) return null
  const lines = text.split('\n').map(l => l.trim())
  const sections = []
  let currentSection = null

  const isMajorHeader = (line) => {
    if (!line) return false
    // number-prefixed header like "4. Short Clinical Reasoning"
    if (/^\d+\./.test(line)) return true
    // explicit whitelist of major section keywords (case-insensitive)
    if (/\b(?:Recommendations|Clinical Reasoning|Diagnosis|Management|Dietary|Assessment|Preparations|Home[- ]?Based|Remedies)\b/i.test(line)) return true
    return false
  }

  lines.forEach(line => {
    if (!line) return // skip empty lines

    if (isMajorHeader(line)) {
      if (currentSection) sections.push(currentSection)
      currentSection = { title: line.replace(/^\d+\.\s*/, ''), content: [] }
    } else {
      if (!currentSection) currentSection = { title: null, content: [] }
      currentSection.content.push(line)
    }
  })

  if (currentSection) sections.push(currentSection)

  return sections.map((sec, i) => {
    const normalized = (sec.title || '').toLowerCase().replace(/\s+/g, ' ').trim()
    const isShortClinical = normalized === 'short clinical reasoning'
    return (
      <div key={i} className="diagnosis-section">
        {sec.title && (
          <div className="section-title">
            <h3 className={isShortClinical ? 'accent-title' : ''}>{sec.title}</h3>
          </div>
        )}
        <div className="kv-value">
          {normalized === 'dietary recommendations' ? (
            <DietaryRenderer lines={sec.content} />
          ) : (
            sec.content.map((c, idx) => (
              <p key={idx}>{c}</p>
            ))
          )}
        </div>
      </div>
    )
  })
}

function parseDietary(lines) {
  const categories = {}
  lines.forEach(line => {
    // Expect lines like "Grains: Rice (especially basmati), wheat." or plain lines
    const m = line.match(/^([^:]+):\s*(.*)$/)
    if (m) {
      const cat = m[1].trim()
      let rest = m[2].trim()

      // split off "Avoid" clauses
      const avoidMatch = rest.match(/(?:\bAvoid\b[:\s-]*)/i)
      let allowText = rest
      let avoidText = ''
      if (avoidMatch) {
        const idx = avoidMatch.index
        allowText = rest.slice(0, idx).trim()
        avoidText = rest.slice(idx + (avoidMatch[0] || '').length).trim()
      }

      const splitItems = txt => txt.split(/,|;|\band\b/).map(s=>s.trim()).filter(Boolean)

      const allowed = allowText ? splitItems(allowText) : []
      const avoid = avoidText ? splitItems(avoidText) : []

      if (!categories[cat]) categories[cat] = { allowed: [], avoid: [] }
      categories[cat].allowed.push(...allowed)
      categories[cat].avoid.push(...avoid)
    } else {
      // fallback: try to detect sentences containing Avoid or similar
      const avoidMatch = line.match(/(?:Avoid|avoid)[:\s-]*(.*)$/)
      if (avoidMatch) {
        const avoidText = avoidMatch[1] || ''
        const items = avoidText.split(/,|;|\band\b/).map(s=>s.trim()).filter(Boolean)
        if (!categories['General']) categories['General'] = { allowed: [], avoid: [] }
        categories['General'].avoid.push(...items)
      } else {
        const items = line.split(/,|;|\band\b/).map(s=>s.trim()).filter(Boolean)
        if (items.length) {
          if (!categories['General']) categories['General'] = { allowed: [], avoid: [] }
          categories['General'].allowed.push(...items)
        }
      }
    }
  })
  return categories
}

function DietaryRenderer({ lines }) {
  const cats = parseDietary(lines)
  return (
    <div>
      {Object.keys(cats).map((cat, idx) => (
        <div key={idx} className="diagnosis-section" style={{ padding: 8, boxShadow: 'none', border: 'none' }}>
          <div className="section-sub"><strong>{cat}</strong></div>
          <div className="food-grid">
            <div className="food-box food-allow">
              <h5>Can have</h5>
              {cats[cat].allowed.length ? (
                <ul>{cats[cat].allowed.map((it,i)=>(<li key={i}>{it}</li>))}</ul>
              ) : <div className="small text-muted">—</div>}
            </div>
            <div className="food-box food-avoid">
              <h5>Avoid</h5>
              {cats[cat].avoid.length ? (
                <ul>{cats[cat].avoid.map((it,i)=>(<li key={i}>{it}</li>))}</ul>
              ) : <div className="small text-muted">—</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ReportRenderer({ diagnosis, onGenerateRecipes, onFindDoctors }) {
  // Check if diagnosis is a JSON recipe array
  if (isValidRecipeArray(diagnosis)) {
    return (
      <div className="report-container" role="region" aria-label="Clinical report">
        <RecipesSection content={diagnosis} />
      </div>
    )
  }
  
  const cleaned = cleanMarkdown(diagnosis)
  return (
    <div className="report-container" role="region" aria-label="Clinical report">
      {cleaned ? renderDiagnosisSections(cleaned) : <div className="kv-value text-muted">No assessment available.</div>}

      <div className="report-actions">
        <button
          type="button"
          className="report-action-btn"
          onClick={() => { if (typeof onGenerateRecipes === 'function') onGenerateRecipes() }}
        >
          Generate recipes
        </button>

        <button
          type="button"
          className="report-action-btn report-action-secondary"
          onClick={() => { if (typeof onFindDoctors === 'function') onFindDoctors() }}
        >
          Help me see nearest Ayurvedic doctors
        </button>
      </div>
    </div>
  )
}
