import React from "react"
import "./RecipesView.css"

export default function RecipesView({ recipes, onBack }) {
  if (!recipes) return null;

  return (
    <div className="recipes-page">
      <header className="recipes-header">
        <button className="back-btn" onClick={onBack}>← Back to Chat</button>
        <h1>Ayurvedic Personalized Recipes</h1>
      </header>
      
      <div className="recipes-content">
        {recipes.split(/---RECIPE---|\n\n/).filter(r => r.trim()).map((recipe, idx) => (
          <div key={idx} className="recipe-card">
            <div className="recipe-body">
              {recipe.split("\n").map((line, lidx) => (
                 line.trim() && (
                  <p key={lidx} className={line.startsWith("#") ? "recipe-title" : "recipe-text"}>
                    {line.replace(/#+\s*/, "")}
                  </p>
                 )
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
