// Hook que carga todos los datos iniciales al autenticarse y normaliza los
// campos JSON/fecha que vienen de Postgres. Extrae el useEffect de carga
// inicial de App() para que sea testeable y reutilizable independientemente
// del árbol de componentes.
import { useEffect } from "react";
import {
  dbLeer            as gsLeer,
  dbBordLeer        as gsBordLeer,
  dbCuelLeer        as gsCuelLeer,
  dbClientesLeer    as gsClientesLeer,
  dbClientesGuardar as gsClientesGuardar,
  dbCatalogoLeer    as gsCatalogoLeer,
} from "./db.js";
import { idbLeerTodas } from "./idb.js";
import { hoy } from "./dominio.js";

export function useCargarDatos(rolBase, rol, {
  setPedidos, setNextId,
  setBordados, setNextBordId,
  setCuellos, setNextCuelId,
  setClientes, setCatalogo, setSync, setSec,
}) {
  useEffect(() => {
    if (!rolBase) return;
    if (rol && rol.startsWith("operario_")) {
      const mod = rol.replace("operario_", "");
      if (["pedidos", "bordados", "cuellos"].includes(mod)) setSec(mod);
    }
    setSync("cargando");
    Promise.all([gsLeer(), idbLeerTodas(), gsBordLeer(), gsCuelLeer(), gsClientesLeer(), gsCatalogoLeer()]).then(([sheetsData, idbData, bordSh, cuelSh, cliSh, catSh]) => {
      console.log("Datos cargados — confección:", sheetsData.length, "bordados:", bordSh.length, "cuellos:", cuelSh.length, "clientes:", cliSh.length);
      const normFecha = v => {
        if (!v) return "";
        const s = String(v).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        try {
          const d = new Date(s);
          if (!isNaN(d.getTime())) {
            const yr = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, "0");
            const da = String(d.getDate()).padStart(2, "0");
            return yr + "-" + mo + "-" + da;
          }
        } catch (e) {}
        return s;
      };
      const parseCampo = v => {
        if (Array.isArray(v) || typeof v === "object") return v;
        if (typeof v === "string" && (v.startsWith("[") || v.startsWith("{"))) {
          try {
            return JSON.parse(v);
          } catch {
            return [];
          }
        }
        return v;
      };
      if (sheetsData.length > 0) {
        const idbMap = Object.fromEntries(idbData.map(r => [String(r.pedidoId), r.imagenes || []]));
        const merged = sheetsData.map(p => {
          const rawImgs = parseCampo(p.imagenes);
          const sheetsImgs = Array.isArray(rawImgs) ? rawImgs : [];
          const localImgs = idbMap[String(p.id)] || [];
          const imgsMerged = sheetsImgs.map(sImg => {
            const local = localImgs.find(l => l.nombre === sImg.nombre && (l.data || l.driveUrl));
            return local ? {
              ...sImg,
              ...local,
              driveUrl: sImg.driveUrl || local.driveUrl
            } : sImg;
          });
          return {
            ...p,
            imagenes: imgsMerged,
            tallasItems: parseCampo(p.tallasItems),
            tallasQty: parseCampo(p.tallasQty),
            medidas: parseCampo(p.medidas),
            abonos: parseCampo(p.abonos) || [],
            personas: parseCampo(p.personas) || [],
            modoRegistro: p.modoRegistro || "tallas",
            fecha: normFecha(p.fecha),
            fechaEntrega: normFecha(p.fechaEntrega),
            fechaInicio: normFecha(p.fechaInicio)
          };
        });
        setPedidos(merged);
        setNextId(Math.max(...merged.map(p => Number(p.id) || 0)) + 1);
      }
      if (bordSh.length > 0) {
        const bordParsed = bordSh.map(b => ({
          ...b,
          abonos: parseCampo(b.abonos) || []
        }));
        setBordados(bordParsed);
        setNextBordId(Math.max(...bordParsed.map(b => Number(b.id) || 0)) + 1);
      }
      if (cuelSh.length > 0) {
        const cuelParsed = cuelSh.map(cu => ({
          ...cu,
          abonos: parseCampo(cu.abonos) || [],
          cuello: parseCampo(cu.cuello) || null,
          puno: parseCampo(cu.puno) || null,
          banda: parseCampo(cu.banda) || null
        }));
        setCuellos(cuelParsed);
        setNextCuelId(Math.max(...cuelParsed.map(c => Number(c.id) || 0)) + 1);
      }
      if (cliSh.length > 0) {
        setClientes(cliSh);
      } else {
        const mapaC = {};
        [...sheetsData, ...bordSh, ...cuelSh].forEach(p => {
          const nombre = (p.cliente || "").trim();
          if (!nombre) return;
          const key = nombre.toLowerCase();
          if (!mapaC[key]) mapaC[key] = {
            id: Object.keys(mapaC).length + 1,
            nombre,
            telefono: p.telefono || "",
            tipo: p.tipoCliente || "persona",
            contacto: p.nombreContacto || "",
            nit: p.nit || "",
            nrc: p.nrc || "",
            razonSocial: p.razonSocial || "",
            dirFiscal: p.dirFiscal || "",
            notas: "",
            fecha: hoy()
          }; else {
            const ex = mapaC[key];
            if (!ex.telefono && p.telefono) ex.telefono = p.telefono;
            if (!ex.nit && p.nit) ex.nit = p.nit;
            if (!ex.nrc && p.nrc) ex.nrc = p.nrc;
          }
        });
        const listaCli = Object.values(mapaC);
        if (listaCli.length > 0) {
          setClientes(listaCli);
          listaCli.forEach(cli => gsClientesGuardar(cli));
        }
      }
      if (catSh && catSh.length > 0) setCatalogo(catSh);
      setSync("ok");
    }).catch(err => { console.warn("Carga parcial:", err); setSync("ok"); });
  }, [rolBase]);
}
