#!/usr/bin/env node
/**
 * Script de verificación pre-producción
 * Verifica que todo esté listo antes de deployar
 */

console.log('🔍 Verificando configuración de producción...\n');

const checks = [];
let hasErrors = false;

// 1. Verificar Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
checks.push({
  name: 'Node.js version',
  pass: majorVersion >= 18,
  message: majorVersion >= 18 
    ? `✅ Node.js ${nodeVersion} (compatible)` 
    : `❌ Node.js ${nodeVersion} (requiere >= 18.x)`
});

// 2. Verificar variables de entorno críticas
const requiredEnvVars = {
  'DATABASE_URL': 'URL de PostgreSQL',
  'SESSION_SECRET': 'Clave secreta de sesión',
  'NODE_ENV': 'Entorno (debe ser "production")'
};

Object.entries(requiredEnvVars).forEach(([key, desc]) => {
  const value = process.env[key];
  const exists = !!value;
  const isDefault = value && (
    value.includes('password') || 
    value.includes('change-this') ||
    value === 'your-secret-key-here' ||
    value === 'development'
  );
  
  if (!exists) {
    checks.push({
      name: key,
      pass: false,
      message: `❌ ${key} no está configurado (${desc})`
    });
    hasErrors = true;
  } else if (isDefault) {
    checks.push({
      name: key,
      pass: false,
      message: `⚠️  ${key} usa valor por defecto - CÁMBIALO`
    });
    hasErrors = true;
  } else {
    checks.push({
      name: key,
      pass: true,
      message: `✅ ${key} configurado`
    });
  }
});

// 3. Verificar que DATABASE_URL es PostgreSQL
if (process.env.DATABASE_URL) {
  const isPostgres = process.env.DATABASE_URL.startsWith('postgresql');
  checks.push({
    name: 'PostgreSQL',
    pass: isPostgres,
    message: isPostgres 
      ? '✅ Usando PostgreSQL' 
      : '❌ Debe usar PostgreSQL en producción (no SQLite)'
  });
  if (!isPostgres) hasErrors = true;

  // Verificar SSL
  const hasSSL = process.env.DATABASE_URL.includes('sslmode=require');
  checks.push({
    name: 'Database SSL',
    pass: hasSSL,
    message: hasSSL 
      ? '✅ SSL habilitado' 
      : '⚠️  Considera agregar ?sslmode=require a DATABASE_URL'
  });
}

// 4. Verificar NODE_ENV
if (process.env.NODE_ENV !== 'production') {
  checks.push({
    name: 'NODE_ENV',
    pass: false,
    message: `❌ NODE_ENV debe ser "production", actualmente es "${process.env.NODE_ENV}"`
  });
  hasErrors = true;
}

// 5. Verificar que dist/ existe
const fs = require('fs');
const distExists = fs.existsSync('./dist');
checks.push({
  name: 'Build',
  pass: distExists,
  message: distExists 
    ? '✅ Carpeta dist/ existe' 
    : '⚠️  No se encuentra dist/ - ejecuta "npm run build"'
});

// 6. Verificar SESSION_SECRET strength
if (process.env.SESSION_SECRET) {
  const secret = process.env.SESSION_SECRET;
  const isStrong = secret.length >= 32 && 
                   !/^(your|test|dev|secret|password|change)/i.test(secret);
  checks.push({
    name: 'SESSION_SECRET seguro',
    pass: isStrong,
    message: isStrong 
      ? '✅ SESSION_SECRET tiene buena fortaleza' 
      : '⚠️  SESSION_SECRET débil - usa al menos 32 caracteres aleatorios'
  });
  if (!isStrong) hasErrors = true;
}

// Imprimir resultados
console.log('═════════════════════════════════════════════════\n');
checks.forEach(check => console.log(check.message));
console.log('\n═════════════════════════════════════════════════\n');

// Resumen
const passed = checks.filter(c => c.pass).length;
const total = checks.length;

if (hasErrors) {
  console.log(`❌ ${passed}/${total} verificaciones pasaron`);
  console.log('\n⚠️  CORRIGE LOS ERRORES ANTES DE DEPLOYAR A PRODUCCIÓN\n');
  console.log('📖 Lee PRODUCTION.md para más información\n');
  process.exit(1);
} else {
  console.log(`✅ ${passed}/${total} verificaciones pasaron`);
  console.log('\n🚀 ¡Listo para producción!\n');
  process.exit(0);
}
