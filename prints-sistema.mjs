import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'https://capette-financeiro.vercel.app';

const EMAIL = 'trezepinheiro@gmail.com';
const SENHA = 'capette';

const rotas = [
  '/painel-admin',
  '/painel-operacional',
  '/painel-diretoria',
  '/importar',
  '/conciliacao',
  '/lancamentos',
  '/cobrancas',
  '/pendencias',
  '/fornecedores',
  '/controle-dividas',
  '/aplicacoes',
  '/plano-trabalho',
  '/planos-execucao',
  '/projetos',
  '/atendimentos',
  '/usuarios-atendidos',
  '/doacoes',
  '/equipe',
  '/eventos-campanhas',
  '/documentos-fiscais',
  '/patrimonio',
  '/prestacao-contas',
  '/relatorios-central',
  '/instituicao',
  '/parcerias',
  '/usuarios',
  '/backup',
  '/configuracoes',
  '/sociedade'
];

const pasta = './prints-sistema';

if (!fs.existsSync(pasta)) {
  fs.mkdirSync(pasta);
}

function nomeArquivo(rota) {
  return rota.replace('/', '') || 'home';
}

const browser = await chromium.launch({
  headless: true
});

const page = await browser.newPage({
  viewport: {
    width: 1440,
    height: 1000
  }
});

console.log('Abrindo login...');

await page.goto(`${BASE_URL}/login`, {
  waitUntil: 'networkidle'
});

await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', SENHA);

console.log('Fazendo login...');

await page.click('button[type="submit"]');

await page.waitForTimeout(4000);

for (const rota of rotas) {
  try {
    console.log(`Tirando print de ${rota}...`);

    await page.goto(`${BASE_URL}${rota}`, {
      waitUntil: 'networkidle'
    });

    await page.waitForTimeout(2500);

    await page.screenshot({
      path: `${pasta}/${nomeArquivo(rota)}.png`,
      fullPage: true
    });

  } catch (erro) {
    console.log(`Erro em ${rota}: ${erro.message}`);
  }
}

await browser.close();

console.log('Pronto! Os prints estão na pasta prints-sistema.');