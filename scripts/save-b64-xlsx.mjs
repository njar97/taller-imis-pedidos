// Decodifica el base64 del MCP de Drive y lo escribe como XLSX.
// Uso: node save-b64-xlsx.mjs <base64.txt> <out.xlsx>
import fs from "node:fs";
const [b64File, outFile] = process.argv.slice(2);
const b64 = fs.readFileSync(b64File, "utf8").trim();
fs.writeFileSync(outFile, Buffer.from(b64, "base64"));
console.log(`✓ XLSX escrito a ${outFile} (${fs.statSync(outFile).size} bytes)`);
