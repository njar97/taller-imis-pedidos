// Caza identificadores LIBRES dentro de las funciones-componente de un archivo.
//
//     node scripts/identificadores-libres.mjs src/DetallePedidoModal.jsx
//
// POR QUE EXISTE
// `InfoTabla` usaba `asignaciones`, `inventario`, `recetas` y `costosBase` sin
// recibirlas como prop. El build pasa —esbuild no resuelve scopes— y los tests
// tampoco lo ven, porque la rama solo se ejecuta cuando un admin abre el detalle
// de un pedido. En produccion reventaba con «asignaciones is not defined» y se
// caia el detalle entero. Este chequeo lo agarra en segundos.
//
// LA TRAMPA AL ESCRIBIRLO: si se recorre el arbol entero y despues se descartan
// las propiedades, no sirve — `style: { display: ... }` vuelve a meter `display`
// como si fuera una variable y salen cientos de falsos positivos. Hay que NO
// visitar esos hijos: la `property` de un `a.b` y la `key` de `{b: ...}`.
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { transformSync } from "esbuild";
import { parse } from "acorn";

const GLOBALES = new Set([
  ...Object.getOwnPropertyNames(globalThis),
  "React", "console", "window", "document", "fetch", "localStorage", "navigator",
  "location", "alert", "confirm", "prompt", "setTimeout", "clearTimeout",
  "setInterval", "clearInterval", "requestAnimationFrame", "structuredClone",
  // globales del NAVEGADOR: no existen en el globalThis de Node, asi que sin
  // esta lista salen como falsos positivos.
  "Image", "FileReader", "IntersectionObserver", "ResizeObserver", "Notification",
  "indexedDB", "PublicKeyCredential", "SpeechSynthesisUtterance", "speechSynthesis",
  "FormData", "Audio", "MutationObserver", "IDBKeyRange", "AbortController",
  "XLSX",   // se carga por CDN, no por import — ver la deuda del plan
]);

/** Recorre el AST. `saltar(nodo, clave)` decide que hijos NO se visitan. */
function recorrer(nodo, ver, saltar) {
  if (!nodo || typeof nodo !== "object") return;
  if (Array.isArray(nodo)) return nodo.forEach(n => recorrer(n, ver, saltar));
  if (!nodo.type) return;
  ver(nodo);
  for (const k of Object.keys(nodo)) {
    if (k === "type" || k === "start" || k === "end" || k === "loc") continue;
    if (saltar && saltar(nodo, k)) continue;
    recorrer(nodo[k], ver, saltar);
  }
}

// `a.b` -> b no es variable.  `{b: v}` -> b tampoco.  `{b}` SI lo es.
const saltarPropiedades = (n, k) =>
  (n.type === "MemberExpression" && k === "property" && !n.computed) ||
  (n.type === "Property" && k === "key" && !n.computed && !n.shorthand) ||
  (n.type === "MethodDefinition" && k === "key" && !n.computed) ||
  (n.type === "PropertyDefinition" && k === "key" && !n.computed) ||
  (n.type === "JSXAttribute" && k === "name") ||
  (n.type === "LabeledStatement" && k === "label") ||
  (n.type === "BreakStatement" && k === "label") ||
  (n.type === "ContinueStatement" && k === "label");

function nombresDe(patron, out) {
  if (!patron) return;
  const t = patron.type;
  if (t === "Identifier") out.add(patron.name);
  else if (t === "ObjectPattern") patron.properties.forEach(p =>
    nombresDe(p.type === "RestElement" ? p.argument : p.value, out));
  else if (t === "ArrayPattern") patron.elements.forEach(e => nombresDe(e, out));
  else if (t === "AssignmentPattern") nombresDe(patron.left, out);
  else if (t === "RestElement") nombresDe(patron.argument, out);
}

/** Todo lo que una funcion declara adentro, incluidas las anidadas. */
function declarados(fn) {
  const s = new Set();
  fn.params.forEach(p => nombresDe(p, s));
  recorrer(fn.body, n => {
    if (n.type === "VariableDeclarator") nombresDe(n.id, s);
    else if (n.type === "CatchClause") nombresDe(n.param, s);
    else if (/Function(Declaration|Expression)|ArrowFunctionExpression/.test(n.type)) {
      if (n.id) s.add(n.id.name);
      n.params.forEach(p => nombresDe(p, s));
    } else if (n.type === "ClassDeclaration" && n.id) s.add(n.id.name);
  }, saltarPropiedades);
  return s;
}

function delModulo(ast) {
  const s = new Set();
  const anota = n => {
    if (!n) return;
    if (n.type === "FunctionDeclaration" || n.type === "ClassDeclaration") {
      if (n.id) s.add(n.id.name);
    } else if (n.type === "VariableDeclaration") {
      n.declarations.forEach(d => nombresDe(d.id, s));
    }
  };
  for (const n of ast.body) {
    if (n.type === "ImportDeclaration") n.specifiers.forEach(e => s.add(e.local.name));
    else if (n.type === "ExportNamedDeclaration") anota(n.declaration);
    else if (n.type === "ExportDefaultDeclaration") anota(n.declaration);
    else anota(n);
  }
  return s;
}

// ⚠ Sin argumentos busca el solo. En Windows npm NO expande `src/*.jsx`: le
// llega el asterisco tal cual y revienta con ENOENT, asi que el script no puede
// depender de que el shell resuelva el glob.
function buscar(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "node_modules" && !e.name.startsWith(".")) buscar(ruta, out);
    } else if (/\.jsx?$/.test(e.name) && !/\.test\.jsx?$/.test(e.name)) {
      out.push(ruta);
    }
  }
  return out;
}

const archivos = process.argv.slice(2).length
  ? process.argv.slice(2)
  : buscar("src");

let hallazgos = 0;
for (const arch of archivos) {
  const js = transformSync(readFileSync(arch, "utf8"),
    { loader: "jsx", format: "esm", target: "es2022" }).code;
  const ast = parse(js, { ecmaVersion: "latest", sourceType: "module" });
  const modulo = delModulo(ast);

  // ⚠ SOLO las funciones de nivel superior. Una funcion declarada DENTRO de un
  // componente es un closure y usar las variables del componente es correcto:
  // mirarlas tambien da 50 falsos positivos y el chequeo deja de servir.
  const funciones = [];
  for (const n of ast.body) {
    const d = n.type === "ExportNamedDeclaration" || n.type === "ExportDefaultDeclaration"
      ? n.declaration : n;
    if (d && d.type === "FunctionDeclaration" && d.id) funciones.push(d);
  }

  for (const fn of funciones) {
    const dentro = declarados(fn);
    const usados = new Set();
    recorrer(fn.body, n => {
      if (n.type === "Identifier") usados.add(n.name);
    }, saltarPropiedades);
    const libres = [...usados]
      .filter(u => !dentro.has(u) && !modulo.has(u) && !GLOBALES.has(u))
      .sort();
    if (libres.length) {
      hallazgos++;
      console.log(`${arch}  ${fn.id.name}()  ->  ${libres.join(", ")}`);
    }
  }
}
console.log(hallazgos
  ? `\n${hallazgos} funcion(es) con identificadores libres`
  : "limpio: ninguna funcion usa algo que no reciba ni declare");
process.exit(hallazgos ? 1 : 0);
