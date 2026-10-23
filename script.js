const pages = [...document.querySelectorAll(".page")];
const hint = document.getElementById("hint");
const back = document.getElementById("back");
const dots = document.getElementById("dots");
let current = 0;

pages.forEach(() => dots.appendChild(document.createElement("span")));

function show(index) {
  pages[current].classList.remove("active");
  current = Math.max(0, Math.min(index, pages.length - 1));
  const page = pages[current];
  page.classList.add("active");

  [...dots.children].forEach((d, i) => d.classList.toggle("on", i === current));
  back.classList.toggle("show", current > 0);
  hint.classList.toggle("show", !page.hasAttribute("data-locked"));

  const name = page.dataset.page;
  if (name === "ask") resetAsk();
  if (name === "yay") fireworks(4500);
  if (name === "dinner") dinnerConfetti();
  if (name === "end") fireworks(3000, 0.5);
}

// tap anywhere to continue (except on "locked" pages)
document.addEventListener("click", (e) => {
  if (e.target.closest("button")) return;
  if (pages[current].hasAttribute("data-locked")) return;
  show(current + 1);
});

back.addEventListener("click", () => show(current - 1));

/* ---------- the runaway "No" button ---------- */

const yes = document.getElementById("yes");
const no = document.getElementById("no");
const noLines = [
  "No", "nope", "wrong button", "try again", "nice try", "too slow",
  "are you sure??", "the other one", "I'm fast btw", "HAHAHAHAH",
  "not an option", "pls", "ok now you're just playing",
];
let dodges = 0;

function runAway() {
  dodges++;
  no.textContent = noLines[dodges % noLines.length];
  yes.style.setProperty("--grow", Math.min(1 + dodges * 0.08, 1.8));

  const rect = no.getBoundingClientRect();
  if (!no.classList.contains("running")) {
    // pin it where it currently is first, so the first jump animates
    no.style.left = rect.left + "px";
    no.style.top = rect.top + "px";
    no.classList.add("running");
  }

  const pad = 16;
  const maxX = window.innerWidth - rect.width - pad;
  const maxY = window.innerHeight - rect.height - pad;
  let x, y, tries = 0;
  do {
    x = pad + Math.random() * (maxX - pad);
    y = pad + Math.random() * (maxY - pad);
    tries++;
  } while (tries < 50 && (Math.hypot(x - rect.left, y - rect.top) < 150 || coversYes(x, y, rect)));

  requestAnimationFrame(() => {
    no.style.left = x + "px";
    no.style.top = y + "px";
  });
}

// never land on top of the Yes button
function coversYes(x, y, rect) {
  const y0 = yes.getBoundingClientRect();
  const m = 20;
  return x < y0.right + m && x + rect.width > y0.left - m &&
         y < y0.bottom + m && y + rect.height > y0.top - m;
}

// mouse: dodge on hover. phone: dodge the moment a finger touches it.
no.addEventListener("mouseenter", runAway);
no.addEventListener("touchstart", (e) => { e.preventDefault(); runAway(); }, { passive: false });
no.addEventListener("click", (e) => { e.preventDefault(); runAway(); });

// put both buttons back the way they started
function resetAsk() {
  dodges = 0;
  no.textContent = noLines[0];
  no.classList.remove("running");
  no.style.left = "";
  no.style.top = "";
  no.style.display = "";
  yes.style.removeProperty("--grow");
}

yes.addEventListener("click", () => {
  no.style.display = "none";
  show(1);
});

/* ---------- dinner surprise ---------- */

const dinnerReveal = document.getElementById("dinnerReveal");

function dinnerConfetti() {
  const r = dinnerReveal.getBoundingClientRect();
  confetti(r.left + r.width / 2, r.top + r.height / 2);
}

/* ---------- replay ---------- */

document.getElementById("replay").addEventListener("click", () => show(0));

/* ---------- fireworks + confetti ---------- */

const canvas = document.getElementById("fx");
const ctx = canvas.getContext("2d");
const colors = ["#ff6b9a", "#ffd23f", "#4cc9f0", "#7bd389", "#b388ff", "#ff9f43"];
let particles = [];
let rockets = [];
let launchUntil = 0;
let launchRate = 1;
let running = false;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener("resize", resize);
resize();

function burst(x, y, count = 70, speed = 6) {
  const color = colors[(Math.random() * colors.length) | 0];
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count;
    const v = speed * (0.5 + Math.random() * 0.6);
    particles.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 1,
      decay: 0.012 + Math.random() * 0.012,
      color: Math.random() < 0.2 ? colors[(Math.random() * colors.length) | 0] : color,
      size: 2 + Math.random() * 2,
    });
  }
}

function launch() {
  rockets.push({
    x: innerWidth * (0.15 + Math.random() * 0.7),
    y: innerHeight,
    vy: -(9 + Math.random() * 4),
    targetY: innerHeight * (0.12 + Math.random() * 0.35),
  });
}

function fireworks(ms, rate = 1) {
  launchUntil = performance.now() + ms;
  launchRate = rate;
  for (let i = 0; i < 3; i++) setTimeout(launch, i * 200);
  loop();
}

function confetti(x, y) {
  for (let i = 0; i < 120; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 3 + Math.random() * 8;
    particles.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 4,
      life: 1,
      decay: 0.008 + Math.random() * 0.01,
      color: colors[(Math.random() * colors.length) | 0],
      size: 4 + Math.random() * 4,
      square: true,
      spin: Math.random() * Math.PI,
    });
  }
  loop();
}

function loop() {
  if (running) return;
  running = true;
  requestAnimationFrame(tick);
}

function tick(now) {
  ctx.clearRect(0, 0, innerWidth, innerHeight);

  if (now < launchUntil && Math.random() < 0.06 * launchRate) launch();

  rockets = rockets.filter((r) => {
    r.y += r.vy;
    r.vy *= 0.985;
    ctx.fillStyle = "#2b2340";
    ctx.beginPath();
    ctx.arc(r.x, r.y, 3, 0, Math.PI * 2);
    ctx.fill();
    if (r.y <= r.targetY || r.vy > -2) {
      burst(r.x, r.y);
      return false;
    }
    return true;
  });

  particles = particles.filter((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.97;
    p.vy = p.vy * 0.97 + 0.12;
    p.life -= p.decay;
    if (p.life <= 0) return false;
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    if (p.square) {
      p.spin += 0.2;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    return true;
  });

  if (particles.length || rockets.length || now < launchUntil) {
    requestAnimationFrame(tick);
  } else {
    running = false;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
  }
}

show(0);
