import fs from 'node:fs';
import path from 'node:path';

// Carrega variáveis do arquivo .env
function carregarEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const linhas = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const linha of linhas) {
      const match = linha.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = match[2] || '';
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[match[1]] = val.trim();
      }
    }
  }
}

carregarEnv();

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF || 'edyjpusrdpotmskgobws';

if (!token) {
  console.error('Erro: SUPABASE_ACCESS_TOKEN não encontrado no arquivo .env');
  process.exit(1);
}

const arquivoSql = process.argv[2];
if (!arquivoSql) {
  console.error('Uso: node supabase/executar-sql.mjs <caminho-do-arquivo.sql>');
  process.exit(1);
}

if (!fs.existsSync(arquivoSql)) {
  console.error(`Erro: Arquivo não encontrado: ${arquivoSql}`);
  process.exit(1);
}

const query = fs.readFileSync(arquivoSql, 'utf8');

console.log(`Executando ${arquivoSql} no Supabase (${projectRef})...`);

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query }),
});

const data = await res.json().catch(() => null);

if (!res.ok) {
  console.error('Falha ao executar query no Supabase:', data || res.statusText);
  process.exit(1);
}

console.log('✅ SQL executado com sucesso no Supabase!');
if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
  console.log('Retorno:', JSON.stringify(data, null, 2));
}
