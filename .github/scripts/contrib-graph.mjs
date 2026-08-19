// Generates assets/contrib-graph.svg from the GitHub GraphQL contribution calendar.
import { writeFileSync } from "node:fs";

const token = process.env.GITHUB_TOKEN;
const login = "sur-ser";

const query = `query {
  user(login: "${login}") {
    contributionsCollection {
      contributionCalendar { weeks { contributionDays { date contributionCount } } }
    }
  }
}`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { authorization: `bearer ${token}`, "content-type": "application/json" },
  body: JSON.stringify({ query }),
});
const json = await res.json();
if (!json.data?.user) {
  console.error(JSON.stringify(json));
  process.exit(1);
}

const days = json.data.user.contributionsCollection.contributionCalendar.weeks
  .flatMap((w) => w.contributionDays)
  .slice(-30);

const W = 960, H = 280;
const m = { l: 52, r: 24, t: 34, b: 42 };
const iw = W - m.l - m.r, ih = H - m.t - m.b;
const max = Math.max(...days.map((d) => d.contributionCount), 1);
const x = (i) => m.l + (iw * i) / (days.length - 1);
const y = (v) => m.t + ih * (1 - v / max);

const pts = days.map((d, i) => `${x(i).toFixed(1)},${y(d.contributionCount).toFixed(1)}`);
const line = `M ${pts.join(" L ")}`;
const area = `${line} L ${x(days.length - 1).toFixed(1)},${(m.t + ih).toFixed(1)} L ${m.l},${(m.t + ih).toFixed(1)} Z`;

const ticks = [0.25, 0.5, 0.75, 1].map((k) => {
  const v = Math.round(max * k);
  const yy = y(v).toFixed(1);
  return `<line x1="${m.l}" y1="${yy}" x2="${W - m.r}" y2="${yy}" stroke="#21262d" stroke-width="1"/>
  <text x="${m.l - 10}" y="${yy}" text-anchor="end" dominant-baseline="middle" class="lbl">${v}</text>`;
}).join("\n");

const dates = days.map((d, i) => {
  if (i % 5 !== 0 && i !== days.length - 1) return "";
  const [, mm, dd] = d.date.split("-");
  return `<text x="${x(i).toFixed(1)}" y="${H - 14}" text-anchor="middle" class="lbl">${dd}.${mm}</text>`;
}).join("\n");

const dots = days.map((d, i) =>
  `<circle cx="${x(i).toFixed(1)}" cy="${y(d.contributionCount).toFixed(1)}" r="2.6" fill="#7ee787" opacity="0">
    <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="${(0.5 + i * 0.05).toFixed(2)}s" fill="freeze"/>
  </circle>`
).join("\n");

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .lbl { font-family: 'SF Mono','Fira Code',Menlo,Consolas,monospace; font-size: 11px; fill: #8b949e; }
    .title { font-family: 'SF Mono','Fira Code',Menlo,Consolas,monospace; font-size: 14px; fill: #7ee787; }
  </style>
  <text x="${m.l}" y="20" class="title">$ git log --author=${login} --since="30 days ago"</text>
  ${ticks}
  <path d="${area}" fill="#26a641" fill-opacity="0.14"/>
  <path d="${line}" fill="none" stroke="#39d353" stroke-width="2" stroke-linejoin="round" stroke-dasharray="4000" stroke-dashoffset="4000">
    <animate attributeName="stroke-dashoffset" from="4000" to="0" dur="2.5s" fill="freeze"/>
  </path>
  ${dots}
  ${dates}
</svg>
`;

writeFileSync("assets/contrib-graph.svg", svg);
console.log(`ok: ${days.length} days, max=${max}`);
