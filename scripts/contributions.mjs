// Gera um gráfico estático de contribuições (claro e escuro) na paleta do perfil.
// Uso: GITHUB_TOKEN=... node scripts/contributions.mjs <usuario> <pasta-saida>
import { mkdirSync, writeFileSync } from "node:fs";

const [user = "kaiquethomaz", outDir = "dist"] = process.argv.slice(2);

const query = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
  }
}`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${process.env.GITHUB_TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, variables: { login: user } }),
});
const json = await res.json();
if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors ?? json));
const { totalContributions, weeks } = json.data.user.contributionsCollection.contributionCalendar;

const THEMES = {
  dark: {
    text: "#9A9A9A", strong: "#E6E6E6",
    levels: ["#21162F", "#3A2257", "#553080", "#7B3FB5", "#A566E0"],
  },
  light: {
    text: "#57606A", strong: "#1F2328",
    levels: ["#EBEDF0", "#D9C6F0", "#B08AD9", "#8A5BC2", "#5E2F94"],
  },
};
const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DAYS = { 1: "seg", 3: "qua", 5: "sex" };

const CELL = 11, GAP = 3, STEP = CELL + GAP;
const LEFT = 32, TOP = 40;
const width = LEFT + weeks.length * STEP + 8;
const height = TOP + 7 * STEP + 34;

function render({ text, strong, levels }) {
  const font = `font-family="-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"`;
  const out = [];

  out.push(`<text x="${LEFT}" y="16" ${font} font-size="13" font-weight="600" fill="${strong}">` +
    `${totalContributions} contribuições no último ano</text>`);

  let lastMonth = -1, lastLabelX = -99;
  weeks.forEach((week, x) => {
    const month = new Date(week.contributionDays[0].date + "T00:00:00").getMonth();
    if (month !== lastMonth && x - lastLabelX >= 3 && x < weeks.length - 2) {
      out.push(`<text x="${LEFT + x * STEP}" y="${TOP - 8}" ${font} font-size="10" fill="${text}">${MONTHS[month]}</text>`);
      lastMonth = month;
      lastLabelX = x;
    }
    for (const day of week.contributionDays) {
      const y = new Date(day.date + "T00:00:00").getDay();
      const n = day.contributionCount;
      out.push(`<rect x="${LEFT + x * STEP}" y="${TOP + y * STEP}" width="${CELL}" height="${CELL}" rx="2" ` +
        `fill="${levels[LEVEL[day.contributionLevel]]}"><title>${day.date}: ${n} contribuiç${n === 1 ? "ão" : "ões"}</title></rect>`);
    }
  });

  for (const [y, label] of Object.entries(DAYS)) {
    out.push(`<text x="0" y="${TOP + y * STEP + 9}" ${font} font-size="10" fill="${text}">${label}</text>`);
  }

  const legendY = TOP + 7 * STEP + 14;
  const legendX = width - 8 - 5 * STEP - 70;
  out.push(`<text x="${legendX}" y="${legendY + 9}" ${font} font-size="10" fill="${text}">Menos</text>`);
  levels.forEach((c, i) =>
    out.push(`<rect x="${legendX + 36 + i * STEP}" y="${legendY}" width="${CELL}" height="${CELL}" rx="2" fill="${c}"/>`));
  out.push(`<text x="${legendX + 40 + 5 * STEP}" y="${legendY + 9}" ${font} font-size="10" fill="${text}">Mais</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${totalContributions} contribuições no último ano">\n${out.join("\n")}\n</svg>\n`;
}

mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/contributions-dark.svg`, render(THEMES.dark));
writeFileSync(`${outDir}/contributions.svg`, render(THEMES.light));
console.log(`OK: ${totalContributions} contribuições, ${weeks.length} semanas`);
