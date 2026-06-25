// Sube las portadas reales (imagenes_finales/{id}.jpg) al bucket "covers" de
// Supabase Storage y actualiza books.cover_url, matcheando por legacy_id.
// Uso:
//   node scripts/migrar-imagenes-portada.mjs            -> dry-run
//   node scripts/migrar-imagenes-portada.mjs --apply     -> corrida real

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseCsv } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.resolve(WEB_DIR, "..", "Archivos para la base de datos");
const IMAGES_DIR = path.join(DATA_DIR, "imagenes_finales");

const APPLY = process.argv.includes("--apply");

function loadEnvLocal() {
  const text = fs.readFileSync(path.join(WEB_DIR, ".env.local"), "utf8");
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

async function main() {
  loadEnvLocal();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  console.log(APPLY ? "=== CORRIDA REAL ===" : "=== DRY RUN (no escribe nada) ===");

  const rows = readCsv("salida_imagenes.csv");
  const conImagen = rows.filter((r) => r.imagen_archivo?.trim());
  const sinImagen = rows.filter((r) => !r.imagen_archivo?.trim());

  console.log(`Total filas: ${rows.length}`);
  console.log(`Con imagen: ${conImagen.length}`);
  console.log(`Sin imagen (quedan con cover_url null): ${sinImagen.length}`);
  console.log(
    "Ejemplos sin imagen:",
    sinImagen.slice(0, 5).map((r) => `${r.id} - ${r.nombre}`)
  );

  let subidas = 0;
  let sinArchivo = 0;
  let sinMatchBook = 0;

  for (const row of conImagen) {
    const legacyId = parseInt(row.id, 10);
    const filename = row.imagen_archivo.trim();
    const filePath = path.join(IMAGES_DIR, filename);

    if (!fs.existsSync(filePath)) {
      sinArchivo++;
      console.warn(`⚠ No existe el archivo: ${filename} (id ${legacyId})`);
      continue;
    }

    if (!APPLY) {
      subidas++;
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `${legacyId}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("covers")
      .upload(storagePath, fileBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error(`✗ Error subiendo ${filename}: ${uploadError.message}`);
      continue;
    }

    const { data: publicUrlData } = supabase.storage
      .from("covers")
      .getPublicUrl(storagePath);

    const { error: updateError, count } = await supabase
      .from("books")
      .update({ cover_url: publicUrlData.publicUrl })
      .eq("legacy_id", legacyId)
      .select("id", { count: "exact" });

    if (updateError) {
      console.error(`✗ Error actualizando libro legacy_id ${legacyId}: ${updateError.message}`);
      continue;
    }

    if (!count) {
      sinMatchBook++;
      console.warn(`⚠ No hay libro con legacy_id ${legacyId}`);
      continue;
    }

    subidas++;
  }

  console.log(`\nImágenes ${APPLY ? "subidas" : "a subir"}: ${subidas}`);
  if (sinArchivo) console.log(`Archivos listados pero faltantes en disco: ${sinArchivo}`);
  if (sinMatchBook) console.log(`Sin libro correspondiente: ${sinMatchBook}`);
  console.log(
    APPLY
      ? "\n✓ Migración de imágenes completa."
      : "\nDry-run completo. Corré con --apply para escribir de verdad."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
