// Extrae los JSON de cada hoja del XLSX bajado de Google Drive.
// Las hojas (Apps Script-style) guardan un JSON gigante en A1 con todos los registros.
// Uso: node scripts/extract-drive-backup.mjs <ruta-al-xlsx>

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const xlsxPath = process.argv[2];
if (!xlsxPath) {
  console.error("Uso: node extract-drive-backup.mjs <archivo.xlsx>");
  process.exit(1);
}

const outDir = path.join(path.dirname(xlsxPath), "extracted");
fs.mkdirSync(outDir, { recursive: true });

const unzipDir = path.join(outDir, "_unzipped");
fs.rmSync(unzipDir, { recursive: true, force: true });
fs.mkdirSync(unzipDir, { recursive: true });

const absXlsx = path.resolve(xlsxPath);
execSync(`cd "${unzipDir}" && unzip -q "${absXlsx}"`, { stdio: "inherit", shell: "bash" });

const sharedStrings = fs.readFileSync(
  path.join(unzipDir, "xl/sharedStrings.xml"),
  "utf8"
);

const strings = [];
const re = /<si>([\s\S]*?)<\/si>/g;
let m;
while ((m = re.exec(sharedStrings)) !== null) {
  const inner = m[1];
  const tMatches = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)];
  const txt = tMatches.map(x => x[1]).join("");
  strings.push(
    txt
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
  );
}

const workbook = fs.readFileSync(
  path.join(unzipDir, "xl/workbook.xml"),
  "utf8"
);
const sheetNames = [...workbook.matchAll(/<sheet\s+[^>]*name="([^"]+)"[^>]*sheetId="(\d+)"[^>]*r:id="(rId\d+)"/g)].map(
  ([, name, sheetId, rid]) => ({ name, sheetId, rid })
);

const rels = fs.readFileSync(
  path.join(unzipDir, "xl/_rels/workbook.xml.rels"),
  "utf8"
);
const ridMap = {};
for (const [, id, target] of rels.matchAll(/<Relationship\s+Id="(rId\d+)"[^>]*Target="([^"]+)"/g)) {
  ridMap[id] = target;
}

for (const { name, rid } of sheetNames) {
  const target = ridMap[rid];
  if (!target) continue;
  const sheetPath = path.join(unzipDir, "xl", target.replace(/^\.\//, ""));
  if (!fs.existsSync(sheetPath)) continue;

  const sheet = fs.readFileSync(sheetPath, "utf8");
  const cells = [...sheet.matchAll(/<c\s+r="([A-Z]+\d+)"(?:\s+s="\d+")?(?:\s+t="([^"]+)")?[^>]*>([\s\S]*?)<\/c>/g)];

  const data = {};
  for (const [, ref, type, content] of cells) {
    const v = content.match(/<v>([\s\S]*?)<\/v>/);
    const isStr = content.match(/<is><t[^>]*>([\s\S]*?)<\/t><\/is>/);
    let val;
    if (isStr) val = isStr[1];
    else if (v) {
      if (type === "s") val = strings[parseInt(v[1], 10)];
      else val = v[1];
    } else continue;
    data[ref] = val;
  }

  const outFile = path.join(outDir, `${name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
  console.log(`✓ ${name} → ${outFile} (${Object.keys(data).length} celdas)`);

  // intentar parsear A1 como JSON
  if (data.A1) {
    try {
      const parsed = JSON.parse(data.A1);
      const jsonFile = path.join(outDir, `${name}.records.json`);
      fs.writeFileSync(jsonFile, JSON.stringify(parsed, null, 2));
      console.log(`  └─ ${parsed.length} registros parseados → ${jsonFile}`);
    } catch (e) {
      console.log(`  └─ A1 no es JSON parseable (${data.A1?.slice(0, 50)}...)`);
    }
  }
}
