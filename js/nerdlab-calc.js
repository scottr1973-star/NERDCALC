// =========================
// Global state
// =========================
let expression = "";
let display = "0";
let ans = 0;
let memory = 0;
let angleMode = "RAD"; // RAD or DEG
let baseMode = "DEC";  // future: HEX/BIN

// DOM refs (assigned after DOMContentLoaded)
let exprEl, mainEl, statusEl, memEl, ansEl, anglePillEl, basePillEl;

function safeParseFloat(val) {
  const n = parseFloat(val);
  if (Number.isNaN(n)) return 0;
  return n;
}

function updateDisplay() {
  if (!exprEl || !mainEl || !memEl || !ansEl || !anglePillEl || !basePillEl) return;
  exprEl.textContent = expression;
  mainEl.textContent = display;
  memEl.textContent = memory.toString();
  ansEl.textContent = ans.toString();
  anglePillEl.textContent = "Angle: " + angleMode;
  basePillEl.textContent = baseMode;
}

function setStatus(msg) {
  if (!statusEl) return;
  statusEl.textContent = msg;
}

function clearAll() {
  expression = "";
  display = "0";
  setStatus("Cleared.");
  updateDisplay();
}

function backspace() {
  if (!expression) return;
  expression = expression.slice(0, -1);
  display = expression || "0";
  updateDisplay();
}

function pushKey(key) {
  expression += key;
  display = expression;
  updateDisplay();
}

function pushOp(op) {
  if (op === "×") expression += "*";
  else if (op === "÷") expression += "/";
  else expression += op;
  display = expression;
  updateDisplay();
}

function pushFunc(name) {
  if (name === "pi") {
    expression += "pi";
  } else if (name === "e") {
    expression += "e";
  } else if (name === "rand") {
    expression += "random()";
  } else if (name === "sqrt") {
    expression += "sqrt(";
  } else if (name === "square") {
    expression += "(" + (expression || "ans") + ")^2";
  } else if (name === "inv") {
    expression = "1/(" + (expression || "ans") + ")";
  } else if (name === "sin" || name === "cos" || name === "tan") {
    const base = (angleMode === "DEG") ? name + "d" : name;
    expression += base + "(";
  } else if (name === "ln") {
    expression += "log(";
  } else if (name === "log10") {
    expression += "log10(";
  } else if (name === "abs") {
    expression += "abs(";
  } else if (name === "sign") {
    if (expression) expression = "-(" + expression + ")";
    else expression = "-(" + ans + ")";
  } else if (name === "factorial") {
    expression = "(" + (expression || "ans") + ")!";
  } else if (name === "ans") {
    expression += "ans";
  }
  display = expression;
  updateDisplay();
}

function toggleAngle(mode) {
  angleMode = mode;
  setStatus("Angle mode: " + mode);
  updateDisplay();
}

function memoryOp(op) {
  if (op === "mc") {
    memory = 0;
  } else if (op === "mr") {
    expression += memory.toString();
  } else if (op === "mplus") {
    memory += safeParseFloat(display);
  } else if (op === "mminus") {
    memory -= safeParseFloat(display);
  }
  updateDisplay();
}

// math.js config + sind/cosd/tand
if (typeof math !== "undefined") {
  math.config({ number: 'number', precision: 16 });
  math.import({
    sind: x => math.sin(x * math.pi / 180),
    cosd: x => math.cos(x * math.pi / 180),
    tand: x => math.tan(x * math.pi / 180),
  }, { override: true });
}

// =========================
// DOM wiring
// =========================
document.addEventListener('DOMContentLoaded', () => {
  // Cache DOM elements
  exprEl = document.getElementById('expression-display');
  mainEl = document.getElementById('main-display');
  statusEl = document.getElementById('status-line');
  memEl = document.getElementById('memory-indicator');
  ansEl = document.getElementById('ans-indicator');
  anglePillEl = document.getElementById('angle-mode-pill');
  basePillEl = document.getElementById('base-mode-pill');

  updateDisplay();
  setStatus("Ready.");

  // Keypads
  document.querySelectorAll('[data-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.getAttribute('data-key');
      if (k === 'mode-deg') toggleAngle('DEG');
      else if (k === 'mode-rad') toggleAngle('RAD');
      else if (k === 'mode-clear') clearAll();
      else if (k === 'mode-del') backspace();
      else pushKey(k);
    });
  });

  document.querySelectorAll('[data-op]').forEach(btn => {
    btn.addEventListener('click', () => pushOp(btn.getAttribute('data-op')));
  });

  document.querySelectorAll('[data-func]').forEach(btn => {
    btn.addEventListener('click', () => pushFunc(btn.getAttribute('data-func')));
  });

  document.querySelectorAll('[data-mem]').forEach(btn => {
    btn.addEventListener('click', () => memoryOp(btn.getAttribute('data-mem')));
  });

  const evalBtn = document.querySelector('[data-eval="="]');
  if (evalBtn) {
    evalBtn.addEventListener('click', evaluateExpression);
  }

  // === Keyboard handling ===
  document.addEventListener('keydown', (e) => {
    const tag = e.target.tagName.toLowerCase();
    const isEditable =
      tag === 'input' ||
      tag === 'textarea' ||
      e.target.isContentEditable;

    // If typing in an input/textarea, let normal behavior happen,
    // except: Shift+Enter in console should run the console.
    if (isEditable) {
      if (e.target.id === 'consoleInput' && e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        runConsole();
      }
      return;
    }

    // Outside of editable fields → route keys to main calculator
    const key = e.key;
    if ((key >= '0' && key <= '9') || key === '.' || key === '(' || key === ')') {
      pushKey(key);
    } else if (key === '+' || key === '-' || key === '*' || key === '/') {
      pushKey(key);
    } else if (key === 'Enter') {
      e.preventDefault();
      evaluateExpression();
    } else if (key === 'Backspace') {
      e.preventDefault();
      backspace();
    } else if (key === 'Escape') {
      clearAll();
    }
  });

  // Tabs
  document.querySelectorAll('[data-tab-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab-target');
      document.querySelectorAll('[data-tab-target]').forEach(b => {
        b.classList.remove('tab-pill-active', 'tab-pill-inactive');
        b.classList.add('tab-pill-inactive');
      });
      btn.classList.remove('tab-pill-inactive');
      btn.classList.add('tab-pill-active');

      document.querySelectorAll('[id^="tab-"]').forEach(panel => {
        panel.classList.add('hidden');
      });
      const panel = document.getElementById('tab-' + target);
      if (panel) panel.classList.remove('hidden');
    });
  });
});

// =========================
// Core evaluation
// =========================
function evaluateExpression() {
  if (!expression.trim()) {
    setStatus("Nothing to evaluate.");
    return;
  }
  try {
    const scope = { ans, memory, mem: memory, pi: Math.PI, e: Math.E };
    const result = math.evaluate(expression, scope);
    if (typeof result === "number") {
      ans = result;
      display = (Math.abs(result) < 1e-9 ? "0" : result.toString());
    } else {
      display = result.toString();
    }
    setStatus("OK.");
    updateDisplay();
  } catch (err) {
    setStatus("Error: " + err.message);
  }
}

// =========================
// Console
// =========================
function formatConsoleResult(val) {
  try {
    if (typeof val === 'number') {
      if (!isFinite(val)) return val.toString();
      if (Math.abs(val) < 1e-4 || Math.abs(val) >= 1e6) {
        return val.toExponential(8);
      }
      return parseFloat(val.toPrecision(12)).toString();
    }
    if (typeof math !== 'undefined' && math.typeOf) {
      const t = math.typeOf(val);
      if (['Complex','Fraction','BigNumber','Matrix'].includes(t)) {
        return val.toString();
      }
    }
    if (Array.isArray(val)) return JSON.stringify(val, null, 2);
    return String(val);
  } catch (e) {
    return String(val);
  }
}

function runConsole() {
  const inputEl = document.getElementById('consoleInput');
  const outEl = document.getElementById('consoleOutput');
  if (!inputEl || !outEl) return;

  const text = inputEl.value;
  if (!text.trim()) {
    outEl.textContent = 'No input.';
    return;
  }

  const scope = { ans: safeParseFloat(display), mem: memory, memory };
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const results = [];
  try {
    for (const line of lines) {
      const expr = line.trim();
      const value = math.evaluate(expr, scope);
      results.push('> ' + expr + '\n' + formatConsoleResult(value));
    }
    outEl.textContent = results.join('\n\n');
  } catch (err) {
    outEl.textContent = 'Error: ' + err.message;
  }
}

function clearConsole() {
  const inputEl = document.getElementById('consoleInput');
  const outEl = document.getElementById('consoleOutput');
  if (inputEl) inputEl.value = '';
  if (outEl) outEl.textContent = 'Enter an expression and hit Run.';
}

function loadExprIntoConsole() {
  const inputEl = document.getElementById('consoleInput');
  if (inputEl) {
    const expr = expression || display || "0";
    inputEl.value = expr;
  }
}

// =========================
// Graphing
// =========================
let graphChart = null;

function buildGraphPoints(expr, xmin, xmax, steps) {
  const xs = [];
  const ys = [];
  const step = (xmax - xmin) / steps;
  for (let i = 0; i <= steps; i++) {
    const x = xmin + i * step;
    let y;
    try {
      y = math.evaluate(expr, { x, ans, mem: memory, memory });
    } catch (e) {
      y = NaN;
    }
    xs.push(x);
    ys.push(typeof y === 'number' && isFinite(y) ? y : NaN);
  }
  return { xs, ys };
}

function plotGraph() {
  const exprInput = document.getElementById('graphExpr');
  const xminEl = document.getElementById('graphXMin');
  const xmaxEl = document.getElementById('graphXMax');
  if (!exprInput || !xminEl || !xmaxEl) return;

  const exprVal = exprInput.value.trim();
  if (!exprVal) {
    setStatus('No graph expression.');
    return;
  }

  const xmin = parseFloat(xminEl.value);
  const xmax = parseFloat(xmaxEl.value);
  if (!isFinite(xmin) || !isFinite(xmax) || xmin >= xmax) {
    setStatus('Invalid x range.');
    return;
  }

  const { xs, ys } = buildGraphPoints(exprVal, xmin, xmax, 400);
  const canvas = document.getElementById('graphCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (graphChart) graphChart.destroy();

  graphChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: xs,
      datasets: [{
        label: 'f(x) = ' + exprVal,
        data: ys,
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: '#9ca3af' },
          grid: { color: 'rgba(55,65,81,0.4)' }
        },
        y: {
          ticks: { color: '#9ca3af' },
          grid: { color: 'rgba(55,65,81,0.4)' }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#e5e7eb' }
        }
      }
    }
  });

  setStatus('Plotted f(x).');
}

function resetGraph() {
  const exprInput = document.getElementById('graphExpr');
  const xminEl = document.getElementById('graphXMin');
  const xmaxEl = document.getElementById('graphXMax');
  if (exprInput) exprInput.value = '';
  if (xminEl) xminEl.value = '-10';
  if (xmaxEl) xmaxEl.value = '10';
  if (graphChart) {
    graphChart.destroy();
    graphChart = null;
  }
  setStatus('Graph reset.');
}

function loadExprIntoGraph() {
  const exprInput = document.getElementById('graphExpr');
  if (exprInput) {
    const exprVal = expression || display || "0";
    exprInput.value = exprVal;
  }
}

// =========================
// Matrix Lab
// =========================
function parseMatrix(text) {
  const rows = text.split('\n').map(r => r.trim()).filter(r => r.length > 0);
  if (!rows.length) return null;
  const matrix = rows.map(row =>
    row.split(/[, \t]+/).map(x => parseFloat(x)).filter(v => !Number.isNaN(v))
  );
  return math.matrix(matrix);
}

function formatMatrix(m) {
  try {
    if (math.typeOf(m) === 'Matrix') return m.toString();
    return String(m);
  } catch (e) {
    return String(m);
  }
}

function matrixDet() {
  const aText = document.getElementById('matrixA').value;
  const out = document.getElementById('matrixOutput');
  try {
    const A = parseMatrix(aText);
    if (!A) {
      out.textContent = 'No matrix A.';
      return;
    }
    const d = math.det(A);
    out.textContent = 'det(A) = ' + d.toString();
  } catch (e) {
    out.textContent = 'Error: ' + e.message;
  }
}

function matrixInv() {
  const aText = document.getElementById('matrixA').value;
  const out = document.getElementById('matrixOutput');
  try {
    const A = parseMatrix(aText);
    if (!A) {
      out.textContent = 'No matrix A.';
      return;
    }
    const inv = math.inv(A);
    out.textContent = 'inv(A) =\n' + formatMatrix(inv);
  } catch (e) {
    out.textContent = 'Error: ' + e.message;
  }
}

function matrixMul() {
  const aText = document.getElementById('matrixA').value;
  const bText = document.getElementById('matrixB').value;
  const out = document.getElementById('matrixOutput');
  try {
    const A = parseMatrix(aText);
    const B = parseMatrix(bText);
    if (!A || !B) {
      out.textContent = 'Need both A and B.';
      return;
    }
    const C = math.multiply(A, B);
    out.textContent = 'A × B =\n' + formatMatrix(C);
  } catch (e) {
    out.textContent = 'Error: ' + e.message;
  }
}

// =========================
// Stats
// =========================
function parseDataSeries(text) {
  const tokens = text.split(/[,\s]+/).map(x => x.trim()).filter(x => x.length > 0);
  const values = tokens.map(t => parseFloat(t)).filter(v => !Number.isNaN(v));
  return values;
}

function computeStats() {
  const dataText = document.getElementById('statsData').value;
  const out = document.getElementById('statsOutput');
  const vals = parseDataSeries(dataText);
  if (!vals.length) {
    out.textContent = 'No data.';
    return;
  }
  try {
    const n = vals.length;
    const mean = math.mean(vals);
    const min = math.min(vals);
    const max = math.max(vals);
    const variance = math.variance(vals);
    const std = math.std(vals);
    const median = math.median(vals);
    const sum = math.sum(vals);
    out.textContent =
      'n       = ' + n + '\n' +
      'sum     = ' + sum + '\n' +
      'mean    = ' + mean + '\n' +
      'median  = ' + median + '\n' +
      'min     = ' + min + '\n' +
      'max     = ' + max + '\n' +
      'variance= ' + variance + '\n' +
      'std dev = ' + std;
  } catch (e) {
    out.textContent = 'Error: ' + e.message;
  }
}

function clearStats() {
  const dataEl = document.getElementById('statsData');
  const out = document.getElementById('statsOutput');
  if (dataEl) dataEl.value = '';
  if (out) out.textContent = 'Paste data and hit "Compute stats".';
}

// =========================
// Data Viz
// =========================
let dataChart = null;

function parseLabelValueData(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const labels = [];
  const values = [];
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 2) continue;
    const label = parts[0].trim();
    const value = parseFloat(parts.slice(1).join(',').trim());
    if (!label || Number.isNaN(value)) continue;
    labels.push(label);
    values.push(value);
  }
  return { labels, values };
}

function plotDataChart() {
  const inputEl = document.getElementById('dataInput');
  const typeEl = document.getElementById('dataChartType');
  if (!inputEl || !typeEl) return;

  const { labels, values } = parseLabelValueData(inputEl.value);
  if (!labels.length) {
    setStatus('No valid label/value data for Data Viz.');
    return;
  }

  const chartType = typeEl.value || 'bar';
  const canvas = document.getElementById('dataCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (dataChart) dataChart.destroy();

  const config = {
    type: chartType,
    data: {
      labels,
      datasets: [{
        label: 'Data',
        data: values,
        borderWidth: 1.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#e5e7eb' } }
      }
    }
  };

  if (chartType === 'bar' || chartType === 'line') {
    config.options.scales = {
      x: {
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(55,65,81,0.4)' }
      },
      y: {
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(55,65,81,0.4)' }
      }
    };
  }

  dataChart = new Chart(ctx, config);
  setStatus('Rendered data chart (' + chartType + ').');
}

function clearDataChart() {
  const inputEl = document.getElementById('dataInput');
  if (inputEl) inputEl.value = '';
  if (dataChart) {
    dataChart.destroy();
    dataChart = null;
  }
  setStatus('Cleared data chart.');
}

// =========================
// Solve tools
// =========================
function loadExprIntoDeriv() {
  const el = document.getElementById('solveDerivExpr');
  if (el) el.value = expression || display || "0";
}
function loadExprIntoIntegral() {
  const el = document.getElementById('solveIntExpr');
  if (el) el.value = expression || display || "0";
}
function loadExprIntoRoot() {
  const el = document.getElementById('solveRootExpr');
  if (el) el.value = expression || display || "0";
}

function solveDerivative() {
  const exprEl = document.getElementById('solveDerivExpr');
  const x0El = document.getElementById('solveDerivX0');
  const outEl = document.getElementById('solveDerivOutput');
  if (!exprEl || !x0El || !outEl) return;

  const expr = exprEl.value.trim();
  if (!expr) {
    outEl.textContent = 'No expression.';
    return;
  }
  const x0 = parseFloat(x0El.value);
  if (!isFinite(x0)) {
    outEl.textContent = 'Invalid x₀.';
    return;
  }

  const h = 1e-5;
  try {
    const scope1 = { x: x0 + h, ans, mem: memory, memory };
    const scope2 = { x: x0 - h, ans, mem: memory, memory };
    const f1 = math.evaluate(expr, scope1);
    const f2 = math.evaluate(expr, scope2);
    const d = (f1 - f2) / (2 * h);

    outEl.textContent =
      'f(x) = ' + expr + '\n' +
      'x₀   = ' + x0 + '\n' +
      "h    = " + h + '\n\n' +
      'f(x₀ + h) ≈ ' + f1 + '\n' +
      'f(x₀ - h) ≈ ' + f2 + '\n\n' +
      "f'(x₀) ≈ " + d;
  } catch (e) {
    outEl.textContent = 'Error: ' + e.message;
  }
}

function solveIntegral() {
  const exprEl = document.getElementById('solveIntExpr');
  const aEl = document.getElementById('solveIntA');
  const bEl = document.getElementById('solveIntB');
  const outEl = document.getElementById('solveIntOutput');
  if (!exprEl || !aEl || !bEl || !outEl) return;

  const expr = exprEl.value.trim();
  if (!expr) {
    outEl.textContent = 'No expression.';
    return;
  }
  const a = parseFloat(aEl.value);
  const b = parseFloat(bEl.value);
  if (!isFinite(a) || !isFinite(b) || a === b) {
    outEl.textContent = 'Invalid interval [a, b].';
    return;
  }

  const n = 400; // even
  const h = (b - a) / n;
  let sum = 0;
  try {
    for (let i = 0; i <= n; i++) {
      const x = a + i * h;
      const scope = { x, ans, mem: memory, memory };
      const fx = math.evaluate(expr, scope);
      const coeff = (i === 0 || i === n) ? 1 : (i % 2 === 0 ? 2 : 4);
      sum += coeff * fx;
    }
    const integral = (h / 3) * sum;
    outEl.textContent =
      'Integral of f(x) = ' + expr + '\n' +
      'over [' + a + ', ' + b + '] (Simpson, n=' + n + '):\n\n' +
      '≈ ' + integral;
  } catch (e) {
    outEl.textContent = 'Error: ' + e.message;
  }
}

function solveRoot() {
  const exprEl = document.getElementById('solveRootExpr');
  const guessEl = document.getElementById('solveRootGuess');
  const outEl = document.getElementById('solveRootOutput');
  if (!exprEl || !guessEl || !outEl) return;

  const expr = exprEl.value.trim();
  if (!expr) {
    outEl.textContent = 'No expression.';
    return;
  }
  let x = parseFloat(guessEl.value);
  if (!isFinite(x)) {
    outEl.textContent = 'Invalid initial guess.';
    return;
  }

  const maxIter = 30;
  const tol = 1e-8;
  const h = 1e-5;
  const lines = [];
  lines.push('f(x) = ' + expr);
  lines.push('x₀   = ' + x);
  lines.push('max iterations = ' + maxIter);
  lines.push('tolerance      = ' + tol);
  lines.push('');

  try {
    for (let i = 0; i < maxIter; i++) {
      const scope = { x, ans, mem: memory, memory };
      const fx = math.evaluate(expr, scope);

      const scope1 = { x: x + h, ans, mem: memory, memory };
      const scope2 = { x: x - h, ans, mem: memory, memory };
      const f1 = math.evaluate(expr, scope1);
      const f2 = math.evaluate(expr, scope2);
      const dfdx = (f1 - f2) / (2 * h);

      lines.push(
        'Iter ' + i +
        ': x = ' + x +
        ', f(x) = ' + fx +
        ', f\'(x) ≈ ' + dfdx
      );

      if (Math.abs(fx) < tol) {
        lines.push('');
        lines.push('Converged: |f(x)| < tol');
        lines.push('Root ≈ ' + x);
        outEl.textContent = lines.join('\n');
        return;
      }
      if (!isFinite(dfdx) || Math.abs(dfdx) < 1e-12) {
        lines.push('');
        lines.push('Derivative too small or invalid, aborting.');
        outEl.textContent = lines.join('\n');
        return;
      }

      const xNext = x - fx / dfdx;
      if (!isFinite(xNext)) {
        lines.push('');
        lines.push('Next x not finite, aborting.');
        outEl.textContent = lines.join('\n');
        return;
      }

      if (Math.abs(xNext - x) < tol) {
        x = xNext;
        lines.push('');
        lines.push('Step below tol, treating as converged.');
        lines.push('Root ≈ ' + x);
        outEl.textContent = lines.join('\n');
        return;
      }

      x = xNext;
    }

    lines.push('');
    lines.push('Max iterations reached. Last x ≈ ' + x);
    outEl.textContent = lines.join('\n');
  } catch (e) {
    outEl.textContent = 'Error during iteration: ' + e.message;
  }
}
