import React from 'react'
import './RecipesView.css'

const SECTION_LABELS = {
  benefits: 'Benefits',
  ingredients: 'Ingredients',
  preparation: 'Preparation',
  timing: 'Best time to take',
  precautions: 'Precautions'
}

const INLINE_SECTION_PATTERNS = [
  { key: 'title', label: 'Name of the dish/recipe:' },
  { key: 'benefits', label: 'Benefits:' },
  { key: 'ingredients', label: 'Ingredients:' },
  { key: 'preparation', label: 'Preparation steps:' },
  { key: 'timing', label: 'When to consume:' },
  { key: 'precautions', label: 'Precautions:' }
]

function normalizeLine(line) {
  return line
    .replace(/^[#*\-\d.\s]+/, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/\s*\/\s*/g, ' ')
    .replace(/\s+-\s+/g, ', ')
    .replace(/\s*\|\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getSectionKey(line) {
  const lowered = line.toLowerCase()

  if (lowered.startsWith('benefits:') || lowered.startsWith('benefit:')) return 'benefits'
  if (lowered.startsWith('ingredients:') || lowered.startsWith('ingredient:')) return 'ingredients'
  if (lowered.startsWith('preparation steps:') || lowered.startsWith('preparation:') || lowered.startsWith('steps:')) return 'preparation'
  if (lowered.startsWith('when to consume:') || lowered.startsWith('when to take:') || lowered.startsWith('best time to consume:')) return 'timing'
  if (lowered.startsWith('precautions:') || lowered.startsWith('precaution:')) return 'precautions'

  return null
}

function toBulletItems(text) {
  return text
    .split(/[,\n]+/)
    .map(item => normalizeLine(item))
    .filter(Boolean)
}

function toStepItems(text) {
  const normalized = text
    .replace(/\s*\/\s*/g, '. ')
    .replace(/\s+\-\s+/g, '. ')
    .replace(/\s+/g, ' ')
    .replace(/\s+(?=[A-Z])/g, ' ')
    .trim()

  return normalized
    .split(/\.\s+/)
    .map(step => normalizeLine(step.replace(/\.$/, '')))
    .filter(Boolean)
}

function parseInlineSections(block, index) {
  const recipe = {
    title: '',
    intro: [],
    benefits: [],
    ingredients: [],
    preparation: [],
    timing: [],
    precautions: []
  }

  const matches = INLINE_SECTION_PATTERNS
    .map(section => {
      const position = block.indexOf(section.label)
      return position === -1 ? null : { ...section, position }
    })
    .filter(Boolean)
    .sort((a, b) => a.position - b.position)

  if (matches.length === 0) return null

  matches.forEach((match, idx) => {
    const start = match.position + match.label.length
    const end = matches[idx + 1]?.position ?? block.length
    const value = normalizeLine(block.slice(start, end))
    if (!value) return

    if (match.key === 'title') {
      recipe.title = value
      return
    }

    if (match.key === 'ingredients') {
      recipe.ingredients.push(...toBulletItems(value))
      return
    }

    if (match.key === 'preparation') {
      recipe.preparation.push(...toStepItems(value))
      return
    }

    recipe[match.key].push(value)
  })

  return recipe
}

function parseRecipeBlock(block, index) {
  const inlineRecipe = parseInlineSections(block, index)
  if (inlineRecipe) return inlineRecipe

  const lines = block.split('\n').map(line => line.trim()).filter(Boolean)
  const recipe = {
    title: '',
    intro: [],
    benefits: [],
    ingredients: [],
    preparation: [],
    timing: [],
    precautions: []
  }

  let activeSection = 'intro'

  lines.forEach((rawLine, lineIndex) => {
    const sectionKey = getSectionKey(rawLine)

    if (lineIndex === 0 && !sectionKey) {
      recipe.title = normalizeLine(rawLine)
      return
    }

    if (sectionKey) {
      activeSection = sectionKey
      const value = rawLine.split(':').slice(1).join(':').trim()
      if (!value) return

      if (sectionKey === 'ingredients') {
        recipe[sectionKey].push(...toBulletItems(value))
      } else if (sectionKey === 'preparation') {
        recipe[sectionKey].push(...toStepItems(value))
      } else {
        recipe[sectionKey].push(normalizeLine(value))
      }
      return
    }

    const cleanLine = normalizeLine(rawLine)
    if (!cleanLine) return

    if (activeSection === 'ingredients') {
      recipe.ingredients.push(...toBulletItems(cleanLine))
      return
    }

    if (activeSection === 'preparation') {
      recipe.preparation.push(...toStepItems(cleanLine))
      return
    }

    recipe[activeSection].push(cleanLine)
  })

  return recipe
}

function hasRecipeSections(recipe) {
  return Boolean(
    recipe.ingredients.length
    || recipe.preparation.length
    || recipe.timing.length
    || recipe.precautions.length
    || recipe.benefits.length
  )
}

function isIntroOnlyBlock(recipe) {
  return !hasRecipeSections(recipe) && Boolean(recipe.title || recipe.intro.length)
}

function parseRecipes(recipes) {
  const blocks = recipes
    .split(/---RECIPE---/i)
    .map(block => block.trim())
    .filter(Boolean)

  const parsedRecipes = blocks.map(parseRecipeBlock)
  let intro = ''

  if (parsedRecipes.length > 0 && parsedRecipes[0] && isIntroOnlyBlock(parsedRecipes[0])) {
    intro = [parsedRecipes[0].title, ...parsedRecipes[0].intro].filter(Boolean).join(' ')
    parsedRecipes.shift()
  }

  return {
    intro,
    recipes: parsedRecipes
  }
}

function RecipeSection({ title, items, accent = 'leaf', variant = 'bullets' }) {
  if (!items.length) return null

  return (
    <section className={`recipe-section recipe-section-${accent}`}>
      <h3>{title}</h3>
      {variant === 'steps' ? (
        <ol className="recipe-steps">
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>
              <span className="step-label">Step {index + 1}</span>
              <p>{item}</p>
            </li>
          ))}
        </ol>
      ) : (
        <ul>
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function RecipesView({ recipes, embedded = false }) {
  if (!recipes) return null

  const { intro, recipes: parsedRecipes } = parseRecipes(recipes)

  return (
    <div className={`recipes-view${embedded ? ' embedded' : ''}`}>
      {!embedded && (
        <div className="recipes-header-copy standalone">
          <p className="recipes-eyebrow">Personalized plan</p>
          <h1>Ayurvedic Recipes</h1>
          <p className="recipes-subtitle">
            Discover personalized ayurvedic recipes tailored to your unique constitution and health goals.
          </p>
        </div>
      )}

      <div className="recipes-content">
        {intro && (
          <section className="recipes-intro-card">
            <p>{intro}</p>
          </section>
        )}

        {parsedRecipes.map((recipe, idx) => (
          <article key={`${recipe.title}-${idx}`} className="recipe-card">
            <div className="recipe-card-top">
              <span className="recipe-badge">Recipe {idx + 1}</span>
              {recipe.title && (
                <h2 className="recipe-title">{recipe.title}</h2>
              )}
              {recipe.intro.length > 0 && (
                <p className="recipe-intro">{recipe.intro.join(' ')}</p>
              )}
            </div>

            <div className="recipe-sections">
              <RecipeSection title={SECTION_LABELS.benefits} items={recipe.benefits} accent="accent" />
              <RecipeSection title={SECTION_LABELS.ingredients} items={recipe.ingredients} accent="earth" />
              <RecipeSection title={SECTION_LABELS.preparation} items={recipe.preparation} accent="leaf" variant="steps" />
              <RecipeSection title={SECTION_LABELS.timing} items={recipe.timing} accent="accent" />
              <RecipeSection title={SECTION_LABELS.precautions} items={recipe.precautions} accent="earth" />
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
