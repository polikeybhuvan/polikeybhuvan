import { mkdir, writeFile } from "node:fs/promises";

const username = "polikeybhuvan";
const api = "https://api.github.com";
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "polikeybhuvan-profile-readme",
  "X-GitHub-Api-Version": "2022-11-28",
};

async function getJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`GitHub API ${response.status} for ${url}`);
  return response.json();
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[character]);
}

const [profile, repositories] = await Promise.all([
  getJson(`${api}/users/${username}`),
  getJson(`${api}/users/${username}/repos?type=owner&per_page=100&sort=updated`),
]);

const ownRepositories = repositories.filter((repo) => !repo.fork);
const languageTotals = new Map();
await Promise.all(ownRepositories.map(async (repo) => {
  const languages = await getJson(`${api}/repos/${username}/${repo.name}/languages`);
  for (const [language, bytes] of Object.entries(languages)) {
    languageTotals.set(language, (languageTotals.get(language) ?? 0) + bytes);
  }
}));

const totalBytes = [...languageTotals.values()].reduce((sum, bytes) => sum + bytes, 0) || 1;
const sortedLanguages = [...languageTotals.entries()].sort((a, b) => b[1] - a[1]);
const chartLanguages = sortedLanguages.slice(0, 4);
const otherBytes = sortedLanguages.slice(4).reduce((sum, [, bytes]) => sum + bytes, 0);
if (otherBytes > 0) chartLanguages.push(["Other", otherBytes]);

const metrics = [
  ["PUBLIC REPOS", profile.public_repos],
  ["STARS EARNED", repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0)],
  ["LANGUAGES", languageTotals.size],
  ["CLOUD SKILL BADGES", "120+"],
];

const metricTiles = metrics.map(([label, value], index) => {
  const x = 28 + index * 127;
  return `<g>
    <rect x="${x}" y="91" width="115" height="114" rx="10" fill="#111923" stroke="#263442"/>
    <rect x="${x + 12}" y="91" width="30" height="3" rx="1.5" fill="${["#58A6FF", "#3FB950", "#A371F7", "#F0883E"][index]}"/>
    <text x="${x + 12}" y="119" class="metric-label">${escapeXml(label)}</text>
    <text x="${x + 12}" y="158" class="metric-value">${escapeXml(value)}</text>
    <text x="${x + 12}" y="183" class="metric-note">${["on GitHub", "across projects", "in public repos", "Google Cloud"][index]}</text>
  </g>`;
}).join("\n  ");

const palette = ["#58A6FF", "#3FB950", "#A371F7", "#F0883E", "#DB61A2"];
const centerX = 669;
const centerY = 143;
const radius = 51;
const circumference = 2 * Math.PI * radius;
let offset = 0;
const donutSegments = chartLanguages.map(([language, bytes], index) => {
  const fraction = bytes / totalBytes;
  const segment = fraction * circumference;
  const visibleSegment = Math.max(0, segment - 3);
  const element = `<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="${palette[index]}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${visibleSegment} ${circumference - visibleSegment}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${centerX} ${centerY})"/>`;
  offset += segment;
  return element;
}).join("\n  ");

const legendRows = chartLanguages.map(([language, bytes], index) => {
  const y = 94 + index * 24;
  const percentage = ((bytes / totalBytes) * 100).toFixed(1);
  return `<circle cx="754" cy="${y - 4}" r="4" fill="${palette[index]}"/>
  <text x="767" y="${y}" class="legend-name">${escapeXml(language)}</text>
  <text x="922" y="${y}" text-anchor="end" class="legend-value">${percentage}%</text>`;
}).join("\n  ");

const dashboard = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="250" viewBox="0 0 960 250" role="img" aria-label="GitHub profile statistics and language mix">
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#58A6FF"/><stop offset=".52" stop-color="#A371F7"/><stop offset="1" stop-color="#3FB950"/></linearGradient>
    <radialGradient id="glow"><stop stop-color="#1F3B59" stop-opacity=".7"/><stop offset="1" stop-color="#0D1117" stop-opacity="0"/></radialGradient>
  </defs>
  <style>
    .eyebrow{font:700 10px 'Segoe UI',Ubuntu,sans-serif;letter-spacing:2px;fill:#8B949E}
    .title{font:700 20px 'Segoe UI',Ubuntu,sans-serif;fill:#F0F6FC}
    .caption{font:12px 'Segoe UI',Ubuntu,sans-serif;fill:#8B949E}
    .metric-label{font:700 9px 'Segoe UI',Ubuntu,sans-serif;letter-spacing:.6px;fill:#8B949E}
    .metric-value{font:700 29px 'Segoe UI',Ubuntu,sans-serif;fill:#F0F6FC}
    .metric-note{font:11px 'Segoe UI',Ubuntu,sans-serif;fill:#6E7681}
    .legend-name{font:12px 'Segoe UI',Ubuntu,sans-serif;fill:#C9D1D9}
    .legend-value{font:700 11px 'Segoe UI',Ubuntu,sans-serif;fill:#8B949E}
  </style>
  <rect x="1" y="1" width="958" height="248" rx="16" fill="#0D1117" stroke="#30363D"/>
  <path d="M18 2H942" stroke="url(#accent)" stroke-width="2" stroke-linecap="round"/>
  <circle cx="850" cy="140" r="130" fill="url(#glow)"/>
  <text x="28" y="33" class="eyebrow">POLIKEY BHUVAN  /  OPEN SOURCE</text>
  <text x="28" y="59" class="title">A little progress, built in public.</text>
  <text x="28" y="77" class="caption">Public profile snapshot · refreshed daily</text>
  ${metricTiles}
  <path d="M557 27V222" stroke="#263442"/>
  <text x="591" y="43" class="eyebrow">LANGUAGE MIX</text>
  <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="#21262D" stroke-width="14"/>
  ${donutSegments || ""}
  <text x="${centerX}" y="140" text-anchor="middle" class="metric-value" style="font-size:17px">${languageTotals.size}</text>
  <text x="${centerX}" y="157" text-anchor="middle" class="metric-label">LANGS</text>
  ${legendRows || '<text x="754" y="101" class="legend-name">Language data will appear soon</text>'}
</svg>`;

await mkdir("dist", { recursive: true });
await writeFile("dist/github-profile-dashboard.svg", dashboard);
