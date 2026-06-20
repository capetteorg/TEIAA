// =============================================
// GERADOR DE PDF — AGENDO INTEGRA TEIAA
// Usa window.print() com CSS otimizado
// =============================================

const TEIAA_INFO = {
  nome: 'Associação TEIAA - Troca de Experiências e Integração entre Amigos de Autistas',
  cnpj: '27.837.768/0001-70',
  registros: [
    'Associação de Pais e Amigos de Autistas de Teresópolis',
    'CTA - Centro TEIAA de Atendimentos',
    'Atuação: inclusão social, defesa de direitos e apoio a pessoas com TEA',
    'Sistema AGENDO Integra para gestão institucional e prestação de contas',
  ],
  endereco: 'Rua Prefeito Sebastião Teixeira, 58, Várzea, Teresópolis — RJ, CEP 25953-200',
  whatsapp: '(21) 97335-8220',
  email: 'associacaoteiaa@gmail.com',
  site: 'www.associacaoteiaa.org.br',
}

// CSS base para todos os relatórios
const CSS_BASE = `
  /* === RESET E BASE === */
  * { box-sizing: border-box; margin: 0; padding: 0; }

  @page {
    size: A4 portrait;
    margin: 0;
  }
  @page landscape {
    size: A4 landscape;
    margin: 0;
  }
  @media print {
    html, body { background: #fff; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { page-break-inside: avoid; }
  }
  thead { display: table-header-group; }

  /* Variáveis */
  :root {
    --agendo: #0E7EA8;
    --agendo-dark: #06344F;
    --agendo-soft: #EAF5F8;
    --ink: #171A1F;
    --muted: #626B76;
    --soft: #F5F2EA;
    --line: #D7D0C2;
    --line-soft: #ECE6DA;
    --paper: #FFFEFA;
    --green: #2E6F3E;
    --red: #A7352C;
    --sans: Inter, Arial, sans-serif;
    --serif: Georgia, 'Times New Roman', serif;
  }

  body {
    font-family: var(--sans);
    font-size: 11px;
    color: var(--ink);
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* === WRAPPER DA PÁGINA === */
  .pg {
    width: 210mm;
    min-height: 297mm;
    padding: 16mm 17mm 18mm 14mm;
    position: relative;
    background: #fff;
    margin: 0 auto;
  }
  .pg-landscape {
    width: 297mm;
    min-height: 210mm;
    padding: 12mm 14mm 14mm;
  }

  /* === FAIXA AZUL LATERAL (identidade) === */
  .pg::before {
    content: '';
    position: fixed;
    top: 0; left: 0;
    width: 5px;
    height: 100%;
    background: linear-gradient(180deg, var(--agendo), var(--agendo-dark));
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* === CABEÇALHO INTERNO === */
  .cab {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 16px;
    align-items: flex-start;
    border-bottom: 1px solid var(--line);
    padding-bottom: 12px;
    margin-bottom: 20px;
  }
  .cab-nome {
    font-size: 13px;
    font-weight: 700;
    color: var(--agendo-dark);
    letter-spacing: -.01em;
    margin-bottom: 2px;
  }
  .cab-sub {
    font-size: 9px;
    color: var(--muted);
    line-height: 1.5;
  }
  .cab-dir {
    text-align: right;
    font-size: 8.5px;
    color: var(--muted);
    font-weight: 600;
    letter-spacing: .08em;
    text-transform: uppercase;
    line-height: 1.6;
  }
  .cab-dir span {
    display: block;
    color: var(--agendo);
  }

  /* === CABEÇALHO LOGO COMPLETO (capa e 1ª página) === */
  .cab-full {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
    padding-bottom: 14px;
    border-bottom: 2px solid var(--agendo);
  }
  .cab-full-dir {
    text-align: right;
    font-size: 9px;
    color: #5F6874;
    max-width: 380px;
    line-height: 1.5;
  }
  .cab-full-dir strong {
    font-size: 12px;
    color: var(--ink);
    display: block;
    margin-bottom: 2px;
  }
  .cab-full-dir .cnpj {
    font-size: 10px;
    font-weight: 700;
    color: var(--ink);
    margin-bottom: 3px;
  }
  .cab-registros {
    font-size: 7.5px;
    color: #9199A2;
    line-height: 1.5;
    text-align: right;
  }

  /* === TÍTULO DO DOCUMENTO === */
  .titulo-bloco {
    text-align: center;
    margin-bottom: 18px;
    padding: 14px;
    background: var(--agendo-soft);
    border-radius: 4px;
    border-top: 3px solid var(--agendo);
  }
  .titulo-principal {
    font-size: 14px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--agendo-dark);
  }
  .titulo-sub {
    font-size: 10px;
    color: var(--muted);
    margin-top: 3px;
  }
  .titulo-status {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 99px;
    font-size: 9.5px;
    font-weight: 700;
    margin-top: 5px;
  }
  .status-preliminar { background: #FAEEDA; color: #854F0B; }
  .status-final { background: #E8F4E8; color: #2E6F3E; }

  /* === GRIDS DE INFO === */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; font-size: 10px; }
  .info-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 14px; font-size: 10px; }
  .info-grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-bottom: 14px; font-size: 10px; }
  .info-item {
    background: #F8F7F2;
    border-radius: 4px;
    padding: 7px 10px;
    border: 1px solid var(--line-soft);
  }
  .info-label {
    color: #6B7280;
    font-size: 7.5px;
    margin-bottom: 2px;
    text-transform: uppercase;
    letter-spacing: .4px;
  }
  .info-valor { font-weight: 700; color: var(--ink); }

  /* === RESUMO FINANCEIRO === */
  .resumo-box {
    border: 1px solid var(--line);
    border-top: 3px solid var(--agendo);
    border-radius: 4px;
    padding: 12px 14px;
    margin-bottom: 16px;
    background: var(--paper);
  }
  .resumo-titulo {
    font-size: 9px;
    font-weight: 700;
    margin-bottom: 10px;
    color: var(--agendo-dark);
    text-transform: uppercase;
    letter-spacing: .5px;
  }
  .resumo-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }
  .resumo-item {
    text-align: center;
    background: #fff;
    border-radius: 4px;
    padding: 8px 6px;
    border: 1px solid var(--line-soft);
  }
  .resumo-label { font-size: 7.5px; color: #6B7280; margin-bottom: 3px; text-transform: uppercase; letter-spacing: .3px; }
  .resumo-valor { font-size: 13px; font-weight: 700; }
  .verde { color: var(--green); }
  .vermelho { color: var(--red); }
  .azul { color: var(--agendo); }

  /* === SEÇÕES === */
  .secao { margin-bottom: 18px; }
  .secao-titulo {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .8px;
    margin-bottom: 10px;
    padding: 6px 10px 6px 14px;
    border-left: 3px solid var(--agendo);
    background: var(--agendo-soft);
    color: var(--agendo-dark);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .secao-titulo-verde { border-left-color: var(--green); background: #EEF8F1; color: var(--green); }
  .secao-titulo-vermelho { border-left-color: var(--red); background: #FFF0F0; color: var(--red); }
  .secao-titulo-azul { border-left-color: var(--agendo); background: var(--agendo-soft); color: var(--agendo-dark); }

  /* === TABELAS EDITORIAIS === */
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  thead tr { background: #F2F6F7; }
  th {
    padding: 8px 9px;
    text-align: left;
    font-size: 8px;
    font-weight: 700;
    color: #525B66;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    letter-spacing: .12em;
    text-transform: uppercase;
  }
  td {
    padding: 7px 9px;
    border-bottom: 1px solid var(--line-soft);
    vertical-align: top;
    color: #20252C;
  }
  .total-row td {
    background: #F5F2EA !important;
    font-weight: 700;
    border-top: 1.5px solid var(--line);
    border-bottom: none;
  }
  .num { text-align: right; white-space: nowrap; }
  .center { text-align: center; }
  .muted { color: var(--muted); }

  /* Extrato — indicador entrada/saída */
  .ext-entrada td:first-child { border-left: 2px solid var(--green); }
  .ext-saida td:first-child { border-left: 2px solid var(--red); }

  /* === ALERTAS === */
  .alerta { padding: 8px 12px; border-radius: 4px; margin-bottom: 10px; font-size: 10px; }
  .alerta-critico { background: #FFF0F0; border-left: 3px solid var(--red); color: var(--red); }
  .alerta-aviso { background: #FFF6E8; border-left: 3px solid #C07A1A; color: #854F0B; }
  .alerta-ok { background: #EEF8F1; border-left: 3px solid var(--green); color: var(--green); }

  /* === ASSINATURAS === */
  .assinaturas { margin-top: 28px; padding-top: 14px; border-top: 1px solid var(--line); }
  .assin-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 28px; margin-top: 16px; }
  .assin-item { text-align: center; }
  .assin-linha { border-bottom: 1px solid #9199A2; margin-bottom: 6px; height: 44px; }
  .assin-label { font-size: 9px; color: var(--agendo-dark); font-weight: 700; }
  .assin-cargo { font-size: 8.5px; color: var(--muted); margin-top: 2px; }

  /* === RODAPÉ PRÓPRIO === */
  .rodape {
    margin-top: 20px;
    padding-top: 10px;
    border-top: 1px solid var(--line);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8.5px;
    color: var(--muted);
  }
  .rodape-sistema { font-size: 7.5px; color: #9199A2; }
`

// Gera o HTML do cabeçalho
function htmlCabecalho(opts = {}) {
  const tipo = opts.tipo || 'cab'  // 'cab' = compacto, 'full' = com logo e registros
  if (tipo === 'full') {
    return `
  <div class="cab-full">
    <div>
      <img src="https://teiaa.agendoas.com/logo.png" alt="TEIAA" style="height:56px;width:auto;object-fit:contain;display:block"
        onerror="this.outerHTML='<div style=\'display:flex;flex-direction:column;gap:2px\'><div style=\'font-size:20px;font-weight:900;color:#0E7EA8;letter-spacing:.04em\'>TEIAA</div><div style=\'font-size:9px;color:#888\'>Centro TEIAA de Atendimentos</div></div>'" />
    </div>
    <div class="cab-full-dir">
      <strong>${TEIAA_INFO.nome}</strong>
      <div class="cnpj">CNPJ: ${TEIAA_INFO.cnpj}</div>
      <div class="cab-registros">${TEIAA_INFO.registros.join('<br>')}</div>
    </div>
  </div>`
  }
  // compacto: cabeçalho de página interna
  return `
  <div class="cab">
    <div>
      <div class="cab-nome">${opts.titulo || 'Relatório Financeiro'}</div>
      <div class="cab-sub">${TEIAA_INFO.nome} · ${opts.sub || 'TEIAA'}</div>
    </div>
    <div class="cab-dir">
      AGENDO Integra<span>${opts.ref || ''}</span>
    </div>
  </div>`
}

// Gera o HTML do rodapé

// Imagens oficiais do timbrado TEAcolher (logo + apoiadores), extraídas do PDF oficial
// do projeto, usadas SOMENTE nos documentos que precisam ficar idênticos ao modelo
// oficial (Anexo I e Termo de Autorização de Imagem) — os demais relatórios do sistema
// continuam com a identidade visual do AGENDO Integra.
const TEACOLHER_HEADER_IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA+gAAADpCAIAAAA4dYqLAAByUElEQVR42uz997NcV3Yn+H7X2vucNNfhwgOEI0GAnqAp2vJGZVUyPVJ3q1ut6ZG6J173TEzEi3j/wnt/wXszPT3To1Z3SyppVCpJJZX3VfSeIEGAJCzh/bWZec7e6/t+OJkXFyz6IksscH0iA7w28+TJZN7v3rn22vKV//VROHdlUcsUsdh58fCp/cfOSGwZgoCBBGgQiJ8kd4UxsAXJor1UybqrZn7td2ptv6zIJhUQAPVz5K4ghCSwJITaA1RyNyBFG5s9ds3FgztKjoN+ltwVRQj4S7lzzjnnnHO/Ejy4O+ecc84558HdOeecc84558HdOeecc845D+7OOeecc845D+7OOeecc845D+7OOeecc855cHfOOeecc855cHfOOeecc85dLvopcM4555xz7v2MAviMu3POOeecc78SPLg755xzzjnnwd0555xzzjnnwd0555xzzjkP7s4555xzzjkP7s4555xzzjkP7s4555xzznlwd+5XBf0UuA8Y8ee9c85dqSJgfhbclTYeldpAaKHBRLMJiUxSxGSUbJy7shhkACqsQ/QYMySagEKwVKkh2c+Ru6IGqFSImYhJGwyiSZAkl5rG1CKEPoB1V2hwpwxjDC/97zDE1/r0nX3lF7mSf6zb/Uc/eD8D7+xXOPqQAFRERQKhIhTmYXBvnvb+8PnBXwFnQAASogAgKmwJ+iLJWAJZZAB2hRFsfsFP3wfkDFzBD9/waSzIkIqixjagwKJIZSQoYBK0+BZf5/3F0//v/xU6eCICwYcv7kqbiLHSqGZtWslcUCKoAhABJKCXBRjnftWxGacmiAAZqBWmAghEAZqwWJ54/E+3B/df/eBOhVFyAKgJFCiEpqGWuICihzwOejGwuwJFBH//1F15VBhERBVBRZCJYdWACMXIZuJ99LeAo78Or/rKm/7Ae30lv8jtvitX8oE9+F+lMyCjUCNZpBKELANllqzIpRjBAjKAeFWku7JYFLYhUJRgSSSB0WCsiD40X/p/xrkrKbgnLPhZcFdcbIeJiNaZF3I+AxQcTr0YiaVpmEtJCHjNr7zpD7zXV/KL3O67ciUf2IP/1TsDppBKZCBSWB7kOkvuSloBZKCAznu9r7uSCERyh0KRpGjB2pRxkZ7kSbNWNiZZoLffcFfkk//88Vk/C+7Ke1GngKK9qu5XVYaCkGVvuwrhNe7v+cHDiwV+WQ8fAAqUTZZnRtHm5Ko+5CSgQBcgvTbMXUmv8YRAgD5RG9pAR1AJ5hQtDjbkxbEg/ox3V+qTnz4N465IXsbuPuASMAeUQJdeNOCuOAoAA6AiWkApMGAOEGDSX/7dlRzczZKfBXeFMdSjPqdCgiLNOr1RpPdXdHelvZKDEagh85ASeUwADaQkYQTVlPRSGXdFPeMhpgJAMxnEmv6QtcBoJQwI3g7SXZmiiBeBuSsMiRKgNMXs0izeWwrr6jMx7gqMMSaQ5rmdEAjTYXUMAUJgvmWHu8Ke82IKIUghYQKBCCgVJFCjNh0jnbuiwg0BRPoz2115IWY008KfW51EeNGAuxIZoAESh899Gc5JQgymwiDe+dddea/0SkgGFNo0gcqCBKkhnm3clRjcReA17u7KfHIvj/DOfXCe9MPtUfXypbX+/4G7Qp/zsuxJTkCad5YU3k/GXcEjVg/uzjnnnHPOvf/5qNQ555xzzjkP7s4555xzzjkP7s4555xzznlwd84555xzznlwd84555xzznlwd84555xzzoO7c84555xzzoO7c84555xzzoO7c84555xzHtydc84555xzHtydc84555zz4O6cc84555zz4O6cc84555zz4O6cc84555wHd+ecc84555wHd+ecc84555wHd+ecc845537FRT8Fzjn3/kAgLftUALn8Y3kPb1mWfdzcIN/DG3TOOefB3TnnroD4jlFkbj7W9zZBc9m/r/qic8659xMh/eXZOeecc8659zufcXfOufeN15xIkff6Jl9v+kZ+CTfvnHPOg7tzzv2Kk1dl+V9+gPYid+ec8+DunHPutYIyYTQCEBUQIkvBnYSAoSluVH2XG4KZmYiICMnmX5KqwR8S55zz4O6cc+618jNrVTUzUlSVIAhARUQgTZAH0MTrd22sYFQNIshmNIoiqALImarv1u0455x7F/jiVOece18gDEiAkLAMUkLQ5hskREVUQALvcpgmaQYBIMMmkE2NjAg8tjvnnAd355xzr52hc2YMellX9UvhmZYJgeq71tPdDABes/TGMiBQ36bPOec8uDvnnFu+9pQESVWpBjh06MTBA0fPnV3o91O71V29etXmrdNXX7um3RIzgvJO68+XLXUdDQnSAOfOzpw9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"
const TEACOLHER_FOOTER_IMG = "data:image/png;base64,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kaduvm3GMFnB1772g5deOvL3//5f27tnHMBHPnrnv/2//uMf/uHX/9v/7hda7daJkyf27N3h+9nwyJAhW79lvVFFv6GbAnT//Q9t27qDvOgHP3hi6y98NDUXimBkZPwv/5UPpW8IwtFvfev+D33o9i9+8VuNpvvH//i/mp7KAZib/+C/+lf/7vc//9V/8N/8HMCFwmgSCxG+e+8TDzzwxC//9U/f8b7LATjBr//6n37+C/9l646/XSoXfvjEU5dftscv+NldyZDhLYScaRM02GAh1im7nEviIsObzUuzS/Bqq5ayJwwwip2ObXdct2dV3SW7d3S7ttns+MYkHYo6PQDWQRQ923Za94lPz0fPPf/yJz51++4rKg888njkIFAHwLQSbXFfEi1SWAAGfrephlVFk6TdihpO9c/+9OlvfOUHP//pn5qZDqPYGsJL+48sL5/8Sz9/Q2XMf/yJgwosLvYeeuiZ299/857dI50kiXrxWFX/5t/46btuv45UrcP37n3kmmsu/8jHrtn/8tPHjp4ODC2caj791BP33PO+vXvGk8R2enailv/0Zz71/IuvvHxo6eTc4u/+3ucbzRbA/UyqbPZlyPAehQGCVHlW4RTOKYio2Uief+HwTXeM3XTrFT98/EgnUqE2oMyUxNRoSLuXqLotWyaYwiefOPbiC4c/+VMfmZ7K9azt2t7MdPjpn/9LTz69//j8qvEL1vkceFbwnXufue766+543+XduBfFzjB+4bMfj6POow8/y6K/8ev/z/LCKoAswzNDhrfQdR/Oh6G0du9cmq5rAfi1F5ss4p4R97cBCseUWAePAsPseSYMvTgyX/3yg1OTUxO1QhKRJOV7v/3kb/y7P/2t3/jj/+Pf/N4rB08GlAPogfv3z8xs23VJ5fobLpufX3j55ZXA9wA4TRQuLUYFYlACgMkn9pLEERNISmHxiSde+eY3v/upn/notddNxiJeAKf44WMHt+zYsnkT3XjTlc8882K7g6XFVrerl+zd7VTB1vPFuq64bpJY39CBfXPtpr35psv3XDo5Ui0/+9QrgJ6eX202mnsv2aKqYJPLeaI6OTU5Mlp7+eXDs1umP/e5z1UrVYVmCg4ZMry3LWBandbf+HbiRBWExx8/7MR73x1XXHvt1k7De/LxgwEFChUBXGAMF3O+debBB54tFQvWirNu5/Yx1XTD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i4uLP856aq2zDG5TU1MoFMrNzYW/bij8t1o4cmRa6fycmBPhAx3tUyeNAU/OmzZv975Dj7+3dbebawRCKpUKMmAyGWIqIlJD8ouZVlpzX1mecgQDXxq9PfH1q1bOPOXUH31t7pKtq599+hEhxGfmXUioFWnSJDgnDZrUrV+97a033ywqKkqn0w888MC0aVOyIPjOO7/3zDPPVFdX79u379prr/n+97+XhZu333775z73ueuv/8L8+W8++OADCxYsyF6jn/3sZ8uXL6+urtZaP/jgg3l5+YiwcuXqq666auTIkQMDA7W1dU8//WRWW7V06dIbb7zh6aefOeecs6+//oZvfev2iy66EICSyfRVV125efOmoqKi73znO7/+9a/PO++841c/ezU554899thjjz02evTow4cPX3vttXfccUd2bbZq1aqrr746GAz6vp+Xl/fCCy/k5eVlxTPZWwUR+/v7r7/+ekTMy8urq6v79a9/bZomIv785z9/7rnnysvLOzs7H3300YkTJwLAkiVLnn766QMHDkQisSlTpjY2NgYCAUR28OC+00477YorPv/AA/e7rksEtm29/fbbX//610eOHNna2nriiSf+7ne/MwyDc3748OHLLrvM9/2sluaZZ54ZMWLEvzLP5f9E9wEpUB5piSbjZGilTQ6kkhr7NIVTfo42qrrTtGhlWoONgYojnZ1miFQkp6+7h/f0FPAcWxop8vpSrK+vLWiCgelIXshv0gpQKG5mvHhrhy2griTPPXIAMrJ54TqZ4M6AUuECyU0EQzOmCXwDDfzkjOgGI4qBCBgHIg0kgRkIyA1jat3wA6+/663djHaEFZUWzZpaOGosRSGBYGs0XAJNPGT4PFB01gWBtNj5/qJ3nn9xVk5R2ayZlzcMmTakrL03rdNuZUGwLOKYumPltle64vsgJkmjKQOlebUADhAHgEx3D5NKWoYC4ICybwDSGW1FlJacISn9X38A+hgRRQioKfs/AgBTGglRGIicM+YnEih9oU3OCELB8dddrdIyVF+rBfrZhgckIGR/lzda1i0FBrM4iYMOcFVYWjnHyAmR3wO96xPdmVAB9z1l2vxwc/yX9zzLAH/4w+ujEXTT0hBcImzduT0ZT55/3pk/uOG2Css54uQbzEgxaRqM20Zzfw/nnAf5sZWCI4lAawbAslCdMcY4IGgkrXzL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"

function htmlRodape(opts = {}) {
  const protocolo = opts.protocolo || ''
  return `
  <div class="rodape">
    <div>${TEIAA_INFO.endereco} · ${TEIAA_INFO.whatsapp} · ${TEIAA_INFO.email}</div>
    <div class="rodape-sistema">AGENDO Integra · Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}${protocolo ? ' · ' + protocolo : ''}</div>
  </div>`
}

// Gera assinaturas
function htmlAssinaturas(campos = ['Responsável Financeiro', 'Representante Legal / Diretoria', 'Responsável pela Conferência']) {
  const itens = campos.map(c => `
    <div class="assin-item">
      <div class="assin-linha"></div>
      <div class="assin-label">${c}</div>
    </div>`).join('')
  return `
  <div class="assinaturas">
    <div style="font-size:10px;color:#444;">Teresópolis — RJ, _______ de _________________ de _______</div>
    <div class="assin-grid">${itens}</div>
  </div>`
}

// Formata moeda
const fmt = v => 'R$ ' + Math.abs(Number(v)||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

// Abre janela de impressão
function abrirImpressao(html, titulo, paisagem = false) {
  const win = window.open('', '_blank')
  if (!win) {
    alert('O navegador bloqueou a janela do relatório. Permita pop-ups para este site e tente novamente.')
    return
  }
  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>
${CSS_BASE}
${paisagem ? '@page { size: A4 landscape; margin: 0; } .pg { width: 297mm; min-height: 210mm; padding: 12mm 14mm; }' : ''}
</style>
</head>
<body>${html}</body>
</html>`)
  win.document.close()
  win.focus()
  // Aguardar TODAS as imagens (logo) carregarem antes de imprimir
  const imgs = Array.from(win.document.images)
  const prontas = Promise.all(imgs.map(img =>
    img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r })
  ))
  const timeout = new Promise(r => setTimeout(r, 2500)) // máx 2,5s de espera
  Promise.race([prontas, timeout]).then(() => setTimeout(() => win.print(), 200))
}


// Cabeçalho completo com logo (capa de todos os documentos)
function cabFull(subtitulo) {
  return `
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0E7EA8;padding-bottom:11px;margin-bottom:18px">
    <div><img src="https://teiaa.agendoas.com/logo.png" alt="TEIAA" style="height:46px;width:auto;object-fit:contain;display:block" onerror="this.outerHTML='<div style=\'font-size:16px;font-weight:900;color:#0E7EA8;letter-spacing:.04em\'>TEIAA</div><div style=\'font-size:8px;color:#888\'>Centro TEIAA de Atendimentos</div>'" /></div>
    <div style="text-align:right;font-size:9px;color:#5F6874;max-width:260px;line-height:1.5">
      <div style="font-size:11px;font-weight:700;color:#20252C">${TEIAA_INFO.nome}</div>
      <div style="font-size:9.5px;font-weight:700;color:#20252C;margin:2px 0">CNPJ: ${TEIAA_INFO.cnpj}</div>
      <div style="font-size:7.5px;color:#9199A2;line-height:1.5">${TEIAA_INFO.registros.slice(0,3).join('<br>')}</div>
    </div>
  </div>
  ${subtitulo ? `<div style="font-size:9px;color:#626B76;margin-bottom:12px">${subtitulo}</div>` : ''}
  `
}

// Cabeçalho compacto (páginas internas)
function cabCompact(titulo, sub, ref) {
  return `
  <div style="display:grid;grid-template-columns:1fr auto;gap:16px;border-bottom:1px solid #D7D0C2;padding-bottom:10px;margin-bottom:16px">
    <div>
      <div style="font-size:14px;font-weight:700;color:#06344F;letter-spacing:-.01em">${titulo}</div>
      <div style="margin-top:3px;color:#66717E;font-size:9px">${sub}</div>
    </div>
    <div style="text-align:right;font-size:9px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:#06344F">
      AGENDO Integra<span style="display:block;margin-top:3px;color:#0E7EA8;font-weight:400;text-transform:none;letter-spacing:0">${ref}</span>
    </div>
  </div>`
}

// Título editorial (serif grande + linha dourada)
function tituloEditorial(kicker, linha1, linha2, periodo, badge) {
  return `
  <div style="font-size:9px;font-weight:700;color:#0E7EA8;letter-spacing:.18em;text-transform:uppercase;margin-bottom:7px">${kicker}</div>
  <div style="font-family:Georgia,serif;font-size:40px;line-height:.95;font-weight:400;letter-spacing:-.04em;color:#06344F;margin-bottom:9px">${linha1}${linha2?'<br>'+linha2:''}</div>
  <div style="width:65px;height:2px;background:#A98E54;margin-bottom:11px"></div>
  <div style="font-size:12px;color:#303944;margin-bottom:${badge?'10px':'16px'}">${periodo}</div>
  ${badge ? `<div style="margin-bottom:16px">${badge}</div>` : ''}
  `
}

// Grid de identificação 2x2
function metaGrid(itens) {
  const cells = itens.map((it, i) => {
    const odd = i % 2 === 0
    const lastTwo = i >= itens.length - 2
    return `<div style="padding:10px ${odd?'16px':'0'} 10px ${odd?'0':'16px'};${odd?'border-right:1px solid #ECE6DA;':''}${!lastTwo?'border-bottom:1px solid #ECE6DA;':''}">
      <div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:3px">${it.label}</div>
      <div style="font-size:11px;color:${it.cor||'#20252C'};font-weight:600">${it.val}</div>
      ${it.sub ? `<div style="font-size:9px;color:#626B76;margin-top:2px">${it.sub}</div>` : ''}
    </div>`
  }).join('')
  return `<div style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;margin:12px 0">${cells}</div>`
}

// Indicadores financeiros
function figuras(itens, cols) {
  const cells = itens.map((it, i) => `
    <div style="padding:11px 8px;${i<itens.length-1?'border-right:1px solid #ECE6DA;':''}">
      <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:5px">${it.label}</div>
      <div style="font-family:Georgia,serif;font-size:16px;color:${it.cor||'#20252C'}">${it.val}</div>
    </div>`).join('')
  return `<div style="display:grid;grid-template-columns:repeat(${cols||itens.length},1fr);border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;margin:12px 0">${cells}</div>`
}

// Cabeçalho de seção
function secTitle(texto) {
  return `<div style="font-family:Georgia,serif;font-size:17px;color:#06344F;margin:14px 0 9px;letter-spacing:-.02em">${texto}</div>`
}

// Rodapé
function rodape(protocolo) {
  return `
  <div style="border-top:1px solid #D7D0C2;padding-top:8px;display:flex;justify-content:space-between;color:#66717E;font-size:8.5px;margin-top:14px">
    <div>${TEIAA_INFO.endereco} · ${TEIAA_INFO.whatsapp} · ${TEIAA_INFO.email}</div>
    <div><strong style="color:#06344F">AGENDO Integra</strong> · ${protocolo}</div>
  </div>`
}

// Tabela padrão
function tabelaHeader(colunas) {
  const ths = colunas.map(c => `<th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:${c.align||'left'}">${c.label}</th>`).join('')
  return `<thead><tr>${ths}</tr></thead>`
}

// =============================================
// RELATÓRIO DE CONCILIAÇÃO
// =============================================
export function gerarPDFConciliacao(dados, dataInicio, dataFim, opts = {}) {
  const { lista, totalEnt, totalSai, saldo, contaDados } = dados

  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const periodoLabel = `${fmtData(dataInicio)} a ${fmtData(dataFim)}`
  const protocolo = `AG-TEIAA-${new Date().getFullYear()}-CONC`
  const dataEmissao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
  const contaNome = contaDados?.nome || 'Conta'
  const bancNome  = contaDados?.banco || '—'
  const agNome    = contaDados?.agencia || '—'
  const ctNum     = contaDados?.conta_num || '—'

  const conciliadas = lista.filter(m => m.conciliado).length
  const pendentes   = lista.filter(m => !m.conciliado).length
  const statusCor   = pendentes > 0 ? '#854F0B' : '#2E6F3E'
  const statusTxt   = pendentes > 0 ? `${pendentes} pendente(s)` : 'Totalmente conciliado'
  const statusBg    = pendentes > 0 ? '#FFF6ED' : '#EEF8F1'

  // ── Demonstrativo mensal ──
  const mesesMap = {}
  lista.forEach(m => {
    const mes = m.data?.slice(0,7)
    if (!mes) return
    if (!mesesMap[mes]) mesesMap[mes] = { ent:0, sai:0, qtd:0 }
    const v = Number(m.valor)
    if (v > 0) mesesMap[mes].ent += v
    else mesesMap[mes].sai += Math.abs(v)
    mesesMap[mes].qtd++
  })
  const linhasMensais = Object.entries(mesesMap).sort().map(([mes, d], i) => {
    const [ano, mo] = mes.split('-')
    const nomeMes = new Date(+ano, +mo-1, 1).toLocaleDateString('pt-BR', {month:'long', year:'numeric'})
    const res = d.ent - d.sai
    const resCor = res >= 0 ? '#2E6F3E' : '#A7352C'
    const bg = i % 2 === 0 ? '#fff' : '#F8F7F2'
    return `<tr style="background:${bg}">
      <td style="padding:7px 10px;border-bottom:1px solid #ECE6DA;font-size:10px">${nomeMes.charAt(0).toUpperCase()+nomeMes.slice(1)}</td>
      <td style="padding:7px 10px;text-align:right;border-bottom:1px solid #ECE6DA;color:#2E6F3E;font-weight:600;font-size:10px">${fmt(d.ent)}</td>
      <td style="padding:7px 10px;text-align:right;border-bottom:1px solid #ECE6DA;color:#A7352C;font-weight:600;font-size:10px">${fmt(d.sai)}</td>
      <td style="padding:7px 10px;text-align:right;border-bottom:1px solid #ECE6DA;color:${resCor};font-weight:700;font-size:10px">${res>=0?'+ ':'\u2212 '}${fmt(Math.abs(res))}</td>
      <td style="padding:7px 10px;text-align:right;border-bottom:1px solid #ECE6DA;color:#626B76;font-size:10px">${d.qtd}</td>
    </tr>`
  }).join('')

  // ── Linhas de detalhamento ──
  const linhas = lista.map((m, i) => {
    const isEnt  = Number(m.valor) > 0
    const partes = m._partes || []
    const fornecedor = m.fornecedor || m.lancamento?.fornecedor || '—'
    const numNota    = m.num_nota  || m.lancamento?.num_nota   || '—'
    const catTxt     = partes.length > 0 ? '' : (m.categoria?.nome || '—')
    const subCatTxt  = partes.length > 0 ? '' : (m.subcategoria?.nome || '')
    const bg = isEnt ? '#F5FBF0' : (i % 2 === 0 ? '#fff' : '#FEFEFE')
    const valCor = isEnt ? '#2E6F3E' : '#A7352C'
    const sinal  = isEnt ? '+' : '\u2212'

    const subLinhas = partes.map(p => `
      <tr style="background:#F8F7F4">
        <td style="padding:3px 8px;border-bottom:1px solid #ECE6DA"></td>
        <td colspan="2" style="padding:3px 8px 3px 20px;border-bottom:1px solid #ECE6DA;font-size:8px;color:#888;font-style:italic">
          └ ${p.descricao||'—'}
        </td>
        <td style="padding:3px 8px;border-bottom:1px solid #ECE6DA;font-size:8px;color:#626B76">${p.categoria?.nome||'—'}</td>
        <td style="padding:3px 8px;border-bottom:1px solid #ECE6DA;font-size:8px;color:#888">${p.subcategoria?.nome||'—'}</td>
        <td colspan="3" style="border-bottom:1px solid #ECE6DA"></td>
      </tr>`).join('')

    return `<tr style="background:${bg}">
      <td style="padding:6px 8px;border-bottom:1px solid #ECE6DA;white-space:nowrap;color:#626B76;font-size:9px">${fmtData(m.data)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ECE6DA;font-size:9px;max-width:180px">
        ${m.descricao||'—'}${partes.length>0?` <span style="font-size:8px;color:#0E7EA8;font-weight:600">(${partes.length})</span>`:''}
      </td>
      <td style="padding:6px 8px;border-bottom:1px solid #ECE6DA;font-size:8.5px;color:#444">${catTxt}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ECE6DA;font-size:8px;color:#888">${subCatTxt}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ECE6DA;font-size:8px;color:#888;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${fornecedor==='—'?'—':fornecedor.split(' ').slice(0,2).join(' ')}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ECE6DA;font-family:monospace;font-size:8px;color:#aaa">${numNota}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ECE6DA;text-align:right;font-weight:700;white-space:nowrap;font-size:9.5px;color:${valCor}">${sinal} ${fmt(Math.abs(Number(m.valor)))}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ECE6DA;text-align:center;font-weight:700;font-size:10px;color:${m.conciliado?'#2E6F3E':'#854F0B'}">${m.conciliado?'✓':'⏳'}</td>
    </tr>${subLinhas}`
  }).join('')

  const logoFallback = `<div style="font-size:16px;font-weight:900;color:#0E7EA8;letter-spacing:.04em">TEIAA</div><div style="font-size:8px;color:#888">Centro TEIAA de Atendimentos</div>`

  // ── Cabeçalho compacto para páginas internas ──
  const cabecalhoPagina = `
  <div style="display:grid;grid-template-columns:1fr auto;gap:20px;border-bottom:1.5px solid #0E7EA8;padding-bottom:10px;margin-bottom:16px;align-items:end">
    <div>
      <div style="font-size:7.5px;font-weight:700;color:#0E7EA8;letter-spacing:.15em;text-transform:uppercase;margin-bottom:3px">Conciliação Bancária · ${new Date().getFullYear()}</div>
      <div style="font-size:12px;font-weight:700;color:#06344F">${contaNome} · ${bancNome}</div>
      <div style="font-size:9px;color:#66717E;margin-top:2px">${periodoLabel}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:7.5px;font-weight:700;color:#06344F;letter-spacing:.1em;text-transform:uppercase">AGENDO Integra</div>
      <div style="font-size:9px;color:#0E7EA8;margin-top:2px">${protocolo}</div>
    </div>
  </div>`

  const rodapeHtml = `
  <div style="border-top:1px solid #D7D0C2;padding-top:8px;display:flex;justify-content:space-between;color:#9199A2;font-size:8px;margin-top:20px">
    <div>${TEIAA_INFO.endereco} · ${TEIAA_INFO.whatsapp} · ${TEIAA_INFO.email}</div>
    <div>AGENDO Integra · ${protocolo}</div>
  </div>`

  // ── TH helper ──
  const th = (txt, align='left') =>
    `<th style="background:#1A2535;color:#C8D0DA;font-size:7px;text-transform:uppercase;letter-spacing:.12em;padding:8px 8px;text-align:${align};font-weight:700;border:none">${txt}</th>`

  const html = `
  <div class="pg">

    <!-- ── CABEÇALHO COM LOGO ── -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #0E7EA8;padding-bottom:14px;margin-bottom:20px">
      <div>
        <img src="https://teiaa.agendoas.com/logo.png" alt="TEIAA"
          style="height:50px;width:auto;object-fit:contain;display:block"
          onerror="this.outerHTML='${logoFallback}'" />
      </div>
      <div style="text-align:right;font-size:9px;color:#5F6874;max-width:290px;line-height:1.6">
        <div style="font-size:12px;font-weight:700;color:#20252C;margin-bottom:2px">${TEIAA_INFO.nome}</div>
        <div style="font-size:9.5px;font-weight:700;color:#444;margin-bottom:3px">CNPJ: ${TEIAA_INFO.cnpj}</div>
        <div style="font-size:7.5px;color:#9199A2;line-height:1.6">${TEIAA_INFO.registros.slice(0,3).join('<br>')}</div>
      </div>
    </div>

    <!-- ── KICKER + TÍTULO ── -->
    <div style="font-size:9px;font-weight:700;color:#0E7EA8;letter-spacing:.2em;text-transform:uppercase;margin-bottom:8px">Documento Operacional</div>
    <div style="font-family:Georgia,serif;font-size:44px;line-height:.92;font-weight:400;letter-spacing:-.04em;color:#06344F;margin-bottom:10px">Conciliação<br>Bancária</div>
    <div style="width:60px;height:2.5px;background:#A98E54;margin-bottom:12px"></div>
    <div style="font-size:12px;color:#444;margin-bottom:20px">Período: <strong>${periodoLabel}</strong></div>

    <!-- ── 4 KPIs ── -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px">
      <div style="border-top:3px solid #2E6F3E;background:#F5FBF0;border-radius:4px;padding:10px 12px">
        <div style="font-size:7px;text-transform:uppercase;letter-spacing:.12em;color:#5A8060;margin-bottom:5px">Total Entradas</div>
        <div style="font-size:15px;font-weight:700;color:#2E6F3E">${fmt(totalEnt)}</div>
      </div>
      <div style="border-top:3px solid #A7352C;background:#FFF5F5;border-radius:4px;padding:10px 12px">
        <div style="font-size:7px;text-transform:uppercase;letter-spacing:.12em;color:#8A4040;margin-bottom:5px">Total Saídas</div>
        <div style="font-size:15px;font-weight:700;color:#A7352C">${fmt(totalSai)}</div>
      </div>
      <div style="border-top:3px solid #0E7EA8;background:#EAF5F8;border-radius:4px;padding:10px 12px">
        <div style="font-size:7px;text-transform:uppercase;letter-spacing:.12em;color:#1A6080;margin-bottom:5px">Saldo do Período</div>
        <div style="font-size:15px;font-weight:700;color:${saldo>=0?'#2E6F3E':'#A7352C'}">${saldo>=0?'+ ':'\u2212 '}${fmt(Math.abs(saldo))}</div>
      </div>
      <div style="border-top:3px solid #6B7280;background:#F8F7F2;border-radius:4px;padding:10px 12px">
        <div style="font-size:7px;text-transform:uppercase;letter-spacing:.12em;color:#5F6874;margin-bottom:5px">Movimentações</div>
        <div style="font-size:15px;font-weight:700;color:#1A1F1C">${lista.length.toLocaleString('pt-BR')}</div>
      </div>
    </div>

    <!-- ── METADADOS ── -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #E0DDD5;border-radius:4px;margin-bottom:20px;overflow:hidden">
      <div style="padding:10px 12px;border-right:1px solid #E0DDD5;background:#FAFAF8">
        <div style="font-size:7px;text-transform:uppercase;letter-spacing:.12em;color:#888780;margin-bottom:4px">Instituição</div>
        <div style="font-size:9.5px;font-weight:600;color:#1A1F1C;line-height:1.3">${TEIAA_INFO.nome}</div>
        <div style="font-size:8px;color:#888780;margin-top:2px">${TEIAA_INFO.cnpj}</div>
      </div>
      <div style="padding:10px 12px;border-right:1px solid #E0DDD5;background:#FAFAF8">
        <div style="font-size:7px;text-transform:uppercase;letter-spacing:.12em;color:#888780;margin-bottom:4px">Conta analisada</div>
        <div style="font-size:9.5px;font-weight:600;color:#1A1F1C">${contaNome}</div>
        <div style="font-size:8px;color:#888780;margin-top:2px">${bancNome} · Ag. ${agNome} · Cc. ${ctNum}</div>
      </div>
      <div style="padding:10px 12px;border-right:1px solid #E0DDD5;background:#FAFAF8">
        <div style="font-size:7px;text-transform:uppercase;letter-spacing:.12em;color:#888780;margin-bottom:4px">Protocolo</div>
        <div style="font-size:9.5px;font-weight:600;color:#1A1F1C">${protocolo}</div>
        <div style="font-size:8px;color:#888780;margin-top:2px">Emitido em ${dataEmissao}</div>
      </div>
      <div style="padding:10px 12px;background:${statusBg}">
        <div style="font-size:7px;text-transform:uppercase;letter-spacing:.12em;color:#888780;margin-bottom:4px">Status</div>
        <div style="font-size:9.5px;font-weight:700;color:${statusCor}">${statusTxt}</div>
        <div style="font-size:8px;color:#888780;margin-top:2px">${conciliadas} conciliadas · ${pendentes} pendentes</div>
      </div>
    </div>

    <!-- ── DEMONSTRATIVO MENSAL ── -->
    <div style="font-family:Georgia,serif;font-size:19px;color:#06344F;margin-bottom:10px;letter-spacing:-.02em">Demonstrativo mensal</div>
    <table style="border-collapse:collapse;width:100%;border-radius:4px;overflow:hidden">
      <thead>
        <tr>
          ${th('Mês')}
          ${th('Entradas','right')}
          ${th('Saídas','right')}
          ${th('Resultado','right')}
          ${th('Movs.','right')}
        </tr>
      </thead>
      <tbody>
        ${linhasMensais}
        <tr style="background:#F0EDE4;font-weight:700;border-top:2px solid #1A2535">
          <td style="padding:9px 10px;font-size:10.5px;color:#1A1F1C">Total do período</td>
          <td style="padding:9px 10px;text-align:right;font-size:10.5px;color:#2E6F3E">${fmt(totalEnt)}</td>
          <td style="padding:9px 10px;text-align:right;font-size:10.5px;color:#A7352C">${fmt(totalSai)}</td>
          <td style="padding:9px 10px;text-align:right;font-size:10.5px;color:${saldo>=0?'#2E6F3E':'#A7352C'}">${saldo>=0?'+ ':'\u2212 '}${fmt(Math.abs(saldo))}</td>
          <td style="padding:9px 10px;text-align:right;font-size:10.5px;color:#626B76">${lista.length}</td>
        </tr>
      </tbody>
    </table>

    ${rodapeHtml}
  </div>

  <!-- ── PÁGINAS DE DETALHAMENTO ── -->
  <div class="pg page-break">
    ${cabecalhoPagina}

    <div style="font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;padding:7px 12px 7px 14px;border-left:3px solid #0E7EA8;background:#EAF5F8;color:#06344F;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
      <span>⇅ Detalhamento das movimentações (${lista.length})</span>
      <span style="font-size:8px;font-weight:400;color:#0E7EA8">
        <span style="display:inline-block;width:10px;height:10px;background:#F5FBF0;border:1px solid #2E6F3E;border-radius:2px;vertical-align:middle;margin-right:3px"></span>Entrada &nbsp;
        <span style="display:inline-block;width:10px;height:10px;background:#FFF5F5;border:1px solid #A7352C;border-radius:2px;vertical-align:middle;margin-right:3px"></span>Saída
      </span>
    </div>

    <table style="font-size:9px;border-collapse:collapse;width:100%">
      <thead>
        <tr>
          ${th('Data')}
          ${th('Descrição / Fornecedor')}
          ${th('Categoria')}
          ${th('Subcategoria')}
          ${th('Fornecedor')}
          ${th('Nº Nota')}
          ${th('Valor','right')}
          ${th('✓','center')}
        </tr>
      </thead>
      <tbody>
        ${linhas}
        <tr style="background:#F0EDE4;font-weight:700;border-top:2px solid #1A2535">
          <td colspan="6" style="padding:8px 8px;font-size:10px;color:#1A1F1C">Saldo do período</td>
          <td style="padding:8px 8px;text-align:right;font-size:10.5px;color:${saldo>=0?'#2E6F3E':'#A7352C'}">${saldo>=0?'+ ':'\u2212 '}${fmt(Math.abs(saldo))}</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    ${opts.assinaturas ? htmlAssinaturas(['Responsável pela Administração', 'Representante Legal', 'Conselho Fiscal']) : ''}
    ${rodapeHtml}
  </div>`

  abrirImpressao(html, 'Relatório de Conciliação', true)
}


// =============================================
// RELATÓRIO FINANCEIRO GERAL
// =============================================

export function gerarPDFRelatorio(dados, dataInicio, dataFim, opts = {}) {
  const { entradas, saidas, totalEnt, totalSai, saldo, lista, contaDados, saldoInicialBancario, saldoFinalBancario } = dados

  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const periodoLabel = `${fmtData(dataInicio)} a ${fmtData(dataFim)}`

  const infoConta = contaDados ? `
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">
    <div class="info-item"><div class="info-label">Conta</div><div class="info-valor">${contaDados.nome || '—'}</div></div>
    <div class="info-item"><div class="info-label">Banco</div><div class="info-valor">${contaDados.banco || '—'}</div></div>
    <div class="info-item"><div class="info-label">Agência</div><div class="info-valor">${contaDados.agencia || '—'}</div></div>
    <div class="info-item"><div class="info-label">Número da conta</div><div class="info-valor">${contaDados.conta_num || contaDados.numero || '—'}</div></div>
  </div>` : `<div style="margin-bottom:16px;padding:8px 12px;background:#F8F7F2;border-radius:6px;font-size:10px;color:#888">Todas as contas</div>`

  // Agrupar entradas por categoria
  const grupoEnt = {}
  entradas.forEach(m => {
    const cat = m.categoria?.nome || 'Sem categoria'
    if (!grupoEnt[cat]) grupoEnt[cat] = { total: 0, qtd: 0 }
    grupoEnt[cat].total += Math.abs(Number(m.valor))
    grupoEnt[cat].qtd++
  })

  // Agrupar saídas por categoria
  const grupoSai = {}
  saidas.forEach(m => {
    const cat = m.categoria?.nome || 'Sem categoria'
    if (!grupoSai[cat]) grupoSai[cat] = { total: 0, qtd: 0 }
    grupoSai[cat].total += Math.abs(Number(m.valor))
    grupoSai[cat].qtd++
  })

  // Linhas de resumo entradas
  const linhasResEnt = Object.entries(grupoEnt).sort((a,b)=>b[1].total-a[1].total).map(([cat,info]) => {
    return `<tr>
      <td>${cat}</td>
      <td class="center">${info.qtd}</td>
      <td class="num verde">${fmt(info.total)}</td>
      <td class="num">${totalEnt>0?Math.round(info.total/totalEnt*100):0}%</td>
    </tr>`
  }).join('')

  // Linhas de resumo saídas
  const linhasResSai = Object.entries(grupoSai).sort((a,b)=>b[1].total-a[1].total).map(([cat,info]) => {
    return `<tr>
      <td>${cat}</td>
      <td class="center">${info.qtd}</td>
      <td class="num vermelho">${fmt(info.total)}</td>
      <td class="num">${totalSai>0?Math.round(info.total/totalSai*100):0}%</td>
    </tr>`
  }).join('')

  // Linhas detalhadas de entradas
  const linhasDetEnt = entradas.map((m, i) => `<tr>
    <td style="white-space:nowrap">${fmtData(m.data)}</td>
    <td>${m.categoria?.nome || '—'}</td>
    <td style="color:#888">${m.subcategoria?.nome || '—'}</td>
    <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.descricao || '—'}</td>
    <td class="num verde">${fmt(m.valor)}</td>
  </tr>`).join('')

  // Linhas detalhadas de saídas
  const linhasDetSai = saidas.map((m, i) => `<tr>
    <td style="white-space:nowrap">${fmtData(m.data)}</td>
    <td>${m.categoria?.nome || '—'}</td>
    <td style="color:#888">${m.subcategoria?.nome || '—'}</td>
    <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.descricao || '—'}</td>
    <td class="num vermelho">${fmt(Math.abs(Number(m.valor)))}</td>
  </tr>`).join('')

  // Linhas do extrato cronológico
  const linhasExtrato = lista.map((m) => {
    const isEnt = Number(m.valor) > 0
    return `<tr class="${isEnt ? 'ext-entrada' : 'ext-saida'}">
      <td style="white-space:nowrap">${fmtData(m.data)}</td>
      <td style="font-weight:600;color:${isEnt?'#3B6D11':'#A32D2D'}">${isEnt ? '↑ Entrada' : '↓ Saída'}</td>
      <td>${m.categoria?.nome || '—'}</td>
      <td style="color:#888;font-size:9px">${m.subcategoria?.nome || '—'}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px">${m.descricao || '—'}</td>
      <td class="num" style="font-weight:700;color:${isEnt?'#3B6D11':'#A32D2D'}">${isEnt ? '+' : '-'} ${fmt(Math.abs(Number(m.valor)))}</td>
    </tr>`
  }).join('')

  const temSaldoBancario = saldoInicialBancario != null && saldoFinalBancario != null
  const cardsSaldoBancario = temSaldoBancario ? `
      <div class="resumo-item"><div class="resumo-label">Saldo Bancário Inicial</div><div class="resumo-valor azul">${fmt(saldoInicialBancario)}</div></div>
      <div class="resumo-item"><div class="resumo-label">Saldo Bancário Final</div><div class="resumo-valor azul">${fmt(saldoFinalBancario)}</div></div>
    ` : ''
  const colunasResumo = temSaldoBancario ? 6 : 4

  const anoRelatorio = dataFim ? new Date(dataFim+'T12:00:00').getFullYear() : new Date().getFullYear()
  const protocolo = `AG-TEIAA-${anoRelatorio}-RF`
  const dataEmissao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
  const contaNome = contaDados?.nome || 'Todas as contas'
  const bancNome = contaDados?.banco || '—'
  const agNome = contaDados?.agencia || '—'
  const ctNum = contaDados?.conta_num || contaDados?.numero || '—'

  // Demonstrativo mensal (agrupa por mês)
  const mesesMap = {}
  lista.forEach(m => {
    const mes = m.data?.slice(0,7)
    if (!mes) return
    if (!mesesMap[mes]) mesesMap[mes] = { ent: 0, sai: 0, qtd: 0 }
    const v = Number(m.valor)
    if (v > 0) mesesMap[mes].ent += v
    else mesesMap[mes].sai += Math.abs(v)
    mesesMap[mes].qtd++
  })
  const linhasMensais = Object.entries(mesesMap).sort().map(([mes, d]) => {
    const [ano, mo] = mes.split('-')
    const nomeMes = new Date(+ano, +mo-1, 1).toLocaleDateString('pt-BR', { month:'long', year:'numeric' })
    const resultado = d.ent - d.sai
    return `<tr>
      <td style="text-transform:capitalize">${nomeMes}</td>
      <td class="num verde">${fmt(d.ent)}</td>
      <td class="num vermelho">${fmt(d.sai)}</td>
      <td class="num ${resultado>=0?'verde':'vermelho'}">${resultado>=0?'+':'-'} ${fmt(resultado)}</td>
      <td class="num">${d.qtd}</td>
    </tr>`
  }).join('')

  const html = `
  <div class="pg">
    <!-- CAPA -->
    ${htmlCabecalho({ tipo: 'full' })}

    <div style="margin-top:48px">
      <div style="font-size:10px;font-weight:700;color:var(--agendo);letter-spacing:.18em;text-transform:uppercase;margin-bottom:14px">
        Documento institucional
      </div>
      <div style="font-family:Georgia,serif;font-size:52px;line-height:.96;font-weight:400;letter-spacing:-.04em;color:var(--agendo-dark);margin-bottom:20px">
        Relatório<br>Financeiro
      </div>
      <div style="width:120px;height:2px;background:#A98E54;margin-bottom:28px"></div>
      <div style="font-size:14px;color:#303944;line-height:1.55;margin-bottom:36px">
        Exercício ${anoRelatorio} &nbsp;·&nbsp; Período: ${periodoLabel}
      </div>
    </div>

    <div style="margin-top:40px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)">
      <div style="display:grid;grid-template-columns:1fr 1fr">
        <div style="padding:16px 20px 16px 0;border-right:1px solid var(--line-soft)">
          <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:.13em;color:#6B7280;margin-bottom:7px">Instituição</div>
          <div style="font-size:13px;color:#20252C;font-weight:600">${TEIAA_INFO.nome}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">CNPJ: ${TEIAA_INFO.cnpj}</div>
        </div>
        <div style="padding:16px 0 16px 20px">
          <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:.13em;color:#6B7280;margin-bottom:7px">Conta analisada</div>
          <div style="font-size:13px;color:#20252C;font-weight:600">${contaNome}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">${bancNome} · Ag. ${agNome} · Cc. ${ctNum}</div>
        </div>
        <div style="padding:16px 20px 16px 0;border-right:1px solid var(--line-soft);border-top:1px solid var(--line-soft)">
          <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:.13em;color:#6B7280;margin-bottom:7px">Sistema gerador</div>
          <div style="font-size:13px;color:#20252C">AGENDO Integra</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">Gestão integrada para OSCs</div>
        </div>
        <div style="padding:16px 0 16px 20px;border-top:1px solid var(--line-soft)">
          <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:.13em;color:#6B7280;margin-bottom:7px">Protocolo de emissão</div>
          <div style="font-size:13px;color:#20252C;font-weight:600">${protocolo}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">Emitido em ${dataEmissao}</div>
        </div>
      </div>
    </div>

    <div style="position:absolute;bottom:40px;left:17mm;right:17mm;border-top:1px solid var(--line);padding-top:12px;display:flex;justify-content:space-between;color:#59636F;font-size:10px">
      <div><strong style="color:var(--agendo-dark)">AGENDO Integra</strong> · Gestão integrada para OSCs</div>
      <div>${protocolo}</div>
    </div>
  </div>

  <!-- PÁGINA 2: FICHA TÉCNICA + RESUMO EXECUTIVO -->
  <div class="pg page-break">
    ${htmlCabecalho({ titulo: 'Relatório Financeiro — ' + anoRelatorio, sub: periodoLabel, ref: protocolo })}

    <div style="font-family:Georgia,serif;font-size:26px;color:var(--agendo-dark);margin-bottom:20px;letter-spacing:-.02em">Ficha técnica</div>

    <table style="margin-bottom:24px;font-size:11px">
      <tbody>
        <tr><td style="color:#6B7280;width:40%;padding:9px 9px 9px 0;border-bottom:1px solid var(--line-soft)">Instituição titular</td><td style="font-weight:600;border-bottom:1px solid var(--line-soft)">${TEIAA_INFO.nome}</td></tr>
        <tr><td style="color:#6B7280;padding:9px 9px 9px 0;border-bottom:1px solid var(--line-soft)">CNPJ</td><td style="border-bottom:1px solid var(--line-soft)">${TEIAA_INFO.cnpj}</td></tr>
        <tr><td style="color:#6B7280;padding:9px 9px 9px 0;border-bottom:1px solid var(--line-soft)">Sistema gerador</td><td style="border-bottom:1px solid var(--line-soft)">AGENDO Integra — Gestão integrada para OSCs</td></tr>
        <tr><td style="color:#6B7280;padding:9px 9px 9px 0;border-bottom:1px solid var(--line-soft)">Protocolo de emissão</td><td style="font-weight:600;border-bottom:1px solid var(--line-soft)">${protocolo}</td></tr>
        <tr><td style="color:#6B7280;padding:9px 9px 9px 0;border-bottom:1px solid var(--line-soft)">Conta analisada</td><td style="border-bottom:1px solid var(--line-soft)">${contaNome} · ${bancNome} · Ag. ${agNome} · Cc. ${ctNum}</td></tr>
        <tr><td style="color:#6B7280;padding:9px 9px 9px 0;border-bottom:1px solid var(--line-soft)">Período</td><td style="border-bottom:1px solid var(--line-soft)">${periodoLabel}</td></tr>
        <tr><td style="color:#6B7280;padding:9px 9px 9px 0;border-bottom:1px solid var(--line-soft)">Tipo de emissão</td><td style="border-bottom:1px solid var(--line-soft)">${opts.assinaturas ? 'Para assinatura e arquivo' : 'Conferência interna'}</td></tr>
        <tr><td style="color:#6B7280;padding:9px 9px 9px 0">Data de emissão</td><td>${dataEmissao}</td></tr>
      </tbody>
    </table>

    <div style="font-family:Georgia,serif;font-size:26px;color:var(--agendo-dark);margin-bottom:16px;letter-spacing:-.02em">Resumo executivo</div>

    <div style="font-size:12px;line-height:1.65;color:#303842;margin-bottom:20px">
      O presente relatório consolida as movimentações financeiras registradas na ${contaNome} da TEIAA, conforme dados lançados no sistema AGENDO Integra, para fins de conferência interna, acompanhamento institucional e suporte à prestação de contas.
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);margin:20px 0 28px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)">
      ${temSaldoBancario ? `
      <div style="padding:16px 14px;border-right:1px solid var(--line-soft)">
        <div style="font-size:8.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.12em;margin-bottom:8px">Saldo Bancário Inicial</div>
        <div style="font-family:Georgia,serif;font-size:20px;color:var(--agendo)">${fmt(saldoInicialBancario)}</div>
      </div>
      <div style="padding:16px 14px;border-right:1px solid var(--line-soft)">
        <div style="font-size:8.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.12em;margin-bottom:8px">Saldo Bancário Final</div>
        <div style="font-family:Georgia,serif;font-size:20px;color:var(--agendo)">${fmt(saldoFinalBancario)}</div>
      </div>` : ''}
      <div style="padding:16px 14px;border-right:1px solid var(--line-soft)">
        <div style="font-size:8.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.12em;margin-bottom:8px">Total de Entradas</div>
        <div style="font-family:Georgia,serif;font-size:20px;color:var(--green)">${fmt(totalEnt)}</div>
      </div>
      <div style="padding:16px 14px;border-right:1px solid var(--line-soft)">
        <div style="font-size:8.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.12em;margin-bottom:8px">Total de Saídas</div>
        <div style="font-family:Georgia,serif;font-size:20px;color:var(--red)">${fmt(totalSai)}</div>
      </div>
      <div style="padding:16px 14px">
        <div style="font-size:8.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.12em;margin-bottom:8px">Resultado do Período</div>
        <div style="font-family:Georgia,serif;font-size:20px;color:${saldo>=0?'var(--green)':'var(--red)'}">${saldo>=0?'+':'-'} ${fmt(saldo)}</div>
      </div>
    </div>

    ${htmlRodape({ protocolo })}
  </div>

  <!-- PÁGINA 3: CATEGORIAS -->
  <div class="pg page-break">
    ${htmlCabecalho({ titulo: 'Relatório Financeiro — ' + anoRelatorio, sub: periodoLabel, ref: protocolo })}

    <div class="secao">
      <div class="secao-titulo secao-titulo-verde">▲ Entradas por Categoria</div>
      <table>
        <thead><tr><th>Categoria</th><th class="center">Qtd</th><th class="num">Total</th><th class="num">%</th></tr></thead>
        <tbody>
          ${linhasResEnt || '<tr><td colspan="4" style="text-align:center;color:#888">Sem entradas</td></tr>'}
          <tr class="total-row"><td><strong>TOTAL ENTRADAS</strong></td><td></td><td class="num verde"><strong>${fmt(totalEnt)}</strong></td><td class="num"><strong>100%</strong></td></tr>
        </tbody>
      </table>
    </div>

    <div class="secao" style="margin-top:20px">
      <div class="secao-titulo secao-titulo-vermelho">▼ Saídas por Categoria</div>
      <table>
        <thead><tr><th>Categoria</th><th class="center">Qtd</th><th class="num">Total</th><th class="num">%</th></tr></thead>
        <tbody>
          ${linhasResSai || '<tr><td colspan="4" style="text-align:center;color:#888">Sem saídas</td></tr>'}
          <tr class="total-row"><td><strong>TOTAL SAÍDAS</strong></td><td></td><td class="num vermelho"><strong>${fmt(totalSai)}</strong></td><td class="num"><strong>100%</strong></td></tr>
        </tbody>
      </table>
    </div>

    ${htmlRodape({ protocolo })}
  </div>

  <!-- PÁGINA 4: DEMONSTRATIVO MENSAL -->
  <div class="pg page-break">
    ${htmlCabecalho({ titulo: 'Relatório Financeiro — ' + anoRelatorio, sub: periodoLabel, ref: protocolo })}

    <div style="font-family:Georgia,serif;font-size:26px;color:var(--agendo-dark);margin-bottom:16px;letter-spacing:-.02em">Demonstrativo mensal</div>

    <table style="font-size:11px">
      <thead>
        <tr style="background:var(--agendo-dark)">
          <th style="color:#fff;background:var(--agendo-dark)">Mês</th>
          <th class="num" style="color:#fff;background:var(--agendo-dark)">Entradas</th>
          <th class="num" style="color:#fff;background:var(--agendo-dark)">Saídas</th>
          <th class="num" style="color:#fff;background:var(--agendo-dark)">Resultado</th>
          <th class="num" style="color:#fff;background:var(--agendo-dark)">Movs.</th>
        </tr>
      </thead>
      <tbody>
        ${linhasMensais || '<tr><td colspan="5" style="text-align:center;color:#888">Sem movimentações</td></tr>'}
        <tr class="total-row">
          <td><strong>TOTAL DO PERÍODO</strong></td>
          <td class="num verde"><strong>${fmt(totalEnt)}</strong></td>
          <td class="num vermelho"><strong>${fmt(totalSai)}</strong></td>
          <td class="num ${saldo>=0?'verde':'vermelho'}"><strong>${saldo>=0?'+':'-'} ${fmt(saldo)}</strong></td>
          <td class="num"><strong>${lista.length}</strong></td>
        </tr>
      </tbody>
    </table>

    ${htmlRodape({ protocolo })}
  </div>

  <!-- PÁGINAS SEGUINTES: DETALHAMENTO -->
  <div class="pg page-break">
    ${htmlCabecalho({ titulo: 'Relatório Financeiro — ' + anoRelatorio, sub: periodoLabel, ref: protocolo })}

    <div class="secao">
      <div class="secao-titulo secao-titulo-verde">▲ Detalhamento de Entradas (${entradas.length} registros)</div>
      <table style="font-size:9.5px">
        <thead><tr><th>Data</th><th>Categoria</th><th>Subcategoria</th><th>Descrição</th><th class="num">Valor</th></tr></thead>
        <tbody>
          ${linhasDetEnt || '<tr><td colspan="5" style="text-align:center;color:#888">Sem entradas</td></tr>'}
          <tr class="total-row"><td colspan="4"><strong>TOTAL ENTRADAS</strong></td><td class="num verde"><strong>${fmt(totalEnt)}</strong></td></tr>
        </tbody>
      </table>
    </div>

    ${htmlRodape({ protocolo })}
  </div>

  <div class="pg page-break">
    ${htmlCabecalho({ titulo: 'Relatório Financeiro — ' + anoRelatorio, sub: periodoLabel, ref: protocolo })}

    <div class="secao">
      <div class="secao-titulo secao-titulo-vermelho">▼ Detalhamento de Saídas (${saidas.length} registros)</div>
      <table style="font-size:9.5px">
        <thead><tr><th>Data</th><th>Categoria</th><th>Subcategoria</th><th>Descrição</th><th class="num">Valor</th></tr></thead>
        <tbody>
          ${linhasDetSai || '<tr><td colspan="5" style="text-align:center;color:#888">Sem saídas</td></tr>'}
          <tr class="total-row"><td colspan="4"><strong>TOTAL SAÍDAS</strong></td><td class="num vermelho"><strong>${fmt(totalSai)}</strong></td></tr>
        </tbody>
      </table>
    </div>

    ${htmlRodape({ protocolo })}
  </div>

<!-- PÁGINA FINAL: ENCAMINHAMENTO E ASSINATURAS -->
  ${opts.assinaturas ? `
  <div class="pg page-break">
    ${htmlCabecalho({ titulo: 'Relatório Financeiro — ' + anoRelatorio, sub: periodoLabel, ref: protocolo })}

    <div style="font-family:Georgia,serif;font-size:26px;color:var(--agendo-dark);margin-bottom:20px;letter-spacing:-.02em">Encaminhamento institucional</div>

    <div style="font-size:12px;line-height:1.7;color:#303842;margin-bottom:24px">
      Declaramos, para fins de conferência interna, prestação de contas e acompanhamento institucional, que o presente relatório consolida as movimentações financeiras registradas no sistema AGENDO Integra referentes ao período de <strong>${periodoLabel}</strong>.
    </div>

    <div style="font-size:11.5px;color:#303842;margin:32px 0 52px">
      Teresópolis — RJ, _______ de _________________________ de _______.
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:52px 40px">
      ${['Presidente / Representante Legal','Responsável pela Emissão','Responsável Financeiro','Conselho Fiscal — Membro 1','Conselho Fiscal — Membro 2','Conselho Fiscal — Membro 3'].map(n => `
      <div>
        <div style="height:50px;border-bottom:1px solid #9199A2;margin-bottom:8px"></div>
        <div style="font-size:11px;font-weight:700;color:var(--agendo-dark)">${n}</div>
      </div>`).join('')}
    </div>

    <div style="margin-top:40px;border:1px dashed #A8A08F;padding:16px 18px;color:#555E6A;font-size:11px;line-height:1.55;background:#FFFEFA">
      <div style="font-weight:700;margin-bottom:6px;color:var(--agendo-dark)">Espaço reservado para assinatura eletrônica</div>
      Assinatura eletrônica GOV.BR ou certificação digital, quando aplicável.
    </div>

    ${htmlRodape({ protocolo })}
  </div>` : ''}
`
  abrirImpressao(html, 'Relatório Financeiro')
}

export function gerarPDFTransparencia(dados, mes) {
  const { totalEnt, totalSai, grupoEnt, grupoSai } = dados
  const mesLabel = new Date(mes+'-15').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})

  const linhasEnt = Object.entries(grupoEnt).sort((a,b)=>b[1]-a[1]).map(([cat,val]) => {
    const total = Object.values(grupoEnt).reduce((a,v)=>a+v,0)
    return `<tr><td>${cat}</td><td class="num verde">${fmt(val)}</td><td class="num">${total>0?Math.round(val/total*100):0}%</td></tr>`
  }).join('')

  const linhasSai = Object.entries(grupoSai).sort((a,b)=>b[1]-a[1]).map(([cat,val]) => {
    const total = Object.values(grupoSai).reduce((a,v)=>a+v,0)
    return `<tr><td>${cat}</td><td class="num vermelho">${fmt(val)}</td><td class="num">${total>0?Math.round(val/total*100):0}%</td></tr>`
  }).join('')

  const protocolo = `AG-TEIAA-${new Date().getFullYear()}-TP`
  const dataEmissao = new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})
  const saldo = totalEnt - totalSai

  const linhasEnt2 = Object.entries(grupoEnt).sort((a,b)=>b[1]-a[1]).map(([cat,val]) =>
    `<tr><td>${cat}</td><td style="text-align:right;color:#2E6F3E;white-space:nowrap">${fmt(val)}</td><td style="text-align:right">${totalEnt>0?Math.round(val/totalEnt*100):0}%</td></tr>`
  ).join('')

  const linhasSai2 = Object.entries(grupoSai).sort((a,b)=>b[1]-a[1]).map(([cat,val]) =>
    `<tr><td>${cat}</td><td style="text-align:right;color:#A7352C;white-space:nowrap">${fmt(val)}</td><td style="text-align:right">${totalSai>0?Math.round(val/totalSai*100):0}%</td></tr>`
  ).join('')

  const html = `
  <div class="pg">
    ${cabFull()}
    ${tituloEditorial('Documento público','Transparência','Financeira',`Competência: ${mesLabel}`)}

    <div style="border-left:3px solid #0E7EA8;padding:10px 14px;background:#EAF5F8;margin:12px 0;font-size:10px;color:#06344F;line-height:1.55">
      Este relatório é disponibilizado publicamente pela TEIAA em cumprimento às obrigações de transparência previstas na Lei nº 13.019/2014 e demais normas aplicáveis às organizações da sociedade civil.
    </div>

    ${figuras([
      { label:'Total entradas', val:fmt(totalEnt), cor:'#2E6F3E' },
      { label:'Total saídas', val:fmt(totalSai), cor:'#A7352C' },
      { label:'Resultado do período', val:(saldo>=0?'+ ':'- ')+fmt(saldo), cor:saldo>=0?'#2E6F3E':'#A7352C' },
    ], 3)}

    ${secTitle('Entradas por categoria')}
    <table style="border-collapse:collapse;width:100%;font-size:9px;margin-bottom:14px">
      ${tabelaHeader([{label:'Categoria'},{label:'Total',align:'right'},{label:'%',align:'right'}])}
      <tbody>
        ${linhasEnt2}
        <tr style="background:#F5F2EA;font-weight:700;border-top:1.5px solid #D7D0C2"><td style="padding:5px;border-bottom:none">Total entradas</td><td style="text-align:right;color:#2E6F3E;padding:5px;border-bottom:none">${fmt(totalEnt)}</td><td style="text-align:right;padding:5px;border-bottom:none">100%</td></tr>
      </tbody>
    </table>

    ${secTitle('Saídas por categoria')}
    <table style="border-collapse:collapse;width:100%;font-size:9px">
      ${tabelaHeader([{label:'Categoria'},{label:'Total',align:'right'},{label:'%',align:'right'}])}
      <tbody>
        ${linhasSai2}
        <tr style="background:#F5F2EA;font-weight:700;border-top:1.5px solid #D7D0C2"><td style="padding:5px;border-bottom:none">Total saídas</td><td style="text-align:right;color:#A7352C;padding:5px;border-bottom:none">${fmt(totalSai)}</td><td style="text-align:right;padding:5px;border-bottom:none">100%</td></tr>
      </tbody>
    </table>

    <div style="margin-top:14px;font-size:9px;color:#9199A2;line-height:1.55">
      Informações disponibilizadas em conformidade com a Lei nº 13.019/2014 — MROSC. Os valores apresentados correspondem às movimentações registradas no sistema AGENDO Integra, conforme dados conciliados com o extrato bancário.
    </div>

    ${rodape(protocolo)}
  </div>`
  abrirImpressao(html, 'Transparência Pública')
}


export function gerarPDFEvento(evento, entradas, saidas, opts = {}) {
  const totalEnt = entradas.reduce((a,m)=>a+Number(m.valor||0),0)
  const totalSai = Math.abs(saidas.reduce((a,m)=>a+Number(m.valor||0),0))
  const saldo = totalEnt - totalSai

  const linhasEnt = entradas.map(m => `<tr>
    <td>${new Date(m.data+'T12:00:00').toLocaleDateString('pt-BR')}</td>
    <td>${m.descricao||'—'}</td>
    <td>${m.categoria?.nome||'—'}</td>
    <td>${m.subcategoria?.nome||'—'}</td>
    <td>${m.fornecedor||'—'}</td>
    <td class="num verde">${fmt(m.valor)}</td>
    <td class="center">${m.conciliado?'✓ Conciliado':'Pendente'}</td>
  </tr>`).join('')

  const linhasSai = saidas.map(m => `<tr>
    <td>${new Date(m.data+'T12:00:00').toLocaleDateString('pt-BR')}</td>
    <td>${m.descricao||'—'}</td>
    <td>${m.categoria?.nome||'—'}</td>
    <td>${m.subcategoria?.nome||'—'}</td>
    <td>${m.fornecedor||'—'}</td>
    <td>${m.num_nota||'—'}</td>
    <td class="num vermelho">${fmt(Math.abs(m.valor))}</td>
    <td class="center">${m.conciliado?'✓ Conciliado':'Pendente'}</td>
  </tr>`).join('')

  const protocolo = `AG-TEIAA-${new Date().getFullYear()}-EV`
  const dataEmissao = new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})
  const periodoLabel = evento.data_inicio ? (new Date(evento.data_inicio+'T12:00:00').toLocaleDateString('pt-BR') + (evento.data_fim && evento.data_fim!==evento.data_inicio ? ' a '+new Date(evento.data_fim+'T12:00:00').toLocaleDateString('pt-BR') : '')) : '—'
  const pctMeta = evento.meta_financeira > 0 ? Math.round(totalEnt/evento.meta_financeira*100) : null

  const html = `
  <div class="pg">
    ${cabFull()}
    ${tituloEditorial('Relatório de evento', evento.nome||'Evento', '', periodoLabel)}

    ${metaGrid([
      { label:'Tipo', val:'Evento institucional', sub:'Realização TEIAA' },
      { label:'Protocolo', val:protocolo, sub:'Emitido em '+dataEmissao },
      { label:'Período', val:periodoLabel, sub:'Data de realização' },
      { label:'Meta financeira', val:evento.meta_financeira?fmt(evento.meta_financeira):'—', sub:pctMeta!=null?pctMeta+'% atingido':'' },
    ])}

    ${figuras([
      { label:'Total entradas', val:fmt(totalEnt), cor:'#2E6F3E' },
      { label:'Total saídas', val:fmt(totalSai), cor:'#A7352C' },
      { label:'Resultado', val:(saldo>=0?'+ ':'- ')+fmt(saldo), cor:saldo>=0?'#2E6F3E':'#A7352C' },
      { label:'Meta atingida', val:pctMeta!=null?pctMeta+'%':'—', cor:'#A98E54' },
    ])}

    ${secTitle('Entradas realizadas')}
    <table style="border-collapse:collapse;width:100%;font-size:9px;margin-bottom:12px">
      ${tabelaHeader([{label:'Data'},{label:'Descrição'},{label:'Categoria'},{label:'Valor',align:'right'}])}
      <tbody>
        ${entradas.map(m=>`<tr><td style="white-space:nowrap;color:#626B76">${new Date(m.data+'T12:00:00').toLocaleDateString('pt-BR')}</td><td>${m.descricao||'—'}</td><td style="font-size:8.5px">${m.categoria?.nome||'—'}</td><td style="text-align:right;color:#2E6F3E;white-space:nowrap">+ ${fmt(m.valor)}</td></tr>`).join('')}
        <tr style="background:#F5F2EA;font-weight:700;border-top:1.5px solid #D7D0C2"><td colspan="3" style="padding:5px;border-bottom:none">Total entradas</td><td style="text-align:right;color:#2E6F3E;padding:5px;border-bottom:none">${fmt(totalEnt)}</td></tr>
      </tbody>
    </table>

    ${secTitle('Saídas realizadas')}
    <table style="border-collapse:collapse;width:100%;font-size:9px">
      ${tabelaHeader([{label:'Data'},{label:'Descrição'},{label:'Categoria'},{label:'Valor',align:'right'}])}
      <tbody>
        ${saidas.map(m=>`<tr><td style="white-space:nowrap;color:#626B76">${new Date(m.data+'T12:00:00').toLocaleDateString('pt-BR')}</td><td>${m.descricao||'—'}</td><td style="font-size:8.5px">${m.categoria?.nome||'—'}</td><td style="text-align:right;color:#A7352C;white-space:nowrap">- ${fmt(Math.abs(Number(m.valor)))}</td></tr>`).join('')}
        <tr style="background:#F5F2EA;font-weight:700;border-top:1.5px solid #D7D0C2"><td colspan="3" style="padding:5px;border-bottom:none">Total saídas</td><td style="text-align:right;color:#A7352C;padding:5px;border-bottom:none">${fmt(totalSai)}</td></tr>
      </tbody>
    </table>

    ${opts.assinaturas ? htmlAssinaturas(['Responsável pelo Evento','Responsável Financeiro','Diretoria']) : ''}
    ${rodape(protocolo)}
  </div>`
  abrirImpressao(html, 'Relatório de Evento')
}


export function gerarPDFCampanha(campanha, entradas, saidas, opts = {}) {
  const totalEnt = entradas.reduce((a,m)=>a+Number(m.valor||0),0)
  const totalSai = Math.abs(saidas.reduce((a,m)=>a+Number(m.valor||0),0))
  const saldo = totalEnt - totalSai
  const pctMeta = campanha.meta_financeira > 0 ? Math.round(totalEnt/campanha.meta_financeira*100) : 0

  const linhasEnt = entradas.map(m => `<tr>
    <td>${new Date(m.data+'T12:00:00').toLocaleDateString('pt-BR')}</td>
    <td>${m.descricao||'—'}</td>
    <td>${m.categoria?.nome||'—'}</td>
    <td>${m.fornecedor||'—'}</td>
    <td class="num verde">${fmt(m.valor)}</td>
    <td class="center">${m.conciliado?'✓':'Pendente'}</td>
  </tr>`).join('')

  const linhasSai = saidas.map(m => `<tr>
    <td>${new Date(m.data+'T12:00:00').toLocaleDateString('pt-BR')}</td>
    <td>${m.descricao||'—'}</td>
    <td>${m.categoria?.nome||'—'}</td>
    <td>${m.fornecedor||'—'}</td>
    <td>${m.num_nota||'—'}</td>
    <td class="num vermelho">${fmt(Math.abs(m.valor))}</td>
    <td class="center">${m.conciliado?'✓':'Pendente'}</td>
  </tr>`).join('')

  const protocolo = `AG-TEIAA-${new Date().getFullYear()}-CA`
  const dataEmissao = new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})
  const periodoLabel = campanha.data_inicio ? (new Date(campanha.data_inicio+'T12:00:00').toLocaleDateString('pt-BR') + (campanha.data_fim?' a '+new Date(campanha.data_fim+'T12:00:00').toLocaleDateString('pt-BR'):'')) : '—'

  const html = `
  <div class="pg">
    ${cabFull()}
    ${tituloEditorial('Relatório de campanha', campanha.nome||'Campanha', '', periodoLabel)}

    ${metaGrid([
      { label:'Tipo', val:'Campanha de arrecadação', sub:'Realização TEIAA' },
      { label:'Protocolo', val:protocolo, sub:'Emitido em '+dataEmissao },
      { label:'Período', val:periodoLabel, sub:'Duração da campanha' },
      { label:'Meta financeira', val:campanha.meta_financeira?fmt(campanha.meta_financeira):'—', sub:pctMeta>0?pctMeta+'% atingido':'' },
    ])}

    ${campanha.meta_financeira > 0 ? `
    <div style="margin:12px 0;background:#F5F2EA;border-radius:4px;padding:12px 14px;display:flex;align-items:center;gap:14px">
      <div style="font-size:9px;color:#06344F;font-weight:700;white-space:nowrap">Meta: ${pctMeta}%</div>
      <div style="flex:1;height:7px;background:#D7D0C2;border-radius:99px;overflow:hidden">
        <div style="height:100%;width:${Math.min(pctMeta,100)}%;background:#0E7EA8;border-radius:99px"></div>
      </div>
      <div style="font-size:9px;color:#626B76;white-space:nowrap">${fmt(totalEnt)} / ${fmt(campanha.meta_financeira)}</div>
    </div>` : ''}

    ${figuras([
      { label:'Total arrecadado', val:fmt(totalEnt), cor:'#2E6F3E' },
      { label:'Total despesas', val:fmt(totalSai), cor:'#A7352C' },
      { label:'Resultado', val:(saldo>=0?'+ ':'- ')+fmt(saldo), cor:saldo>=0?'#2E6F3E':'#A7352C' },
      { label:'Meta atingida', val:pctMeta>0?pctMeta+'%':'—', cor:'#A98E54' },
    ])}

    ${secTitle('Movimentações')}
    <table style="border-collapse:collapse;width:100%;font-size:9px">
      ${tabelaHeader([{label:'Data'},{label:'Descrição'},{label:'Tipo'},{label:'Valor',align:'right'}])}
      <tbody>
        ${[...entradas.map(m=>({...m,isEnt:true})),...saidas.map(m=>({...m,isEnt:false}))].sort((a,b)=>a.data.localeCompare(b.data)).map(m=>`<tr>
          <td style="white-space:nowrap;color:#626B76">${new Date(m.data+'T12:00:00').toLocaleDateString('pt-BR')}</td>
          <td>${m.descricao||'—'}</td>
          <td style="font-size:8.5px;color:${m.isEnt?'#2E6F3E':'#A7352C'}">${m.isEnt?'Entrada':'Saída'}</td>
          <td style="text-align:right;color:${m.isEnt?'#2E6F3E':'#A7352C'};white-space:nowrap">${m.isEnt?'+':'-'} ${fmt(Math.abs(Number(m.valor)))}</td>
        </tr>`).join('')}
        <tr style="background:#F5F2EA;font-weight:700;border-top:1.5px solid #D7D0C2"><td colspan="3" style="padding:5px;border-bottom:none">Resultado</td><td style="text-align:right;color:${saldo>=0?'#2E6F3E':'#A7352C'};padding:5px;border-bottom:none">${saldo>=0?'+ ':'- '}${fmt(saldo)}</td></tr>
      </tbody>
    </table>

    ${opts.assinaturas ? htmlAssinaturas(['Responsável pela Campanha','Responsável Financeiro','Diretoria']) : ''}
    ${rodape(protocolo)}
  </div>`
  abrirImpressao(html, 'Relatório de Campanha')
}


export function gerarPDFCobrancas(cobrancas, filtros) {
  const totalAberto = cobrancas.filter(c=>!c.pago_confirmado).reduce((a,c)=>a+Number(c.valor),0)
  const totalConfirmado = cobrancas.filter(c=>c.pago_confirmado).reduce((a,c)=>a+Number(c.valor),0)
  const totalInformado = cobrancas.filter(c=>c.pago_informado&&!c.pago_confirmado).reduce((a,c)=>a+Number(c.valor),0)

  const linhas = cobrancas.map((c,i) => `<tr>
    <td class="center">${i+1}</td>
    <td>${c.pagador}</td>
    <td class="center">${new Date(c.data_vencimento+'T12:00:00').toLocaleDateString('pt-BR')}</td>
    <td class="num">${fmt(c.valor)}</td>
    <td class="center">${c.status||'Pendente'}</td>
    <td class="center">${c.pago_confirmado?'✓ Confirmado':c.pago_informado?'Informado':'—'}</td>
    <td class="center">${c.data_promessa?new Date(c.data_promessa+'T12:00:00').toLocaleDateString('pt-BR'):'—'}</td>
    <td>${c.ultima_obs||'—'}</td>
  </tr>`).join('')

  const protocolo = `AG-TEIAA-${new Date().getFullYear()}-COB`
  const dataEmissao = new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})
  const statusCor = { 'pago confirmado no extrato':'#2E6F3E', 'pago - aguardando confirmação':'#854F0B', 'em aberto':'#626B76', 'vencido':'#A7352C', 'cancelado':'#9199A2', 'incobrável':'#9199A2' }
  const statusBg  = { 'pago confirmado no extrato':'#EEF8F1', 'pago - aguardando confirmação':'#FFF6E8', 'em aberto':'#F1EFE8', 'vencido':'#FEF2F2', 'cancelado':'#F5F2EA', 'incobrável':'#F5F2EA' }
  const hoje = new Date().toISOString().slice(0,10)

  const html = `
  <div class="pg">
    ${cabFull()}
    ${tituloEditorial('Relatório de cobranças','Cobranças','e Boletos',`Emitido em ${dataEmissao}`)}

    ${figuras([
      { label:'Em aberto', val:fmt(totalAberto), cor:'#A7352C' },
      { label:'Informado pago', val:fmt(totalInformado), cor:'#854F0B' },
      { label:'Confirmado', val:fmt(totalConfirmado), cor:'#2E6F3E' },
      { label:'Total cobranças', val:cobrancas.length, cor:'#0E7EA8' },
    ])}

    ${secTitle('Detalhamento das cobranças')}
    <table style="border-collapse:collapse;width:100%;font-size:9px">
      ${tabelaHeader([{label:'Devedor'},{label:'Descrição'},{label:'Vencimento'},{label:'Valor',align:'right'},{label:'Status',align:'center'}])}
      <tbody>
        ${cobrancas.map(cob => {
          const st = cob.status||'em aberto'
          const venc = cob.data_vencimento
          const isVenc = venc && venc < hoje && st==='em aberto'
          const stReal = isVenc ? 'vencido' : st
          return `<tr>
            <td>${cob.devedor||'—'}</td>
            <td style="font-size:8.5px">${cob.descricao||'—'}</td>
            <td style="white-space:nowrap;color:${isVenc?'#A7352C':'#626B76'}">${venc?new Date(venc+'T12:00:00').toLocaleDateString('pt-BR'):'—'}</td>
            <td style="text-align:right;white-space:nowrap">${fmt(cob.valor)}</td>
            <td style="text-align:center"><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:7.5px;font-weight:700;background:${statusBg[stReal]||'#F1EFE8'};color:${statusCor[stReal]||'#626B76'}">${stReal}</span></td>
          </tr>`
        }).join('')}
        <tr style="background:#F5F2EA;font-weight:700;border-top:1.5px solid #D7D0C2">
          <td colspan="3" style="padding:5px;border-bottom:none">Total em aberto</td>
          <td style="text-align:right;color:#A7352C;padding:5px;border-bottom:none;white-space:nowrap">${fmt(totalAberto)}</td>
          <td style="border-bottom:none"></td>
        </tr>
      </tbody>
    </table>
    ${rodape(protocolo)}
  </div>`
  abrirImpressao(html, 'Relatório de Cobranças')
}


export function gerarPDFPrestacaoContas(dados, pendencias, tipo, opts = {}) {
  const { conta, entradas, saidas, totalRepasses, totalRendimentos, totalDisponivel, totalDespesas, saldoFinal, bens, rateadas, porPlano, totalMovs, totalConciliados } = dados

  const isPreliminar = tipo === 'preliminar'
  const fmt = v => 'R$ ' + Math.abs(Number(v)||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const TIPO_LABEL = { emenda:'Emenda Parlamentar', edital:'Edital', fomento:'Termo de Fomento', colaboracao:'Termo de Colaboração', convenio:'Convênio', projeto:'Projeto Específico' }
  const tipoLabel = TIPO_LABEL[conta.tipo_conta] || conta.tipo_conta

  const pendCriticas = pendencias.reduce((a,m) => a + m.pendencias.filter(p=>p.gravidade==='crítica').length, 0)

  // Receitas
  const linhasReceitas = entradas.map(m => `<tr>
    <td>${fmtData(m.data)}</td>
    <td>${m.tipo_receita||m.categoria?.nome||'—'}</td>
    <td>${m.descricao||'—'}</td>
    <td style="font-family:monospace;font-size:9px">${m.doc||'—'}</td>
    <td class="num verde">${fmt(m.valor)}</td>
    <td>${m.obs_prestacao||'—'}</td>
  </tr>`).join('')

  // Despesas
  let seq = 1
  const linhasDespesas = saidas.map(m => `<tr>
    <td class="center">${seq++}</td>
    <td>${fmtData(m.data)}</td>
    <td>${m.fornecedor||'—'}</td>
    <td style="font-size:9px">${m.cpf_cnpj||'—'}</td>
    <td>${m.categoria?.nome||'—'}</td>
    <td>${m.subcategoria?.nome||'—'}</td>
    <td>${m.plano?.nome||'—'}</td>
    <td style="font-family:monospace;font-size:9px">${m.num_nota||'—'}</td>
    <td>${fmtData(m.data_documento)}</td>
    <td class="num vermelho">${fmt(Math.abs(m.valor))}</td>
    <td style="font-size:9px;color:#666">${m.local_comprovante||'—'}</td>
    <td class="center">${m.conciliado?'✓ OK':'Pend.'}</td>
  </tr>`).join('')

  // Plano de trabalho
  const linhasPlano = Object.values(porPlano).map(p => {
    const saldo = p.valor_previsto - p.executado
    const pct = p.valor_previsto > 0 ? Math.round(p.executado/p.valor_previsto*100) : 0
    const sit = pct===0?'Não iniciado':pct>=100?'Executado integralmente':'Em execução'
    return `<tr>
      <td>${p.nome}</td>
      <td class="num">${fmt(p.valor_previsto)}</td>
      <td class="num vermelho">${fmt(p.executado)}</td>
      <td class="num ${saldo>=0?'verde':'vermelho'}">${fmt(saldo)}</td>
      <td class="center">${pct}%</td>
      <td class="center">${sit}</td>
    </tr>`
  }).join('')

  // Bens
  const linhasBens = bens.map((m,i) => `<tr>
    <td class="center">${i+1}</td>
    <td>${m.descricao_produto||m.descricao||'—'}</td>
    <td>${m.fornecedor||'—'}</td>
    <td style="font-size:9px">${m.cpf_cnpj||'—'}</td>
    <td style="font-family:monospace;font-size:9px">${m.num_nota||'—'}</td>
    <td>${fmtData(m.data)}</td>
    <td class="num vermelho">${fmt(Math.abs(m.valor))}</td>
    <td>${m.plano?.nome||'—'}</td>
    <td>${m.local_guarda_bem||'—'}</td>
  </tr>`).join('')

  // Rateios
  const linhasRateio = rateadas.map(m => `<tr>
    <td>${fmtData(m.data)}</td>
    <td>${m.descricao||'—'}</td>
    <td>${m.fornecedor||'—'}</td>
    <td style="font-family:monospace;font-size:9px">${m.num_nota||'—'}</td>
    <td class="num">${fmt(Math.abs(m.valor))}</td>
    <td class="center">${m.percentual_rateio||'—'}%</td>
    <td class="num vermelho">${fmt(Math.abs(m.valor)*(m.percentual_rateio||100)/100)}</td>
    <td>${m.fonte_restante||'—'}</td>
    <td>${m.justificativa_rateio||'—'}</td>
  </tr>`).join('')

  // Pendências
  const linhasPend = pendencias.flatMap(m => m.pendencias.map(p => `<tr>
    <td>${fmtData(m.data)}</td>
    <td>${m.descricao?.slice(0,40)||'—'}</td>
    <td class="num">${fmt(Math.abs(m.valor))}</td>
    <td>${p.tipo}</td>
    <td class="center"><span style="padding:1px 6px;border-radius:99px;font-size:9px;background:${p.gravidade==='crítica'?'#FCEBEB':'#FAEEDA'};color:${p.gravidade==='crítica'?'#A32D2D':'#854F0B'}">${p.gravidade}</span></td>
  </tr>`)).join('')

  const pctConc = totalMovs > 0 ? Math.round(totalConciliados/totalMovs*100) : 0

  const protocolo = `AG-TEIAA-${new Date().getFullYear()}-PC`
  const dataEmissao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
  const tipoLabel2 = TIPO_LABEL[conta.tipo_conta] || conta.tipo_conta

  const logoFallback = `<div style="font-size:16px;font-weight:900;color:#0E7EA8;letter-spacing:.04em">TEIAA</div><div style="font-size:8px;color:#888">Centro TEIAA de Atendimentos</div>`

  const cabFull = `
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0E7EA8;padding-bottom:11px;margin-bottom:20px">
    <div><img src="https://teiaa.agendoas.com/logo.png" alt="TEIAA" style="height:46px;width:auto;object-fit:contain;display:block" onerror="this.outerHTML='${logoFallback}'" /></div>
    <div style="text-align:right;font-size:9px;color:#5F6874;max-width:260px;line-height:1.5">
      <div style="font-size:11px;font-weight:700;color:#20252C">${TEIAA_INFO.nome}</div>
      <div style="font-size:9.5px;font-weight:700;color:#20252C;margin:2px 0">CNPJ: ${TEIAA_INFO.cnpj}</div>
      <div style="font-size:7.5px;color:#9199A2;line-height:1.5">${TEIAA_INFO.registros.slice(0,3).join('<br>')}</div>
    </div>
  </div>`

  const cabCompact = `
  <div style="display:grid;grid-template-columns:1fr auto;gap:16px;border-bottom:1px solid #D7D0C2;padding-bottom:10px;margin-bottom:16px">
    <div>
      <div style="font-size:14px;font-weight:700;color:#06344F;letter-spacing:-.01em">Prestação de Contas — ${tipoLabel2}</div>
      <div style="margin-top:4px;color:#66717E;font-size:9px">${TEIAA_INFO.nome} · ${protocolo}</div>
    </div>
    <div style="text-align:right;font-size:9px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:#06344F">
      AGENDO Integra<span style="display:block;margin-top:3px;color:#0E7EA8;font-weight:400;text-transform:none;letter-spacing:0">${protocolo}</span>
    </div>
  </div>`

  const rodapeHtml = `
  <div style="border-top:1px solid #D7D0C2;padding-top:9px;display:flex;justify-content:space-between;color:#66717E;font-size:8.5px;margin-top:18px">
    <div>${TEIAA_INFO.endereco} · ${TEIAA_INFO.whatsapp} · ${TEIAA_INFO.email}</div>
    <div><strong style="color:#06344F">AGENDO Integra</strong> · ${protocolo}</div>
  </div>`

  const html = `
  <div class="pg">
    ${cabFull}

    <div style="font-size:9px;font-weight:700;color:#0E7EA8;letter-spacing:.18em;text-transform:uppercase;margin-bottom:8px">Documento institucional</div>
    <div style="font-family:Georgia,serif;font-size:42px;line-height:.95;font-weight:400;letter-spacing:-.04em;color:#06344F;margin-bottom:10px">Prestação<br>de Contas</div>
    <div style="width:70px;height:2px;background:#A98E54;margin-bottom:12px"></div>
    <div style="font-size:12px;color:#303944;margin-bottom:14px">${tipoLabel2} · Exercício ${new Date().getFullYear()}</div>
    <div style="margin-bottom:16px;display:flex;gap:8px;align-items:center">
      <span style="display:inline-block;padding:3px 12px;border-radius:4px;font-size:8.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;background:${isPreliminar?'#FAEEDA':'#EEF8F1'};color:${isPreliminar?'#854F0B':'#2E6F3E'}">${isPreliminar?'RELATÓRIO PRELIMINAR':'RELATÓRIO FINAL CONSOLIDADO'}</span>
      ${isPreliminar?`<span style="font-size:9px;color:#854F0B">Aguardando consolidação bancária</span>`:''}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;margin-bottom:16px">
      <div style="padding:11px 18px 11px 0;border-right:1px solid #ECE6DA;border-bottom:1px solid #ECE6DA">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:4px">Instrumento</div>
        <div style="font-size:11px;color:#20252C;font-weight:600">${tipoLabel2}</div>
        <div style="font-size:9px;color:#626B76;margin-top:2px">${conta.nome||'—'}</div>
      </div>
      <div style="padding:11px 0 11px 18px;border-bottom:1px solid #ECE6DA">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:4px">Período</div>
        <div style="font-size:11px;color:#20252C;font-weight:600">${conta.data_inicio ? fmt(conta.data_inicio) : '—'} a ${conta.data_fim ? fmt(conta.data_fim) : '—'}</div>
        <div style="font-size:9px;color:#626B76;margin-top:2px">Exercício de execução</div>
      </div>
      <div style="padding:11px 18px 11px 0;border-right:1px solid #ECE6DA">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:4px">Protocolo</div>
        <div style="font-size:11px;color:#20252C;font-weight:600">${protocolo}</div>
        <div style="font-size:9px;color:#626B76;margin-top:2px">Emitido em ${dataEmissao}</div>
      </div>
      <div style="padding:11px 0 11px 18px">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:4px">Conciliação bancária</div>
        <div style="font-size:11px;color:#20252C;font-weight:600">${pctConc}% conciliado</div>
        <div style="font-size:9px;color:#626B76;margin-top:2px">${totalConciliados} de ${totalMovs} movimentações</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;margin-bottom:18px">
      <div style="padding:11px 8px;border-right:1px solid #ECE6DA">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Total repasses</div>
        <div style="font-family:Georgia,serif;font-size:16px;color:#0E7EA8">${fmt(totalRepasses)}</div>
      </div>
      <div style="padding:11px 8px;border-right:1px solid #ECE6DA">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Total despesas</div>
        <div style="font-family:Georgia,serif;font-size:16px;color:#A7352C">${fmt(totalDespesas)}</div>
      </div>
      <div style="padding:11px 8px;border-right:1px solid #ECE6DA">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Saldo disponível</div>
        <div style="font-family:Georgia,serif;font-size:16px;color:${saldoFinal>=0?'#2E6F3E':'#A7352C'}">${fmt(saldoFinal)}</div>
      </div>
      <div style="padding:11px 8px">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Movimentações</div>
        <div style="font-family:Georgia,serif;font-size:16px;color:#0E7EA8">${totalMovs}</div>
      </div>
    </div>

    <div style="font-family:Georgia,serif;font-size:20px;color:#06344F;margin-bottom:11px;letter-spacing:-.02em">Execução por plano de trabalho</div>
    <table style="font-size:9.5px;border-collapse:collapse;width:100%">
      <thead>
        <tr>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:left">Plano / Meta</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:right">Previsto</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:right">Executado</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:right">Saldo</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:center">%</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:left">Situação</th>
        </tr>
      </thead>
      <tbody>
        ${linhasPlano || '<tr><td colspan="6" style="text-align:center;color:#9199A2;padding:10px">Sem planos vinculados</td></tr>'}
        <tr style="background:#F5F2EA;font-weight:700;border-top:1.5px solid #D7D0C2">
          <td style="padding:6px 5px;border-bottom:none">Total</td>
          <td style="padding:6px 5px;text-align:right;border-bottom:none">${fmt(totalDisponivel)}</td>
          <td style="padding:6px 5px;text-align:right;color:#A7352C;border-bottom:none">${fmt(totalDespesas)}</td>
          <td style="padding:6px 5px;text-align:right;color:${saldoFinal>=0?'#2E6F3E':'#A7352C'};border-bottom:none">${fmt(saldoFinal)}</td>
          <td style="padding:6px 5px;text-align:center;border-bottom:none">${totalDisponivel>0?Math.round(totalDespesas/totalDisponivel*100):0}%</td>
          <td style="border-bottom:none"></td>
        </tr>
      </tbody>
    </table>

    ${pendCriticas > 0 ? `<div style="margin-top:14px;padding:10px 14px;border-left:3px solid #A7352C;background:#FEF2F2;font-size:10px;color:#A7352C"><strong>${pendCriticas} pendência(s) crítica(s)</strong> identificada(s) neste período — verificar antes da aprovação final.</div>` : ''}

    ${rodapeHtml}
  </div>

  <!-- PÁGINAS SEGUINTES: DESPESAS, RECEITAS, ETC -->
  <div class="pg page-break">
    ${cabCompact}

    <div style="font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:6px 10px 6px 13px;border-left:3px solid #A7352C;background:#FFF0F0;color:#A7352C;margin-bottom:12px">▼ Despesas realizadas (${saidas.length} registros)</div>
    <table style="font-size:8.5px;border-collapse:collapse;width:100%">
      <thead>
        <tr>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:6.5px;text-transform:uppercase;letter-spacing:.08em;padding:5px 4px;text-align:center">Seq.</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:6.5px;text-transform:uppercase;letter-spacing:.08em;padding:5px 4px">Data</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:6.5px;text-transform:uppercase;letter-spacing:.08em;padding:5px 4px">Fornecedor</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:6.5px;text-transform:uppercase;letter-spacing:.08em;padding:5px 4px">CPF/CNPJ</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:6.5px;text-transform:uppercase;letter-spacing:.08em;padding:5px 4px">Categoria</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:6.5px;text-transform:uppercase;letter-spacing:.08em;padding:5px 4px">Plano</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:6.5px;text-transform:uppercase;letter-spacing:.08em;padding:5px 4px">Nº Doc.</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:6.5px;text-transform:uppercase;letter-spacing:.08em;padding:5px 4px;text-align:right">Valor</th>
          <th style="background:#F2F6F7;color:#525B66;border-top:1px solid #D7D0C2;border-bottom:1px solid #D7D0C2;font-size:6.5px;text-transform:uppercase;letter-spacing:.08em;padding:5px 4px;text-align:center">Conc.</th>
        </tr>
      </thead>
      <tbody>
        ${linhasDespesas || '<tr><td colspan="9" style="text-align:center;color:#9199A2;padding:10px">Sem despesas registradas</td></tr>'}
        <tr style="background:#F5F2EA;font-weight:700;border-top:1.5px solid #D7D0C2">
          <td colspan="7" style="padding:5px 4px;border-bottom:none">Total despesas</td>
          <td style="padding:5px 4px;text-align:right;color:#A7352C;border-bottom:none">${fmt(totalDespesas)}</td>
          <td style="border-bottom:none"></td>
        </tr>
      </tbody>
    </table>

    ${rodapeHtml}
  </div>

  ${opts.assinaturas ? `
  <div class="pg page-break">
    ${cabCompact}
    <div style="font-family:Georgia,serif;font-size:22px;color:#06344F;margin-bottom:16px;letter-spacing:-.02em">Encaminhamento e assinaturas</div>
    <div style="font-size:11.5px;line-height:1.7;color:#303842;margin-bottom:24px">
      Declaramos que o presente relatório consolida as movimentações financeiras referentes à execução do instrumento <strong>${tipoLabel2}</strong>, conforme registros no sistema AGENDO Integra.
    </div>
    <div style="font-size:11px;color:#303842;margin:28px 0 44px">Teresópolis — RJ, _______ de _________________________ de _______.</div>
    ${htmlAssinaturas(['Responsável Financeiro', 'Representante Legal / Diretoria', 'Responsável pela Conferência'])}
    ${rodapeHtml}
  </div>` : ''}
`
  abrirImpressao(html, `Prestação de Contas — ${tipoLabel}`)
}


export function gerarPDFParecer({ fechamento, movs, instituicao }) {
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' }) : '—'
  const fmtMes = comp => {
    if (!comp) return '—'
    const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
    const [y,m] = comp.split('-')
    return `${meses[parseInt(m)-1]} de ${y}`
  }

  const tipoLabel = { aprovado:'APROVADO', aprovado_ressalva:'APROVADO COM RESSALVA', reprovado:'REPROVADO' }
  const tipoCor = { aprovado:'#3B6D11', aprovado_ressalva:'#854F0B', reprovado:'#A32D2D' }
  const tipoBg = { aprovado:'#EAF3DE', aprovado_ressalva:'#FAEEDA', reprovado:'#FEF2F2' }
  const modalLabel = { presencial:'Presencial', online:'Online (videoconferência)', hibrida:'Híbrida' }

  const entradas = movs.filter(m=>Number(m.valor)>0).reduce((a,m)=>a+Number(m.valor),0)
  const saidas = Math.abs(movs.filter(m=>Number(m.valor)<0).reduce((a,m)=>a+Number(m.valor),0))
  const saldo = entradas - saidas

  const membros = (fechamento.membros_presentes||'').split(',').map(s=>s.trim()).filter(Boolean)

  const vcor  = { aprovado:'#2E6F3E', aprovado_ressalva:'#854F0B', reprovado:'#A7352C' }
  const vbg   = { aprovado:'#EEF8F1', aprovado_ressalva:'#FFF6E8', reprovado:'#FEF2F2' }
  const vicon = { aprovado:'✓', aprovado_ressalva:'!', reprovado:'✗' }
  const vlabel= { aprovado:'Aprovado', aprovado_ressalva:'Aprovado com ressalva', reprovado:'Reprovado' }
  const tipo_apr = fechamento.tipo_aprovacao || 'aprovado'
  const protocolo = `AG-TEIAA-${fechamento.competencia||new Date().getFullYear()}-CF`
  const dataEmissao = new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})

  const html = `
  <div class="pg">
    ${cabFull()}
    ${tituloEditorial('Documento do Conselho Fiscal','Parecer','Mensal',`Competência: ${fmtMes(fechamento.competencia)}`)}

    ${metaGrid([
      { label:'Instituição', val:TEIAA_INFO.nome, sub:'CNPJ: '+TEIAA_INFO.cnpj },
      { label:'Competência', val:fmtMes(fechamento.competencia), sub:'Período mensal' },
      { label:'Protocolo', val:protocolo, sub:'Emitido em '+dataEmissao },
      { label:'Modalidade', val:modalLabel[fechamento.modalidade_reuniao]||fechamento.modalidade_reuniao||'—', sub:fechamento.data_reuniao?'Reunião em '+fmtData(fechamento.data_reuniao):'—' },
    ])}

    <div style="border:1.5px solid ${vcor[tipo_apr]};background:${vbg[tipo_apr]};padding:18px 20px;margin:14px 0;display:flex;align-items:center;gap:18px">
      <div style="width:44px;height:44px;border-radius:50%;background:${vcor[tipo_apr]};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px;font-weight:900;color:#fff">${vicon[tipo_apr]}</div>
      <div>
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:.14em;color:${vcor[tipo_apr]};font-weight:700;margin-bottom:4px">Decisão do Conselho Fiscal</div>
        <div style="font-family:Georgia,serif;font-size:24px;color:${vcor[tipo_apr]};font-weight:400;line-height:1">${vlabel[tipo_apr]}</div>
        ${fechamento.ressalvas ? `<div style="font-size:9px;color:${vcor[tipo_apr]};margin-top:5px;opacity:.85">${fechamento.ressalvas}</div>` : ''}
      </div>
    </div>

    ${figuras([
      { label:'Total entradas', val:fmt(entradas), cor:'#2E6F3E' },
      { label:'Total saídas', val:fmt(saidas), cor:'#A7352C' },
      { label:'Resultado do período', val:(saldo>=0?'+ ':'- ')+fmt(saldo), cor:saldo>=0?'#2E6F3E':'#A7352C' },
      { label:'Movimentações', val:movs.length, cor:'#0E7EA8' },
    ])}

    ${membros.length > 0 ? `
    ${secTitle('Membros presentes')}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:10px">
      ${membros.map(n=>`<div style="text-align:center">
        <div style="height:36px;border-bottom:1px solid #9199A2;margin-bottom:6px"></div>
        <div style="font-size:9px;font-weight:700;color:#06344F">${n}</div>
        <div style="font-size:8.5px;color:#626B76;margin-top:2px">Conselho Fiscal</div>
      </div>`).join('')}
    </div>` : ''}

    ${fechamento.observacoes ? `
    <div style="margin-top:14px;border-left:3px solid #0E7EA8;padding:10px 14px;background:#EAF5F8;font-size:10px;color:#303842;line-height:1.6">
      <strong style="font-size:8.5px;color:#06344F;text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:4px">Observações</strong>
      ${fechamento.observacoes}
    </div>` : ''}

    ${rodape(protocolo)}
  </div>`

  abrirImpressao(html, `Parecer CF — ${fmtMes(fechamento.competencia)}`)
}


export function gerarPDFParecerAnual({ ano, fechamentos, movs, instituicao }) {
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' }) : '—'
  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const tipoLabel = { aprovado:'Aprovado', aprovado_ressalva:'Aprovado c/ ressalva', reprovado:'Reprovado' }

  const entradas = movs.filter(m=>Number(m.valor)>0).reduce((a,m)=>a+Number(m.valor),0)
  const saidas = Math.abs(movs.filter(m=>Number(m.valor)<0).reduce((a,m)=>a+Number(m.valor),0))
  const saldo = entradas - saidas

  const comRessalva = fechamentos.filter(f => f.tipo_aprovacao === 'aprovado_ressalva')
  const ultimoAprovado = [...fechamentos].sort((a,b)=>(b.aprovado_em||'').localeCompare(a.aprovado_em||''))[0]
  const membros = (ultimoAprovado?.membros_presentes||'').split(',').map(s=>s.trim()).filter(Boolean)

  const linhasMeses = fechamentos
    .sort((a,b)=>a.competencia.localeCompare(b.competencia))
    .map(f => {
      const m = parseInt(f.competencia.split('-')[1]) - 1
      return `<tr>
        <td>${MESES[m]}</td>
        <td>${tipoLabel[f.tipo_aprovacao]||'—'}</td>
        <td>${f.aprovado_em ? new Date(f.aprovado_em).toLocaleDateString('pt-BR') : '—'}</td>
        <td>${f.ressalvas ? f.ressalvas : '—'}</td>
      </tr>`
    }).join('')

  const protocolo = `AG-TEIAA-${ano}-CFAN`
  const dataEmissao = new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})
  const tipoLabel2 = { aprovado:'Aprovado', aprovado_ressalva:'Aprovado c/ ressalva', reprovado:'Reprovado' }
  const tipoCor2 = { aprovado:'#2E6F3E', aprovado_ressalva:'#854F0B', reprovado:'#A7352C' }
  const tipoBg2 = { aprovado:'#EEF8F1', aprovado_ressalva:'#FFF6E8', reprovado:'#FEF2F2' }

  const html = `
  <div class="pg">
    ${cabFull()}
    ${tituloEditorial('Documento do Conselho Fiscal','Parecer','Anual',`Consolidação das aprovações mensais · Exercício ${ano}`)}

    ${metaGrid([
      { label:'Exercício', val:ano, sub:'Janeiro a Dezembro' },
      { label:'Protocolo', val:protocolo, sub:'Emitido em '+dataEmissao },
      { label:'Meses analisados', val:`${fechamentos.length} de 12`, sub:'Exercício completo' },
      { label:'Com ressalva', val:comRessalva.length > 0 ? comRessalva.length+' mês(es)' : 'Nenhum', cor:comRessalva.length>0?'#854F0B':'#2E6F3E', sub:comRessalva.length>0?'Verificar observações':'Exercício aprovado' },
    ])}

    ${figuras([
      { label:'Total entradas', val:fmt(entradas), cor:'#2E6F3E' },
      { label:'Total saídas', val:fmt(saidas), cor:'#A7352C' },
      { label:'Resultado do exercício', val:(saldo>=0?'+ ':'- ')+fmt(saldo), cor:saldo>=0?'#2E6F3E':'#A7352C' },
      { label:'Movimentações', val:movs.length, cor:'#0E7EA8' },
    ])}

    ${secTitle('Aprovações mensais')}
    <table style="border-collapse:collapse;width:100%;font-size:9px">
      ${tabelaHeader([{label:'Mês'},{label:'Parecer'},{label:'Data de aprovação'},{label:'Ressalvas'}])}
      <tbody>
        ${linhasMeses}
      </tbody>
    </table>

    ${membros.length > 0 ? `
    ${secTitle('Assinaturas')}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:10px">
      ${membros.map(n=>`<div style="text-align:center">
        <div style="height:36px;border-bottom:1px solid #9199A2;margin-bottom:6px"></div>
        <div style="font-size:9px;font-weight:700;color:#06344F">${n}</div>
        <div style="font-size:8.5px;color:#626B76;margin-top:2px">Conselho Fiscal</div>
      </div>`).join('')}
    </div>` : ''}

    <div style="margin-top:16px;font-size:10px;color:#303842;line-height:1.65">
      Teresópolis — RJ, _______ de _________________________ de ${new Date().getFullYear()+1}.
    </div>

    ${rodape(protocolo)}
  </div>`

  abrirImpressao(html, `Parecer Anual CF — ${ano}`)
}

// =============================================
// RELATÓRIOS DA CENTRAL — PLANO DE AÇÃO
// =============================================
export function gerarPDFPlanoAcao(dados, opts = {}) {
  const { plano, projetosCompletos, presidente } = dados
  const protocolo = `AG-TEIAA-${new Date().getFullYear()}-PA`
  const dataEmissao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const periodoLabel = plano?.periodo_inicio ? `${fmtData(plano.periodo_inicio)} a ${fmtData(plano.periodo_fim)}` : '—'
  const totalOrc = (projetosCompletos||[]).reduce((a,pv) => a + (pv.orcamento||[]).reduce((b,o)=>b+Number(o.valor_previsto||0),0), 0)

  const linhasProjetos = (projetosCompletos||[]).map(pv => {
    const orcTotal = (pv.orcamento||[]).reduce((a,o)=>a+Number(o.valor_previsto||0),0)
    const equipeNomes = (pv.equipe||[]).map(e=>e.membro?.nome||'—').slice(0,3).join(', ') + ((pv.equipe||[]).length>3?' ...':'')
    return `<tr>
      <td><strong style="font-size:9px">${pv.projeto?.nome||'—'}</strong><div style="font-size:8px;color:#626B76;margin-top:2px">${pv.projeto?.tipo_servico||'—'}</div></td>
      <td style="font-size:8.5px">${pv.projeto?.publico_alvo||'—'}</td>
      <td class="center">${pv.projeto?.capacidade_atendimento||'—'}</td>
      <td style="font-size:8.5px">${equipeNomes||'—'}</td>
      <td class="num">${fmt(orcTotal)}</td>
      <td class="center" style="color:${pv.projeto?.situacao==='ativo'?'var(--green)':'var(--muted)'}">${pv.projeto?.situacao||'—'}</td>
    </tr>`
  }).join('')

  const linhasOrc = (projetosCompletos||[]).flatMap(pv =>
    (pv.orcamento||[]).map(o => `<tr>
      <td style="font-size:8.5px">${pv.projeto?.nome||'—'}</td>
      <td>${o.categoria||'—'}</td>
      <td style="font-size:8.5px">${o.elemento_despesa||'—'}</td>
      <td class="num">${fmt(o.valor_previsto||0)}</td>
      <td style="font-size:8.5px;color:var(--muted)">${o.justificativa||'—'}</td>
    </tr>`)
  ).join('')

  const html = `
  <div class="pg">
    ${htmlCabecalho({ tipo:'full' })}
    <div style="font-size:9px;font-weight:700;color:var(--agendo);letter-spacing:.18em;text-transform:uppercase;margin-bottom:8px">Documento institucional</div>
    <div style="font-family:Georgia,serif;font-size:42px;line-height:.95;font-weight:400;letter-spacing:-.04em;color:var(--agendo-dark);margin-bottom:10px">Plano<br>de Ação</div>
    <div style="width:70px;height:2px;background:#A98E54;margin-bottom:12px"></div>
    <div style="font-size:12px;color:#303944;margin-bottom:18px">${plano?.nome_plano||'—'} · ${periodoLabel}</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-bottom:16px">
      <div style="padding:11px 16px 11px 0;border-right:1px solid var(--line-soft);border-bottom:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:3px">Tipo de instrumento</div>
        <div style="font-size:11px;color:#20252C;font-weight:600">${plano?.tipo_plano||'—'}</div>
        <div style="font-size:9px;color:var(--muted);margin-top:2px">${plano?.orgao_ou_parceiro||'—'}</div>
      </div>
      <div style="padding:11px 0 11px 16px;border-bottom:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:3px">Período de execução</div>
        <div style="font-size:11px;color:#20252C;font-weight:600">${periodoLabel}</div>
        <div style="font-size:9px;color:var(--muted);margin-top:2px">Protocolo: ${protocolo}</div>
      </div>
      <div style="padding:11px 16px 11px 0;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:3px">Valor total previsto</div>
        <div style="font-family:Georgia,serif;font-size:18px;color:var(--agendo)">${fmt(totalOrc)}</div>
      </div>
      <div style="padding:11px 0 11px 16px">
        <div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:3px">Projetos / Serviços vinculados</div>
        <div style="font-family:Georgia,serif;font-size:18px;color:var(--agendo)">${(projetosCompletos||[]).length}</div>
      </div>
    </div>

    ${plano?.objeto ? `<div style="border-left:3px solid var(--agendo);padding:10px 14px;background:var(--agendo-soft);font-size:10px;line-height:1.65;color:#303842;margin-bottom:14px"><strong style="font-size:8.5px;color:var(--agendo-dark);text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:4px">Objeto</strong>${plano.objeto}</div>` : ''}
    ${plano?.objetivo_geral ? `<div style="border-left:3px solid var(--line);padding:10px 14px;background:#F8F7F2;font-size:10px;line-height:1.65;color:#303842;margin-bottom:14px"><strong style="font-size:8.5px;color:var(--agendo-dark);text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:4px">Objetivo Geral</strong>${plano.objetivo_geral}</div>` : ''}

    <div style="font-family:Georgia,serif;font-size:20px;color:var(--agendo-dark);margin-bottom:11px;letter-spacing:-.02em">Projetos e serviços vinculados</div>
    <table style="font-size:9px;border-collapse:collapse;width:100%">
      <thead><tr>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Projeto / Serviço</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Público-alvo</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:center">Capacidade</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Equipe</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:right">Orçamento</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:center">Situação</th>
      </tr></thead>
      <tbody>
        ${linhasProjetos||'<tr><td colspan="6" style="text-align:center;color:#9199A2;padding:12px">Nenhum projeto vinculado</td></tr>'}
        <tr style="background:#F5F2EA;font-weight:700;border-top:1.5px solid var(--line)">
          <td colspan="4" style="padding:6px 5px;border-bottom:none">Total previsto</td>
          <td style="padding:6px 5px;text-align:right;color:var(--agendo);border-bottom:none">${fmt(totalOrc)}</td>
          <td style="border-bottom:none"></td>
        </tr>
      </tbody>
    </table>

    ${linhasOrc ? `
    <div style="font-family:Georgia,serif;font-size:18px;color:var(--agendo-dark);margin:18px 0 10px;letter-spacing:-.02em">Detalhamento orçamentário</div>
    <table style="font-size:8.5px;border-collapse:collapse;width:100%">
      <thead><tr>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Projeto</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Categoria</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Elemento</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:right">Valor previsto</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Justificativa</th>
      </tr></thead>
      <tbody>${linhasOrc}</tbody>
    </table>` : ''}

    ${opts.assinaturas ? `
    <div style="margin-top:20px;font-size:11px;color:#303842">Teresópolis — RJ, _______ de _________________________ de ${new Date().getFullYear()}.</div>
    ${htmlAssinaturas(['Responsável Técnico / Coordenador', 'Representante Legal / Presidente', 'Responsável pela Conferência'])}` : ''}
    ${htmlRodape({ protocolo })}
  </div>`

  abrirImpressao(html, 'Plano de Ação')
}

// =============================================
// RELATÓRIO ANUAL
// =============================================
export function gerarPDFRelatAnual(dados, opts = {}) {
  const { plano, projetosCompletos, totalEntGeral, totalDespGeral, totalAtendGeral, totalUsersGeral } = dados
  const protocolo = `AG-TEIAA-${plano?.periodo_inicio?.slice(0,4)||new Date().getFullYear()}-RA`
  const dataEmissao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const ano = plano?.periodo_inicio?.slice(0,4) || new Date().getFullYear()
  const saldoGeral = (totalEntGeral||0) - (totalDespGeral||0)

  const linhasProjetos = (projetosCompletos||[]).map(pv => {
    const sP = (pv.totalEnt||0) - (pv.totalDesp||0)
    return `<tr>
      <td><strong style="font-size:9px">${pv.projeto?.nome||'—'}</strong><div style="font-size:8px;color:#626B76">${pv.projeto?.tipo_servico||'—'}</div></td>
      <td class="center">${pv.totalAtend||0}</td>
      <td class="center">${pv.totalUsers||0}</td>
      <td class="num" style="color:var(--green)">${fmt(pv.totalEnt||0)}</td>
      <td class="num" style="color:var(--red)">${fmt(pv.totalDesp||0)}</td>
      <td class="num" style="color:${sP>=0?'var(--green)':'var(--red)'}">${sP>=0?'+ ':'- '}${fmt(sP)}</td>
    </tr>`
  }).join('')

  const html = `
  <div class="pg">
    ${htmlCabecalho({ tipo:'full' })}
    <div style="font-size:9px;font-weight:700;color:var(--agendo);letter-spacing:.18em;text-transform:uppercase;margin-bottom:8px">Relatório anual</div>
    <div style="font-family:Georgia,serif;font-size:42px;line-height:.95;font-weight:400;letter-spacing:-.04em;color:var(--agendo-dark);margin-bottom:10px">Relatório<br>Anual</div>
    <div style="width:70px;height:2px;background:#A98E54;margin-bottom:12px"></div>
    <div style="font-size:12px;color:#303944;margin-bottom:18px">${plano?.nome_plano||'—'} · Exercício ${ano}</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-bottom:16px">
      <div style="padding:11px 16px 11px 0;border-right:1px solid var(--line-soft);border-bottom:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:3px">Instrumento</div>
        <div style="font-size:11px;color:#20252C;font-weight:600">${plano?.tipo_plano||'—'}</div>
        <div style="font-size:9px;color:var(--muted);margin-top:2px">${plano?.orgao_ou_parceiro||'—'}</div>
      </div>
      <div style="padding:11px 0 11px 16px;border-bottom:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:3px">Exercício</div>
        <div style="font-size:11px;color:#20252C;font-weight:600">${ano}</div>
        <div style="font-size:9px;color:var(--muted);margin-top:2px">${fmtData(plano?.periodo_inicio)} a ${fmtData(plano?.periodo_fim)}</div>
      </div>
      <div style="padding:11px 16px 11px 0;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:3px">Protocolo</div>
        <div style="font-size:11px;color:#20252C;font-weight:600">${protocolo}</div>
        <div style="font-size:9px;color:var(--muted);margin-top:2px">Emitido em ${dataEmissao}</div>
      </div>
      <div style="padding:11px 0 11px 16px">
        <div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.12em;color:#6B7280;margin-bottom:3px">Projetos analisados</div>
        <div style="font-family:Georgia,serif;font-size:18px;color:var(--agendo)">${(projetosCompletos||[]).length}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-bottom:20px">
      <div style="padding:13px 10px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:7px">Total entradas</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--green)">${fmt(totalEntGeral||0)}</div>
      </div>
      <div style="padding:13px 10px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:7px">Total despesas</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--red)">${fmt(totalDespGeral||0)}</div>
      </div>
      <div style="padding:13px 10px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:7px">Resultado</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:${saldoGeral>=0?'var(--green)':'var(--red)'}">${saldoGeral>=0?'+ ':'- '}${fmt(saldoGeral)}</div>
      </div>
      <div style="padding:13px 10px">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:7px">Atendimentos</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--agendo)">${totalAtendGeral||0}</div>
      </div>
    </div>

    <div style="font-family:Georgia,serif;font-size:20px;color:var(--agendo-dark);margin-bottom:11px;letter-spacing:-.02em">Execução por projeto / serviço</div>
    <table style="font-size:9px;border-collapse:collapse;width:100%">
      <thead><tr>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Projeto / Serviço</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:center">Atendimentos</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:center">Usuários</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:right">Entradas</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:right">Despesas</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:right">Saldo</th>
      </tr></thead>
      <tbody>
        ${linhasProjetos||'<tr><td colspan="6" style="text-align:center;color:#9199A2;padding:12px">Nenhum projeto encontrado</td></tr>'}
        <tr style="background:#F5F2EA;font-weight:700;border-top:1.5px solid var(--line)">
          <td style="padding:6px 5px;border-bottom:none">Total</td>
          <td style="padding:6px 5px;text-align:center;border-bottom:none">${totalAtendGeral||0}</td>
          <td style="padding:6px 5px;text-align:center;border-bottom:none">${totalUsersGeral||0}</td>
          <td style="padding:6px 5px;text-align:right;color:var(--green);border-bottom:none">${fmt(totalEntGeral||0)}</td>
          <td style="padding:6px 5px;text-align:right;color:var(--red);border-bottom:none">${fmt(totalDespGeral||0)}</td>
          <td style="padding:6px 5px;text-align:right;color:${saldoGeral>=0?'var(--green)':'var(--red)'};border-bottom:none">${saldoGeral>=0?'+ ':'- '}${fmt(saldoGeral)}</td>
        </tr>
      </tbody>
    </table>

    ${opts.assinaturas ? `
    <div style="margin-top:20px;font-size:11px;color:#303842">Teresópolis — RJ, _______ de _________________________ de ${new Date().getFullYear()}.</div>
    ${htmlAssinaturas(['Responsável Técnico', 'Representante Legal / Presidente', 'Conselho Fiscal'])}` : ''}
    ${htmlRodape({ protocolo })}
  </div>`

  abrirImpressao(html, `Relatório Anual ${ano}`)
}

// =============================================
// EQUIPE
// =============================================
export function gerarPDFEquipe(dados, opts = {}) {
  const { lista, porTipo, porSit } = dados
  const protocolo = `AG-TEIAA-${new Date().getFullYear()}-EQ`
  const dataEmissao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const ativos = lista.filter(e=>e.situacao==='ativo').length

  const linhas = lista.map(e => `<tr>
    <td><strong style="font-size:9px">${e.nome||'—'}</strong>${e.email?`<div style="font-size:8px;color:#626B76">${e.email}</div>`:''}</td>
    <td style="font-size:8.5px">${e.funcao||'—'}</td>
    <td style="font-size:8.5px">${e.tipo_vinculo||'—'}</td>
    <td style="font-size:8.5px">${e.orgao_origem||'—'}</td>
    <td class="center" style="font-size:8px;font-weight:600;color:${e.situacao==='ativo'?'var(--green)':'var(--muted)'}">${e.situacao||'—'}</td>
    <td class="center" style="font-size:8.5px">${e.data_ingresso?fmtData(e.data_ingresso):'—'}</td>
  </tr>`).join('')

  const html = `
  <div class="pg">
    ${htmlCabecalho({ titulo:'Relatório de Equipe', sub:`${TEIAA_INFO.nome} · Emitido em ${dataEmissao}`, ref:protocolo })}

    <div style="font-family:Georgia,serif;font-size:26px;color:var(--agendo-dark);margin-bottom:14px;letter-spacing:-.02em">Equipe</div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-bottom:18px">
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Total</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--agendo)">${lista.length}</div>
      </div>
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Ativos</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--green)">${ativos}</div>
      </div>
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Inativos</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--red)">${lista.length-ativos}</div>
      </div>
      <div style="padding:12px 8px">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Tipos de vínculo</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--agendo)">${Object.keys(porTipo||{}).length}</div>
      </div>
    </div>

    <table style="font-size:9px;border-collapse:collapse;width:100%">
      <thead><tr>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Nome</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Função</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Tipo de vínculo</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Órgão origem</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:center">Situação</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:center">Ingresso</th>
      </tr></thead>
      <tbody>${linhas||'<tr><td colspan="6" style="text-align:center;color:#9199A2;padding:12px">Nenhum membro encontrado</td></tr>'}</tbody>
    </table>
    ${htmlRodape({ protocolo })}
  </div>`

  abrirImpressao(html, 'Relatório de Equipe')
}

// =============================================
// USUÁRIOS ATENDIDOS
// =============================================
export function gerarPDFUsuariosAtendidos(dados, periodoLabel, opts = {}) {
  const { lista, ativos, desligados, faixas } = dados
  const protocolo = `AG-TEIAA-${new Date().getFullYear()}-UA`
  const dataEmissao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const linhas = lista.map(u => `<tr>
    <td><strong style="font-size:9px">${u.nome||'—'}</strong></td>
    <td class="center" style="font-size:8.5px">${u.data_nascimento?fmtData(u.data_nascimento):'—'}</td>
    <td class="center" style="font-size:8px;font-weight:600;color:${u.situacao==='ativo'?'var(--green)':'var(--muted)'}">${u.situacao||'—'}</td>
    <td style="font-size:8.5px">${u.projeto?.nome||'—'}</td>
    <td style="font-size:8.5px">${u.publico_alvo||'—'}</td>
    <td class="center" style="font-size:8.5px">${u.data_ingresso?fmtData(u.data_ingresso):'—'}</td>
  </tr>`).join('')

  const linhasFaixas = Object.entries(faixas||{}).map(([f,v]) => `<tr><td>${f}</td><td class="num">${v}</td><td class="num">${lista.length>0?Math.round(v/lista.length*100):0}%</td></tr>`).join('')

  const html = `
  <div class="pg">
    ${htmlCabecalho({ titulo:'Usuários Atendidos', sub:`${TEIAA_INFO.nome} · ${periodoLabel||'Período selecionado'}`, ref:protocolo })}

    <div style="font-family:Georgia,serif;font-size:26px;color:var(--agendo-dark);margin-bottom:14px;letter-spacing:-.02em">Usuários Atendidos</div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-bottom:18px">
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Total</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--agendo)">${lista.length}</div>
      </div>
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Ativos</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--green)">${ativos}</div>
      </div>
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Desligados</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--red)">${desligados}</div>
      </div>
      <div style="padding:12px 8px">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Projetos</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--agendo)">${[...new Set(lista.map(u=>u.projeto?.nome))].filter(Boolean).length}</div>
      </div>
    </div>

    ${linhasFaixas ? `
    <div style="display:grid;grid-template-columns:1fr 2fr;gap:14px;margin-bottom:16px">
      <div>
        <div style="font-family:Georgia,serif;font-size:16px;color:var(--agendo-dark);margin-bottom:9px;letter-spacing:-.02em">Faixa etária</div>
        <table style="font-size:9px;border-collapse:collapse;width:100%">
          <thead><tr>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:5px">Faixa</th>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:5px;text-align:right">Qtd</th>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:5px;text-align:right">%</th>
          </tr></thead>
          <tbody>${linhasFaixas}</tbody>
        </table>
      </div>
      <div>` : '<div>'}
    <div style="font-family:Georgia,serif;font-size:16px;color:var(--agendo-dark);margin-bottom:9px;letter-spacing:-.02em">Lista de usuários</div>
    <table style="font-size:9px;border-collapse:collapse;width:100%">
      <thead><tr>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Nome</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:center">Nascimento</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:center">Situação</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Projeto</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Público-alvo</th>
        <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:center">Ingresso</th>
      </tr></thead>
      <tbody>${linhas||'<tr><td colspan="6" style="text-align:center;color:#9199A2;padding:12px">Nenhum usuário encontrado</td></tr>'}</tbody>
    </table>
    ${linhasFaixas ? '</div></div>' : ''}
    ${htmlRodape({ protocolo })}
  </div>`

  abrirImpressao(html, 'Usuários Atendidos', true)
}

// =============================================
// ATENDIMENTOS
// =============================================
export function gerarPDFAtendimentos(dados = {}, periodoLabel, opts = {}) {
  const lista = Array.isArray(dados.lista) ? dados.lista : []
  const protocolo = opts.protocolo || `AG-TEIAA-${new Date().getFullYear()}-TEACOLHER-AT`
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const esc = v => String(v ?? '—')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

  const valor = v => v === null || v === undefined || v === '' ? '—' : esc(v)
  const normal = v => String(v || '').toLowerCase().trim()
  const nomeAtendido = a => a.usuario_atendido?.nome || a.usuario?.nome || a.pessoa_atendida || a.nome_usuario || 'Usuário/família'
  const nomeProf = a => a.profissional?.nome || a.equipe?.nome || a.profissional_nome || a.tecnico_nome || '—'
  const nomeProjeto = a => a.projeto?.nome || a.projeto_nome || 'Projeto TEAcolher'
  const etapa = a => a.etapa_fluxo || a.tipo_atend || 'Atendimento TEAcolher'
  const tema = a => a.objetivo_atendimento || a.tema || a.descricao || '—'
  const duracao = a => a.duracao_minutos ? `${a.duracao_minutos} min` : '—'
  const periodo = periodoLabel || opts.periodoLabel || 'Período selecionado'
  const totalPart = Number(dados.totalPart ?? lista.reduce((s, a) => s + (Number(a.qtd_participantes) || 0), 0)) || 0

  const realizados = lista.filter(a => normal(a.situacao) === 'realizado').length
  const pendentes = lista.filter(a => ['agendado','reagendado'].includes(normal(a.situacao))).length
  const cancelados = lista.filter(a => ['cancelado','desligado','encerrado'].includes(normal(a.situacao))).length
  const faltas = lista.filter(a => ['faltou','falta justificada','remarcado','cancelado'].includes(String(a.comparecimento || '').toLowerCase()) || ['reagendado','cancelado'].includes(normal(a.situacao))).length
  const encaminhados = lista.filter(a =>
    (a.tipo_encaminhamento && a.tipo_encaminhamento !== 'Sem encaminhamento externo') ||
    (a.rede_encaminhada && a.rede_encaminhada !== 'Não se aplica') ||
    (a.orgao_encaminhamento || '').trim() ||
    (a.encaminhamentos || '').trim()
  ).length
  const devolutivas = lista.filter(a =>
    String(a.devolutiva_familia || '').toLowerCase().includes('sim') ||
    String(a.etapa_fluxo || '').toLowerCase().includes('devolutiva')
  ).length
  const familias = new Set(lista.map(a => a.usuario_atendido_id ? String(a.usuario_atendido_id) : nomeAtendido(a)).filter(Boolean)).size

  const ehDireto = a => Array.isArray(a.publico_participante) && a.publico_participante.includes('Pessoa com TEA / PCD')
  const diretos = lista.filter(ehDireto).length
  const indiretos = lista.length - diretos

  function agrupar(chaveFn) {
    const obj = {}
    lista.forEach(a => {
      const k = chaveFn(a) || 'Não informado'
      obj[k] = (obj[k] || 0) + 1
    })
    return obj
  }

  function agruparMulti(arrFn) {
    const obj = {}
    lista.forEach(a => {
      const vals = arrFn(a)
      const arr = Array.isArray(vals) && vals.length ? vals : ['Não informado']
      arr.forEach(v => { obj[v] = (obj[v] || 0) + 1 })
    })
    return obj
  }

  const porProfissional = agrupar(a => nomeProf(a))
  const porArea = agrupar(a => a.area_atendimento || 'Interdisciplinar')
  const porModalidade = agrupar(a => a.modalidade_atendimento || 'Não informado')
  const porComparecimento = agrupar(a => a.comparecimento || a.situacao || 'Não informado')
  const porDesfecho = agrupar(a => a.desfecho_teacolher || 'Sem desfecho registrado')
  const porEtapa = agrupar(a => etapa(a))
  const porPublico = agruparMulti(a => a.publico_participante)

  const linhasGrupo = (obj, total = lista.length) => Object.entries(obj).sort((a,b)=>b[1]-a[1]).map(([k,v]) => `
    <tr>
      <td>${valor(k)}</td>
      <td class="num">${v}</td>
      <td class="num">${total > 0 ? Math.round(v / total * 100) : 0}%</td>
    </tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:#9199A2;padding:8px">Sem dados</td></tr>'

  const linhasDetalhe = lista.map(a => {
    const sit = a.comparecimento || a.situacao || '—'
    const enc = a.tipo_encaminhamento && a.tipo_encaminhamento !== 'Sem encaminhamento externo'
      ? a.tipo_encaminhamento
      : (a.rede_encaminhada && a.rede_encaminhada !== 'Não se aplica' ? a.rede_encaminhada : (a.encaminhamentos || '—'))
    return `<tr>
      <td style="white-space:nowrap;color:#626B76">${fmtData(a.data_atend)}</td>
      <td style="white-space:nowrap;color:#626B76">${a.hora_inicio ? String(a.hora_inicio).slice(0,5) : '—'}</td>
      <td><strong>${valor(nomeAtendido(a))}</strong><div style="font-size:7.5px;color:#888;margin-top:2px">${valor(nomeProjeto(a))}</div></td>
      <td>${valor(nomeProf(a))}</td>
      <td>${valor(a.area_atendimento || 'Interdisciplinar')}</td>
      <td>${valor(a.modalidade_atendimento || '—')}</td>
      <td>${valor(sit)}</td>
      <td class="num">${duracao(a)}</td>
      <td>${valor(a.desfecho_teacolher || enc)}</td>
    </tr>`
  }).join('')

  const registrosTecnicos = lista.filter(a => a.registro_tecnico || a.demanda_identificada || a.orientacao_familia || a.devolutiva_familia || a.proxima_acao || a.encaminhamentos || a.tipo_encaminhamento || a.desfecho_teacolher)
  const blocosRegistro = registrosTecnicos.map(a => `
    <div style="border:1px solid var(--line);border-radius:6px;padding:10px 12px;margin-bottom:10px;page-break-inside:avoid;background:#FFFEFA">
      <div style="display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid var(--line-soft);padding-bottom:6px;margin-bottom:8px">
        <div>
          <div style="font-size:12px;font-weight:800;color:var(--agendo-dark)">${valor(nomeAtendido(a))}</div>
          <div style="font-size:8.5px;color:#626B76;margin-top:2px">${fmtData(a.data_atend)} · ${valor(nomeProf(a))} · ${valor(a.area_atendimento || 'Interdisciplinar')}</div>
        </div>
        <div style="text-align:right;font-size:8.5px;color:#626B76">
          ${valor(a.comparecimento || a.situacao)}<br>${duracao(a)}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:9px;line-height:1.45">
        <div><strong>Demanda identificada:</strong><br>${valor(a.demanda_identificada)}</div>
        <div><strong>Objetivo/etapa:</strong><br>${valor(etapa(a))} · ${valor(tema(a))}</div>
        <div style="grid-column:1 / -1"><strong>Registro técnico / evolução:</strong><br>${valor(a.registro_tecnico || a.descricao)}</div>
        <div><strong>Orientação familiar:</strong><br>${valor(a.orientacao_familia)}</div>
        <div><strong>Devolutiva à família:</strong><br>${valor(a.devolutiva_familia)}</div>
        <div><strong>Encaminhamento:</strong><br>${valor(a.tipo_encaminhamento || a.rede_encaminhada || a.encaminhamentos)}</div>
        <div><strong>Próxima ação / desfecho:</strong><br>${valor(a.proxima_acao || a.desfecho_teacolher)}</div>
      </div>
    </div>`).join('')

  const html = `
  <div class="pg">
    ${htmlCabecalho({ titulo:'Relatório Técnico TEAcolher', sub:`${TEIAA_INFO.nome} · ${periodo}`, ref:protocolo })}

    <div style="font-size:9px;font-weight:700;color:var(--agendo);letter-spacing:.18em;text-transform:uppercase;margin-bottom:8px">Prestação técnica de atendimentos</div>
    <div style="font-family:Georgia,serif;font-size:36px;line-height:.95;color:var(--agendo-dark);letter-spacing:-.04em;margin-bottom:10px">Relatório<br>TEAcolher</div>
    <div style="width:80px;height:2px;background:#A98E54;margin-bottom:12px"></div>
    <div style="font-size:11.5px;color:#303944;line-height:1.55;margin-bottom:16px">
      Consolidação dos atendimentos do Projeto TEAcolher para acompanhamento da agenda, execução técnica, encaminhamentos, devolutivas familiares e suporte à prestação de contas.
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-bottom:16px">
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)"><div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:5px">Atendimentos</div><div style="font-family:Georgia,serif;font-size:18px;color:var(--agendo)">${lista.length}</div></div>
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)"><div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:5px">Realizados</div><div style="font-family:Georgia,serif;font-size:18px;color:var(--green)">${realizados}</div></div>
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)"><div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:5px">Famílias</div><div style="font-family:Georgia,serif;font-size:18px;color:var(--agendo-dark)">${familias}</div></div>
      <div style="padding:12px 8px"><div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:5px">Participantes</div><div style="font-family:Georgia,serif;font-size:18px;color:var(--agendo)">${totalPart.toLocaleString('pt-BR')}</div></div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">
      <div class="info-item"><div class="info-label">Pendentes de finalização</div><div class="info-valor" style="color:#854F0B">${pendentes}</div></div>
      <div class="info-item"><div class="info-label">Faltas/remarcações/cancel.</div><div class="info-valor" style="color:var(--red)">${faltas + cancelados}</div></div>
      <div class="info-item"><div class="info-label">Encaminhamentos</div><div class="info-valor" style="color:#854F0B">${encaminhados}</div></div>
      <div class="info-item"><div class="info-label">Devolutivas familiares</div><div class="info-valor" style="color:var(--green)">${devolutivas}</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      <div class="info-item"><div class="info-label">Atendimento direto (pessoa com TEA/PCD)</div><div class="info-valor azul">${diretos}</div></div>
      <div class="info-item"><div class="info-label">Atendimento indireto (só família/núcleo)</div><div class="info-valor">${indiretos}</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div>
        <div class="secao-titulo secao-titulo-azul">Por profissional</div>
        <table><thead><tr><th>Profissional</th><th class="num">Qtd</th><th class="num">%</th></tr></thead><tbody>${linhasGrupo(porProfissional)}</tbody></table>
      </div>
      <div>
        <div class="secao-titulo secao-titulo-azul">Por área</div>
        <table><thead><tr><th>Área</th><th class="num">Qtd</th><th class="num">%</th></tr></thead><tbody>${linhasGrupo(porArea)}</tbody></table>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div>
        <div class="secao-titulo secao-titulo-verde">Comparecimento / situação</div>
        <table><thead><tr><th>Situação</th><th class="num">Qtd</th><th class="num">%</th></tr></thead><tbody>${linhasGrupo(porComparecimento)}</tbody></table>
      </div>
      <div>
        <div class="secao-titulo secao-titulo-verde">Desfechos</div>
        <table><thead><tr><th>Desfecho</th><th class="num">Qtd</th><th class="num">%</th></tr></thead><tbody>${linhasGrupo(porDesfecho)}</tbody></table>
      </div>
    </div>

    ${htmlRodape({ protocolo })}
  </div>

  <div class="pg page-break pg-landscape">
    ${htmlCabecalho({ titulo:'Relatório Técnico TEAcolher — detalhamento', sub:periodo, ref:protocolo })}
    <div class="secao-titulo secao-titulo-azul">Lista de atendimentos, agenda e execução</div>
    <table style="font-size:8.5px">
      <thead><tr>
        <th>Data</th><th>Hora</th><th>Usuário/família</th><th>Profissional</th><th>Área</th><th>Modalidade</th><th>Situação</th><th class="num">Duração</th><th>Desfecho / encaminhamento</th>
      </tr></thead>
      <tbody>${linhasDetalhe || '<tr><td colspan="9" style="text-align:center;color:#9199A2;padding:12px">Nenhum atendimento no período</td></tr>'}</tbody>
    </table>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-top:14px">
      <div><div class="secao-titulo secao-titulo-azul">Por etapa do fluxo</div><table><thead><tr><th>Etapa</th><th class="num">Qtd</th><th class="num">%</th></tr></thead><tbody>${linhasGrupo(porEtapa)}</tbody></table></div>
      <div><div class="secao-titulo secao-titulo-azul">Por modalidade</div><table><thead><tr><th>Modalidade</th><th class="num">Qtd</th><th class="num">%</th></tr></thead><tbody>${linhasGrupo(porModalidade)}</tbody></table></div>
      <div><div class="secao-titulo secao-titulo-azul">Por público atendido</div><table><thead><tr><th>Público</th><th class="num">Qtd</th><th class="num">%</th></tr></thead><tbody>${linhasGrupo(porPublico)}</tbody></table></div>
      <div><div class="secao-titulo secao-titulo-verde">Síntese de controle</div>
        <table><tbody>
          <tr><td>Período</td><td class="num">${valor(periodo)}</td></tr>
          <tr><td>Famílias acompanhadas</td><td class="num">${familias}</td></tr>
          <tr><td>Atendimentos realizados</td><td class="num">${realizados}</td></tr>
          <tr><td>Atendimentos pendentes</td><td class="num">${pendentes}</td></tr>
          <tr><td>Encaminhamentos</td><td class="num">${encaminhados}</td></tr>
        </tbody></table>
      </div>
    </div>
    ${htmlRodape({ protocolo })}
  </div>

  ${blocosRegistro ? `
  <div class="pg page-break">
    ${htmlCabecalho({ titulo:'Relatório Técnico TEAcolher — registros', sub:periodo, ref:protocolo })}
    <div class="secao-titulo secao-titulo-verde">Registros técnicos, devolutivas e encaminhamentos</div>
    ${blocosRegistro}
    ${htmlRodape({ protocolo })}
  </div>` : ''}
  `

  abrirImpressao(html, 'Relatório Técnico TEAcolher', true)
}

// Agenda limpa do TEAcolher — pode ser usada por painel operacional ou técnico
export function gerarPDFAgendaTeacolher(lista = [], titulo = 'Agenda TEAcolher', opts = {}) {
  const protocolo = opts.protocolo || `AG-TEIAA-${new Date().getFullYear()}-AGENDA`
  const esc = v => String(v ?? '—').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')
  const nomeAtendido = a => a.usuario_atendido?.nome || a.usuario?.nome || a.pessoa_atendida || 'Usuário/família'
  const nomeProf = a => a.profissional?.nome || a.equipe?.nome || a.profissional_nome || '—'
  const subtitulo = opts.subtitulo || opts.periodoLabel || 'Agenda do Projeto TEAcolher'
  const ocultarProf = !!opts.ocultarProfissional
  const nCols = ocultarProf ? 4 : 5

  // Cabeçalho de cada grupo de dia: "Quarta-feira, 17/06/2026"
  const cabecalhoDia = d => {
    if (!d) return 'Sem data definida'
    const dt = new Date(d + 'T12:00:00')
    const dia = dt.toLocaleDateString('pt-BR', { weekday: 'long' })
    return dia.charAt(0).toUpperCase() + dia.slice(1) + ', ' + dt.toLocaleDateString('pt-BR')
  }

  // Cor da faixa lateral de cada linha, conforme a situação
  const corSituacao = s => {
    const v = (s || '').toLowerCase()
    if (v.includes('realiz')) return 'var(--green)'
    if (v.includes('cancel') || v.includes('falt')) return 'var(--red)'
    return 'var(--agendo)'
  }

  const itens = Array.isArray(lista) ? lista : []
  const total = itens.length
  const realizados = itens.filter(a => (a.situacao || '').toLowerCase().includes('realiz')).length
  const pendentes = total - realizados

  // Agrupa por data, mantendo a ordem de chegada (a lista já vem ordenada por data/hora)
  const grupos = []
  itens.forEach(a => {
    const chave = a.data_atend || ''
    let g = grupos.find(g => g.chave === chave)
    if (!g) { g = { chave, itens: [] }; grupos.push(g) }
    g.itens.push(a)
  })

  const corpo = grupos.map(g => {
    const linhaDia = `<tr><td colspan="${nCols}" style="background:var(--soft);font-weight:700;font-size:8.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--agendo-dark);padding:7px 9px;border-bottom:1px solid var(--line)">${cabecalhoDia(g.chave)}</td></tr>`
    const linhasItens = g.itens.map(a => `<tr style="border-left:3px solid ${corSituacao(a.situacao)}">
      <td style="white-space:nowrap">${a.hora_inicio ? String(a.hora_inicio).slice(0,5) : '—'}</td>
      <td><strong>${esc(nomeAtendido(a))}</strong></td>
      ${ocultarProf ? '' : `<td>${esc(nomeProf(a))}</td>`}
      <td>${esc(a.area_atendimento || a.etapa_fluxo || a.tipo_atend || 'Atendimento')}</td>
      <td>${esc(a.situacao || 'agendado')}</td>
    </tr>`).join('')
    return linhaDia + linhasItens
  }).join('')

  const html = `<div class="pg">
    ${htmlCabecalho({ titulo, sub:subtitulo, ref:protocolo })}
    <div class="resumo-grid" style="margin-bottom:16px">
      <div class="resumo-item"><div class="resumo-label">Total no período</div><div class="resumo-valor azul">${total}</div></div>
      <div class="resumo-item"><div class="resumo-label">Realizados</div><div class="resumo-valor verde">${realizados}</div></div>
      <div class="resumo-item"><div class="resumo-label">Pendentes</div><div class="resumo-valor">${pendentes}</div></div>
      <div class="resumo-item"><div class="resumo-label">Período</div><div class="resumo-valor" style="font-size:10px">${esc(opts.periodoLabel || '—')}</div></div>
    </div>
    <table>
      <thead><tr><th>Hora</th><th>Usuário/família</th>${ocultarProf ? '' : '<th>Profissional</th>'}<th>Atendimento</th><th>Situação</th></tr></thead>
      <tbody>${corpo || `<tr><td colspan="${nCols}" style="text-align:center;color:#9199A2;padding:12px">Nenhum item na agenda</td></tr>`}</tbody>
    </table>
    ${htmlRodape({ protocolo })}
  </div>`
  abrirImpressao(html, titulo, false)
}

// Ficha individual do atendimento TEAcolher
export function gerarPDFFichaAtendimentoTeacolher(a = {}, opts = {}) {
  const protocolo = opts.protocolo || `AG-TEIAA-${new Date().getFullYear()}-FICHA-${a.id || 'AT'}`
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const esc = v => String(v ?? '—').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')
  const nomeAtendido = a.usuario_atendido?.nome || a.usuario?.nome || a.pessoa_atendida || 'Usuário/família'
  const nomeProf = a.profissional?.nome || a.equipe?.nome || a.profissional_nome || '—'
  const item = (label, value) => `<div class="info-item"><div class="info-label">${label}</div><div class="info-valor">${esc(value || '—')}</div></div>`
  const bloco = (label, value) => `<div style="border:1px solid var(--line);border-radius:5px;padding:10px 12px;margin-bottom:10px"><div style="font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:#6B7280;margin-bottom:5px;font-weight:700">${label}</div><div style="font-size:10.5px;line-height:1.55;color:#20252C">${esc(value || '—')}</div></div>`

  const html = `<div class="pg">
    ${htmlCabecalho({ titulo:'Ficha de Atendimento TEAcolher', sub:TEIAA_INFO.nome, ref:protocolo })}
    <div style="font-family:Georgia,serif;font-size:28px;color:var(--agendo-dark);margin-bottom:14px;letter-spacing:-.03em">Ficha individual do atendimento</div>
    <div class="info-grid-3">
      ${item('Usuário/família', nomeAtendido)}
      ${item('Profissional', nomeProf)}
      ${item('Data e hora', `${fmtData(a.data_atend)} · ${a.hora_inicio ? String(a.hora_inicio).slice(0,5) : '—'}`)}
      ${item('Área', a.area_atendimento || 'Interdisciplinar')}
      ${item('Modalidade', a.modalidade_atendimento)}
      ${item('Situação/comparecimento', a.comparecimento || a.situacao)}
      ${item('Duração', a.duracao_minutos ? `${a.duracao_minutos} min` : '')}
      ${item('Etapa do fluxo', a.etapa_fluxo || a.tipo_atend)}
      ${item('Desfecho', a.desfecho_teacolher)}
    </div>
    ${bloco('Demanda identificada', a.demanda_identificada)}
    ${bloco('Objetivo do atendimento', a.objetivo_atendimento || a.tema)}
    ${bloco('Registro técnico / evolução', a.registro_tecnico || a.descricao)}
    ${bloco('Orientação à família', a.orientacao_familia)}
    ${bloco('Devolutiva familiar', a.devolutiva_familia)}
    ${bloco('Encaminhamento / rede', [a.tipo_encaminhamento, a.rede_encaminhada, a.encaminhamentos].filter(Boolean).join(' · '))}
    ${bloco('Próxima ação', a.proxima_acao)}
    ${htmlAssinaturas(['Profissional responsável', 'Responsável/família', 'Coordenação'])}
    ${htmlRodape({ protocolo })}
  </div>`
  abrirImpressao(html, 'Ficha de Atendimento TEAcolher', false)
}

// Compatibilidade: nome explícito para relatórios técnicos do TEAcolher
export function gerarPDFRelatorioTecnicoTeacolher(dados = {}, periodoLabel, opts = {}) {
  return gerarPDFAtendimentos(dados, periodoLabel, opts)
}


// =============================================
// DOAÇÕES
// =============================================
export function gerarPDFDoacoes(dados, periodoLabel, opts = {}) {
  const { lista, totalEstimado, porCategoria, porDoador } = dados
  const protocolo = `AG-TEIAA-${new Date().getFullYear()}-DO`
  const dataEmissao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const linhas = lista.map(d => `<tr>
    <td style="white-space:nowrap;color:#626B76">${fmtData(d.data_doacao)}</td>
    <td>${d.doador||'—'}</td>
    <td style="font-size:8.5px">${d.categoria||'—'}</td>
    <td style="font-size:8.5px">${d.projeto?.nome||'—'}</td>
    <td style="font-size:8.5px">${d.forma_doacao||'—'}</td>
    <td class="num" style="color:var(--green)">${d.valor_estimado?fmt(d.valor_estimado):'—'}</td>
  </tr>`).join('')

  const linhasCat = Object.entries(porCategoria||{}).sort((a,b)=>b[1]-a[1]).map(([c,v]) =>
    `<tr><td>${c}</td><td class="num">${v}</td><td class="num" style="color:var(--green)">${fmt(v)}</td></tr>`
  ).join('')

  const html = `
  <div class="pg">
    ${htmlCabecalho({ titulo:'Relatório de Doações', sub:`${TEIAA_INFO.nome} · ${periodoLabel||'Período selecionado'}`, ref:protocolo })}

    <div style="font-family:Georgia,serif;font-size:26px;color:var(--agendo-dark);margin-bottom:14px;letter-spacing:-.02em">Doações Recebidas</div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-bottom:18px">
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Doações</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--agendo)">${lista.length}</div>
      </div>
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Valor estimado</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--green)">${fmt(totalEstimado)}</div>
      </div>
      <div style="padding:12px 8px;border-right:1px solid var(--line-soft)">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Categorias</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--agendo)">${Object.keys(porCategoria||{}).length}</div>
      </div>
      <div style="padding:12px 8px">
        <div style="font-size:7.5px;text-transform:uppercase;color:#6B7280;letter-spacing:.1em;margin-bottom:6px">Doadores</div>
        <div style="font-family:Georgia,serif;font-size:17px;color:var(--agendo)">${Object.keys(porDoador||{}).length}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 2fr;gap:14px;margin-bottom:16px">
      <div>
        <div style="font-family:Georgia,serif;font-size:16px;color:var(--agendo-dark);margin-bottom:9px;letter-spacing:-.02em">Por categoria</div>
        <table style="font-size:9px;border-collapse:collapse;width:100%">
          <thead><tr>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:5px">Categoria</th>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:5px;text-align:right">Qtd</th>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:5px;text-align:right">Valor</th>
          </tr></thead>
          <tbody>${linhasCat||'<tr><td colspan="3" style="text-align:center;color:#9199A2;padding:8px">—</td></tr>'}</tbody>
        </table>
      </div>
      <div>
        <div style="font-family:Georgia,serif;font-size:16px;color:var(--agendo-dark);margin-bottom:9px;letter-spacing:-.02em">Detalhamento</div>
        <table style="font-size:9px;border-collapse:collapse;width:100%">
          <thead><tr>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Data</th>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Doador</th>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Categoria</th>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Projeto</th>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px">Forma</th>
            <th style="background:#F2F6F7;color:#525B66;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:7px;text-transform:uppercase;letter-spacing:.08em;padding:6px 5px;text-align:right">Valor est.</th>
          </tr></thead>
          <tbody>
            ${linhas||'<tr><td colspan="6" style="text-align:center;color:#9199A2;padding:12px">Nenhuma doação</td></tr>'}
            <tr style="background:#F5F2EA;font-weight:700;border-top:1.5px solid var(--line)">
              <td colspan="5" style="padding:5px;border-bottom:none">Total estimado</td>
              <td class="num" style="color:var(--green);padding:5px;border-bottom:none">${fmt(totalEstimado)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    ${htmlRodape({ protocolo })}
  </div>`

  abrirImpressao(html, 'Relatório de Doações', true)
}


// =============================================
// ANEXO I — FORMULÁRIO DE CADASTRO PROJETO TEACOLHER
// =============================================
export function gerarPDFAnexoTeacolher(usuario = {}, opts = {}) {
  const esc = v => String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

  const norm = v => String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

  const fmtData = d => {
    if (!d) return ''
    const dt = new Date(String(d).includes('T') ? d : d + 'T12:00:00')
    if (Number.isNaN(dt.getTime())) return esc(d)
    return dt.toLocaleDateString('pt-BR')
  }

  const fmtMoeda = v => {
    if (v === null || v === undefined || v === '') return ''
    const n = Number(v)
    if (Number.isNaN(n)) return esc(v)
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const generoAtual = norm(usuario.genero)
  const defAtual = norm(usuario.tipo_deficiencia)

  const marcadoGenero = label => {
    const alvo = norm(label)
    const aliases = {
      'mulher cis': ['mulher cis', 'feminino cis', 'mulhercis'],
      'mulher trans': ['mulher trans', 'mulhertrans'],
      'homem cis': ['homem cis', 'masculino cis', 'homemcis'],
      'homem trans': ['homem trans', 'homemtrans'],
      'pessoa nao binaria': ['pessoa nao binaria', 'nao binario', 'nao binaria', 'não binária'],
      'prefiro nao informar': ['prefiro nao informar', 'nao informar', 'não informar'],
      'outro': ['outro', 'outra']
    }
    const lista = aliases[alvo] || [alvo]
    return lista.some(item => generoAtual === norm(item)) ? '☑' : '☐'
  }

  const marcadoDef = label => {
    const alvo = norm(label)
    const aliases = {
      'deficiencia fisica': ['deficiencia fisica', 'física', 'fisica'],
      'deficiencia auditiva': ['deficiencia auditiva', 'auditiva'],
      'deficiencia visual': ['deficiencia visual', 'visual'],
      'deficiencia intelectual': ['deficiencia intelectual', 'intelectual'],
      'deficiencia mental psicossocial': ['deficiencia mental psicossocial', 'mental psicossocial', 'psicossocial'],
      'deficiencia multipla': ['deficiencia multipla', 'multipla', 'múltipla']
    }
    const lista = aliases[alvo] || [alvo]
    return lista.some(item => defAtual === norm(item)) ? '☑' : '☐'
  }

  const campo = (label, valor, extra = '') => `
    <div class="campo ${extra}">
      <div class="campo-label">${label}</div>
      <div class="campo-valor">${valor ? esc(valor) : '&nbsp;'}</div>
    </div>`

  const campoHtml = (label, valorHtml, extra = '') => `
    <div class="campo ${extra}">
      <div class="campo-label">${label}</div>
      <div class="campo-valor">${valorHtml || '&nbsp;'}</div>
    </div>`

  const hoje = new Date()
  const ano = hoje.getFullYear()
  const protocolo = `AG-TEIAA-${ano}-TEACOLHER`

  const generoOutro = usuario.genero_outro || (generoAtual === 'outro' ? usuario.genero : '')
  const cidade = usuario.cidade || 'Teresópolis'

  const css = `
    .anexo-titulo {
      text-align:center;
      margin: 10px 0 14px;
      padding: 10px;
      border: 1px solid var(--line);
      background: var(--agendo-soft);
    }
    .anexo-titulo h1 {
      font-size: 14px;
      letter-spacing: .08em;
      color: var(--agendo-dark);
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .anexo-titulo div { font-size: 10px; color: var(--muted); }
    .bloco {
      border: 1px solid var(--line);
      border-radius: 4px;
      margin-bottom: 10px;
      overflow: hidden;
    }
    .bloco h2 {
      background: var(--agendo-dark);
      color: #fff;
      font-size: 10px;
      letter-spacing: .08em;
      text-transform: uppercase;
      padding: 7px 9px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      border-top: 1px solid var(--line-soft);
    }
    .form-grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 0;
      border-top: 1px solid var(--line-soft);
    }
    .campo {
      min-height: 38px;
      padding: 7px 8px;
      border-right: 1px solid var(--line-soft);
      border-bottom: 1px solid var(--line-soft);
    }
    .campo:nth-child(2n) { border-right: none; }
    .form-grid-3 .campo:nth-child(2n) { border-right: 1px solid var(--line-soft); }
    .form-grid-3 .campo:nth-child(3n) { border-right: none; }
    .campo.full {
      grid-column: 1 / -1;
      border-right: none;
    }
    .campo-label {
      color: #6B7280;
      font-size: 7.5px;
      text-transform: uppercase;
      letter-spacing: .08em;
      margin-bottom: 3px;
      font-weight: 700;
    }
    .campo-valor {
      color: #20252C;
      font-size: 10.5px;
      line-height: 1.35;
      min-height: 13px;
    }
    .check-wrap {
      padding: 8px 9px 9px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px 18px;
      font-size: 10px;
      line-height: 1.35;
    }
    .check-item { white-space: nowrap; }
    .declaracao {
      padding: 10px 12px;
      font-size: 10.5px;
      line-height: 1.65;
      color: #20252C;
      text-align: justify;
    }
    .linha-data {
      margin-top: 14px;
      font-size: 10.5px;
      text-align: center;
    }
    .linha-assinatura {
      margin: 30px auto 4px;
      width: 78%;
      border-bottom: 1px solid #20252C;
      height: 28px;
    }
    .assinatura-label {
      text-align: center;
      font-size: 9px;
      color: var(--muted);
    }
    .obs {
      padding: 7px 9px;
      background: #F8F7F2;
      color: #626B76;
      font-size: 8.5px;
      border-top: 1px solid var(--line-soft);
    }
  `

  const html = `
  <div class="pg">
    ${htmlCabecalho({ tipo: 'full' })}

    <div class="anexo-titulo">
      <h1>Anexo I — Modelo de Formulário de Cadastro</h1>
      <div>Projeto TEAcolher · Cadastro de participante / responsável legal</div>
    </div>

    <div class="bloco">
      <h2>1. Dados pessoais</h2>
      <div class="form-grid">
        ${campo('Nome completo', usuario.nome)}
        ${campoHtml('Data de nascimento', esc(fmtData(usuario.data_nascimento)))}
      </div>
      <div class="form-grid-3">
        ${campo('Tipo sanguíneo', usuario.tipo_sanguineo)}
        ${campo('CPF', usuario.cpf)}
        ${campo('RG', usuario.rg)}
      </div>
      <div class="form-grid">
        ${campo('Endereço', usuario.endereco)}
        ${campo('Bairro', usuario.bairro)}
        ${campo('Cidade', cidade)}
        ${campo('Telefone/WhatsApp', usuario.telefone)}
        ${campo('E-mail', usuario.email, 'full')}
      </div>

      <div class="campo full" style="border-right:none">
        <div class="campo-label">Gênero</div>
        <div class="check-wrap">
          <div class="check-item">${marcadoGenero('Mulher cis')} Mulher cis</div>
          <div class="check-item">${marcadoGenero('Mulher trans')} Mulher trans</div>
          <div class="check-item">${marcadoGenero('Homem cis')} Homem cis</div>
          <div class="check-item">${marcadoGenero('Homem trans')} Homem trans</div>
          <div class="check-item">${marcadoGenero('Pessoa não binária')} Pessoa não binária</div>
          <div class="check-item">${marcadoGenero('Prefiro não informar')} Prefiro não informar</div>
          <div class="check-item" style="grid-column:1 / -1">${marcadoGenero('Outro')} Outro: ${esc(generoOutro || '____________________________')}</div>
        </div>
      </div>

      <div class="campo full" style="border-right:none">
        <div class="campo-label">Tipo de deficiência</div>
        <div class="check-wrap">
          <div class="check-item">${marcadoDef('Deficiência Física')} Deficiência Física</div>
          <div class="check-item">${marcadoDef('Deficiência Auditiva')} Deficiência Auditiva</div>
          <div class="check-item">${marcadoDef('Deficiência Visual')} Deficiência Visual</div>
          <div class="check-item">${marcadoDef('Deficiência Intelectual')} Deficiência Intelectual</div>
          <div class="check-item">${marcadoDef('Deficiência Mental/Psicossocial')} Deficiência Mental/Psicossocial</div>
          <div class="check-item">${marcadoDef('Deficiência Múltipla')} Deficiência Múltipla</div>
        </div>
      </div>

      <div class="form-grid">
        ${campo('Forneça aqui detalhes sobre a deficiência', usuario.deficiencia_detalhes, 'full')}
      </div>
    </div>

    <div class="bloco">
      <h2>2. Informações complementares</h2>
      <div class="form-grid">
        ${campo('Nome de contato de familiar ou cuidador', usuario.contato_familiar_nome)}
        ${campo('Relação com o participante (parentesco)', usuario.contato_familiar_parentesco)}
        ${campo('Telefone de contato do familiar/cuidador', usuario.contato_familiar_telefone)}
        ${campoHtml('Renda familiar bruta', esc(fmtMoeda(usuario.renda_familiar_bruta)))}
        ${campo('Número de pessoas que residem no núcleo familiar', usuario.pessoas_nucleo_familiar, 'full')}
      </div>
    </div>

    <div class="bloco">
      <h2>3. Declaração</h2>
      <div class="declaracao">
        Declaro, sob pena do artigo 299 do Código Penal Brasileiro, que as informações prestadas são verdadeiras e que resido oficialmente no município indicado. Autorizo o uso dos dados fornecidos para fins de seleção e acompanhamento no âmbito do Projeto TEAcolher.

        <div class="linha-data">
          ${esc(cidade || '______________________')}, _____ de __________________________ de ____________.
        </div>

        <div class="linha-assinatura"></div>
        <div class="assinatura-label">Assinatura do participante ou responsável legal</div>
      </div>
    </div>

    <div class="obs">
      Documento gerado pelo AGENDO Integra para apoio ao cadastro e acompanhamento do Projeto TEAcolher. Protocolo: ${protocolo}.
    </div>

    ${htmlRodape({ protocolo })}
  </div>`

  abrirImpressao(`<style>${css}</style>${html}`, 'Anexo I — Projeto TEAcolher')
}


// Agenda técnica individual do TEAcolher: diária, semanal ou mensal.
// Usada pelo perfil técnico para imprimir somente os próprios atendimentos.
export function gerarPDFAgendaTecnicoTeacolher(lista = [], opts = {}) {
  const profissional = opts.profissionalNome || 'Profissional técnico'
  const funcao = opts.funcao ? ` · ${opts.funcao}` : ''
  const periodo = opts.periodoLabel || 'Período selecionado'
  const titulo = opts.titulo || 'Minha agenda técnica TEAcolher'
  const subtitulo = `Profissional: ${profissional}${funcao} · ${periodo}`

  return gerarPDFAgendaTeacolher(lista, titulo, {
    ...opts,
    subtitulo,
    periodoLabel: periodo,
    ocultarProfissional: true,
    protocolo: opts.protocolo || `AG-TEIAA-${new Date().getFullYear()}-AGENDA-TEC`,
  })
}

// =============================================
// CRONOGRAMA DE EXECUÇÃO — espelha a tabela oficial do edital (ações x meses), pra prestação
// de contas não financeira bater exatamente com o que a Secretaria de Estado vai cobrar.
// =============================================
export function gerarPDFCronogramaTeacolher(lista = [], opts = {}) {
  const protocolo = opts.protocolo || `AG-TEIAA-${new Date().getFullYear()}-CRONOGRAMA`
  const totalMeses = opts.totalMeses || 11
  const itens = (Array.isArray(lista) ? lista : []).filter(a => String(a.situacao || '').toLowerCase() === 'realizado')

  // Define os meses do projeto. Se a data oficial de início (opts.dataInicioProjeto) não for
  // passada, usa os meses que aparecem nos próprios atendimentos — funciona, mas é menos preciso
  // que informar a data real de início do convênio.
  let meses = []
  if (opts.dataInicioProjeto) {
    const ini = new Date(opts.dataInicioProjeto + 'T12:00:00')
    for (let i = 0; i < totalMeses; i++) {
      const d = new Date(ini.getFullYear(), ini.getMonth() + i, 1)
      meses.push({ chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `Mês ${i + 1}`, sub: d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) })
    }
  } else {
    const chaves = Array.from(new Set(itens.map(a => String(a.data_atend || '').slice(0, 7)).filter(Boolean))).sort()
    meses = chaves.slice(0, totalMeses).map((chave, i) => {
      const [ano, mes] = chave.split('-')
      const d = new Date(Number(ano), Number(mes) - 1, 1)
      return { chave, label: `Mês ${i + 1}`, sub: d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) }
    })
  }

  const contarPorMes = filtroFn => meses.map(m => itens.filter(a => String(a.data_atend || '').slice(0, 7) === m.chave && filtroFn(a)).length)

  const linhaAuto = (rotulo, contagens) => `
    <tr>
      <td style="text-align:left">${rotulo}</td>
      ${contagens.map(q => `<td class="center" style="${q > 0 ? 'background:#EEF8F1;color:var(--green);font-weight:700' : 'color:#B4B2A9'}">${q > 0 ? q : '—'}</td>`).join('')}
    </tr>`

  const linhaManual = (rotulo, indiceMesMarcado) => `
    <tr>
      <td style="text-align:left">${rotulo} <span style="color:#9199A2;font-size:8px">(confirmação administrativa, não vem dos atendimentos)</span></td>
      ${meses.map((m, i) => `<td class="center" style="${i === indiceMesMarcado ? 'background:#FFF6E8;color:#854F0B;font-weight:700' : 'color:#B4B2A9'}">${i === indiceMesMarcado ? 'X' : '—'}</td>`).join('')}
    </tr>`

  const corpo = meses.length === 0 ? '' : `
        ${linhaManual('Implementar 4 núcleos com equipes multidisciplinares', 0)}
        ${linhaManual('Formalização de parcerias institucionais', 0)}
        ${linhaAuto('Realização de atendimentos individuais e coletivos', contarPorMes(() => true))}
        ${linhaAuto('Criação de grupos de apoio e orientação para famílias', contarPorMes(a => a.etapa_fluxo === 'Grupo de apoio e orientação para famílias'))}
        ${linhaAuto('Oficinas e atividades comunitárias', contarPorMes(a => a.etapa_fluxo === 'Oficina / atividade comunitária'))}
        ${linhaAuto('Avaliação participativa com beneficiários e parceiros institucionais', contarPorMes(a => a.etapa_fluxo === 'Avaliação participativa trimestral'))}`

  const html = `<div class="pg pg-landscape">
    ${htmlCabecalho({ titulo: 'Cronograma de Execução — Projeto TEAcolher', sub: 'Ações x meses, no mesmo formato da proposta apresentada à Secretaria de Estado', ref: protocolo })}
    <div class="secao-titulo secao-titulo-azul">Ações previstas x meses de execução</div>
    ${meses.length === 0 ? `
    <div style="text-align:center;color:#9199A2;padding:24px;font-size:11px">
      Nenhum atendimento realizado encontrado para montar os meses. Informe a data de início do
      projeto (opts.dataInicioProjeto) ou aguarde ter ao menos um atendimento finalizado.
    </div>` : `
    <table style="font-size:9px">
      <thead><tr><th style="text-align:left">Ação (etapa do edital)</th>${meses.map(m => `<th class="center">${m.label}<br><span style="font-weight:400;text-transform:none;font-size:7.5px">${m.sub}</span></th>`).join('')}</tr></thead>
      <tbody>${corpo}</tbody>
    </table>`}
    <div style="font-size:9px;color:#626B76;margin-top:10px;line-height:1.5">
      Os números mostram quantos atendimentos realizados naquele mês correspondem à ação. As duas
      primeiras linhas são marcações administrativas (implantação física dos núcleos e formalização
      de parcerias) — não vêm da agenda de atendimentos, ajuste manualmente se a data real for outra.
    </div>
    ${htmlRodape({ protocolo })}
  </div>`

  abrirImpressao(html, 'Cronograma de Execução TEAcolher', true)
}

// =============================================
// LISTA DE USUÁRIOS COM PROFISSIONAIS DE ACOMPANHAMENTO
// Mostra cada usuário/família do TEAcolher e com qual(is) profissional(is) ele
// está em acompanhamento — um usuário pode aparecer com mais de um profissional
// (ex.: psicóloga + fonoaudióloga ao mesmo tempo).
// =============================================
export function gerarPDFListaUsuariosComProfissionais(lista = [], opts = {}) {
  const protocolo = opts.protocolo || `AG-TEIAA-${new Date().getFullYear()}-USUARIOS`
  const esc = v => String(v ?? '—').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')
  const fmtData = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const itens = Array.isArray(lista) ? lista : []
  const comAcompanhamento = itens.filter(u => (u.profissionais || []).length > 0).length
  const semAcompanhamento = itens.length - comAcompanhamento

  const linhas = itens
    .slice()
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
    .map(u => {
      const profs = u.profissionais || []
      const profsTxt = profs.length > 0
        ? profs.map(p => `${esc(p.nome)}${p.funcao ? ` (${esc(p.funcao)})` : ''}`).join('; ')
        : '<span style="color:#B4B2A9">Sem acompanhamento ativo</span>'
      return `<tr>
        <td><strong>${esc(u.nome)}</strong></td>
        <td>${u.data_nascimento ? fmtData(u.data_nascimento) : '—'}</td>
        <td>${esc(u.contato_familiar_nome || u.telefone)}</td>
        <td style="${profs.length > 1 ? 'font-weight:600' : ''}">${profsTxt}</td>
      </tr>`
    }).join('')

  const html = `<div class="pg pg-landscape">
    ${htmlCabecalho({ titulo: 'Usuários e Profissionais de Acompanhamento', sub: 'Projeto TEAcolher · Associação TEIAA', ref: protocolo })}
    <div class="resumo-grid" style="margin-bottom:16px">
      <div class="resumo-item"><div class="resumo-label">Total de usuários</div><div class="resumo-valor azul">${itens.length}</div></div>
      <div class="resumo-item"><div class="resumo-label">Com acompanhamento ativo</div><div class="resumo-valor verde">${comAcompanhamento}</div></div>
      <div class="resumo-item"><div class="resumo-label">Sem acompanhamento no momento</div><div class="resumo-valor">${semAcompanhamento}</div></div>
    </div>
    <table>
      <thead><tr><th>Usuário/família</th><th>Nascimento</th><th>Contato familiar</th><th>Acompanhamento com</th></tr></thead>
      <tbody>${linhas || '<tr><td colspan="4" style="text-align:center;color:#9199A2;padding:12px">Nenhum usuário encontrado</td></tr>'}</tbody>
    </table>
    ${htmlRodape({ protocolo })}
  </div>`

  abrirImpressao(html, 'Usuários e Profissionais TEAcolher', true)
}

// =============================================
// FORMULÁRIO DE CADASTRO TEAcolher — réplica exata do modelo oficial
// (UFF / Secretaria de Estado / Governo do RJ / TEIAA), usado para impressão
// e assinatura física pela família. Usa o timbrado oficial (logo + apoiadores)
// extraído do PDF original — não usa a identidade do AGENDO Integra aqui,
// porque este documento precisa ser idêntico ao modelo aprovado pelo projeto.
// =============================================
export function gerarPDFAnexoOficialTeacolher(usuario = {}) {
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')
  const norm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
  const fmtData = d => {
    if (!d) return ''
    const dt = new Date(String(d).includes('T') ? d : d + 'T12:00:00')
    return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('pt-BR')
  }
  const dataPartes = (() => {
    const f = fmtData(usuario.data_nascimento)
    return f ? f.split('/') : ['', '', '']
  })()

  const generoAtual = norm(usuario.genero)
  const marcG = label => {
    const aliases = {
      'mulher cis': ['mulher cis'], 'mulher trans': ['mulher trans'],
      'homem cis': ['homem cis'], 'homem trans': ['homem trans'],
      'pessoa nao binaria': ['pessoa nao binaria', 'nao binario'],
      'prefiro nao informar': ['prefiro nao informar'],
    }
    const lista = aliases[norm(label)] || [norm(label)]
    return lista.some(v => generoAtual === v) ? '☒' : '☐'
  }
  const generoOutroMarcado = generoAtual && !['mulher cis','mulher trans','homem cis','homem trans','pessoa nao binaria','nao binario','prefiro nao informar'].includes(generoAtual)

  // Tipo de deficiência — campo único no cadastro, casamos por palavra-chave
  const defTexto = norm(`${usuario.tipo_deficiencia || ''} ${usuario.deficiencia_detalhes || ''}`)
  const marcDef = chaves => chaves.some(c => defTexto.includes(norm(c))) ? '☒' : '☐'

  // Condição de neurodesenvolvimento — o cadastro não tem campo dedicado pra isso,
  // então tentamos casar por palavra-chave no texto livre. Se nada bater, fica em
  // branco — vale o operacional conferir/marcar à mão se for o caso.
  const marcNeuro = chaves => chaves.some(c => defTexto.includes(norm(c))) ? '☒' : '☐'

  const linha = (label) => `<div style="border-bottom:1px solid #B9B4D6;display:flex;min-height:26px"><div style="width:230px;flex-shrink:0;padding:5px 8px;font-size:9.5px;border-right:1px solid #B9B4D6;display:flex;align-items:center">${label}</div><div style="flex:1;padding:5px 8px;font-size:10px;display:flex;align-items:center;color:#20252C;font-weight:600">`

  const pagina1 = `
    <img src="${TEACOLHER_HEADER_IMG}" style="width:100%;display:block;margin-bottom:14px" />
    <div style="background:#E3E0EE;padding:6px 10px;font-weight:700;font-size:11px;color:#20252C;border:1px solid #B9B4D6;border-bottom:none">1. DADOS PESSOAIS</div>
    <div style="border:1px solid #B9B4D6">
      ${linha('Nome completo')}${esc(usuario.nome)}</div></div>
      <div style="border-bottom:1px solid #B9B4D6;display:flex;min-height:26px">
        <div style="width:230px;flex-shrink:0;padding:5px 8px;font-size:9.5px;border-right:1px solid #B9B4D6;display:flex;align-items:center">Data de Nascimento</div>
        <div style="flex:1;padding:5px 8px;font-size:10px;display:flex;align-items:center;gap:4px;border-right:1px solid #B9B4D6;font-weight:600">${esc(dataPartes[0])} / ${esc(dataPartes[1])} / ${esc(dataPartes[2])}</div>
        <div style="width:110px;flex-shrink:0;padding:5px 8px;font-size:9.5px;border-right:1px solid #B9B4D6;display:flex;align-items:center">Tipo Sanguíneo</div>
        <div style="width:90px;flex-shrink:0;padding:5px 8px;font-size:10px;display:flex;align-items:center;font-weight:600">${esc(usuario.tipo_sanguineo)}</div>
      </div>
      <div style="border-bottom:1px solid #B9B4D6;display:flex;min-height:74px">
        <div style="width:230px;flex-shrink:0;padding:5px 8px;font-size:9.5px;border-right:1px solid #B9B4D6;display:flex;align-items:flex-start;padding-top:7px">Gênero</div>
        <div style="flex:1;padding:7px 8px;font-size:9.5px;display:grid;grid-template-columns:1fr 1fr;gap:4px 14px">
          <div>${marcG('Mulher cis')} Mulher cis</div>
          <div>${marcG('Pessoa não binária')} Pessoa não binária</div>
          <div>${marcG('Mulher trans')} Mulher trans</div>
          <div>${marcG('Prefiro não informar')} Prefiro não informar</div>
          <div>${marcG('Homem cis')} Homem cis</div>
          <div>${generoOutroMarcado ? '☒' : '☐'} Outro: ${generoOutroMarcado ? esc(usuario.genero_outro || usuario.genero) : '____________________'}</div>
          <div>${marcG('Homem trans')} Homem trans</div>
          <div></div>
        </div>
      </div>
      <div style="border-bottom:1px solid #B9B4D6;display:flex;min-height:26px">
        <div style="width:230px;flex-shrink:0;padding:5px 8px;font-size:9.5px;border-right:1px solid #B9B4D6;display:flex;align-items:center">CPF</div>
        <div style="flex:1;padding:5px 8px;font-size:10px;display:flex;align-items:center;border-right:1px solid #B9B4D6;font-weight:600">${esc(usuario.cpf)}</div>
        <div style="width:110px;flex-shrink:0;padding:5px 8px;font-size:9.5px;border-right:1px solid #B9B4D6;display:flex;align-items:center">RG</div>
        <div style="width:120px;flex-shrink:0;padding:5px 8px;font-size:10px;display:flex;align-items:center;font-weight:600">${esc(usuario.rg)}</div>
      </div>
      ${linha('Endereço')}${esc(usuario.endereco)}</div></div>
      <div style="border-bottom:1px solid #B9B4D6;display:flex;min-height:26px">
        <div style="width:230px;flex-shrink:0;padding:5px 8px;font-size:9.5px;border-right:1px solid #B9B4D6;display:flex;align-items:center">Bairro</div>
        <div style="flex:1;padding:5px 8px;font-size:10px;display:flex;align-items:center;border-right:1px solid #B9B4D6;font-weight:600">${esc(usuario.bairro)}</div>
        <div style="width:110px;flex-shrink:0;padding:5px 8px;font-size:9.5px;border-right:1px solid #B9B4D6;display:flex;align-items:center">Cidade</div>
        <div style="width:140px;flex-shrink:0;padding:5px 8px;font-size:10px;display:flex;align-items:center;font-weight:600">${esc(usuario.cidade || 'Teresópolis')}</div>
      </div>
      ${linha('Telefone/WhatsApp')}${esc(usuario.telefone)}</div></div>
      ${linha('E-mail')}${esc(usuario.email)}</div></div>
      <div style="border-bottom:1px solid #B9B4D6;display:flex;min-height:96px">
        <div style="width:230px;flex-shrink:0;padding:7px 8px;font-size:9.5px;border-right:1px solid #B9B4D6;display:flex;align-items:flex-start">Tipo de deficiência</div>
        <div style="flex:1;padding:7px 8px;font-size:9.5px;line-height:1.9">
          <div>${marcDef(['fisica'])} Deficiência física</div>
          <div>${marcDef(['auditiva'])} Deficiência auditiva</div>
          <div>${marcDef(['visual'])} Deficiência visual</div>
          <div>${marcDef(['intelectual'])} Deficiência intelectual</div>
          <div>${marcDef(['psicossocial'])} Deficiência psicossocial (ex.: transtornos mentais graves e persistentes)</div>
          <div>${marcDef(['multipla'])} Deficiência múltipla</div>
          <div>${marcDef(['nao se aplica'])} Não se aplica</div>
          <div>${defTexto.trim() ? '☐' : '☒'} Não informado</div>
        </div>
      </div>
      <div style="border-bottom:1px solid #B9B4D6;display:flex;min-height:96px">
        <div style="width:230px;flex-shrink:0;padding:7px 8px;font-size:9.5px;border-right:1px solid #B9B4D6;display:flex;align-items:flex-start">Condição do neurodesenvolvimento / características do desenvolvimento:</div>
        <div style="flex:1;padding:7px 8px;font-size:9.5px;line-height:1.9">
          <div>${marcNeuro(['tea','espectro autista','autismo'])} Transtorno do Espectro Autista (TEA)</div>
          <div>${marcNeuro(['tdah'])} TDAH</div>
          <div>${marcNeuro(['desenvolvimento intelectual'])} Transtorno do Desenvolvimento Intelectual (se aplicável)</div>
          <div>${marcNeuro(['dislexia','discalculia','aprendizagem'])} Transtornos de aprendizagem (dislexia, discalculia, etc.)</div>
          <div>${marcNeuro(['atraso no desenvolvimento'])} Atraso no desenvolvimento global</div>
          <div>${marcNeuro(['outro'])} Outro: ____________</div>
          <div>☐ Não informado</div>
          <div>☐ Não se aplica</div>
        </div>
      </div>
      <div style="display:flex;min-height:80px">
        <div style="width:230px;flex-shrink:0;padding:7px 8px;font-size:9px;border-right:1px solid #B9B4D6;display:flex;align-items:flex-start;line-height:1.4">Informações complementares sobre a condição de desenvolvimento ou deficiência: (Preencha apenas o que considerar necessário para o acompanhamento)</div>
        <div style="flex:1;padding:7px 8px;font-size:9.5px;line-height:1.5;color:#20252C">${esc(usuario.deficiencia_detalhes)}</div>
      </div>
    </div>
    <img src="${TEACOLHER_FOOTER_IMG}" style="width:100%;display:block;margin-top:18px" />
  `

  const pagina2 = `
    <img src="${TEACOLHER_HEADER_IMG}" style="width:100%;display:block;margin-bottom:14px" />
    <div style="background:#E3E0EE;padding:6px 10px;font-weight:700;font-size:11px;color:#20252C;border:1px solid #B9B4D6;border-bottom:none">2. INFORMAÇÕES COMPLEMENTARES</div>
    <div style="border:1px solid #B9B4D6;margin-bottom:18px">
      ${linha('Nome de contato de familiar ou cuidador:')}${esc(usuario.contato_familiar_nome)}</div></div>
      ${linha('Relação com o participante (parentesco):')}${esc(usuario.contato_familiar_parentesco)}</div></div>
      <div style="display:flex;min-height:26px">
        <div style="width:230px;flex-shrink:0;padding:5px 8px;font-size:9.5px;border-right:1px solid #B9B4D6;display:flex;align-items:center">Telefone de contato do familiar/cuidador:</div>
        <div style="flex:1;padding:5px 8px;font-size:10px;display:flex;align-items:center;font-weight:600">${esc(usuario.contato_familiar_telefone)}</div>
      </div>
    </div>
    <div style="background:#E3E0EE;padding:6px 10px;font-weight:700;font-size:11px;color:#20252C;border:1px solid #B9B4D6;border-bottom:none">3. DECLARAÇÃO</div>
    <div style="border:1px solid #B9B4D6;padding:12px;font-size:10px;line-height:1.6;color:#20252C">
      Declaro, sob pena do artigo 299 do Código Penal Brasileiro, que as informações prestadas são verdadeiras
      e que resido oficialmente no município indicado. Autorizo o uso dos dados fornecidos para fins de
      seleção e acompanhamento no âmbito do Projeto TEAcolher.
      <div style="margin-top:60px;border-top:1px solid #20252C;padding-top:4px;text-align:center;font-size:9px;color:#5F6874;max-width:420px;margin-left:auto;margin-right:auto">
        Assinatura do responsável legal
      </div>
    </div>
    <img src="${TEACOLHER_FOOTER_IMG}" style="width:100%;display:block;margin-top:140px" />
  `

  const html = `
    <div class="pg" style="font-family:Arial,Helvetica,sans-serif">${pagina1}</div>
    <div class="pg" style="font-family:Arial,Helvetica,sans-serif;page-break-before:always">${pagina2}</div>
  `
  abrirImpressao(html, `Formulário de Cadastro TEAcolher - ${usuario.nome || ''}`, false)
}

// =============================================
// TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM, VOZ E DADOS PESSOAIS — réplica exata
// do modelo oficial. Pode ser gerado em branco (pra imprimir e preencher à mão)
// ou já parcialmente preenchido com o nome/CPF do usuário cadastrado.
// =============================================
export function gerarPDFTermoAutorizacaoImagem(usuario = {}) {
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')
  const linhaPreenchida = (valor, largura) => valor
    ? `<span style="display:inline-block;min-width:${largura};border-bottom:1px solid #20252C;padding:0 4px;font-weight:600">${esc(valor)}</span>`
    : `<span style="display:inline-block;min-width:${largura};border-bottom:1px solid #20252C">&nbsp;</span>`

  const nomeResponsavel = usuario.contato_familiar_nome || ''
  const nomeParticipante = usuario.nome || ''
  const temResponsavel = !!nomeResponsavel
  // O cadastro só tem um campo de CPF, que é da pessoa atendida (a criança/participante).
  // Quando existe um responsável familiar, é ELE quem assina — e o sistema não tem o CPF
  // dele cadastrado, então deixamos em branco pra completar à mão (não dá pra usar o CPF
  // da criança como se fosse do responsável, seria informação errada no termo).
  const cpfAssinante = temResponsavel ? '' : (usuario.cpf || '')
  const endereco = [usuario.endereco, usuario.bairro, usuario.cidade].filter(Boolean).join(', ')

  const html = `
    <div class="pg" style="font-family:Arial,Helvetica,sans-serif">
      <img src="${TEACOLHER_HEADER_IMG}" style="width:100%;display:block;margin-bottom:18px" />
      <div style="text-align:center;font-weight:700;font-size:12px;color:#20252C;margin-bottom:22px;letter-spacing:.01em">
        TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM, VOZ E DADOS PESSOAIS
      </div>
      <div style="font-size:10.5px;line-height:2.1;color:#20252C;text-align:justify">
        Eu, ${linhaPreenchida(nomeResponsavel, '320px')}, portador(a) do CPF nº
        ${linhaPreenchida(cpfAssinante, '180px')}, residente e domiciliado(a) em
        ${linhaPreenchida(endereco, '100%')}, na qualidade de participante do Projeto TEAcolher ou
        responsável legal pelo(a) participante ${linhaPreenchida(nomeParticipante, '320px')}, autorizo, de
        forma livre, expressa e gratuita, a utilização de minha imagem, voz e depoimentos, bem como
        do(a) participante acima identificado(a), captados durante a execução das atividades do
        Projeto TEAcolher.
      </div>
      <div style="font-size:10.5px;line-height:1.7;color:#20252C;text-align:justify;margin-top:14px">
        A presente autorização destina-se exclusivamente à divulgação institucional, educacional,
        científica e informativa das ações desenvolvidas no âmbito do Projeto TEAcolher, podendo os
        registros ser utilizados em relatórios técnicos, materiais gráficos, publicações impressas e
        digitais, apresentações, redes sociais, sítios eletrônicos institucionais, eventos, pesquisas e
        demais meios de comunicação relacionados ao projeto, à Universidade Federal Fluminense (UFF), à
        Fundação Euclides da Cunha (FEC) e aos órgãos parceiros.
      </div>
      <div style="font-size:10.5px;line-height:1.7;color:#20252C;text-align:justify;margin-top:14px">
        A autorização é concedida sem qualquer ônus financeiro e por prazo indeterminado, observadas
        as disposições da Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018) e demais normas
        aplicáveis, podendo ser revogada a qualquer tempo mediante solicitação formal por escrito, sem
        prejuízo das utilizações já realizadas anteriormente à revogação.
      </div>
      <div style="font-size:10.5px;line-height:1.7;color:#20252C;text-align:justify;margin-top:14px;margin-bottom:50px">
        Declaro estar ciente da finalidade desta autorização e concordo com os termos acima descritos.
      </div>

      <div style="border-top:1px solid #20252C;padding-top:4px;font-size:10px;color:#20252C;margin-bottom:18px">
        Nome do(a) participante ou responsável legal${nomeResponsavel || nomeParticipante ? `: <strong>${esc(nomeResponsavel || nomeParticipante)}</strong>` : ''}
      </div>
      <div style="font-size:10px;color:#20252C;margin-bottom:30px">CPF: ${linhaPreenchida(cpfAssinante, '220px')}${temResponsavel ? `<span style="font-size:8.5px;color:#9199A2;margin-left:10px">(CPF do(a) participante, ${esc(nomeParticipante)}: ${esc(usuario.cpf) || 'não informado'})</span>` : ''}</div>

      <div style="border-top:1px solid #20252C;padding-top:4px;font-size:10px;color:#20252C;margin-bottom:18px;max-width:420px">
        Assinatura
      </div>
      <div style="font-size:10px;color:#20252C;margin-bottom:8px">Local: ${linhaPreenchida('Teresópolis - RJ', '260px')}</div>
      <div style="font-size:10px;color:#20252C">Data: ${linhaPreenchida(new Date().toLocaleDateString('pt-BR'), '140px')}</div>

      <img src="${TEACOLHER_FOOTER_IMG}" style="width:100%;display:block;margin-top:60px" />
    </div>
  `
  abrirImpressao(html, `Termo de Autorização de Imagem - ${usuario.nome || ''}`, false)
}
