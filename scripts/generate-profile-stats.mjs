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
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} for ${url}`);
  }
  return response.json();
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character]);
}

function cardStart(title, subtitle) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="495" height="165" viewBox="0 0 495 165" role="img" aria-label="${escapeXml(title)}">
  <style>
    .title{font:600 17px 'Segoe UI',Ubuntu,sans-serif;fill:#58A6FF}
    .subtitle{font:12px 'Segoe UI',Ubuntu,sans-serif;fill:#8B949E}
    .label{font:12px 'Segoe UI',Ubuntu,sans-serif;fill:#C9D1D9}
    .value{font:700 22px 'Segoe UI',Ubuntu,sans-serif;fill:#F0F6FC}
  </style>
  <rect x="1" y="1" width="493" height="163" rx="12" fill="#0D1117" stroke="#30363D"/>
  <text x="22" y="32" class="title">${escapeXml(title)}</text>
  <text x="22" y="51" class="subtitle">${escapeXml(subtitle)}</text>`;
}

const [profile, repositories] = await Promise.all([
  getJson(`${api}/users/${username}`),
  getJson(`${api}/users/${username}/repos?type=owner&per_page=100&sort=updated`),
]);

const stats = [
  ["PUBLIC REPOSITORIES", profile.public_repos],
  ["STARS RECEIVED", repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0)],
  ["FORKS", repositories.reduce((sum, repo) => sum + repo.forks_count, 0)],
  ["FOLLOWERS", profile.followers],
];

const statsSvg = `${cardStart("GitHub at a glance", "A snapshot of my public GitHub profile")}
  ${stats.map(([label, value], index) => {
    const x = 25 + (index % 2) * 235;
    const y = 88 + Math.floor(index / 2) * 42;
    return `<text x="${x}" y="${y}" class="label">${escapeXml(label)}</text><text x="${x}" y="${y + 25}" class="value">${value}</text>`;
  }).join("\n  ")}
</svg>`;

const languageTotals = new Map();
await Promise.all(repositories.filter((repo) => !repo.fork).map(async (repo) => {
  const languages = await getJson(`${api}/repos/${username}/${repo.name}/languages`);
  for (const [language, bytes] of Object.entries(languages)) {
    languageTotals.set(language, (languageTotals.get(language) ?? 0) + bytes);
  }
}));

const topLanguages = [...languageTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
const totalBytes = topLanguages.reduce((sum, [, bytes]) => sum + bytes, 0) || 1;
const languageRows = topLanguages.map(([language, bytes], index) => {
  const y = 77 + index * 17;
  const width = Math.max(8, Math.round((bytes / totalBytes) * 430));
  const colors = ["#58A6FF", "#3FB950", "#A371F7", "#F0883E", "#DB61A2"];
  return `<text x="24" y="${y}" class="label">${escapeXml(language)}</text>
  <text x="471" y="${y}" text-anchor="end" class="subtitle">${((bytes / totalBytes) * 100).toFixed(1)}%</text>
  <rect x="24" y="${y + 5}" width="447" height="5" rx="2.5" fill="#21262D"/>
  <rect x="24" y="${y + 5}" width="${width}" height="5" rx="2.5" fill="${colors[index]}"/>`;
}).join("\n  ");

const languagesSvg = `${cardStart("Most used languages", "Across my public, non-fork repositories")}
  ${languageRows || '<text x="24" y="88" class="label">Language data will appear after repositories are analyzed.</text>'}
</svg>`;

await mkdir("dist", { recursive: true });
await Promise.all([
  writeFile("dist/github-profile-stats.svg", statsSvg),
  writeFile("dist/github-top-languages.svg", languagesSvg),
]);
