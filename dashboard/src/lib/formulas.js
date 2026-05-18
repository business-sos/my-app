// Pure structured-formula evaluator. No eval() / Function() — only the explicit
// ops below are honoured; unknown shapes return null.
//
// Formula schema:
//   { op: 'divide',   a: <expr>, b: <expr>, multiply?: number }
//   { op: 'add',      terms: [<expr>, ...] }
//   { op: 'subtract', a: <expr>, b: <expr> }
//   { op: 'multiply', a: <expr>, b: <expr> }
//   { op: 'literal',  value: number }
//
// <expr> = a sub-formula (same shape) | { slug: string } | a number literal.
//
// getValue(slug) is provided by the caller. It returns a number (current
// period's measurement) or null/undefined when missing.

/**
 * @param {*} expr
 * @param {(slug: string) => number | null | undefined} getValue
 * @returns {number | null}
 */
export function evalFormula(expr, getValue) {
  if (expr == null) return null;
  if (typeof expr === 'number') return Number.isFinite(expr) ? expr : null;
  if (typeof expr !== 'object') return null;

  // Slug reference: { slug: 'revenue' }
  if (expr.slug && typeof expr.slug === 'string') {
    const v = getValue(expr.slug);
    return v == null || !Number.isFinite(Number(v)) ? null : Number(v);
  }

  const op = expr.op;
  if (op === 'literal') {
    return Number.isFinite(expr.value) ? expr.value : null;
  }
  if (op === 'add') {
    if (!Array.isArray(expr.terms)) return null;
    let sum = 0;
    for (const t of expr.terms) {
      const v = evalFormula(t, getValue);
      if (v == null) return null;
      sum += v;
    }
    return sum;
  }
  if (op === 'subtract') {
    const a = evalFormula(expr.a, getValue);
    const b = evalFormula(expr.b, getValue);
    if (a == null || b == null) return null;
    return a - b;
  }
  if (op === 'multiply') {
    const a = evalFormula(expr.a, getValue);
    const b = evalFormula(expr.b, getValue);
    if (a == null || b == null) return null;
    return a * b;
  }
  if (op === 'divide') {
    const a = evalFormula(expr.a, getValue);
    const b = evalFormula(expr.b, getValue);
    if (a == null || b == null || b === 0) return null;
    let v = a / b;
    if (Number.isFinite(expr.multiply)) v *= expr.multiply;
    return v;
  }
  return null;
}

/**
 * Walk a formula and return the set of input slugs it references.
 * @param {*} expr
 * @returns {Set<string>}
 */
export function inputSlugs(expr) {
  const out = new Set();
  function walk(e) {
    if (!e || typeof e !== 'object') return;
    if (e.slug && typeof e.slug === 'string') {
      out.add(e.slug);
      return;
    }
    if (Array.isArray(e.terms)) e.terms.forEach(walk);
    if (e.a) walk(e.a);
    if (e.b) walk(e.b);
  }
  walk(expr);
  return out;
}

/**
 * Build a dependency graph and return derivation order (topological sort).
 * Inputs are indicators with a formula; output is an array of slugs in the
 * order they should be computed. Throws on cycles.
 *
 * @param {Array<{ slug: string, formula?: object | null }>} indicators
 * @returns {string[]}
 */
export function derivationOrder(indicators) {
  const bySlug = new Map(indicators.filter(i => i.slug).map(i => [i.slug, i]));
  const visited = new Set();
  const inStack = new Set();
  const order = [];

  function visit(slug) {
    if (visited.has(slug)) return;
    if (inStack.has(slug)) throw new Error(`Cycle detected at ${slug}`);
    const ind = bySlug.get(slug);
    if (!ind || !ind.formula) {
      // base input — not derived
      visited.add(slug);
      return;
    }
    inStack.add(slug);
    for (const dep of inputSlugs(ind.formula)) {
      if (bySlug.has(dep)) visit(dep);
    }
    inStack.delete(slug);
    visited.add(slug);
    order.push(slug);
  }

  for (const ind of indicators) {
    if (ind.slug && ind.formula) visit(ind.slug);
  }
  return order;
}
