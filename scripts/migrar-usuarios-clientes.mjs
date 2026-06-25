// Migración de clientes y usuarios de la base vieja.
// Uso:
//   node scripts/migrar-usuarios-clientes.mjs                  -> dry-run
//   node scripts/migrar-usuarios-clientes.mjs --apply           -> migra clientes_historicos + crea cuentas Auth
//   node scripts/migrar-usuarios-clientes.mjs --apply --invite  -> además manda el mail de "elegí tu contraseña"

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.resolve(WEB_DIR, "..", "Archivos para la base de datos");

const APPLY = process.argv.includes("--apply");
const INVITE = process.argv.includes("--invite");

function loadEnvLocal() {
  const envPath = path.join(WEB_DIR, ".env.local");
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

// idéntico al parser usado en migrar-catalogo-legacy.mjs
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
        if (ch === ",") {
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
  if (v == null) return null;
  if (v === "NULL") return null;
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

  const dumpPath = path.join(DATA_DIR, "pueblobl_pueblo_blanco.sql");
  const dumpText = fs.readFileSync(dumpPath, "utf8");

  // ----- 1. clientes -----
  const clientesTuples = parseSqlTuples(dumpText, "clientes");
  const clientesPayload = clientesTuples.map((t) => {
    const [id, nombres, apellidos, email, telefono, domicilio, status, fechaAlta] = t;
    return {
      id: parseInt(id, 10),
      nombre: `${stripQuotes(nombres)} ${stripQuotes(apellidos)}`.trim(),
      email: stripQuotes(email),
      telefono: stripQuotes(telefono) || null,
      domicilio: stripQuotes(domicilio) || null,
      status: parseInt(status, 10),
      fecha_alta: stripQuotes(fechaAlta),
    };
  });

  console.log(`Clientes a migrar: ${clientesPayload.length}`);

  if (APPLY) {
    const CHUNK = 200;
    for (let i = 0; i < clientesPayload.length; i += CHUNK) {
      const chunk = clientesPayload.slice(i, i + CHUNK);
      const { error } = await supabase.from("clientes_historicos").upsert(chunk);
      if (error) throw new Error(`Error insertando clientes_historicos: ${error.message}`);
    }
    console.log(`✓ ${clientesPayload.length} clientes migrados a clientes_historicos`);
  } else {
    console.log("  (dry-run) ejemplo:", clientesPayload[0]);
  }

  const clienteById = new Map(clientesPayload.map((c) => [c.id, c]));

  // ----- 2. usuarios -----
  const usuariosTuples = parseSqlTuples(dumpText, "usuarios");
  const usuarios = usuariosTuples.map((t) => {
    const [id, usuario, , activacion, , , , idCliente] = t;
    const cliente = clienteById.get(parseInt(stripQuotes(idCliente), 10));
    return {
      id: parseInt(id, 10),
      usuario: stripQuotes(usuario),
      activacion: parseInt(activacion, 10),
      idCliente: parseInt(stripQuotes(idCliente), 10),
      email: cliente?.email ?? null,
      nombre: cliente?.nombre ?? stripQuotes(usuario),
    };
  });

  console.log(`Usuarios en la base vieja: ${usuarios.length}`);
  for (const u of usuarios) {
    console.log(
      `  - usuario "${u.usuario}" -> ${u.email ?? "(sin email)"} | activado: ${u.activacion === 1 ? "sí" : "no"}`
    );
  }

  const activos = usuarios.filter((u) => u.activacion === 1 && u.email);
  console.log(`\nSe van a crear cuentas para ${activos.length} usuarios activados con email.`);

  if (!APPLY) {
    console.log("\nDry-run completo. Corré con --apply para crear las cuentas.");
    return;
  }

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3002";

  for (const u of activos) {
    // ¿ya existe una cuenta con ese email?
    const { data: existingList } = await supabase.auth.admin.listUsers();
    const exists = existingList?.users?.some(
      (au) => au.email?.toLowerCase() === u.email.toLowerCase()
    );

    if (exists) {
      console.log(`- ${u.email}: ya tiene cuenta, omitido.`);
      continue;
    }

    const { error: createError } = await supabase.auth.admin.createUser({
      email: u.email,
      email_confirm: true,
      user_metadata: { full_name: u.nombre },
    });

    if (createError) {
      console.warn(`⚠ No se pudo crear cuenta para ${u.email}: ${createError.message}`);
      continue;
    }

    console.log(`✓ Cuenta creada para ${u.email}`);

    if (INVITE) {
      const anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      );
      const { error: resetError } = await anon.auth.resetPasswordForEmail(u.email, {
        redirectTo: `${SITE_URL}/recuperar/nueva-clave`,
      });
      if (resetError) {
        console.warn(`  ⚠ No se pudo mandar el mail de clave a ${u.email}: ${resetError.message}`);
      } else {
        console.log(`  ✓ Mail de "elegí tu contraseña" enviado a ${u.email}`);
      }
    }
  }

  console.log("\n✓ Migración de usuarios completa.");
  if (!INVITE) {
    console.log(
      "No se mandaron mails de invitación (correr de nuevo con --apply --invite cuando quieras enviarlos)."
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
