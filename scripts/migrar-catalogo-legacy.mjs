// Migración del catálogo legacy (libros + ubicación por caja + historial de ventas).
// Uso:
//   node scripts/migrar-catalogo-legacy.mjs            -> dry-run (no escribe nada)
//   node scripts/migrar-catalogo-legacy.mjs --apply     -> corrida real
//
// Lee:
//   .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
//   ../Archivos para la base de datos/salida_productos_finales.csv
//   ../Archivos para la base de datos/salida_ubicaciones.csv
//   ../Archivos para la base de datos/salida_mapeo_ids.csv
//   ../Archivos para la base de datos/pueblobl_pueblo_blanco.sql (tablas compra/detalle_compra)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseCsv } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.resolve(
  WEB_DIR,
  "..",
  "Archivos para la base de datos"
);

const APPLY = process.argv.includes("--apply");

function loadEnvLocal() {
  const envPath = path.join(WEB_DIR, ".env.local");
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

function readCsv(filename) {
  const text = fs
    .readFileSync(path.join(DATA_DIR, filename), "utf8")
    .replace(/^﻿/, "");
  return parseCsv(text, { columns: true, skip_empty_lines: true });
}

// --- parser de tuplas SQL (maneja comillas simples escapadas con \') ---
function parseSqlTuples(sqlText, tableName) {
  const startMarker = `INSERT INTO \`${tableName}\``;
  const startIdx = sqlText.indexOf(startMarker);
  if (startIdx === -1) return [];
  const valuesIdx = sqlText.indexOf("VALUES", startIdx);
  const afterValues = sqlText.slice(valuesIdx + "VALUES".length);
  const endIdx = afterValues.indexOf(";\n");
  const block = afterValues.slice(0, endIdx === -1 ? undefined : endIdx);

  const tuples = [];
  let i = 0;
  while (i < block.length) {
    if (block[i] === "(") {
      const fields = [];
      let cur = "";
      let inString = false;
      i++;
      while (i < block.length) {
        const ch = block[i];
        if (inString) {
          if (ch === "\\" && i + 1 < block.length) {
            cur += block[i + 1] === "'" ? "'" : block[i + 1] === "\\" ? "\\" : block[i + 1];
            i += 2;
            continue;
          }
          if (ch === "'") {
            inString = false;
            i++;
            continue;
          }
          cur += ch;
          i++;
          continue;
        }
        if (ch === "'") {
          inString = true;
          i++;
          continue;
        }
        if (ch === "," ) {
          fields.push(cur.trim());
          cur = "";
          i++;
          continue;
        }
        if (ch === ")") {
          fields.push(cur.trim());
          tuples.push(fields);
          i++;
          break;
        }
        cur += ch;
        i++;
      }
    } else {
      i++;
    }
  }
  return tuples;
}

function stripQuotes(v) {
  if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1);
  return v;
}

async function main() {
  loadEnvLocal();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  console.log(APPLY ? "=== CORRIDA REAL ===" : "=== DRY RUN (no escribe nada) ===");

  // ----- 1. productos -----
  const productos = readCsv("salida_productos_finales.csv");
  console.log(`Productos a importar: ${productos.length}`);

  const booksPayload = productos.map((p) => ({
    legacy_id: parseInt(p.id, 10),
    title: p.nombre.trim(),
    author: p.autor.trim(),
    publisher: p.editorial?.trim() || null,
    price: parseFloat(p.precio),
    stock: 0, // se sincroniza solo por trigger al cargar ubicaciones
    category_id: null,
    active: true,
  }));

  let legacyIdToUuid = new Map();

  if (APPLY) {
    const { data: inserted, error } = await supabase
      .from("books")
      .insert(booksPayload)
      .select("id, legacy_id");
    if (error) throw new Error(`Error insertando books: ${error.message}`);
    for (const row of inserted) legacyIdToUuid.set(row.legacy_id, row.id);
    console.log(`✓ ${inserted.length} libros insertados`);
  } else {
    console.log("  (dry-run) ejemplo:", booksPayload[0]);
  }

  // ----- 2. ubicaciones -----
  const ubicacionesCsv = readCsv("salida_ubicaciones.csv");
  const stockFinalPorLegacyId = new Map(
    productos.map((p) => [parseInt(p.id, 10), parseInt(p.stock_final, 10)])
  );
  const legacyIdsConCaja = new Set(
    ubicacionesCsv.map((u) => parseInt(u.producto_id, 10))
  );

  const ubicacionesPayload = [];
  for (const u of ubicacionesCsv) {
    const legacyId = parseInt(u.producto_id, 10);
    ubicacionesPayload.push({
      legacy_id: legacyId,
      caja: u.caja.trim(),
      cantidad: parseInt(u.cantidad, 10),
    });
  }

  // productos con stock_final > 0 pero sin ninguna caja conocida -> SIN-UBICAR
  let sinUbicarCount = 0;
  for (const [legacyId, stockFinal] of stockFinalPorLegacyId) {
    if (!legacyIdsConCaja.has(legacyId) && stockFinal > 0) {
      ubicacionesPayload.push({
        legacy_id: legacyId,
        caja: "SIN-UBICAR",
        cantidad: stockFinal,
      });
      sinUbicarCount++;
    }
  }

  console.log(
    `Ubicaciones a importar: ${ubicacionesPayload.length} (${sinUbicarCount} en caja SIN-UBICAR)`
  );

  if (APPLY) {
    const sinMatch = [];
    const rows = ubicacionesPayload
      .map((u) => {
        const producto_id = legacyIdToUuid.get(u.legacy_id);
        if (!producto_id) {
          sinMatch.push(u);
          return null;
        }
        return { producto_id, caja: u.caja, cantidad: u.cantidad };
      })
      .filter(Boolean);

    if (sinMatch.length) {
      console.warn(
        `⚠ ${sinMatch.length} ubicaciones sin producto correspondiente (omitidas):`,
        sinMatch.slice(0, 10)
      );
    }

    // insertar en tandas para no exceder límites de payload
    const CHUNK = 500;
    let insertedCount = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error } = await supabase.from("ubicaciones").insert(chunk);
      if (error) throw new Error(`Error insertando ubicaciones: ${error.message}`);
      insertedCount += chunk.length;
    }
    console.log(`✓ ${insertedCount} ubicaciones insertadas`);
  } else {
    console.log("  (dry-run) ejemplo:", ubicacionesPayload[0]);
  }

  // ----- 3. mapeo de ids (para historial de ventas) -----
  const mapeo = readCsv("salida_mapeo_ids.csv");
  const idViejoToCanonico = new Map(
    mapeo.map((m) => [parseInt(m.id_viejo, 10), parseInt(m.id_nuevo_canonico, 10)])
  );

  // ----- 4. historial de ventas (compra / detalle_compra) -----
  const dumpPath = path.join(DATA_DIR, "pueblobl_pueblo_blanco.sql");
  const dumpText = fs.readFileSync(dumpPath, "utf8");

  const compraTuples = parseSqlTuples(dumpText, "compra");
  const detalleTuples = parseSqlTuples(dumpText, "detalle_compra");

  console.log(
    `Historial: ${compraTuples.length} compras, ${detalleTuples.length} líneas de detalle`
  );

  const ventasPayload = compraTuples.map((t) => {
    const [id, , fecha, status, email, , total, medioPago] = t;
    return {
      id: parseInt(id, 10),
      fecha: stripQuotes(fecha),
      email: stripQuotes(email),
      total: parseFloat(stripQuotes(total)),
      medio_pago: stripQuotes(medioPago),
      status: stripQuotes(status),
    };
  });

  const sinMatchVentas = [];
  const ventasItemsPayload = detalleTuples
    .map((t) => {
      const [id, idCompra, idProducto, nombre, precio, cantidad] = t;
      const legacyIdViejo = parseInt(idProducto, 10);
      const canonico = idViejoToCanonico.get(legacyIdViejo) ?? legacyIdViejo;
      const producto_id_uuid = APPLY ? legacyIdToUuid.get(canonico) : canonico;
      if (APPLY && !producto_id_uuid) {
        sinMatchVentas.push({ id, idProducto, canonico });
      }
      return {
        id: parseInt(id, 10),
        venta_id: parseInt(idCompra, 10),
        producto_id: producto_id_uuid ?? null,
        nombre: stripQuotes(nombre),
        precio: parseFloat(stripQuotes(precio)),
        cantidad: parseInt(cantidad, 10),
      };
    });

  if (sinMatchVentas.length) {
    console.warn(
      `⚠ ${sinMatchVentas.length} items de venta histórica sin producto correspondiente (quedan con producto_id null):`,
      sinMatchVentas.slice(0, 10)
    );
  }

  if (APPLY) {
    const { error: e1 } = await supabase.from("ventas_historicas").insert(ventasPayload);
    if (e1) throw new Error(`Error insertando ventas_historicas: ${e1.message}`);
    console.log(`✓ ${ventasPayload.length} ventas históricas insertadas`);

    const { error: e2 } = await supabase
      .from("ventas_historicas_items")
      .insert(ventasItemsPayload);
    if (e2) throw new Error(`Error insertando ventas_historicas_items: ${e2.message}`);
    console.log(`✓ ${ventasItemsPayload.length} items de venta histórica insertados`);
  } else {
    console.log("  (dry-run) ejemplo venta:", ventasPayload[0]);
    console.log("  (dry-run) ejemplo item:", ventasItemsPayload[0]);
  }

  console.log(APPLY ? "\n✓ Migración completa." : "\nDry-run completo. Corré con --apply para escribir de verdad.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
