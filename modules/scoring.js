// modules/scoring.js
// Flexible scoring engine supporting raw time, handicap, and pacesetter-percent (NASTAR-style)

class ScoringEngine {
  constructor(config = {}) {
    this.formula = config.formula || { type: 'raw_time' };
    this.categories = config.categories || [];
  }

  setFormula(formulaConfig) {
    this.formula = { ...formulaConfig };
  }

  setCategories(categories) {
    this.categories = categories;
  }

  // Returns true when a higher score is better (e.g. pacesetter %)
  isHigherBetter() {
    return this.formula.type === 'pacesetter_percent';
  }

  // Compute numeric score for one run. Returns null for non-scorable runs.
  scoreRun(run) {
    if (run.status !== 'completed') return null;
    const base = run.adjustedTime ?? run.totalTime;
    if (base == null) return null;

    switch (this.formula.type) {
      case 'raw_time':
        return base;

      case 'handicap': {
        const field = this.formula.handicapField ?? 'handicap';
        const h = parseFloat(run.metadata?.[field] ?? 0) || 0;
        return parseFloat(Math.max(0, base - h).toFixed(3));
      }

      case 'pacesetter_percent': {
        const pt = parseFloat(this.formula.pacesetterTime);
        if (!pt || pt <= 0) return null;
        return parseFloat(((pt / base) * 100).toFixed(2));
      }

      default:
        return base;
    }
  }

  // Match a run to one of the configured categories
  getCategoryForRun(run) {
    if (!this.categories.length) return null;
    const gender = run.metadata?.gender;
    const age = run.metadata?.age != null ? parseInt(run.metadata.age) : null;
    const discipline = run.metadata?.discipline;

    for (const cat of this.categories) {
      if (cat.gender && gender && cat.gender !== gender) continue;
      if (cat.ageMin != null && age != null && age < cat.ageMin) continue;
      if (cat.ageMax != null && age != null && age > cat.ageMax) continue;
      if (cat.discipline && discipline && cat.discipline !== discipline) continue;
      return cat;
    }
    return null;
  }

  // Returns ranked, scored runs. Pass categoryId to filter to one category.
  getLeaderboard(runs, categoryId = null) {
    let pool = runs.filter(r => r.status === 'completed');

    if (categoryId) {
      pool = pool.filter(r => {
        const cat = this.getCategoryForRun(r);
        return cat?.id === categoryId;
      });
    }

    const scored = pool
      .map(r => ({ ...r, score: this.scoreRun(r) }))
      .filter(r => r.score != null);

    const higherBetter = this.isHigherBetter();
    scored.sort((a, b) => higherBetter ? b.score - a.score : a.score - b.score);

    const leaderScore = scored[0]?.score ?? null;
    return scored.map((run, i) => ({
      ...run,
      rank: i + 1,
      gap: i === 0 || leaderScore == null
        ? 0
        : parseFloat(Math.abs(run.score - leaderScore).toFixed(higherBetter ? 2 : 3))
    }));
  }

  // Returns { overall, [catId]: [...], ... }
  getCategoryLeaderboards(runs) {
    const result = { overall: this.getLeaderboard(runs) };
    for (const cat of this.categories) {
      result[cat.id] = this.getLeaderboard(runs, cat.id);
    }
    return result;
  }

  // Human-readable score string
  formatScore(score) {
    if (score == null) return '—';
    if (this.formula.type === 'pacesetter_percent') {
      return score.toFixed(2) + '%';
    }
    const s = parseFloat(score);
    const mins = Math.floor(s / 60);
    const secs = (s % 60).toFixed(3).padStart(6, '0');
    return mins > 0 ? `${mins}:${secs}` : secs;
  }

  // Built-in category presets for alpine racing
  static defaultCategories() {
    return [
      { id: 'open',     name: 'Open',          gender: null, ageMin: null, ageMax: null },
      { id: 'men',      name: 'Men',            gender: 'M',  ageMin: null, ageMax: null },
      { id: 'women',    name: 'Women',          gender: 'F',  ageMin: null, ageMax: null },
      { id: 'jr_m',     name: 'Junior Men',     gender: 'M',  ageMin: 0,    ageMax: 17   },
      { id: 'jr_f',     name: 'Junior Women',   gender: 'F',  ageMin: 0,    ageMax: 17   },
      { id: 'adult_m',  name: 'Adult Men',      gender: 'M',  ageMin: 18,   ageMax: 54   },
      { id: 'adult_f',  name: 'Adult Women',    gender: 'F',  ageMin: 18,   ageMax: 54   },
      { id: 'senior_m', name: 'Senior Men',     gender: 'M',  ageMin: 55,   ageMax: null },
      { id: 'senior_f', name: 'Senior Women',   gender: 'F',  ageMin: 55,   ageMax: null },
    ];
  }
}

module.exports = ScoringEngine;
