// ==========================================
// app.js - VERSÃO COMPLETA E DEFINITIVA
// Portal OPPO - 100% Nuvem, Híbrido, Auto-Save e BI
// ==========================================

let lojaAtual = ""; 
let vendedorSelecionadoVenda = null; 
let pendenciasVendaMultipla = []; 
let aparelhoEmSelecao = null; 
let pendenciasEstoque = {};
let promotorFiltroAtual = "todos"; 
let subPromotorFiltroAtual = "todos"; 
let promotorEstoqueFiltroAtual = "todos";
let chartCoparticipacao = null; 
let chartCapa = null; 
let chartLojas = null; 
let chartModelos = null;
let chartHorariosPico = null;
let chartPaceVisual = null;
let chartShareGlobal = null;
let supervisorGerenciadoAtual = null; 
let tipoHistoricoAtual = 'geral'; 
let mostruarioEmEdicao = null; 
let vendaParaCancelar = null;

// Polyfill para NodeList
if (window.NodeList && !NodeList.prototype.forEach) { NodeList.prototype.forEach = Array.prototype.forEach; }

window.addEventListener('offline', () => { mostrarToast("Conexão instável...", "alerta"); });
window.addEventListener('online', () => { ocultarBotaoReconexao(); });

document.addEventListener('DOMContentLoaded', () => {
    loadIcons();
    if(typeof inicializarAPI === "function") inicializarAPI();
});

function mostrarBotaoReconexao() { let painel = document.getElementById('painel-erro-conexao'); if (painel) painel.style.display = 'block'; loadIcons(); }
function ocultarBotaoReconexao() { let painel = document.getElementById('painel-erro-conexao'); if (painel) painel.style.display = 'none'; }

// ==========================================
// SISTEMA DE TOASTS E UI GLOBAL
// ==========================================
function mostrarToast(msg, tipo = "sucesso") { 
    const container = document.getElementById("toast-container"); 
    const toastsAtuais = container.querySelectorAll('.toast span');
    for (let t of toastsAtuais) { if (t.innerHTML === msg.replace(/\n/g, '<br>')) return; }

    const toast = document.createElement("div"); 
    toast.className = `toast ${tipo}`; 
    let icon = '<i data-lucide="check-circle"></i>'; 
    if(tipo === 'erro') icon = '<i data-lucide="x-circle"></i>'; 
    if(tipo === 'alerta') icon = '<i data-lucide="info"></i>'; 
    
    toast.innerHTML = icon + ' <span style="flex: 1;">' + msg.replace(/\n/g, '<br>') + '</span><i data-lucide="x" class="toast-close"></i>'; 
    container.appendChild(toast); loadIcons(); 
    
    if(tipo === 'sucesso') vibrar(100); if(tipo === 'erro') vibrar([50, 50, 50]); 
    setTimeout(() => toast.classList.add("show"), 10); 
    let timeoutId = setTimeout(() => { fecharToast(toast); }, 4000); 

    toast.onclick = () => { clearTimeout(timeoutId); fecharToast(toast); };
}

function fecharToast(toastElement) {
    if (!toastElement) return;
    toastElement.classList.remove("show");
    setTimeout(() => toastElement.remove(), 300);
}

function vibrar(padrao) { if(navigator.vibrate) navigator.vibrate(padrao); }

function loadIcons() { 
    if(typeof lucide !== 'undefined') { lucide.createIcons(); } 
    let isDark = document.body.classList.contains('dark-mode'); 
    let icone = document.getElementById('icone-tema'); 
    if(icone) icone.setAttribute('data-lucide', isDark ? 'sun' : 'moon'); 
    let iconeSub = document.getElementById('icone-tema-sub'); 
    if(iconeSub) iconeSub.setAttribute('data-lucide', isDark ? 'sun' : 'moon'); 
    if(typeof lucide !== 'undefined') { lucide.createIcons(); } 
}

function toggleTema() { 
    document.body.classList.toggle('dark-mode'); 
    localStorage.setItem('temaEscuro', document.body.classList.contains('dark-mode') ? 'sim' : 'nao'); 
    loadIcons(); 
    if (document.getElementById('tela-dashboard').classList.contains('ativa')) abrirDashboard(); 
}

// ==========================================
// FUNÇÃO DE AUTO-SAVE INVISÍVEL
// ==========================================
async function salvarConfiguracoesGlobais(mostrarAviso = false) {
    if (!navigator.onLine) { if(mostrarAviso) mostrarToast("Sem conexão para salvar.", "erro"); return; }
    try {
        let payload = { 
            id: 'padrao', 
            mapa_emojis: mapaEmojis, 
            aparelhos_premium: aparelhosPremium, 
            taxas_coparticipacao: taxasCoparticipacao, 
            valores_comissao: valoresComissao,
            mostruarios: mostruariosGlobais
        };
        const { error } = await supabaseClient.from('configuracoes_globais').upsert([payload]);
        if (error) throw error;
        if (mostrarAviso) mostrarToast("Salvo na nuvem com sucesso!", "sucesso");
    } catch (e) {
        console.error("Erro no auto-save:", e);
        if (mostrarAviso) mostrarToast("Erro ao auto-salvar.", "erro");
    }
}

// ==========================================
// NAVEGAÇÃO HÍBRIDA (MOBILE E PC) E TELAS
// ==========================================
function mudarTela(idTela) { 
    let telas = document.querySelectorAll('.tela'); 
    for(let i=0; i<telas.length; i++) { telas[i].classList.remove('ativa'); } 
    let telaAlvo = document.getElementById(idTela); 
    if(telaAlvo) telaAlvo.classList.add('ativa'); 
    
    let sidebar = document.getElementById('sidebar-desktop');
    let container = document.querySelector('.container');

    if (idTela === 'tela-login') {
        if (sidebar) sidebar.style.display = 'none';
        if (container) container.classList.add('login-mode-desktop');
    } else {
        if (sidebar) sidebar.style.display = ''; 
        if (container) container.classList.remove('login-mode-desktop');
    }

    if (idTela === 'tela-menu' || idTela === 'tela-login') { 
        let hHome = document.getElementById('header-view-home'); if(hHome) hHome.style.display = 'flex'; 
        let hBack = document.getElementById('header-view-back'); if(hBack) hBack.style.display = 'none'; 
    } else { 
        let hHome = document.getElementById('header-view-home'); if(hHome) hHome.style.display = 'none'; 
        let hBack = document.getElementById('header-view-back'); if(hBack) hBack.style.display = 'flex'; 
        let title = "Portal OPPO"; 
        if(idTela === 'tela-promotores' || idTela === 'tela-lojas') title = "Equipe / Loja"; 
        if(idTela === 'tela-venda') title = "Nova Venda"; 
        if(idTela === 'tela-acompanhamento') title = "Acompanhamento"; 
        if(idTela === 'tela-estoque') title = "Estoque"; 
        if(idTela === 'tela-historico') title = "Histórico"; 
        if(idTela === 'tela-dashboard') title = "Dashboard"; 
        if(idTela === 'tela-admin') title = "Ajustes"; 
        let hTitle = document.getElementById('header-title-sub'); if(hTitle) hTitle.innerText = title; 
    } 
    
    if (container) { 
        if(idTela === 'tela-dashboard' || idTela === 'tela-admin' || idTela === 'tela-historico') { 
            container.classList.add('container-wide'); 
        } else { container.classList.remove('container-wide'); } 
    } 
    setTimeout(() => loadIcons(), 50); 
}

function navAction(acao) { 
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('ativo')); 
    document.querySelectorAll('.sidebar-link').forEach(item => item.classList.remove('ativo')); 
    
    let mobileBtn = document.querySelector(`.nav-item[data-acao="${acao}"]`);
    let desktopBtn = document.querySelector(`.sidebar-link[data-acao="${acao}"]`);
    if(mobileBtn) mobileBtn.classList.add('ativo');
    if(desktopBtn) desktopBtn.classList.add('ativo');

    if(acao === 'venda') irParaVendas(); 
    else if(acao === 'acomp') abrirAcompanhamento(); 
    else if(acao === 'dashboard') abrirDashboard(); 
    else if(acao === 'estoque') abrirEstoque(); 
    else if(acao === 'admin') abrirAdmin(); 
    else if(acao === 'historico') abrirHistorico('geral');
}

function navTo(idTela) { 
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('ativo')); 
    document.querySelectorAll('.sidebar-link').forEach(item => item.classList.remove('ativo')); 
    
    let acaoEquivalente = "home"; 
    if (idTela === 'tela-menu') acaoEquivalente = "home";

    let mobileBtn = document.querySelector(`.nav-item[data-acao="${acaoEquivalente}"]`);
    let desktopBtn = document.querySelector(`.sidebar-link[data-acao="${acaoEquivalente}"]`);
    if(mobileBtn) mobileBtn.classList.add('ativo');
    if(desktopBtn) desktopBtn.classList.add('ativo');

    mudarTela(idTela); 
}

function switchTab(tabId, groupClass) { 
    document.querySelectorAll(`.${groupClass}-content`).forEach(t => t.style.display = 'none'); 
    document.querySelectorAll(`.${groupClass}-btn`).forEach(b => b.classList.remove('ativo')); 
    document.getElementById(tabId).style.display = 'block'; 
    if(event && event.currentTarget) event.currentTarget.classList.add('ativo'); 
    loadIcons(); 
}

// ==========================================
// PULL TO REFRESH
// ==========================================
let ptrStartY = 0; let ptrCurrentY = 0; let isPulling = false;
document.addEventListener('touchstart', e => { if (window.scrollY === 0 || document.documentElement.scrollTop === 0) { ptrStartY = e.touches[0].clientY; isPulling = true; } }, { passive: true });
document.addEventListener('touchmove', e => {
    if (!isPulling) return;
    let currentY = e.touches[0].clientY; let diffY = currentY - ptrStartY;
    if (diffY > 0 && (window.scrollY === 0 || document.documentElement.scrollTop === 0)) {
        if (e.cancelable) e.preventDefault(); 
        ptrCurrentY = currentY;
        if (diffY > 15) {
            let ptr = document.getElementById('ptr-indicator');
            if (!ptr) {
                ptr = document.createElement('div'); ptr.id = 'ptr-indicator';
                ptr.innerHTML = '<i data-lucide="arrow-down" id="ptr-icon" style="margin:0;"></i>';
                document.body.appendChild(ptr); if(typeof lucide !== 'undefined') lucide.createIcons();
            }
            let pullDist = Math.min((diffY - 15) / 2, 60); ptr.style.top = pullDist + 'px';
            let icon = document.getElementById('ptr-icon');
            if (icon) { if (diffY > 90) { icon.setAttribute('data-lucide', 'refresh-cw'); } else { icon.setAttribute('data-lucide', 'arrow-down'); } if(typeof lucide !== 'undefined') lucide.createIcons(); }
        }
    } else { isPulling = false; }
}, { passive: false });

document.addEventListener('touchend', e => {
    if (!isPulling) return; isPulling = false; let diffY = ptrCurrentY - ptrStartY; let ptr = document.getElementById('ptr-indicator');
    if (ptr && diffY > 90) { ptr.classList.add('refreshing'); ptr.style.top = '40px'; executarRefreshTelaAtual(); setTimeout(() => { ptr.style.top = '-60px'; ptr.classList.remove('refreshing'); setTimeout(() => ptr.remove(), 300); }, 1500); } else if (ptr) { ptr.style.top = '-60px'; setTimeout(() => ptr.remove(), 300); }
    ptrStartY = 0; ptrCurrentY = 0;
});

function executarRefreshTelaAtual() {
    vibrar(50);
    if (document.getElementById('tela-dashboard').classList.contains('ativa')) { forcarAtualizacaoDashboard(); } 
    else if (document.getElementById('tela-acompanhamento').classList.contains('ativa')) { carregarDadosDoBanco(); } 
    else if (document.getElementById('tela-estoque').classList.contains('ativa')) { carregarEstoqueDoBanco(); } 
    else if (document.getElementById('tela-historico').classList.contains('ativa')) { carregarHistoricoDoBanco(true); } 
    else { mostrarToast("Atualizado!", "sucesso"); }
}

function gerarSkeletonHtml(qtd) { let html = ""; for(let i=0; i<qtd; i++) { html += '<div class="skeleton-card"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text" style="width: 80%;"></div></div>'; } return html; }
function calcularDiasUteisRestantes() { let hoje = new Date(); let ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0); let diasUteis = 0; for (let d = hoje.getDate(); d <= ultimoDia.getDate(); d++) { let dataAtual = new Date(hoje.getFullYear(), hoje.getMonth(), d); let diaSemana = dataAtual.getDay(); if (diaSemana !== 0 && diaSemana !== 6) { diasUteis++; } } return diasUteis; }
function extrairChaveAparelho(textoBruto) { let semImei = textoBruto.split("→")[0].split("(")[0].replace(/\[Motivo:.*?\]/g, "").trim().toLowerCase(); let chavesOrdenadas = Object.keys(mapaEmojis).sort((a, b) => b.length - a.length); for (let i = 0; i < chavesOrdenadas.length; i++) { let chave = chavesOrdenadas[i].toLowerCase(); if (semImei.includes(chave)) return chave; } return semImei.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim(); }
function ehPremium(textoBruto, supervisorId) { let chave = extrairChaveAparelho(textoBruto); let pSup = aparelhosPremium[supervisorId]; if (!pSup || Object.keys(pSup).length === 0) pSup = aparelhosPremium["geral"] || {}; return (pSup[chave] === 1 || pSup[chave] === true); }

// ==========================================
// FUNÇÕES DE VENDAS (CARRINHO E BYPASS)
// ==========================================
function irParaVendas() {
    let adminRole = (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master" || usuarioLogado.cargo === "supervisor");
    if (adminRole) { 
        let promotoresDele = Object.keys(bancoUsuarios).filter(k => bancoUsuarios[k].cargo === "promotor" && podeGerenciar(usuarioLogado, k)); 
        if(promotoresDele.length === 0) return mostrarToast("Você não possui promotores vinculados.", "alerta"); 
        montarBotoesPromotores(promotoresDele); mudarTela('tela-promotores'); 
    } else { 
        let lojas = usuarioLogado.lojasPermitidas || []; 
        if(lojas.length === 0) return mostrarToast("Você não possui lojas vinculadas.", "alerta"); 
        if(lojas.length === 1) selecionarLoja(lojas[0]); else { montarBotoesLojas(lojas); mudarTela('tela-lojas'); } 
    }
}

function selecionarPromotor(obj) { let lojas = obj.lojasPermitidas || []; if(lojas.length === 0) { mostrarToast("Nenhuma loja vinculada.", "alerta"); return; } if (lojas.length === 1) selecionarLoja(lojas[0]); else { montarBotoesLojas(lojas); mudarTela('tela-lojas'); } }
function montarBotoesPromotores(listaChaves) { const div = document.getElementById('botoes-promotores-dinamicos'); div.innerHTML = ""; if (!listaChaves || listaChaves.length === 0) { div.innerHTML = "<div class='mensagem-vazia'>Sem promotores na equipe.</div>"; return; } listaChaves.sort((a, b) => { let nomeA = (bancoUsuarios[a].nome || a).toLowerCase(); let nomeB = (bancoUsuarios[b].nome || b).toLowerCase(); return nomeA.localeCompare(nomeB); }); listaChaves.forEach(k => { let btn = document.createElement('button'); btn.className = "btn-sistema"; btn.innerHTML = `<i data-lucide="user" class="lucide-sm"></i> Equipe ${bancoUsuarios[k].nome || k}`; btn.onclick = () => selecionarPromotor(bancoUsuarios[k]); div.appendChild(btn); }); loadIcons(); }
function montarBotoesLojas(arr) { const div = document.getElementById('botoes-lojas-dinamicos'); div.innerHTML = ""; let arrOrdenado = arr.sort((a, b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})); arrOrdenado.forEach(l => { let btn = document.createElement('button'); btn.className = "btn-sistema"; btn.innerHTML = `<i data-lucide="store" class="lucide-sm"></i> ${l}`; btn.onclick = () => selecionarLoja(l); div.appendChild(btn); }); loadIcons(); }

function selecionarLoja(nomeLoja) {
    lojaAtual = nomeLoja; document.getElementById('titulo-loja-ativa').innerText = lojaAtual; document.getElementById('nome-promotor-ativo').innerText = getPromotorDaLoja(nomeLoja); vendedorSelecionadoVenda = null; pendenciasVendaMultipla = []; renderizarVendedoresVenda(); 
    const btn = document.getElementById('btn-trocar-loja'); 
    let adminRole = (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master" || usuarioLogado.cargo === "supervisor");
    if (adminRole) { btn.style.display = "flex"; btn.innerHTML = '<i data-lucide="refresh-ccw"></i> Trocar Equipe/Loja'; btn.onclick = () => mudarTela('tela-promotores'); } 
    else if (usuarioLogado.lojasPermitidas && usuarioLogado.lojasPermitidas.length > 1) { btn.style.display = "flex"; btn.innerHTML = '<i data-lucide="refresh-ccw"></i> Trocar de Loja'; btn.onclick = () => mudarTela('tela-lojas'); } 
    else { btn.style.display = "none"; }
    carregarCards(); atualizarTelaConferencia(); mudarTela('tela-venda'); loadIcons();
}

function getPromotorDaLoja(loja) { for (let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].lojasPermitidas && bancoUsuarios[k].lojasPermitidas.includes(loja)) { return bancoUsuarios[k].nome || k; } } return "Promotor Indefinido"; }
function renderizarVendedoresVenda() { const div = document.getElementById('grid-vendedores'); div.innerHTML = ""; const listaVendedores = (lojasConfig[lojaAtual] && lojasConfig[lojaAtual].vendedores) ? lojasConfig[lojaAtual].vendedores : []; if(listaVendedores.length === 0) { div.innerHTML = "<span style='color:var(--cor-secundaria); font-size:13px;'>Nenhum vendedor nesta loja.</span>"; return; } let vendedoresOrdenados = [...listaVendedores].sort((a, b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})); vendedoresOrdenados.forEach(v => { let isAtivo = (vendedorSelecionadoVenda === v) ? "ativo" : ""; div.innerHTML += `<div class="card-vendedor-venda ${isAtivo}" onclick="toggleVendedorVenda('${v}')">${v}</div>`; }); loadIcons(); }
function toggleVendedorVenda(nome) { if(vendedorSelecionadoVenda === nome) vendedorSelecionadoVenda = null; else vendedorSelecionadoVenda = nome; renderizarVendedoresVenda(); }
function carregarCards() { const div = document.getElementById("grid-aparelhos"); let html = ""; for (let ap in mapaEmojis) { html += `<div class="item-aparelho"><div class="card-aparelho" onclick="iniciarSelecaoAparelho('${ap}')"><span class="emoji-card">${mapaEmojis[ap]}</span></div><span class="nome-card">${ap.toUpperCase()}</span></div>`; } div.innerHTML = html; }
function iniciarSelecaoAparelho(ap) { if (!vendedorSelecionadoVenda) return mostrarToast("Selecione UM vendedor primeiro!", "alerta"); aparelhoEmSelecao = { nome: ap.toUpperCase(), emoji: mapaEmojis[ap] }; document.getElementById('modal-titulo-aparelho').innerHTML = `${aparelhoEmSelecao.emoji} ${aparelhoEmSelecao.nome}`; document.getElementById('input-imei').value = ""; document.getElementById('modal-imei').classList.add('ativo'); }
function confirmarImei(comImei) { let imei = comImei ? document.getElementById('input-imei').value.trim() : ""; document.getElementById('modal-imei').classList.remove('ativo'); pendenciasVendaMultipla.push({ vendedor: vendedorSelecionadoVenda, aparelho: aparelhoEmSelecao.nome, emoji: aparelhoEmSelecao.emoji, imei: imei }); aparelhoEmSelecao = null; vendedorSelecionadoVenda = null; renderizarVendedoresVenda(); atualizarTelaConferencia(); }
function atualizarTelaConferencia() { const div = document.getElementById("area-conferencia"); const lista = document.getElementById("lista-pendentes"); if (pendenciasVendaMultipla.length > 0) { div.style.display = "block"; lista.innerHTML = pendenciasVendaMultipla.map(p => `<div class="item-pendente" style="display:flex; flex-direction:column; align-items:flex-start; gap:4px;"><div style="font-size:11px; color:var(--cor-secundaria);"><i data-lucide="user" class="lucide-sm"></i> Vend: ${p.vendedor}</div><div style="font-weight:bold;"><i data-lucide="check" class="lucide-sm" style="color: #10b981;"></i> ${p.emoji} ${p.aparelho} ${p.imei ? `(IMEI: ${p.imei})` : ''}</div></div>`).join(""); } else { div.style.display = "none"; lista.innerHTML = ""; } loadIcons(); }
function limparPendentes() { pendenciasVendaMultipla = []; atualizarTelaConferencia(); }

async function enviarParaBanco() {
    if (!navigator.onLine) { mostrarToast("Sem internet!", "erro"); mostrarBotaoReconexao(); return; }
    if (pendenciasVendaMultipla.length === 0) return;

    const btn = document.getElementById("btn-enviar-venda");
    btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" style="animation: spin 2s linear infinite;"></i> Validando...'; loadIcons();

    let contagemNecessaria = {};
    pendenciasVendaMultipla.forEach(p => { let nomeAparelhoFormatado = `${p.emoji} ${p.aparelho}`; contagemNecessaria[nomeAparelhoFormatado] = (contagemNecessaria[nomeAparelhoFormatado] || 0) + 1; });

    try {
        let aparelhosSemEstoque = [];
        for (let apNome in contagemNecessaria) {
            const { data: estItem } = await supabaseClient.from('estoque').select('quantidade').eq('loja', lojaAtual).eq('aparelho', apNome).maybeSingle();
            let qtdAtual = estItem ? (estItem.quantidade || 0) : 0; let qtdExigida = contagemNecessaria[apNome];
            if (qtdAtual < qtdExigida) aparelhosSemEstoque.push(`• ${apNome} (Estoque: ${qtdAtual} | Vendendo: ${qtdExigida})`);
        }

        // LÓGICA DE BYPASS DO GESTOR
        if (aparelhosSemEstoque.length > 0) {
            let isGestor = (usuarioLogado.cargo === "supervisor" || usuarioLogado.cargo === "regional" || usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master");
            if (isGestor) {
                mostrarToast("Estoque insuficiente. Venda forçada liberada (Acesso Gestor).", "alerta");
            } else {
                mostrarToast(`ESTOQUE INSUFICIENTE!\nCorrija a auditoria:\n\n${aparelhosSemEstoque.join('\n')}`, "erro");
                btn.disabled = false; btn.innerHTML = '<i data-lucide="send"></i> Enviar'; loadIcons(); return; 
            }
        }

        btn.innerHTML = '<i data-lucide="loader-2" style="animation: spin 2s linear infinite;"></i> Salvando Venda...'; loadIcons();

        let vendasInsert = [];
        pendenciasVendaMultipla.forEach(p => {
            let nomeAparelhoFormatado = `${p.emoji} ${p.aparelho}`;
            vendasInsert.push({ promotor_login: usuarioLogado.id, loja: lojaAtual, vendedor: p.vendedor, aparelhos_vendidos: nomeAparelhoFormatado + (p.imei ? ` → IMEI: ${p.imei}` : ""), data_venda: new Date().toISOString(), status: 'Realizado' });
        });

        const { error: errV } = await supabaseClient.from('vendas').insert(vendasInsert);
        if (errV) throw errV;

        for (let apNome in contagemNecessaria) {
             const { data: estItem } = await supabaseClient.from('estoque').select('*').eq('loja', lojaAtual).eq('aparelho', apNome).maybeSingle();
             if (estItem) { 
                 let novaQtd = (estItem.quantidade || 0) - contagemNecessaria[apNome]; 
                 if (novaQtd < 0) novaQtd = 0; // IMPEDE O ESTOQUE DE FICAR NEGATIVO
                 await supabaseClient.from('estoque').update({ quantidade: novaQtd }).eq('id', estItem.id); 
             }
        }

        mostrarToast("Vendas registradas no banco!", "sucesso"); limparPendentes();
    } catch (e) {
        console.error(e); mostrarToast("Erro ao registrar venda.", "erro"); mostrarBotaoReconexao();
    } finally { btn.disabled = false; btn.innerHTML = '<i data-lucide="send"></i> Enviar'; loadIcons(); }
}

// ==========================================
// ACOMPANHAMENTO E HISTÓRICO
// ==========================================
function abrirAcompanhamento() { mudarTela('tela-acompanhamento'); if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") { promotorFiltroAtual = "todos"; } else { promotorFiltroAtual = usuarioLogado.id; } subPromotorFiltroAtual = "todos"; renderizarFiltroPromotores(); carregarDadosDoBanco(); }
function renderizarFiltroPromotores() { 
    const div = document.getElementById("seletor-promotores"); const divSub = document.getElementById("seletor-sub-promotores"); 
    if (usuarioLogado.cargo === "promotor") { div.innerHTML = `<div class="card-promotor-filtro ativo"><i data-lucide="user" class="lucide-sm"></i> ${usuarioLogado.nome} (Suas Lojas)</div>`; if(divSub) divSub.style.display = "none"; loadIcons(); return; } 
    let html = `<div class="card-promotor-filtro ${promotorFiltroAtual === 'todos' ? 'ativo' : ''}" onclick="setFiltroPromotor('todos')"><i data-lucide="layout-dashboard" class="lucide-sm"></i> Visão Geral (Todas)</div>`; 
    if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") { 
        for (let key in bancoUsuarios) { if (bancoUsuarios[key].cargo === "supervisor") { if(podeGerenciar(usuarioLogado, key)) { html += `<div class="card-promotor-filtro ${promotorFiltroAtual === key ? 'ativo' : ''}" onclick="setFiltroPromotor('${key}')"><i data-lucide="users" class="lucide-sm"></i> Equipe ${bancoUsuarios[key].nome || key}</div>`; } } } 
        if (promotorFiltroAtual !== 'todos' && bancoUsuarios[promotorFiltroAtual]) { 
            let htmlSub = `<div class="card-promotor-filtro ${subPromotorFiltroAtual === 'todos' ? 'ativo' : ''}" style="${subPromotorFiltroAtual === 'todos' ? 'background-color: var(--primary); border-color: var(--primary); color: white;' : 'background-color: var(--bg-item); color: var(--cor-secundaria); border-color: var(--border-color);'}" onclick="setSubFiltroPromotor('todos')"><i data-lucide="users" class="lucide-sm"></i> Todas (Equipe)</div>`; 
            for (let key in bancoUsuarios) { if (bancoUsuarios[key].cargo === "promotor" && bancoUsuarios[key].criadoPor === promotorFiltroAtual) { let isAt = subPromotorFiltroAtual === key; htmlSub += `<div class="card-promotor-filtro ${isAt ? 'ativo' : ''}" style="${isAt ? 'background-color: var(--primary); border-color: var(--primary); color: white;' : 'background-color: var(--bg-item); color: var(--cor-secundaria); border-color: var(--border-color);'}" onclick="setSubFiltroPromotor('${key}')"><i data-lucide="user" class="lucide-sm"></i> ${bancoUsuarios[key].nome || key}</div>`; } } 
            if(divSub) { divSub.innerHTML = htmlSub; divSub.style.display = "flex"; } 
        } else { if(divSub) divSub.style.display = "none"; } 
    } else if (usuarioLogado.cargo === "supervisor") { 
        html = `<div class="card-promotor-filtro ${promotorFiltroAtual === 'todos' ? 'ativo' : ''}" onclick="setFiltroPromotor('todos')"><i data-lucide="layout-dashboard" class="lucide-sm"></i> Visão Geral (Sua Equipe)</div>`; 
        for (let key in bancoUsuarios) { if (bancoUsuarios[key].cargo === "promotor" && bancoUsuarios[key].criadoPor === usuarioLogado.id) { html += `<div class="card-promotor-filtro ${promotorFiltroAtual === key ? 'ativo' : ''}" onclick="setFiltroPromotor('${key}')"><i data-lucide="user" class="lucide-sm"></i> ${bancoUsuarios[key].nome || key}</div>`; } } 
        if(divSub) divSub.style.display = "none"; 
    } div.innerHTML = html; loadIcons(); 
}
function setFiltroPromotor(id) { promotorFiltroAtual = id; subPromotorFiltroAtual = "todos"; renderizarFiltroPromotores(); renderizarListaAcompanhamento(); }
function setSubFiltroPromotor(id) { subPromotorFiltroAtual = id; renderizarFiltroPromotores(); renderizarListaAcompanhamento(); }

function renderizarListaAcompanhamento() {
    const div = document.getElementById("lista-agrupada"); if (dadosAcompanhamentoGlobal.length === 0) return div.innerHTML = `<div class="mensagem-vazia">Nenhuma venda registrada.</div>`;
    let promotoresGrupos = {}; 
    dadosAcompanhamentoGlobal.forEach(row => {
        let match = (row["Vendedor"] || "").match(/^\[(.*?)\]\s*(.*)$/); let loja = match ? match[1] : "Outras Lojas"; let vend = match ? match[2] : row["Vendedor"];
        let promotoresDaLoja = []; for(let key in bancoUsuarios) { if (bancoUsuarios[key].cargo === "promotor" && bancoUsuarios[key].lojasPermitidas && bancoUsuarios[key].lojasPermitidas.includes(loja)) { promotoresDaLoja.push(key); } }
        if (promotoresDaLoja.length === 0) promotoresDaLoja.push("sem_promotor");
        promotoresDaLoja.forEach(pKey => {
            if (usuarioLogado.cargo === "supervisor") { if (pKey === "sem_promotor") return; if (bancoUsuarios[pKey].criadoPor !== usuarioLogado.id) return; if (promotorFiltroAtual !== "todos" && pKey !== promotorFiltroAtual) return; } 
            else if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") { if (promotorFiltroAtual !== "todos") { if (pKey === "sem_promotor") return; if (bancoUsuarios[pKey].criadoPor !== promotorFiltroAtual) return; if (subPromotorFiltroAtual !== "todos" && pKey !== subPromotorFiltroAtual) return; } else { if (pKey !== "sem_promotor" && !podeGerenciar(usuarioLogado, bancoUsuarios[pKey].criadoPor)) return; } } 
            else if (usuarioLogado.cargo === "promotor") { if (pKey !== usuarioLogado.id) return; }
            if (!promotoresGrupos[pKey]) promotoresGrupos[pKey] = { lojas: {} }; if (!promotoresGrupos[pKey].lojas[loja]) promotoresGrupos[pKey].lojas[loja] = []; promotoresGrupos[pKey].lojas[loja].push({ vendedor: vend, aparelhosStr: row["Aparelhos"] || "" });
        });
    });
    if (Object.keys(promotoresGrupos).length === 0) return div.innerHTML = `<div class="mensagem-vazia">Nenhuma venda encontrada no filtro.</div>`;
    let html = "";
    for (let pKey in promotoresGrupos) {
        let nomePromotor = pKey === "sem_promotor" ? "Lojas Sem Promotor Atribuído" : (bancoUsuarios[pKey].nome || pKey); let totalPromotor = 0; let htmlLojas = ""; let lojasDoPromotorOrd = Object.keys(promotoresGrupos[pKey].lojas).sort((a,b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));
        for (let i=0; i<lojasDoPromotorOrd.length; i++) {
            let loja = lojasDoPromotorOrd[i]; let totalLoja = 0; let consVend = {};
            promotoresGrupos[pKey].lojas[loja].forEach(item => { let arr = item.aparelhosStr.split("||").map(x => x.trim()).filter(x => x !== ""); totalLoja += arr.length; if (!consVend[item.vendedor]) consVend[item.vendedor] = { nome: item.vendedor, qtd: 0, ap: [] }; consVend[item.vendedor].qtd += arr.length; consVend[item.vendedor].ap.push(...arr); });
            totalPromotor += totalLoja; let vendOrd = Object.values(consVend).sort((a, b) => b.qtd - a.qtd); let htmlVend = ""; let rank = 1; let ult = -1;
            vendOrd.forEach((v) => { if (ult !== -1 && v.qtd < ult) rank++; ult = v.qtd; let cRank = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-outros'; let listaAp = v.ap.map(ap => { let imeiMatch = ap.match(/IMEI:\s*(.*?)(\)|$)/); let imei = imeiMatch ? imeiMatch[1].trim() : ""; let textoSemImei = ap.replace(/\(IMEI:.*?\)/g, "").replace(/IMEI:.*/g, "").trim(); let emoji = textoSemImei.substring(0, 2).trim(); let modelo = textoSemImei.substring(2).trim(); return `<div class="item-vendido"><div class="item-vendido-topo"><div class="emoji-badge">${emoji}</div><span class="aparelho-nome">${modelo}</span></div>${imei ? `<span class="imei-texto">IMEI: ${imei}</span>` : ''}</div>`; }).join(""); htmlVend += `<div class="vendedor-bloco"><div class="vendedor-cabecalho"><div><span class="badge-rank ${cRank}">${rank}º</span> <strong style="color:var(--cor-texto);">${v.nome}:</strong></div><span class="vendedor-quantidade">${v.qtd} un</span></div><div class="vendedor-itens-box">${listaAp}</div></div>`; });
            htmlLojas += `<div class="loja-card-acompanhamento"><div class="loja-titulo"><span><i data-lucide="store" class="lucide-sm"></i> ${loja}</span><span class="loja-badge-total">Total: ${totalLoja} un</span></div>${htmlVend}</div>`;
        }
        html += `<div style="margin-bottom: 25px; border-radius: 16px; box-shadow: 0 4px 10px var(--shadow-color); overflow: hidden; text-align: left; border: 1px solid var(--border-color);"><div style="background: ${pKey === 'sem_promotor' ? '#64748b' : 'var(--primary-gradiente)'}; color: white; padding: 16px 20px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;"><span style="font-size: 15px; display:flex; align-items:center;"><i data-lucide="user"></i> Promotor: ${nomePromotor}</span><span style="background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 20px; font-size: 13px;">Total: ${totalPromotor} un</span></div><div style="background: var(--bg-card); padding: 20px 15px 5px 15px; border-top: none; border-radius: 0 0 16px 16px;">${htmlLojas}</div></div>`;
    } div.innerHTML = html; loadIcons();
}

async function carregarDadosDoBanco() {
    const div = document.getElementById("lista-agrupada"); let btn = document.getElementById("btn-atualizar-acomp");
    if(btn) btn.innerHTML = '<i data-lucide="loader-2" class="lucide-sm" style="animation: spin 2s linear infinite;"></i> Atualizando...'; loadIcons(); if(div) div.innerHTML = gerarSkeletonHtml(5);
    try {
        const { data, error } = await supabaseClient.from('vendas').select('*').neq('status', 'Cancelado').neq('status', 'Auditoria').order('data_venda', { ascending: false });
        if (error) throw error;
        dadosAcompanhamentoGlobal = data.filter(row => !(row.aparelhos_vendidos || "").toUpperCase().includes('[AUDITORIA]')).map(row => ({ Vendedor: `[${row.loja}] ${row.vendedor}`, Aparelhos: row.aparelhos_vendidos, Data: row.data_venda, Status: row.status || "Realizado" }));
        if (typeof renderizarListaAcompanhamento === "function") renderizarListaAcompanhamento();
    } catch (err) { console.error(err); if(div) div.innerHTML = `<p style="color:red; text-align:center;">Erro ao carregar.</p>`; mostrarBotaoReconexao(); } finally { if(btn) btn.innerHTML = '<i data-lucide="refresh-cw"></i> Atualizar'; loadIcons(); }
}

function abrirHistorico(tipo) { 
    tipoHistoricoAtual = tipo; mudarTela('tela-historico'); let selSup = document.getElementById('filtro-sup-historico'); 
    if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") { 
        document.getElementById('container-filtro-sup-historico').style.display = "block"; let htmlOp = '<option value="todos">Todas as Regiões</option>'; for(let k in bancoUsuarios) { if(bancoUsuarios[k].cargo === "supervisor" && podeGerenciar(usuarioLogado, k)) { htmlOp += `<option value="${k}">Equipe: ${bancoUsuarios[k].nome || k}</option>`; } } selSup.innerHTML = htmlOp; 
    } else { document.getElementById('container-filtro-sup-historico').style.display = "none"; } mudouSupHistorico(); carregarHistoricoDoBanco(); 
}

function mudouSupHistorico() { 
    let selSup = document.getElementById('filtro-sup-historico').value; let selProm = document.getElementById('filtro-promotor-historico'); let htmlOp = '<option value="todos">Todos da Equipe</option>'; let supAlvo = (usuarioLogado.cargo === "supervisor") ? usuarioLogado.id : selSup; 
    if (supAlvo && supAlvo !== "todos") { for(let k in bancoUsuarios) { if(bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].criadoPor === supAlvo) { htmlOp += `<option value="${k}">${bancoUsuarios[k].nome || k}</option>`; } } } selProm.innerHTML = htmlOp; aplicarFiltroHistorico(); 
}

async function carregarHistoricoDoBanco(forcarNuvem = false) {
    const div = document.getElementById("lista-historico"); if (!forcarNuvem && dadosHistoricoGlobal.length > 0) { renderizarListaHistorico(); return; }
    div.innerHTML = gerarSkeletonHtml(5); loadIcons();
    try {
        const { data, error } = await supabaseClient.from('vendas').select('*').order('data_venda', { ascending: false }).limit(500);
        if (error) throw error;
        dadosHistoricoGlobal = data.map(row => ({ id_banco: row.id, Tipo: row.status === 'Auditoria' ? 'Auditoria' : 'Venda', Status: row.status || "Realizado", Data: row.data_venda, Promotor: row.promotor_login, loja_banco: row.loja, aparelhos_banco: row.aparelhos_vendidos, Detalhe: row.status === 'Auditoria' ? row.aparelhos_vendidos : `Venda: ${row.aparelhos_vendidos} | [${row.loja}] ${row.vendedor}` }));
        renderizarListaHistorico();
    } catch (e) { console.error(e); div.innerHTML = "Erro ao carregar histórico."; mostrarBotaoReconexao(); }
}

async function executarCancelamentoVenda() {
    if (!vendaParaCancelar) return; let venda = dadosHistoricoGlobal[vendaParaCancelar.index]; if (!venda.id_banco) return mostrarToast("Erro: ID da venda não encontrado.", "erro");
    mostrarToast("Iniciando estorno...", "info");
    try {
        const { error: errUpdate } = await supabaseClient.from('vendas').update({ status: 'Cancelado' }).eq('id', venda.id_banco);
        if (errUpdate) throw errUpdate;
        let loja = venda.loja_banco; let listaAparelhos = venda.aparelhos_banco.split("||").map(x => x.trim()).filter(x => x !== ""); let contagemEstoqueDevolucao = {};
        listaAparelhos.forEach(ap => { let nomeLimpo = ap.split(" →")[0].trim(); contagemEstoqueDevolucao[nomeLimpo] = (contagemEstoqueDevolucao[nomeLimpo] || 0) + 1; });
        for (let apNome in contagemEstoqueDevolucao) {
            const { data: estItem } = await supabaseClient.from('estoque').select('*').eq('loja', loja).eq('aparelho', apNome).maybeSingle();
            if (estItem) { let novaQtd = (estItem.quantidade || 0) + contagemEstoqueDevolucao[apNome]; await supabaseClient.from('estoque').update({ quantidade: novaQtd }).eq('id', estItem.id); }
        }
        mostrarToast("Venda cancelada e estoque estornado com sucesso!", "sucesso"); carregarHistoricoDoBanco(true); 
    } catch (e) { console.error("Erro no cancelamento:", e); mostrarToast("Erro ao estornar a venda.", "erro"); } finally { vendaParaCancelar = null; }
}

async function executarDesfazerCancelamento(indexHist) {
    let venda = dadosHistoricoGlobal[indexHist]; if (!venda || !venda.id_banco) return mostrarToast("Erro: ID da venda não encontrado.", "erro");
    mostrarToast("Revertendo estorno...", "info");
    try {
        const { error: errUpdate } = await supabaseClient.from('vendas').update({ status: 'Realizado' }).eq('id', venda.id_banco);
        if (errUpdate) throw errUpdate;
        let loja = venda.loja_banco; let listaAparelhos = venda.aparelhos_banco.split("||").map(x => x.trim()).filter(x => x !== ""); let contagemEstoqueRetirada = {};
        listaAparelhos.forEach(ap => { let nomeLimpo = ap.split(" →")[0].trim(); contagemEstoqueRetirada[nomeLimpo] = (contagemEstoqueRetirada[nomeLimpo] || 0) + 1; });
        for (let apNome in contagemEstoqueRetirada) {
            const { data: estItem } = await supabaseClient.from('estoque').select('*').eq('loja', loja).eq('aparelho', apNome).maybeSingle();
            if (estItem) { let novaQtd = (estItem.quantidade || 0) - contagemEstoqueRetirada[apNome]; if(novaQtd < 0) novaQtd = 0; await supabaseClient.from('estoque').update({ quantidade: novaQtd }).eq('id', estItem.id); }
        }
        mostrarToast("Estorno revertido com sucesso!", "sucesso"); carregarHistoricoDoBanco(true); 
    } catch (e) { console.error("Erro ao desfazer:", e); mostrarToast("Erro ao desfazer o estorno.", "erro"); }
}

function abrirModalCancelarVenda(indexHist, pLogin) { vendaParaCancelar = { index: indexHist, login: pLogin }; let inputSenha = document.getElementById('senha-confirmacao-cancelamento'); if (inputSenha) inputSenha.value = ""; let modal = document.getElementById('modal-cancelar-venda'); if (modal) modal.classList.add('ativo'); }
function fecharModalCancelarVenda() { let modal = document.getElementById('modal-cancelar-venda'); if (modal) modal.classList.remove('ativo'); vendaParaCancelar = null; }
function validarECancelarVenda() { let inputSenha = document.getElementById('senha-confirmacao-cancelamento'); let senhaDigitada = inputSenha ? inputSenha.value.trim() : ""; if (senhaDigitada !== usuarioLogado.senha && usuarioLogado.id !== "master") { return mostrarToast("Senha incorreta. Estorno negado.", "erro"); } if(inputSenha) inputSenha.value = ""; let modal = document.getElementById('modal-cancelar-venda'); if (modal) modal.classList.remove('ativo'); executarCancelamentoVenda(); }

let limiteHistorico = 50; 
function aplicarFiltroHistorico() { limiteHistorico = 50; renderizarListaHistorico(); }
window.toggleAcordeaoHistorico = function(container, id) { let content = document.getElementById(id); let btn = container.querySelector('.btn-expandir-historico'); if(content.classList.contains('expandido')) { content.classList.remove('expandido'); if(btn) btn.classList.remove('aberto'); } else { content.classList.add('expandido'); if(btn) btn.classList.add('aberto'); } };

function renderizarListaHistorico() { 
    const div = document.getElementById("lista-historico"); let dataInicio = document.getElementById('filtro-data-inicio-historico') ? document.getElementById('filtro-data-inicio-historico').value : ""; let dataFim = document.getElementById('filtro-data-fim-historico') ? document.getElementById('filtro-data-fim-historico').value : ""; let supAlvo = (usuarioLogado.cargo === "supervisor") ? usuarioLogado.id : document.getElementById('filtro-sup-historico').value; let promAlvo = document.getElementById('filtro-promotor-historico').value; let ocultarCancelados = document.getElementById('filtro-ocultar-cancelados') ? document.getElementById('filtro-ocultar-cancelados').checked : false; let apenasCancelados = document.getElementById('filtro-apenas-cancelados') ? document.getElementById('filtro-apenas-cancelados').checked : false; 
    if(apenasCancelados) { if(document.getElementById('filtro-ocultar-cancelados')) document.getElementById('filtro-ocultar-cancelados').checked = false; ocultarCancelados = false; } 
    
    let filtrados = []; 
    dadosHistoricoGlobal.forEach((row, index) => { 
        let isCancelado = row.Status === "Cancelado"; if (ocultarCancelados && isCancelado) return; if (apenasCancelados && row.Tipo !== 'Auditoria' && !isCancelado) return; 
        let isEstoque = row.Tipo === 'Auditoria'; if (tipoHistoricoAtual === 'estoque' && !isEstoque) return; if (tipoHistoricoAtual === 'geral' && isEstoque) return; 
        
        if (usuarioLogado.id !== "master" && row.Promotor !== usuarioLogado.id) { if (!podeGerenciar(usuarioLogado, row.Promotor)) return; } 
        let pObj = bancoUsuarios[row.Promotor]; if (supAlvo && supAlvo !== "todos") { if (row.Promotor !== supAlvo && (!pObj || pObj.criadoPor !== supAlvo)) return; } if (promAlvo && promAlvo !== "todos" && row.Promotor !== promAlvo) return; 
        if(dataInicio && row.Data) { let dt = new Date(dataInicio + "T00:00:00"); if(new Date(row.Data) < dt) return; } if(dataFim && row.Data) { let dt = new Date(dataFim + "T23:59:59"); if(new Date(row.Data) > dt) return; } 
        filtrados.push({row: row, originalIndex: index, pLogin: row.Promotor, isEstoque: isEstoque, detalhe: row.Detalhe, isCancelado: isCancelado, dataLinha: row.Data}); 
    }); 
    
    let filtrados_total = filtrados.length; filtrados = filtrados.slice(0, limiteHistorico); if(filtrados_total === 0) { div.innerHTML = "<div class='mensagem-vazia'>Nenhuma ação encontrada.</div>"; return; } 
    let html = ""; 
    filtrados.forEach(item => { 
        let dataFormatada = "Sem Data"; if (item.dataLinha) { let d = new Date(item.dataLinha); if(!isNaN(d)) dataFormatada = d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR').slice(0, 5); } 
        let nomePromotor = bancoUsuarios[item.pLogin] ? bancoUsuarios[item.pLogin].nome : item.pLogin; if (!nomePromotor) nomePromotor = "Usuário Desconhecido"; 
        let opacidade = item.isCancelado ? "opacity: 0.7; filter: grayscale(0.8);" : ""; let bgCard = item.isCancelado ? "background: var(--bg-fundo);" : "background: var(--bg-card);"; let bordaCard = item.isCancelado ? "border: 1px dashed #ef4444;" : "border: 1px solid var(--border-color);"; let estiloTexto = item.isCancelado ? "text-decoration: line-through; color: var(--cor-secundaria);" : "color: var(--cor-texto);"; let badgeCancelado = item.isCancelado ? `<div style="background: #fee2e2; color: #ef4444; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; margin-bottom: 8px; display: inline-block;">ESTORNADO</div>` : ""; let icone = item.isEstoque ? '<i data-lucide="package" style="color:#f59e0b;" class="lucide-sm"></i>' : '<i data-lucide="shopping-bag" style="color:#10b981;" class="lucide-sm"></i>'; if (item.isCancelado) icone = '<i data-lucide="slash" style="color: #ef4444;" class="lucide-sm"></i>'; 
        let btnAcao = ""; let adminRole = (usuarioLogado.cargo === "supervisor" || usuarioLogado.cargo === "regional" || usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master"); 
        if (tipoHistoricoAtual === 'geral' && adminRole && !item.isEstoque) { if (!item.isCancelado) { btnAcao = `<button onclick="abrirModalCancelarVenda(${item.originalIndex}, '${item.pLogin}')" style="background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); padding: 10px; border-radius: 8px; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; width: 100%; margin-top: 10px;"><i data-lucide="x-circle" class="lucide-sm"></i> Estornar Venda</button>`; } else { btnAcao = `<button onclick="executarDesfazerCancelamento(${item.originalIndex})" style="background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.3); padding: 10px; border-radius: 8px; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; width: 100%; margin-top: 10px;"><i data-lucide="rotate-ccw" class="lucide-sm"></i> Desfazer Estorno</button>`; } }
        
        let textoBase = item.detalhe.replace(/\[CANCELADO\]/ig, '').trim(); let tituloResumo = ""; let listaItensHtml = "";
        if (item.isEstoque) { tituloResumo = textoBase; } else {
            let limpo = textoBase.replace(/^Venda:\s*/i, ''); let partesLojas = limpo.split('|'); let aparelhosBrutos = partesLojas[0].trim(); let lojaVendedorInfo = partesLojas.slice(1).join('|').trim(); let arrayAparelhos = aparelhosBrutos.split('||').map(x => x.trim()).filter(x => x !== "");
            if (arrayAparelhos.length > 1) { tituloResumo = `${arrayAparelhos.length} Aparelhos Vendidos (${lojaVendedorInfo || 'Loja'})`; } else if (arrayAparelhos.length === 1) { tituloResumo = `${arrayAparelhos[0]} | ${lojaVendedorInfo}`; } else { tituloResumo = limpo; }
            arrayAparelhos.forEach(ap => { let imeiMatch = ap.match(/IMEI:\s*(.*?)(\)|$)/); let imei = imeiMatch ? imeiMatch[1].trim() : ""; let textoSemImei = ap.replace(/\(IMEI:.*?\)/g, "").replace(/IMEI:.*/g, "").trim(); let emoji = textoSemImei.substring(0, 2).trim(); let modelo = textoSemImei.substring(2).trim(); listaItensHtml += `<div style="display: flex; flex-direction: column; gap: 2px; background: var(--bg-card); padding: 8px 10px; border-radius: 6px; margin-bottom: 6px; border: 1px solid var(--border-color);"><div style="display: flex; align-items: center; gap: 8px;"><span style="font-size: 16px;">${emoji}</span><strong style="font-size: 13px; color: var(--cor-texto);">${modelo}</strong></div>${imei ? `<span style="font-size: 11px; color: var(--cor-secundaria); margin-left: 24px;">IMEI: ${imei}</span>` : ''}</div>`; });
            if (lojaVendedorInfo) { listaItensHtml += `<div style="font-size: 11px; font-weight: bold; color: var(--primary); margin-top: 4px;">📍 Local/Vendedor: ${lojaVendedorInfo}</div>`; }
        }
        let htmlCorpoVenda = "";
        if (listaItensHtml !== "" || btnAcao !== "") { htmlCorpoVenda = `<div style="display: flex; flex-direction: column; width: 100%;"><div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; width: 100%; cursor: pointer;" onclick="toggleAcordeaoHistorico(this, 'acordeao-${item.originalIndex}')"><div style="display:flex; align-items:center; gap:8px;">${icone} <strong style="font-size:14px;">${tituloResumo}</strong></div><button class="btn-expandir-historico" style="background:var(--bg-fundo); border:1px solid var(--border-color); color:var(--cor-secundaria); padding:4px 8px; border-radius:6px; cursor:pointer; pointer-events: none;"><i data-lucide="chevron-down" style="margin:0; transition: transform 0.3s; width:14px; height:14px;"></i></button></div><div id="acordeao-${item.originalIndex}" class="historico-detalhes"><div style="padding: 12px; background: var(--bg-fundo); border-radius: 8px; margin-top: 8px; font-size: 12px; font-weight: 500; color: var(--cor-secundaria); word-break: break-word; border: 1px solid var(--border-color);">${listaItensHtml}${btnAcao}</div></div></div>`; } 
        else { htmlCorpoVenda = `<div style="display: flex; align-items: flex-start; gap: 8px;">${icone} <span style="word-break: break-word; font-weight:bold;">${textoBase}</span></div>`; }
        html += `<div style="${bgCard} ${opacidade} ${bordaCard} padding: 16px; border-radius: 12px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; transition: background-color 0.2s ease;">${badgeCancelado}<div style="display: flex; flex-direction: column; gap: 4px; text-align: left;"><div style="display: flex; justify-content: space-between; align-items: center; width: 100%;"><span style="font-size: 11px; font-weight: bold; color: var(--cor-secundaria);">${dataFormatada}</span></div><div style="font-size: 13px; font-weight: bold; color: var(--primary); display: flex; align-items: center; gap: 4px; word-break: break-word; overflow: hidden;"><i data-lucide="user" class="lucide-sm" style="flex-shrink: 0;"></i> <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;">${nomePromotor}</span></div></div><div style="font-size: 14px; ${estiloTexto} text-align: left; display: flex;">${htmlCorpoVenda}</div></div>`;
    }); 
    div.innerHTML = html; loadIcons(); 
    if (filtrados_total > limiteHistorico) { div.innerHTML += `<button class="btn-sistema" style="margin-top: 15px; background: var(--bg-item); color: var(--primary); border: 1px solid var(--primary);" onclick="limiteHistorico += 50; renderizarListaHistorico();">Carregar mais históricos...</button>`; } 
}

function setFiltroDataRapido(tipo) {
    let inputInicio = document.getElementById('filtro-data-inicio-historico'); let inputFim = document.getElementById('filtro-data-fim-historico'); if (!inputInicio || !inputFim) return;
    let hoje = new Date(); let formatarData = (d) => { let ano = d.getFullYear(); let mes = String(d.getMonth() + 1).padStart(2, '0'); let dia = String(d.getDate()).padStart(2, '0'); return `${ano}-${mes}-${dia}`; };
    if (tipo === 'hoje') { let strHoje = formatarData(hoje); inputInicio.value = strHoje; inputFim.value = strHoje; } 
    else if (tipo === 'ontem') { let ontem = new Date(); ontem.setDate(hoje.getDate() - 1); let strOntem = formatarData(ontem); inputInicio.value = strOntem; inputFim.value = strOntem; } 
    else if (tipo === 'semana') { let inicioSemana = new Date(); inicioSemana.setDate(hoje.getDate() - 7); inputInicio.value = formatarData(inicioSemana); inputFim.value = formatarData(hoje); } 
    else if (tipo === 'mes') { let inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1); inputInicio.value = formatarData(inicioMes); inputFim.value = formatarData(hoje); } 
    else if (tipo === 'limpar') { inputInicio.value = ""; inputFim.value = ""; } aplicarFiltroHistorico();
}

// ==========================================
// FUNÇÕES DE ESTOQUE E AUDITORIA
// ==========================================
function fecharModalConfirmMostruario() { document.getElementById('modal-confirm-mostruario').classList.remove('ativo'); mostruarioEmEdicao = null; }
function fecharModalPromptMostruario() { document.getElementById('modal-prompt-mostruario').classList.remove('ativo'); mostruarioEmEdicao = null; }

function executarRemoverMostruario() { 
    if (!mostruarioEmEdicao) return; 
    delete mostruariosGlobais[mostruarioEmEdicao.key]; 
    salvarConfiguracoesGlobais(false); 
    renderizarListaEstoque(); 
    mostrarToast("Status removido.", "info"); 
    fecharModalConfirmMostruario(); 
}

function executarAddMostruario() { 
    if (!mostruarioEmEdicao) return; 
    let obs = document.getElementById('input-obs-mostruario').value; 
    mostruariosGlobais[mostruarioEmEdicao.key] = obs.trim() !== "" ? obs.trim() : true; 
    salvarConfiguracoesGlobais(false); 
    renderizarListaEstoque(); 
    mostrarToast("Marcado como mostruário!", "sucesso"); 
    fecharModalPromptMostruario(); 
}

function toggleMostruario(loja, ap) { let k = `${loja}_${ap}`; mostruarioEmEdicao = { loja: loja, ap: ap, key: k }; if (mostruariosGlobais[k]) { document.getElementById('texto-confirm-mostruario').innerHTML = `Deseja DESMARCAR o <b>${ap}</b> como mostruário na loja <b>${loja}</b>?`; document.getElementById('modal-confirm-mostruario').classList.add('ativo'); } else { document.getElementById('texto-prompt-mostruario').innerHTML = `Marcando <b>${ap}</b> como MOSTRUÁRIO na loja <b>${loja}</b>.`; document.getElementById('input-obs-mostruario').value = ""; document.getElementById('modal-prompt-mostruario').classList.add('ativo'); } }

function abrirEstoque() { mudarTela('tela-estoque'); promotorEstoqueFiltroAtual = (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") ? "todos" : usuarioLogado.id; renderizarFiltroPromotoresEstoque(); carregarEstoqueDoBanco(); }

async function carregarEstoqueDoBanco() {
    let btn = document.getElementById("btn-atualizar-estoque"); if(btn) btn.innerHTML = '<i data-lucide="loader-2" style="animation: spin 2s linear infinite;"></i> Atualizando...'; loadIcons(); document.getElementById("lista-estoque-agrupada").innerHTML = gerarSkeletonHtml(4);
    try { const { data, error } = await supabaseClient.from('estoque').select('*'); if (error) throw error; dadosEstoqueGlobal = data.map(row => ({ Loja: row.loja, Aparelho: row.aparelho, Quantidade: row.quantidade })); renderizarListaEstoque(); } catch (err) { console.error(err); document.getElementById("lista-estoque-agrupada").innerHTML = `<p style="color:red;">Erro ao carregar estoque.</p>`; mostrarBotaoReconexao(); } finally { if(btn) btn.innerHTML = '<i data-lucide="refresh-cw"></i> Atualizar Estoque'; loadIcons(); }
}

function renderizarFiltroPromotoresEstoque() { 
    const div = document.getElementById("seletor-promotores-estoque"); if (usuarioLogado.cargo === "promotor") { div.innerHTML = `<div class="card-promotor-filtro ativo"><i data-lucide="user" class="lucide-sm"></i> ${usuarioLogado.nome}</div>`; loadIcons(); return; } 
    let html = `<div class="card-promotor-filtro ${promotorEstoqueFiltroAtual === 'todos' ? 'ativo' : ''}" onclick="setFiltroPromotorEstoque('todos')"><i data-lucide="layout-dashboard" class="lucide-sm"></i> Visão Geral (Todas)</div>`; 
    if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") { for (let key in bancoUsuarios) { if (bancoUsuarios[key].cargo === "supervisor") { if (podeGerenciar(usuarioLogado, key)) { html += `<div class="card-promotor-filtro ${promotorEstoqueFiltroAtual === key ? 'ativo' : ''}" onclick="setFiltroPromotorEstoque('${key}')"><i data-lucide="users" class="lucide-sm"></i> Equipe ${bancoUsuarios[key].nome || key}</div>`; } } } } else if (usuarioLogado.cargo === "supervisor") { for (let key in bancoUsuarios) { if (bancoUsuarios[key].cargo === "promotor" && bancoUsuarios[key].criadoPor === usuarioLogado.id) { html += `<div class="card-promotor-filtro ${promotorEstoqueFiltroAtual === key ? 'ativo' : ''}" onclick="setFiltroPromotorEstoque('${key}')"><i data-lucide="user" class="lucide-sm"></i> ${bancoUsuarios[key].nome || key}</div>`; } } } 
    div.innerHTML = html; loadIcons(); 
}

function setFiltroPromotorEstoque(id) { promotorEstoqueFiltroAtual = id; renderizarFiltroPromotoresEstoque(); renderizarListaEstoque(); }

function renderizarListaEstoque() { 
    pendenciasEstoque = {}; document.getElementById("area-conferencia-estoque").style.display = "none"; let lojasEstoque = {}; let lojasAtivas = []; let mostrarZerados = document.getElementById('check-mostrar-zerados').checked; let termoBusca = document.getElementById('busca-estoque') ? document.getElementById('busca-estoque').value.toLowerCase() : ""; 
    
    if (promotorEstoqueFiltroAtual === "todos" && (usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master")) { lojasAtivas = Object.keys(lojasConfig); } else if (promotorEstoqueFiltroAtual === "todos" && usuarioLogado.cargo === "regional") { for (let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === "promotor" && podeGerenciar(usuarioLogado, k)) { bancoUsuarios[k].lojasPermitidas.forEach(l => { if(!lojasAtivas.includes(l)) lojasAtivas.push(l); }); } } } else if (promotorEstoqueFiltroAtual === "todos" && usuarioLogado.cargo === "supervisor") { for (let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].criadoPor === usuarioLogado.id) { bancoUsuarios[k].lojasPermitidas.forEach(l => { if(!lojasAtivas.includes(l)) lojasAtivas.push(l); }); } } } else { let fObj = bancoUsuarios[promotorEstoqueFiltroAtual]; if (fObj && fObj.cargo === "supervisor") { for (let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].criadoPor === promotorEstoqueFiltroAtual) { bancoUsuarios[k].lojasPermitidas.forEach(l => { if(!lojasAtivas.includes(l)) lojasAtivas.push(l); }); } } } else if (fObj && fObj.cargo === "promotor") { lojasAtivas = fObj.lojasPermitidas; } } 
    lojasAtivas.sort((a,b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})); 
    let selectLojaEst = document.getElementById('filtro-loja-estoque'); if (selectLojaEst) { let valAtual = selectLojaEst.value; let htmlOptions = '<option value="todas">Todas as Lojas</option>'; lojasAtivas.forEach(l => { htmlOptions += `<option value="${l}" ${l === valAtual ? 'selected' : ''}>${l}</option>`; }); selectLojaEst.innerHTML = htmlOptions; if (selectLojaEst.value !== 'todas') { lojasAtivas = lojasAtivas.filter(l => l === selectLojaEst.value); } } 
    lojasAtivas.forEach(loja => { lojasEstoque[loja] = {}; for (let ap in mapaEmojis) lojasEstoque[loja][`${mapaEmojis[ap]} ${ap.toUpperCase()}`] = 0; }); 
    dadosEstoqueGlobal.forEach(row => { if (lojasEstoque[row["Loja"]]) { let chave = extrairChaveAparelho(row["Aparelho"] || ""); if (chave && mapaEmojis[chave]) { let nomeOficial = `${mapaEmojis[chave]} ${chave.toUpperCase()}`; if (lojasEstoque[row["Loja"]][nomeOficial] !== undefined) { lojasEstoque[row["Loja"]][nomeOficial] += Number(row["Quantidade"]) || 0; } } } }); 
    let html = ""; let totalRupturas = 0; let totalBaixoEstoque = 0;
    for (let loja in lojasEstoque) { 
        let totalLoja = 0; let htmlItens = ""; 
        for (let apNome in lojasEstoque[loja]) { 
            if (termoBusca && !apNome.toLowerCase().includes(termoBusca)) continue; 
            let qtd = lojasEstoque[loja][apNome]; 
            if (qtd === 0) totalRupturas++; else if (qtd > 0 && qtd < 3) totalBaixoEstoque++;
            if (qtd === 0 && !mostrarZerados) continue; 
            totalLoja += qtd; 
            let btnId = (loja + apNome).replace(/[^a-zA-Z0-9]/g, ''); let kMostruario = `${loja}_${apNome}`; let isMostruario = mostruariosGlobais[kMostruario]; 
            if (qtd !== 1 && isMostruario) { delete mostruariosGlobais[kMostruario]; isMostruario = false; salvarConfiguracoesGlobais(false); } 
            let btnMostruarioHtml = ""; if (qtd === 1) { if (isMostruario) { btnMostruarioHtml = `<span onclick="toggleMostruario('${loja}', '${apNome}')" style="cursor:pointer; font-size:10px; background:#ef4444; color:white; padding:4px 8px; border-radius:12px; margin-left:8px; font-weight:bold;">🔴 Mostruário</span>`; } else { btnMostruarioHtml = `<span onclick="toggleMostruario('${loja}', '${apNome}')" style="cursor:pointer; font-size:10px; background:var(--bg-fundo); border:1px solid var(--border-color); color:var(--cor-secundaria); padding:4px 8px; border-radius:12px; margin-left:8px;">⚪ Marcar Mostruário</span>`; } } 
            let htmlControles = ""; let permEstoquePromotor = (usuarioLogado.cargo === "promotor") ? (usuarioLogado.permissoes ? usuarioLogado.permissoes.estoque_editar : true) : false; let adminRole = (usuarioLogado.cargo === "supervisor" || usuarioLogado.cargo === "regional" || usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master"); let badgeStyle = ""; let iconeAlerta = ""; 
            if (qtd > 0 && qtd < 3) { badgeStyle = "background-color: #fee2e2; color: #ef4444; border-color: #ef4444;"; iconeAlerta = " 🔥"; } 
            
            // EDIÇÃO DIRETA DO ESTOQUE
            if (permEstoquePromotor || adminRole) { 
                htmlControles = `<button class="btn-est" onclick="alterarEstoque('${loja}', '${apNome}', -1, '${btnId}')">-</button>
                                 <input type="number" class="qtd-badge-input" id="badge-${btnId}" value="${qtd}" onchange="setEstoqueDireto('${loja}', '${apNome}', this, '${btnId}')" style="${badgeStyle}">
                                 <button class="btn-est" onclick="alterarEstoque('${loja}', '${apNome}', 1, '${btnId}')">+</button>`; 
            } else { 
                htmlControles = `<span class="qtd-badge" style="${badgeStyle}">${qtd} un${iconeAlerta}</span>`; 
            } 
            
            htmlItens += `<div class="card-estoque-pop"><div class="header-pop"><span style="font-weight: bold; font-size: 15px;">${apNome} ${btnMostruarioHtml}</span></div><div style="display: flex; justify-content: space-between; align-items: center;"><span style="font-size: 13px; color: var(--cor-secundaria);">Quantidade:</span><div class="estoque-controles">${htmlControles}</div></div></div>`; 
        } 
        if(htmlItens !== "") { html += `<div class="loja-card-acompanhamento" style="background: transparent; border: none; box-shadow: none; padding: 0;"><div class="loja-titulo" style="margin-bottom: 15px; border-radius: 12px;"><span><i data-lucide="store" class="lucide-sm"></i> ${loja}</span><span class="loja-badge-total">Total: ${totalLoja} un</span></div><div>${htmlItens}</div></div>`; } 
    } 
    let bannerAlertaHtml = ""; if (totalRupturas > 0 || totalBaixoEstoque > 0) { bannerAlertaHtml = `<div style="background:rgba(239, 68, 68, 0.08); border:1px solid rgba(239, 68, 68, 0.3); border-radius:12px; padding:14px 16px; margin-bottom:15px; text-align:left; display:flex; align-items:center; gap:12px;"><i data-lucide="alert-triangle" style="color:#ef4444; width:24px; height:24px; flex-shrink:0;"></i><div style="font-size:13px; color:var(--cor-texto); line-height:1.4;"><strong>Alerta Operacional:</strong> Há <span style="color:#ef4444; font-weight:bold;">${totalRupturas} items em ruptura (0 un)</span> e <span style="color:#f59e0b; font-weight:bold;">${totalBaixoEstoque} itens em nível crítico (< 3 un)</span> nas lojas filtradas.</div></div>`; }
    document.getElementById("lista-estoque-agrupada").innerHTML = bannerAlertaHtml + (html || `<div class='mensagem-vazia'>Nenhum estoque para exibir.</div>`); atualizarTelaConferenciaEstoque(); loadIcons(); 
}

function alterarEstoque(loja, ap, delta, id) { 
    let k = `${loja}|${ap}`; 
    if (!pendenciasEstoque[k]) { let linha = dadosEstoqueGlobal.find(r => r.Loja === loja && r.Aparelho === ap); pendenciasEstoque[k] = { loja: loja, aparelho: ap, qtdOriginal: linha ? Number(linha.Quantidade) : 0, novaQtd: 0, deltaTotal: 0 }; } 
    let p = pendenciasEstoque[k]; p.deltaTotal += delta; p.novaQtd = p.qtdOriginal + p.deltaTotal; 
    if (p.novaQtd < 0) { p.novaQtd = 0; p.deltaTotal = -p.qtdOriginal; } 
    let badge = document.getElementById(`badge-${id}`); 
    if(badge) { 
        if (badge.tagName === 'INPUT') badge.value = p.novaQtd; else badge.innerText = p.novaQtd;
        badge.style.backgroundColor = p.deltaTotal !== 0 ? "#fef3c7" : "transparent"; badge.style.color = p.deltaTotal !== 0 ? "#b45309" : "var(--cor-texto)"; 
    } 
    atualizarTelaConferenciaEstoque(); 
}

function setEstoqueDireto(loja, ap, inputEl, id) {
    let novoValor = parseInt(inputEl.value);
    if (isNaN(novoValor) || novoValor < 0) { novoValor = 0; inputEl.value = 0; }
    let k = `${loja}|${ap}`;
    if (!pendenciasEstoque[k]) {
        let linha = dadosEstoqueGlobal.find(r => r.Loja === loja && r.Aparelho === ap);
        pendenciasEstoque[k] = { loja: loja, aparelho: ap, qtdOriginal: linha ? Number(linha.Quantidade) : 0, novaQtd: 0, deltaTotal: 0 };
    }
    let p = pendenciasEstoque[k];
    p.novaQtd = novoValor;
    p.deltaTotal = p.novaQtd - p.qtdOriginal;
    
    inputEl.style.backgroundColor = p.deltaTotal !== 0 ? "#fef3c7" : "transparent";
    inputEl.style.color = p.deltaTotal !== 0 ? "#b45309" : "var(--cor-texto)";
    atualizarTelaConferenciaEstoque();
}

function atualizarTelaConferenciaEstoque() { 
    const div = document.getElementById("area-conferencia-estoque"); 
    const lista = document.getElementById("lista-pendentes-estoque"); 
    const btnOk = document.getElementById('container-btn-conferencia-ok'); 
    let html = ""; let tem = false; 
    for (let k in pendenciasEstoque) { 
        let p = pendenciasEstoque[k]; 
        if (p.deltaTotal !== 0) { 
            tem = true; 
            html += `<div style="background: var(--bg-container); border: 1px solid var(--border-color); padding: 12px; border-radius: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 13px;"><span>📍 [${p.loja}] ${p.aparelho}</span><span>De: <strong>${p.qtdOriginal}</strong> ➔ Para: <span style="color: var(--primary); font-weight: bold;">${p.novaQtd} un</span></span></div>`; 
        } 
    } 
    if (tem) { 
        div.style.display = "block"; lista.innerHTML = html; if(btnOk) btnOk.style.display = "none"; 
    } else { 
        div.style.display = "none"; lista.innerHTML = ""; 
        let hoje = new Date().toLocaleDateString('pt-BR'); 
        let ultima = usuarioLogado.ultima_conferencia; 
        if (usuarioLogado.cargo === "promotor" && ultima !== hoje) { 
            if(btnOk) btnOk.style.display = "block"; 
        } else { 
            if(btnOk) btnOk.style.display = "none"; 
        } 
    } 
}

function limparConferenciaEstoque() { renderizarListaEstoque(); }

function verificarMotivoEstoque() { let chaves = Object.keys(pendenciasEstoque).filter(k => pendenciasEstoque[k].deltaTotal !== 0); if (chaves.length === 0) return; let adminRole = (usuarioLogado.cargo === "supervisor" || usuarioLogado.cargo === "regional" || usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master"); if (adminRole) { executarEnvioEstoque("Ajuste Gerencial"); } else { document.getElementById('modal-motivo-estoque').classList.add('ativo'); } }
function confirmarEnvioEstoqueMotivo() { document.getElementById('modal-motivo-estoque').classList.remove('ativo'); executarEnvioEstoque(document.getElementById('select-motivo-estoque').value); }

async function executarEnvioEstoque(motivoSelecionado) {
    if (!navigator.onLine) { mostrarToast("Sem internet!", "erro"); mostrarBotaoReconexao(); return; }
    const btn = document.getElementById("btn-enviar-estoque"); btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" style="animation: spin 2s linear infinite;"></i> Atualizando...'; loadIcons();
    let chaves = Object.keys(pendenciasEstoque).filter(k => pendenciasEstoque[k].deltaTotal !== 0); let qtdAlterada = chaves.length;
    let dataHojeStr = new Date().toLocaleDateString('pt-BR');
    try {
        for (let i = 0; i < chaves.length; i++) {
            let p = pendenciasEstoque[chaves[i]];
            const { data: estItem } = await supabaseClient.from('estoque').select('*').eq('loja', p.loja).eq('aparelho', p.aparelho).maybeSingle();
            if (estItem) { await supabaseClient.from('estoque').update({ quantidade: p.novaQtd }).eq('id', estItem.id); } else { await supabaseClient.from('estoque').insert({ loja: p.loja, aparelho: p.aparelho, quantidade: p.novaQtd }); }
            await supabaseClient.from('vendas').insert([{ promotor_login: usuarioLogado.id, loja: p.loja, vendedor: motivoSelecionado || "Ajuste Manual", aparelhos_vendidos: `[Auditoria] ${p.aparelho}: De ${p.qtdOriginal} para ${p.novaQtd} un`, data_venda: new Date().toISOString(), status: 'Auditoria' }]);
        }
        await supabaseClient.from('usuarios').update({ ultima_conferencia: dataHojeStr }).eq('login', usuarioLogado.id);
        usuarioLogado.ultima_conferencia = dataHojeStr;
        mostrarToast(`Correção Enviada!<br>${qtdAlterada} modelos alterados.`, "sucesso"); carregarEstoqueDoBanco();
    } catch (e) { console.error(e); mostrarToast("Erro ao atualizar estoque.", "erro"); mostrarBotaoReconexao(); } finally { btn.disabled = false; btn.innerHTML = '<i data-lucide="upload-cloud"></i> Enviar Atualização'; loadIcons(); }
}

async function enviarConferenciaDiaria() { 
    if (!navigator.onLine) { mostrarToast("Sem internet para confirmar.", "erro"); return; }
    let btn = document.getElementById('btn-conferencia-ok'); if(btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" style="animation: spin 1s linear infinite;"></i> Registrando...'; loadIcons(); }
    let dataHojeStr = new Date().toLocaleDateString('pt-BR');
    try {
        const { error } = await supabaseClient.from('vendas').insert([{ promotor_login: usuarioLogado.id, loja: document.getElementById('filtro-loja-estoque') ? document.getElementById('filtro-loja-estoque').value : "Múltiplas", vendedor: "Conferência Diária", aparelhos_vendidos: "[Auditoria] Estoque conferido e validado sem alterações.", data_venda: new Date().toISOString(), status: 'Auditoria' }]);
        if (error) throw error;
        await supabaseClient.from('usuarios').update({ ultima_conferencia: dataHojeStr }).eq('login', usuarioLogado.id);
        usuarioLogado.ultima_conferencia = dataHojeStr;
        document.getElementById('container-btn-conferencia-ok').style.display = "none"; mostrarToast("Conferência registrada na nuvem com sucesso!", "sucesso"); 
    } catch (e) { console.error("Erro ao registrar conferência:", e); mostrarToast("Erro ao registrar conferência no sistema.", "erro"); } finally { if(btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="check-square" class="lucide-lg"></i> Confirmar Conferência Diária'; loadIcons(); } }
}

// ==========================================
// DASHBOARD, GRÁFICOS E LÓGICA DE DADOS
// ==========================================
window.setFiltroDataRapidoDash = function(tipo) {
    let inputInicio = document.getElementById('dash-data-inicio'); 
    let inputFim = document.getElementById('dash-data-fim'); 
    if (!inputInicio || !inputFim) return;
    
    let hoje = new Date(); 
    let formatarData = (d) => { 
        let ano = d.getFullYear(); 
        let mes = String(d.getMonth() + 1).padStart(2, '0'); 
        let dia = String(d.getDate()).padStart(2, '0'); 
        return `${ano}-${mes}-${dia}`; 
    };
    
    if (tipo === 'hoje') { let strHoje = formatarData(hoje); inputInicio.value = strHoje; inputFim.value = strHoje; } 
    else if (tipo === 'ontem') { let ontem = new Date(); ontem.setDate(hoje.getDate() - 1); let strOntem = formatarData(ontem); inputInicio.value = strOntem; inputFim.value = strOntem; } 
    else if (tipo === 'semana') { let inicioSemana = new Date(); inicioSemana.setDate(hoje.getDate() - 7); inputInicio.value = formatarData(inicioSemana); inputFim.value = formatarData(hoje); } 
    else if (tipo === 'mes') { let inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1); inputInicio.value = formatarData(inicioMes); inputFim.value = formatarData(hoje); } 
    else if (tipo === 'limpar') { inputInicio.value = ""; inputFim.value = ""; } 
    
    forcarAtualizacaoDashboard();
};

function forcarAtualizacaoDashboard() { 
    mostrarToast("Buscando dados atualizados...", "info"); 
    let icone = document.getElementById('icon-refresh-dash'); 
    if(icone) icone.style.animation = "spin 1s linear infinite"; 
    abrirDashboard(); 
    if(typeof carregarGraficosShare === 'function') carregarGraficosShare(); 
}

function abrirDashboard() { 
    mudarTela('tela-dashboard'); window.confettiDisparado = false; 

    let btnDesempenho = document.getElementById('btn-tab-desempenho');
    let btnAvancada = document.getElementById('btn-tab-avancada');
    let btnOppo = document.getElementById('btn-tab-oppo');

    if (usuarioLogado.cargo === "promotor") {
        if (btnDesempenho) btnDesempenho.style.display = "none";
        if (btnAvancada) btnAvancada.style.display = "none";
        switchTab('dash-tab-oppo', 'dash-tab');
        if (btnOppo) { document.querySelectorAll('.dash-tab-btn').forEach(b => b.classList.remove('ativo')); btnOppo.classList.add('ativo'); }
    } else {
        if (btnDesempenho) btnDesempenho.style.display = "";
        if (btnAvancada) btnAvancada.style.display = "";
    }

    let cReg = document.getElementById('container-filtro-regional-dash');
    let cSup = document.getElementById('container-filtro-supervisor-dash');
    let cProm = document.getElementById('container-filtro-promotor-dash');

    if (usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master") {
        if(cReg) cReg.style.display = "flex"; if(cSup) cSup.style.display = "flex"; if(cProm) cProm.style.display = "flex";
        let selReg = document.getElementById('filtro-regional-dash');
        if (selReg && selReg.options.length <= 1) {
            let htmlOp = '<option value="todos">Todas as Regiões (Geral)</option>';
            for(let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === "regional" || bancoUsuarios[k].cargo === "gestor") { htmlOp += `<option value="${k}">Gestor/Região: ${bancoUsuarios[k].nome || k}</option>`; } }
            selReg.innerHTML = htmlOp;
        }
        if(document.getElementById('filtro-supervisor-dash') && document.getElementById('filtro-supervisor-dash').options.length <= 1) mudouRegionalDash();
    } else if (usuarioLogado.cargo === "regional") {
        if(cReg) cReg.style.display = "none"; if(cSup) cSup.style.display = "flex"; if(cProm) cProm.style.display = "flex";
        if(document.getElementById('filtro-supervisor-dash') && document.getElementById('filtro-supervisor-dash').options.length <= 1) mudouRegionalDash();
    } else if (usuarioLogado.cargo === "supervisor") {
        if(cReg) cReg.style.display = "none"; if(cSup) cSup.style.display = "none"; if(cProm) cProm.style.display = "flex";
        if(document.getElementById('filtro-promotor-dash') && document.getElementById('filtro-promotor-dash').options.length <= 1) atualizarFiltroPromotorDash();
    } else {
        if(cReg) cReg.style.display = "none"; if(cSup) cSup.style.display = "none"; if(cProm) cProm.style.display = "none";
        atualizarFiltroLojaDash();
    }

    document.getElementById("total-comissao-geral").innerText = "R$ ****"; 
    document.getElementById("icone-olho-comissao").innerHTML = '<i data-lucide="eye" style="margin:0;"></i>'; 
    loadIcons(); document.getElementById("total-vendas-geral").innerText = "..."; 
    
    let inputDtIni = document.getElementById("dash-data-inicio"); let inputDtFim = document.getElementById("dash-data-fim");
    let dtInicio = inputDtIni && inputDtIni.value ? inputDtIni.value : null; let dtFim = inputDtFim && inputDtFim.value ? inputDtFim.value : null;
    
    let query = supabaseClient.from('vendas').select('*').neq('status', 'Cancelado').neq('status', 'Auditoria');
    if (dtInicio) query = query.gte('data_venda', dtInicio + 'T00:00:00');
    if (dtFim) query = query.lte('data_venda', dtFim + 'T23:59:59');

    query.then(({ data, error }) => {
        if (error) throw error;
        let dados = (data || []).filter(row => !(row.aparelhos_vendidos || "").toUpperCase().includes('[AUDITORIA]')).map(row => ({ promotor_login: row.promotor_login, loja: row.loja, Vendedor: `[${row.loja}] ${row.vendedor}`, Aparelhos: row.aparelhos_vendidos, Data: row.data_venda }));
        dadosAcompanhamentoGlobal = dados; 
        gerarGraficos(dados);
    }).catch(e => { 
        console.error(e); document.getElementById("total-vendas-geral").innerText = "Erro!"; 
        if (e.message && (e.message.includes('fetch') || e.message.includes('network'))) mostrarBotaoReconexao(); else mostrarToast("Erro nos gráficos.", "erro");
    }).finally(() => { let icone = document.getElementById('icon-refresh-dash'); if(icone) icone.style.animation = "none"; loadIcons(); }); 
}

function abrirExtratoComissao() { 
    let elComissao = document.getElementById("total-comissao-geral"); let iconeOlho = document.getElementById("icone-olho-comissao"); 
    if (elComissao.innerText === "R$ ****") { elComissao.innerText = elComissao.dataset.valor || "R$ 0,00"; iconeOlho.innerHTML = '<i data-lucide="eye-off" style="margin:0;"></i>'; loadIcons(); } 
    let html = ''; let totalExtrato = 0; let map = window.extratoComissaoAtual || {};
    for(let key in map) {
        let item = map[key]; let titulo = key;
        let sub = item.isCampanha ? `${item.qtd}x Atingimentos Bônus` : `${item.qtd} un x R$ ${item.valorUnit.toFixed(2)}`;
        let totForm = `R$ ${item.total.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
        totalExtrato += item.total;
        html += `<div style="display:flex; justify-content:space-between; align-items:center; padding: 12px 0; border-bottom: 1px dashed var(--border-color);"><div style="text-align: left;"><strong style="font-size: 13px; color: var(--cor-texto); display:block; margin-bottom: 2px;">${titulo}</strong><span style="font-size: 11px; color: var(--cor-secundaria);">${sub}</span></div><strong style="font-size: 14px; color: #10b981;">${totForm}</strong></div>`;
    }
    if(html === '') { html = `<div class='mensagem-vazia'>Nenhuma comissão gerada neste período.</div>`; } else { html += `<div style="display:flex; justify-content:space-between; align-items:center; padding-top: 15px; margin-top: 10px;"><strong style="font-size: 16px; color: var(--cor-texto);">TOTAL EXTRATO</strong><strong style="font-size: 18px; color: var(--primary);">R$ ${totalExtrato.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}</strong></div>`; }
    document.getElementById('lista-extrato-comissao').innerHTML = html; document.getElementById('modal-extrato-comissao').classList.add('ativo'); loadIcons();
}

function fecharModalExtrato() { document.getElementById('modal-extrato-comissao').classList.remove('ativo'); }

window.mudouRegionalDash = function() {
    let selReg = document.getElementById('filtro-regional-dash'); let selSup = document.getElementById('filtro-supervisor-dash'); let regVal = (usuarioLogado.cargo === "regional") ? usuarioLogado.id : (selReg ? selReg.value : "todos"); let htmlOp = '<option value="todos">Todas as Equipes (Supervisores)</option>';
    for (let k in bancoUsuarios) {
        if (bancoUsuarios[k].cargo === "supervisor") {
            if (regVal === "todos") { if (podeGerenciar(usuarioLogado, k)) htmlOp += `<option value="${k}">Equipe: ${bancoUsuarios[k].nome || k}</option>`; } else {
                let objRegional = bancoUsuarios[regVal]; let check1 = bancoUsuarios[k].criadoPor === regVal; let check2 = objRegional && bancoUsuarios[k].regiao === objRegional.regiao;
                if (check1 || check2) htmlOp += `<option value="${k}">Equipe: ${bancoUsuarios[k].nome || k}</option>`;
            }
        }
    }
    if (selSup) selSup.innerHTML = htmlOp; mudouSupervisorDash();
};

window.mudouSupervisorDash = function() { atualizarFiltroPromotorDash(); };

function atualizarFiltroPromotorDash() {
    let selSup = document.getElementById('filtro-supervisor-dash'); let supVal = selSup ? selSup.value : "todos"; let selProm = document.getElementById('filtro-promotor-dash'); let promotorAtual = selProm ? selProm.value : "todos"; let htmlOp = '<option value="todos">Todos os Promotores</option>';
    let selReg = document.getElementById('filtro-regional-dash'); let regVal = (usuarioLogado.cargo === "regional") ? usuarioLogado.id : (selReg ? selReg.value : "todos"); let supAlvo = (usuarioLogado.cargo === "supervisor") ? usuarioLogado.id : supVal;
    for (let k in bancoUsuarios) {
        if (bancoUsuarios[k].cargo === "promotor") {
            let userProm = bancoUsuarios[k]; let userSup = bancoUsuarios[userProm.criadoPor];
            if (supAlvo !== "todos") { if (userProm.criadoPor === supAlvo) htmlOp += `<option value="${k}">${userProm.nome || k}</option>`; } else if (regVal !== "todos") {
                let objRegional = bancoUsuarios[regVal]; let check1 = userProm.criadoPor === regVal; let check2 = userSup && userSup.criadoPor === regVal; let check3 = userSup && objRegional && userSup.regiao === objRegional.regiao;
                if (check1 || check2 || check3) htmlOp += `<option value="${k}">${userProm.nome || k}</option>`;
            } else { if(podeGerenciar(usuarioLogado, k)) htmlOp += `<option value="${k}">${userProm.nome || k}</option>`; }
        }
    }
    if(selProm) { selProm.innerHTML = htmlOp; if (Array.from(selProm.options).some(opt => opt.value === promotorAtual)) selProm.value = promotorAtual; }
    atualizarFiltroLojaDash();
}

function atualizarFiltroLojaDash() {
    let selProm = document.getElementById('filtro-promotor-dash'); let selLoja = document.getElementById('filtro-loja-dash'); if (!selLoja) return; let htmlOp = '<option value="todas">Todas as Lojas</option>'; let lojasDaBusca = new Set();
    if (usuarioLogado.cargo === "promotor") {
        let lp = usuarioLogado.lojasPermitidas || []; if (typeof lp === 'string') { try { lp = JSON.parse(lp); } catch(e){ lp = [lp]; } }
        lp.forEach(l => lojasDaBusca.add(l));
    } else {
        let promotorAtual = selProm ? selProm.value : "todos";
        if (promotorAtual !== "todos") {
            let userP = bancoUsuarios[promotorAtual]; if (userP && userP.lojasPermitidas) userP.lojasPermitidas.forEach(l => lojasDaBusca.add(l));
        } else {
            let selSup = document.getElementById('filtro-supervisor-dash'); let supVal = (usuarioLogado.cargo === "supervisor") ? usuarioLogado.id : (selSup ? selSup.value : "todos"); let selReg = document.getElementById('filtro-regional-dash'); let regVal = (usuarioLogado.cargo === "regional") ? usuarioLogado.id : (selReg ? selReg.value : "todos");
            if (supVal !== "todos") { getLojasDaRegiao(supVal).forEach(l => lojasDaBusca.add(l)); } else if (regVal !== "todos") {
                for (let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === "supervisor" && (bancoUsuarios[k].criadoPor === regVal || bancoUsuarios[k].regiao === bancoUsuarios[regVal].regiao)) { getLojasDaRegiao(k).forEach(l => lojasDaBusca.add(l)); } }
            } else { Object.keys(lojasConfig).forEach(l => lojasDaBusca.add(l)); }
        }
    }
    Array.from(lojasDaBusca).sort().forEach(l => { htmlOp += `<option value="${l}">${l}</option>`; }); selLoja.innerHTML = htmlOp;
}

window.mudouPromotorDash = function() { atualizarFiltroLojaDash(); abrirDashboard(); if(typeof carregarGraficosShare === 'function') carregarGraficosShare(); };
function toggleComissao() { let elComissao = document.getElementById("total-comissao-geral"); let iconeOlho = document.getElementById("icone-olho-comissao"); if (elComissao.innerText === "R$ ****") { elComissao.innerText = elComissao.dataset.valor || "R$ 0,00"; iconeOlho.innerHTML = '<i data-lucide="eye-off" style="margin:0;"></i>'; } else { elComissao.innerText = "R$ ****"; iconeOlho.innerHTML = '<i data-lucide="eye" style="margin:0;"></i>'; } loadIcons(); }
function isCampaignActiveInMonth(startStr, endStr, mesSelecionado) { return true; }

function gerarGraficos(dadosVendas) {
    if (!dadosVendas) dadosVendas = []; 
    let totalGeral = 0; let vendasPorLoja = {}; let vendasPorModelo = {}; let metricas = {}; let modelosFocoVendidos = {}; let rankingPorLoja = {}; 
    let regiaoFoco = "todos"; let supervisorFoco = "todos"; let promotorFoco = "todos"; let lojaFoco = "todas";

    let elReg = document.getElementById('filtro-regional-dash'); if (elReg && elReg.parentElement.style.display !== "none") regiaoFoco = elReg.value; if (usuarioLogado.cargo === "regional") regiaoFoco = usuarioLogado.id;
    let elSup = document.getElementById('filtro-supervisor-dash'); if (elSup && elSup.parentElement.style.display !== "none") supervisorFoco = elSup.value; if (usuarioLogado.cargo === "supervisor") supervisorFoco = usuarioLogado.id;
    let elProm = document.getElementById('filtro-promotor-dash'); if (elProm && elProm.parentElement.style.display !== "none") promotorFoco = elProm.value; if (usuarioLogado.cargo === "promotor") promotorFoco = usuarioLogado.id;
    let elLoja = document.getElementById('filtro-loja-dash'); if (elLoja) lojaFoco = elLoja.value || "todas";

    let agrupamento = (supervisorFoco === "todos") ? "supervisor" : "promotor"; 
    let visualizarVendedores = (promotorFoco !== "todos" || lojaFoco !== "todas"); 

    let promotoresEscopo = new Set();
    for (let k in bancoUsuarios) {
        if (bancoUsuarios[k].cargo === "promotor") {
            let supLogin = bancoUsuarios[k].criadoPor; let userSup = bancoUsuarios[supLogin];
            if (promotorFoco !== "todos" && k !== promotorFoco) continue;
            if (supervisorFoco !== "todos" && supLogin !== supervisorFoco) continue;
            if (regiaoFoco !== "todos") {
                let objReg = bancoUsuarios[regiaoFoco]; let validReg = false;
                if (supLogin === regiaoFoco) validReg = true;
                if (userSup && userSup.criadoPor === regiaoFoco) validReg = true;
                if (userSup && objReg && userSup.regiao === objReg.regiao) validReg = true;
                if (!validReg) continue;
            } else { if (!podeGerenciar(usuarioLogado, k)) continue; }
            promotoresEscopo.add(k);
        }
    }

    promotoresEscopo.forEach(k => {
        let supDoPromotor = bancoUsuarios[k].criadoPor;
        let chaveAgrupamento = agrupamento === "supervisor" ? supDoPromotor : k;
        let nomeAgrupamento = bancoUsuarios[chaveAgrupamento] ? (bancoUsuarios[chaveAgrupamento].nome || chaveAgrupamento) : chaveAgrupamento;

        if (!metricas[nomeAgrupamento]) { 
            metricas[nomeAgrupamento] = { 
                login: chaveAgrupamento, nome: nomeAgrupamento, metaPremium: 0, metaIndividual: 0, 
                realizadoPremium: 0, realizadoGeral: 0, modelosPremiumVendidos: {}, modelosVendidosGeral: {}, 
                comissaoAcumulada: 0, metasLinhas: bancoUsuarios[chaveAgrupamento] ? bancoUsuarios[chaveAgrupamento].metasLinhas || [] : [], 
                realizadoLinhas: {},
                vendasPorLojaDetalhado: {} 
            }; 
        }
        
        let somaMetasPromotor = 0;
        let lojasDestePromotor = bancoUsuarios[k].lojasPermitidas || [];
        if (lojasDestePromotor.length > 0) {
            lojasDestePromotor.forEach(l => {
                if (lojaFoco !== "todas") {
                    let lFormatada = l.toLowerCase().replace(/\s+/g,'').trim();
                    let fFormatada = lojaFoco.toLowerCase().replace(/\s+/g,'').trim();
                    if (lFormatada !== fFormatada && !lFormatada.includes(fFormatada) && !fFormatada.includes(lFormatada)) return;
                }
                
                let metaDestaLoja = (bancoUsuarios[k].metasPorLoja && bancoUsuarios[k].metasPorLoja[l]) ? bancoUsuarios[k].metasPorLoja[l] : 0;
                somaMetasPromotor += metaDestaLoja;

                if (!metricas[nomeAgrupamento].vendasPorLojaDetalhado[l]) {
                    metricas[nomeAgrupamento].vendasPorLojaDetalhado[l] = { geral: 0, premium: 0, meta: metaDestaLoja, capa: (lojasConfig[l] && lojasConfig[l].capa) ? lojasConfig[l].capa : 0 };
                }
            });
        }
        if (somaMetasPromotor === 0 && lojaFoco === "todas") { somaMetasPromotor = bancoUsuarios[k].meta || 0; } 

        let taxaSup = taxasCoparticipacao[supDoPromotor] || taxasCoparticipacao["geral"] || 25; 
        let metaPremPromotor = Math.round(somaMetasPromotor * (taxaSup / 100));

        metricas[nomeAgrupamento].metaPremium += metaPremPromotor; 
        metricas[nomeAgrupamento].metaIndividual += somaMetasPromotor;
    });

    dadosVendas.forEach(row => {
        let pKey = row.promotor_login; 
        let loja = (row.loja || "Outras").trim(); 

        let usuarioVenda = bancoUsuarios[pKey];
        if (!usuarioVenda || usuarioVenda.cargo !== "promotor") {
            let donoDaLoja = Object.keys(bancoUsuarios).find(k => {
                let u = bancoUsuarios[k];
                return u.cargo === "promotor" && u.lojasPermitidas && u.lojasPermitidas.some(l => l.trim().toLowerCase() === loja.toLowerCase());
            });
            if (donoDaLoja) pKey = donoDaLoja;
        }

        if (!promotoresEscopo.has(pKey)) return; 
        
        if (lojaFoco !== "todas") {
            let lojaFormatada = loja.toLowerCase().replace(/\s+/g, '').trim();
            let focoFormatado = lojaFoco.toLowerCase().replace(/\s+/g, '').trim();
            if (lojaFormatada !== focoFormatado && !lojaFormatada.includes(focoFormatado) && !focoFormatado.includes(lojaFormatada)) return;
        }
        
        let match = (row.Vendedor || "").match(/^\[(.*?)\]\s*(.*)$/); let vendNome = match ? match[2] : row.Vendedor;
        let lista = (row.Aparelhos || "").split("||").map(x => x.trim()).filter(x => x !== ""); let qtd = lista.length; 
        
        totalGeral += qtd; 
        if (!vendasPorLoja[loja]) vendasPorLoja[loja] = 0; vendasPorLoja[loja] += qtd;
        
        if (visualizarVendedores) { 
            if (!rankingPorLoja[loja]) rankingPorLoja[loja] = {}; 
            let multVend = vendNome.split(" e "); 
            multVend.forEach(vN => { let v = vN.trim(); if (!rankingPorLoja[loja][v]) rankingPorLoja[loja][v] = { qtdGeral: 0, qtdPremium: 0 }; rankingPorLoja[loja][v].qtdGeral += qtd; }); 
        }

        let chaveAgrupamento = agrupamento === "supervisor" ? bancoUsuarios[pKey].criadoPor : pKey;
        let nomeAgrupamento = bancoUsuarios[chaveAgrupamento] ? (bancoUsuarios[chaveAgrupamento].nome || chaveAgrupamento) : chaveAgrupamento;

        lista.forEach(ap => { 
            let chaveKey = extrairChaveAparelho(ap); let modeloFormatado = (mapaEmojis[chaveKey] ? mapaEmojis[chaveKey] + " " : "") + chaveKey.toUpperCase(); let nomeApUpper = ap.toUpperCase();
            if (!vendasPorModelo[modeloFormatado]) vendasPorModelo[modeloFormatado] = 0; vendasPorModelo[modeloFormatado] += 1; 
            
            let checkPrem = ehPremium(ap, supervisorFoco !== "todos" ? supervisorFoco : "geral");

            if (visualizarVendedores && checkPrem) { vendNome.split(" e ").forEach(vN => { rankingPorLoja[loja][vN.trim()].qtdPremium += 1; }); }

            if (metricas[nomeAgrupamento]) {
                metricas[nomeAgrupamento].realizadoGeral += 1; 
                
                if (!metricas[nomeAgrupamento].vendasPorLojaDetalhado[loja]) {
                    metricas[nomeAgrupamento].vendasPorLojaDetalhado[loja] = { geral: 0, premium: 0, meta: 0, capa: 0 };
                }
                metricas[nomeAgrupamento].vendasPorLojaDetalhado[loja].geral += 1;
                if (checkPrem) metricas[nomeAgrupamento].vendasPorLojaDetalhado[loja].premium += 1;
                
                metricas[nomeAgrupamento].modelosVendidosGeral[chaveKey] = (metricas[nomeAgrupamento].modelosVendidosGeral[chaveKey] || 0) + 1; 
                if (metricas[nomeAgrupamento].metasLinhas) {
                    metricas[nomeAgrupamento].metasLinhas.forEach(ml => {
                        let arrModelosDestaLinha = ml.linha.split(',').map(s => s.trim());
                        if (arrModelosDestaLinha.some(mod => nomeApUpper.includes(mod))) { metricas[nomeAgrupamento].realizadoLinhas[ml.linha] = (metricas[nomeAgrupamento].realizadoLinhas[ml.linha] || 0) + 1; }
                    });
                }
                if (checkPrem) { 
                    metricas[nomeAgrupamento].realizadoPremium += 1; 
                    modelosFocoVendidos[modeloFormatado] = (modelosFocoVendidos[modeloFormatado] || 0) + 1; 
                    metricas[nomeAgrupamento].modelosPremiumVendidos[chaveKey] = (metricas[nomeAgrupamento].modelosPremiumVendidos[chaveKey] || 0) + 1; 
                } 
            }
        });
    });

    let mesFiltro = ""; window.extratoComissaoAtual = {}; 
    Object.values(metricas).forEach(m => {
        let comissaoUser = 0; let supkey = m.login; 
        if (bancoUsuarios[m.login] && bancoUsuarios[m.login].cargo === "promotor") { supkey = bancoUsuarios[m.login].criadoPor; }
        let vComissaoSup = valoresComissao[supkey] || valoresComissao["geral"] || {}; 
        let grupos = vComissaoSup.grupos || []; let aparelhosCfg = vComissaoSup.aparelhos || {}; let campanhasAtivas = vComissaoSup.campanhasPersonalizadas || [];
        let volumePorGrupo = {}; grupos.forEach(g => volumePorGrupo[g.id] = 0);
        for(let modChave in m.modelosVendidosGeral) { let qtdMod = m.modelosVendidosGeral[modChave]; let cfg = aparelhosCfg[modChave] || { tipo: 'nenhum' }; if (cfg.tipo === 'grupo' && cfg.grupoId && volumePorGrupo[cfg.grupoId] !== undefined) { volumePorGrupo[cfg.grupoId] += qtdMod; } }
        for(let modChave in m.modelosVendidosGeral) { 
            let qtdMod = m.modelosVendidosGeral[modChave]; let cfg = aparelhosCfg[modChave] || { tipo: 'nenhum' }; 
            if (cfg.tipo === 'fixo') { 
                let valFixo = Number(cfg.valorFixo) || 0; let ganho = qtdMod * valFixo; comissaoUser += ganho; 
                if (ganho > 0) { let k = `${modChave.toUpperCase()} (Fixo)`; if(!window.extratoComissaoAtual[k]) window.extratoComissaoAtual[k] = { qtd:0, valorUnit: valFixo, total:0, isCampanha: false }; window.extratoComissaoAtual[k].qtd += qtdMod; window.extratoComissaoAtual[k].total += ganho; }
            } else if (cfg.tipo === 'grupo' && cfg.grupoId) {
                let g = grupos.find(x => x.id === cfg.grupoId);
                if (g && cfg.valores) {
                    let volumeTotalGrupo = volumePorGrupo[cfg.grupoId] || 0; let nivelAlcancadoIdx = null; let maiorMeta = -1;
                    g.niveis.forEach((nv, idx) => { if (volumeTotalGrupo >= Number(nv.meta) && Number(nv.meta) >= maiorMeta) { nivelAlcancadoIdx = idx; maiorMeta = Number(nv.meta); } });
                    if (nivelAlcancadoIdx !== null) { 
                        let payout = Number(cfg.valores[nivelAlcancadoIdx]) || 0; let ganho = qtdMod * payout; comissaoUser += ganho; 
                        if(ganho > 0) { let k = `${modChave.toUpperCase()} (Cat: ${g.nome})`; if(!window.extratoComissaoAtual[k]) window.extratoComissaoAtual[k] = { qtd:0, valorUnit: payout, total:0, isCampanha: false }; window.extratoComissaoAtual[k].qtd += qtdMod; window.extratoComissaoAtual[k].total += ganho; }
                    }
                }
            } else if (cfg.tipo === undefined && (cfg.comissionado === true || cfg.comissionado === 'true')) {
                let niveisGlobais = vComissaoSup.niveis || [{ id: 'l1', meta: 0 }, { id: 'l2', meta: 10 }];
                let nivelAlcancado = 'l1'; let maiorMeta = -1; 
                niveisGlobais.forEach(nv => { let metaParaNivel = (cfg[nv.id + '_meta'] !== undefined && cfg[nv.id + '_meta'] !== "") ? Number(cfg[nv.id + '_meta']) : nv.meta; if (m.realizadoGeral >= metaParaNivel && metaParaNivel >= maiorMeta) { nivelAlcancado = nv.id; maiorMeta = metaParaNivel; } }); 
                let payout = 0; if (cfg[nivelAlcancado] !== undefined && cfg[nivelAlcancado] !== "") { payout = Number(cfg[nivelAlcancado]); } else if (cfg['l1'] !== undefined && cfg['l1'] !== "") { payout = Number(cfg['l1']); } 
                let ganho = qtdMod * payout; comissaoUser += ganho;
                if(ganho > 0) { let k = `${modChave.toUpperCase()} (Global)`; if(!window.extratoComissaoAtual[k]) window.extratoComissaoAtual[k] = { qtd:0, valorUnit: payout, total:0, isCampanha: false }; window.extratoComissaoAtual[k].qtd += qtdMod; window.extratoComissaoAtual[k].total += ganho; }
            }
        }
        campanhasAtivas.forEach(camp => { 
            if (isCampaignActiveInMonth(camp.dataInicio, camp.dataFim, mesFiltro)) { 
                if (camp.promotorAlvo && camp.promotorAlvo !== 'todos' && camp.promotorAlvo !== m.login) { return; } 
                let qtdParaBater = camp.aparelho === 'todos' ? m.realizadoPremium : (m.modelosVendidosGeral[camp.aparelho] || 0); 
                if (qtdParaBater >= Number(camp.qtdMinima)) { 
                    let ganho = qtdParaBater * Number(camp.bonus); comissaoUser += ganho; 
                    if(ganho > 0) { let k = `🎯 Bônus: ${camp.aparelho.toUpperCase()}`; if(!window.extratoComissaoAtual[k]) window.extratoComissaoAtual[k] = { qtd:0, valorUnit: Number(camp.bonus), total:0, isCampanha: true }; window.extratoComissaoAtual[k].qtd += qtdParaBater; window.extratoComissaoAtual[k].total += ganho; }
                } 
            } 
        });
        m.comissaoAcumulada = comissaoUser;
    });

    let diasPassadosMes = new Date().getDate(); if (diasPassadosMes < 1) diasPassadosMes = 1; 
    let mediaDiaria = totalGeral > 0 ? (totalGeral / diasPassadosMes).toFixed(1) : 0;
    let diasNoMesAtual = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    let projecaoPace = Math.round((totalGeral / diasPassadosMes) * diasNoMesAtual);
    let diasUteis = typeof calcularDiasUteisRestantes === 'function' ? calcularDiasUteisRestantes() : 0;

    let htmlPace = `<div style="font-size: 11px; margin-top: 5px; color: rgba(255,255,255,0.8);">Projeção (Pace): <strong>${projecaoPace} un</strong></div>`;
    let htmlDiasUteis = `<div style="font-size: 11px; margin-top: 5px; color: rgba(255,255,255,0.8);"><i data-lucide="calendar" class="lucide-sm" style="margin:0; width:12px; height:12px;"></i> Faltam: <strong>${diasUteis} dias úteis</strong></div>`;
    
    document.getElementById("total-vendas-geral").innerHTML = `${totalGeral} un ${htmlPace}`; 
    document.getElementById("media-diaria-geral").innerHTML = `${mediaDiaria} un ${htmlDiasUteis}`;
    
    let comissaoTotalGeral = Object.values(metricas).reduce((acc, m) => acc + (m.comissaoAcumulada || 0), 0); 
    let valorFormatado = `R$ ${comissaoTotalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`; 
    let elComissao = document.getElementById("total-comissao-geral"); 
    elComissao.dataset.valor = valorFormatado; elComissao.innerText = "R$ ****"; document.getElementById("icone-olho-comissao").innerHTML = '<i data-lucide="eye" style="margin:0;"></i>'; loadIcons();

    let supAlvoParaFoco = (supervisorFoco !== "todos") ? supervisorFoco : "geral"; let pSup = aparelhosPremium[supAlvoParaFoco]; if (!pSup || Object.keys(pSup).length === 0) pSup = aparelhosPremium["geral"] || {}; let listaFocoAtuais = Object.keys(pSup).filter(k => pSup[k]).map(k => `<span style="display:inline-block; background:var(--bg-item); color:var(--cor-texto); padding:4px 8px; border-radius:6px; margin:2px; border: 1px solid var(--border-color); font-weight:bold;">${mapaEmojis[k] || ''} ${k.toUpperCase()}</span>`); document.getElementById("lista-foco-ativo-dash").innerHTML = listaFocoAtuais.length > 0 ? listaFocoAtuais.join("") : "<span style='color:var(--cor-secundaria); font-style:italic;'>Nenhum aparelho configurado como Foco.</span>";

    let totalFocoVendidoGeral = Object.values(modelosFocoVendidos).reduce((a, b) => a + b, 0); let metaFocoSomaGeral = Object.values(metricas).reduce((acc, m) => acc + m.metaPremium, 0); let pctMetaFocoGeral = metaFocoSomaGeral > 0 ? ((totalFocoVendidoGeral / metaFocoSomaGeral) * 100).toFixed(1) : 0; let pctCopartGeral = totalGeral > 0 ? ((totalFocoVendidoGeral / totalGeral) * 100).toFixed(1) : 0;
    let listaFocoHtml = ""; for(let mod in modelosFocoVendidos) { listaFocoHtml += `<span style="display:inline-block; background:var(--bg-item); color:var(--primary); padding:4px 8px; border-radius:6px; margin:2px; font-weight:bold; border: 1px solid var(--border-color);">${mod}: ${modelosFocoVendidos[mod]} un</span> `; } let htmlDetalhesCopart = `<div style="display: flex; flex-direction: column; gap: 8px;"><div style="display: flex; justify-content: space-between; font-size: 13px;"><span><i data-lucide="star" class="lucide-sm"></i> Foco Vendidos: <strong>${totalFocoVendidoGeral} un</strong></span><span style="color: #10b981; font-weight: bold;">Meta: ${pctMetaFocoGeral}%</span></div><div style="display: flex; justify-content: space-between; font-size: 13px;"><span><i data-lucide="pie-chart" class="lucide-sm"></i> Coparticipação Geral: <strong>${pctCopartGeral}%</strong></span></div><div style="margin-top: 5px;"><strong style="font-size: 11px; color: var(--cor-secundaria); display: block; margin-bottom: 3px;">Foco Vendidos no Período:</strong><div>${listaFocoHtml || "<span style='color:var(--cor-secundaria); font-style:italic;'>Nenhum foco vendido.</span>"}</div></div></div>`; document.getElementById("detalhe-coparticipacao-cards").innerHTML = htmlDetalhesCopart; loadIcons();

    try {
        if (chartCoparticipacao) chartCoparticipacao.destroy(); if (chartCapa) chartCapa.destroy(); if (chartLojas) chartLojas.destroy(); if (chartModelos) chartModelos.destroy();
        let corTextoGrafico = document.body.classList.contains('dark-mode') ? '#f8fafc' : '#64748b'; Chart.defaults.color = corTextoGrafico; const pluginsArr = typeof ChartDataLabels !== 'undefined' ? [ChartDataLabels] : []; let labelsProm = Object.keys(metricas); let metasArr = labelsProm.map(p => metricas[p].metaPremium); let maxMeta = metasArr.length > 0 ? Math.max(...metasArr) : 10; if(maxMeta === -Infinity || maxMeta < 1) maxMeta = 10; 
        let widthProm = Math.max(100, labelsProm.length * 18); let wrapCapa = document.getElementById('wrap-graficoMetaPremiumCapa'); if(wrapCapa) wrapCapa.style.minWidth = widthProm + '%'; let wrapCopart = document.getElementById('wrap-graficoCoparticipacaoPromotores'); if(wrapCopart) wrapCopart.style.minWidth = widthProm + '%';

        const ctxCapa = document.getElementById('graficoMetaPremiumCapa').getContext('2d'); chartCapa = new Chart(ctxCapa, { type: 'bar', plugins: pluginsArr, data: { labels: labelsProm, datasets: [{ label: 'Meta Foco (un)', data: labelsProm.map(p => metricas[p].metaPremium), backgroundColor: '#c0c0c0' }, { label: 'Realizado Foco', data: labelsProm.map(p => metricas[p].realizadoPremium), backgroundColor: '#f59e0b' }]}, options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 45 } }, plugins: { legend: { position: 'bottom' }, datalabels: { anchor: 'end', align: 'top', offset: 4, formatter: (val, ctx) => { if (ctx.datasetIndex === 0) return val + ' un'; let p = ctx.chart.data.labels[ctx.dataIndex]; let m = metricas[p]; let pct = m.metaPremium > 0 ? ((val / m.metaPremium) * 100).toFixed(1) : 0; return [`${val} un`, `(${pct}%)`]; }, font: { weight: 'bold', size: 10 }, color: corTextoGrafico, textAlign: 'center' } }, scales: { y: { beginAtZero: true, suggestedMax: maxMeta * 1.3 } } } });
        const ctxCopart = document.getElementById('graficoCoparticipacaoPromotores').getContext('2d'); chartCoparticipacao = new Chart(ctxCopart, { type: 'bar', plugins: pluginsArr, data: { labels: labelsProm, datasets: [{ label: '% Coparticipação', data: labelsProm.map(p => metricas[p].realizadoGeral > 0 ? ((metricas[p].realizadoPremium / metricas[p].realizadoGeral) * 100).toFixed(1) : 0), backgroundColor: '#0086ff' }] }, options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 45 } }, plugins: { legend: { display: false }, tooltip: { padding: 12, callbacks: { label: function(context) { let p = context.chart.data.labels[context.dataIndex]; let m = metricas[p]; let linhas = [`Coparticipação: ${context.raw}% (${m.realizadoPremium} de ${m.realizadoGeral} un)`]; if (m.realizadoPremium > 0) { linhas.push('-------------------------'); linhas.push('Aparelhos Foco Vendidos:'); for (let mod in m.modelosPremiumVendidos) { linhas.push(`• ${m.modelosPremiumVendidos[mod]}x ${mod}`); } } return linhas; } } }, datalabels: { anchor: 'end', align: 'top', offset: 4, formatter: (val, ctx) => { let p = ctx.chart.data.labels[ctx.dataIndex]; let m = metricas[p]; return [`${val}%`, `(${m.realizadoPremium} de ${m.realizadoGeral} un)`]; }, font: { weight: 'bold', size: 10 }, color: corTextoGrafico, textAlign: 'center' } }, scales: { y: { beginAtZero: true, suggestedMax: 100 } } } });

        let lojasSort = Object.keys(vendasPorLoja).sort((a,b) => a.localeCompare(b, undefined, {numeric:true, sensitivity:'base'})); 
        let widthLojas = Math.max(100, lojasSort.length * 18); let wrapLojas = document.getElementById('wrap-graficoVendasLoja'); if(wrapLojas) wrapLojas.style.minWidth = widthLojas + '%';
        const ctxLojas = document.getElementById('graficoVendasLoja').getContext('2d'); chartLojas = new Chart(ctxLojas, { type: 'bar', plugins: pluginsArr, data: { labels: lojasSort, datasets: [{ data: lojasSort.map(l => vendasPorLoja[l]), backgroundColor: '#10b981', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 20 } }, scales: { x: { ticks: { display: false }, grid: { display: false } }, y: { beginAtZero: true } }, plugins: { legend: { display: false }, tooltip: { padding: 12, callbacks: { title: function(context) { return '🏪 ' + context[0].label; }, afterTitle: function(context) { let nomePromotor = getPromotorDaLoja(context[0].label); return '👤 Promotor: ' + nomePromotor; }, label: function(context) { return 'Total Vendido: ' + context.raw + ' un'; } } }, datalabels: { anchor: 'end', align: 'top', color: corTextoGrafico, font: { weight: 'bold' }, formatter: (val) => val + ' un' } } } });

        let topModelos = Object.entries(vendasPorModelo).sort((a, b) => b[1] - a[1]); 
        const ctxModelos = document.getElementById('graficoTopModelos').getContext('2d'); 
        const paletaCores = ['#0086ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#38bdf8', '#fb923c', '#f472b6', '#2dd4bf', '#a78bfa', '#e879f9', '#94a3b8', '#fb7185', '#34d399', '#fbbf24', '#c084fc', '#4ade80'];
        
        let alturaDinamica = Math.max(260, topModelos.length * 40); 
        let wrapModelos = document.getElementById('wrap-graficoTopModelos');
        if(wrapModelos) wrapModelos.style.height = alturaDinamica + 'px';

        chartModelos = new Chart(ctxModelos, { 
            type: 'bar', 
            plugins: pluginsArr, 
            data: { 
                labels: topModelos.map(m => `${m[0]}`), 
                datasets: [{ 
                    data: topModelos.map(m => m[1]), 
                    backgroundColor: topModelos.map((_, index) => paletaCores[index % paletaCores.length]),
                    borderRadius: 6
                }] 
            }, 
            options: { 
                indexAxis: 'y', 
                maintainAspectRatio: false, 
                responsive: true, 
                layout: { padding: { right: 45 } },
                scales: {
                    x: { display: false, grid: { display: false } }, 
                    y: { ticks: { color: corTextoGrafico, font: { weight: 'bold', size: 11 } }, grid: { display: false, drawBorder: false } }
                },
                plugins: { 
                    legend: { display: false }, 
                    tooltip: { callbacks: { label: function(context) { return ' Vendido: ' + context.raw + ' un'; } } },
                    datalabels: { anchor: 'end', align: 'right', color: corTextoGrafico, font: { weight: 'bold', size: 12 }, formatter: (value) => value > 0 ? value + ' un' : '' } 
                } 
            } 
        });

        if (chartHorariosPico) chartHorariosPico.destroy();
        if (chartPaceVisual) chartPaceVisual.destroy();

        let horasContador = { "08:00": 0, "09:00": 0, "10:00": 0, "11:00": 0, "12:00": 0, "13:00": 0, "14:00": 0, "15:00": 0, "16:00": 0, "17:00": 0, "18:00": 0, "19:00": 0, "20:00": 0, "21:00": 0 };
        dadosVendas.forEach(row => {
            if (row.Data) {
                let d = new Date(row.Data);
                if (!isNaN(d)) {
                    let horaStr = String(d.getHours()).padStart(2, '0') + ":00";
                    let listaItensVenda = (row.Aparelhos || "").split("||").filter(x => x.trim() !== "");
                    let qtdNestaVenda = listaItensVenda.length > 0 ? listaItensVenda.length : 1;
                    if (horasContador[horaStr] !== undefined) horasContador[horaStr] += qtdNestaVenda;
                    else { let hNum = d.getHours(); if (hNum < 8) horasContador["08:00"] += qtdNestaVenda; else if (hNum > 21) horasContador["21:00"] += qtdNestaVenda; }
                }
            }
        });

        let maxPicoValor = Math.max(...Object.values(horasContador));
        const ctxHorarios = document.getElementById('graficoHorariosPico').getContext('2d');
        chartHorariosPico = new Chart(ctxHorarios, { 
            type: 'bar', plugins: pluginsArr, data: { labels: Object.keys(horasContador), datasets: [{ label: 'Vendas por Hora', data: Object.values(horasContador), backgroundColor: '#8b5cf6', borderRadius: 6 }] }, 
            options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 25 } }, plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', color: corTextoGrafico, font: { weight: 'bold', size: 11 }, formatter: (val) => val > 0 ? val + ' un' : '' } }, scales: { y: { beginAtZero: true, suggestedMax: maxPicoValor * 1.2 } } } 
        });

        let somaMetasTotal = Object.values(metricas).reduce((acc, m) => acc + m.metaIndividual, 0);
        const ctxPace = document.getElementById('graficoPaceVisual').getContext('2d');
        chartPaceVisual = new Chart(ctxPace, { type: 'bar', plugins: pluginsArr, data: { labels: ['Realizado até Agora', 'Projeção (Pace)', 'Meta do Mês'], datasets: [{ data: [totalGeral, projecaoPace, somaMetasTotal > 0 ? somaMetasTotal : totalGeral], backgroundColor: ['#0086ff', '#f59e0b', '#10b981'], borderRadius: 6 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'right', color: corTextoGrafico, font: { weight: 'bold', size: 12 }, formatter: (val) => val + ' un' } }, scales: { x: { beginAtZero: true, suggestedMax: Math.max(somaMetasTotal, projecaoPace, totalGeral) * 1.2 } } } });

        renderizarRankingComercialDashboard(metricas, totalGeral, diasPassadosMes);

        setTimeout(() => {
            if(document.getElementById('tela-dashboard').classList.contains('ativa')) {
                let isTop1 = false; let promOrd = Object.keys(metricas).sort((a,b) => metricas[b].realizadoGeral - metricas[a].realizadoGeral);
                if (!visualizarVendedores && promOrd.length > 0) { if (promOrd[0] === usuarioLogado.nome || promOrd[0] === usuarioLogado.id) isTop1 = true; }
                if (isTop1 && !window.confettiDisparado) { typeof confetti === "function" && confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#0086ff', '#10b981', '#f59e0b', '#ffd700'] }); window.confettiDisparado = true; mostrarToast("🏆 Parabéns! Você está em 1º Lugar no ranking!", "sucesso"); }
            }
        }, 500);
    } catch(errG) { console.error("Erro interno nos gráficos:", errG); }
}

function renderizarRankingComercialDashboard(metricas, totalGeral, diasPassados) {
    let tbody = document.getElementById('ranking-table-body');
    if (!tbody) return;

    let linhasArray = [];
    let totalFocoGlobal = 0; 
    let metaGlobal = 0; 

    Object.values(metricas).forEach(m => {
        totalFocoGlobal += m.realizadoPremium; 
        metaGlobal += m.metaIndividual;
        
        let lojasDaPessoa = Object.keys(m.vendasPorLojaDetalhado);
        
        if (lojasDaPessoa.length === 0) {
            linhasArray.push({
                nome: m.nome, login: m.login, loja: "Sem Lojas Vinculadas",
                realizadoGeral: m.realizadoGeral, realizadoPremium: m.realizadoPremium,
                meta: m.metaIndividual, capa: 0
            });
        } else {
            lojasDaPessoa.forEach(lojaNome => {
                let d = m.vendasPorLojaDetalhado[lojaNome];
                linhasArray.push({
                    nome: m.nome, login: m.login, loja: lojaNome,
                    realizadoGeral: d.geral || 0, realizadoPremium: d.premium || 0,
                    meta: d.meta || 0, capa: d.capa || 0
                });
            });
        }
    });

    linhasArray.sort((a, b) => {
        if (b.realizadoGeral !== a.realizadoGeral) return b.realizadoGeral - a.realizadoGeral;
        return b.realizadoPremium - a.realizadoPremium;
    });

    let htmlLinhas = "";

    linhasArray.forEach((linha, index) => {
        let pos = index + 1; 
        let posHtml = `${pos}º`;
        if (pos === 1) posHtml = `<span class="rk-medal ouro">1</span>`; 
        else if (pos === 2) posHtml = `<span class="rk-medal prata">2</span>`; 
        else if (pos === 3) posHtml = `<span class="rk-medal bronze">3</span>`;

        let atingimentoNum = linha.meta > 0 ? (linha.realizadoGeral / linha.meta) * 100 : 0;
        let atingimentoStr = atingimentoNum.toFixed(1) + "%";
        
        let corFundoAting = "transparent"; let corTextoAting = "#f8fafc";
        if(linha.meta > 0) {
            if (atingimentoNum === 0) { corFundoAting = "rgba(239, 68, 68, 0.25)"; corTextoAting = "#ef4444"; } 
            else if (atingimentoNum < 40) { corFundoAting = "rgba(245, 158, 11, 0.25)"; corTextoAting = "#f59e0b"; } 
            else { corFundoAting = "rgba(16, 185, 129, 0.25)"; corTextoAting = "#10b981"; }
        } else { corTextoAting = "#94a3b8"; }

        let mks = linha.capa > 0 ? ((linha.realizadoGeral / linha.capa) * 100).toFixed(1) : "0.0";
        let mediaDia = diasPassados > 0 ? (linha.realizadoGeral / diasPassados).toFixed(1) : "0.0";
        let partFoco = linha.realizadoGeral > 0 ? ((linha.realizadoPremium / linha.realizadoGeral) * 100).toFixed(1) : "0.0";

        htmlLinhas += `<tr>
            <td>${posHtml}</td>
            <td style="text-align: left; font-weight: 800; color: #f8fafc;">${linha.nome}</td>
            <td style="text-align: left; font-weight: 700; color: #cbd5e1; padding: 12px 8px;">${linha.loja}</td>
            <td style="font-size: 16px; font-weight: 900; color: #f8fafc; background-color: rgba(30, 58, 138, 0.2);">${linha.realizadoGeral}</td>
            <td style="font-size: 16px; font-weight: 900; color: #10b981; background-color: rgba(6, 78, 59, 0.2);">${linha.realizadoPremium}</td>
            <td>${linha.meta}</td>
            <td style="font-weight: 900; background-color: ${corFundoAting}; color: ${corTextoAting};">${atingimentoStr}</td>
            <td>${linha.capa}</td>
            <td>${mks}%</td>
            <td>${mediaDia}</td>
            <td>${partFoco}%</td>
        </tr>`;
    });

    tbody.innerHTML = htmlLinhas || "<tr><td colspan='11'>Sem dados no período</td></tr>";

    let atingimentoGlobalNum = metaGlobal > 0 ? (totalGeral / metaGlobal) * 100 : 0;
    let totalPromotores = Object.keys(metricas).length;
    let mediaVendedor = totalPromotores > 0 ? (totalGeral / totalPromotores).toFixed(1) : "0.0";
    let penetracaoFoco = totalGeral > 0 ? ((totalFocoGlobal / totalGeral) * 100).toFixed(1) : "0.0";
    
    // Cálculos de Tempo e Projeção (Pace)
    let hoje = new Date();
    let diasNoMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    let diasUteisRestantes = typeof calcularDiasUteisRestantes === 'function' ? calcularDiasUteisRestantes() : 0;
    let pctMes = ((diasPassados / diasNoMesAtual) * 100).toFixed(1);
    
    let projecaoPace = Math.round((totalGeral / diasPassados) * diasNoMesAtual);
    let projecaoPct = metaGlobal > 0 ? ((projecaoPace / metaGlobal) * 100).toFixed(1) : 0;
    
    document.getElementById('rk-total-vendas').innerText = totalGeral; 
    document.getElementById('rk-meta-total').innerText = `${metaGlobal} UN`; 
    document.getElementById('rk-atingimento-global').innerText = `${atingimentoGlobalNum.toFixed(1)}%`; 
    document.getElementById('rk-media-vendedor').innerText = `${mediaVendedor} UN`; 
    document.getElementById('rk-total-foco').innerText = totalFocoGlobal; 
    document.getElementById('rk-penetracao-foco').innerText = `${penetracaoFoco}%`;

    let elDias = document.getElementById('rk-dias-uteis'); if(elDias) elDias.innerText = diasUteisRestantes;
    let elMes = document.getElementById('rk-dias-corridos'); if(elMes) elMes.innerText = `${pctMes}%`;
    let elPace = document.getElementById('rk-projecao-pace'); if(elPace) elPace.innerText = projecaoPace;
    let elPacePct = document.getElementById('rk-projecao-pct'); if(elPacePct) elPacePct.innerText = `${projecaoPct}%`;

    let promotoresArray = Object.values(metricas).sort((a, b) => {
        if (b.realizadoGeral !== a.realizadoGeral) return b.realizadoGeral - a.realizadoGeral;
        return b.realizadoPremium - a.realizadoPremium;
    });

    if (promotoresArray.length > 0 && promotoresArray[0].realizadoGeral > 0) { 
        document.getElementById('rk-lider-nome').innerText = promotoresArray[0].nome; 
        document.getElementById('rk-lider-vendas').innerText = `${promotoresArray[0].realizadoGeral} Vendas`; 
    } else { 
        document.getElementById('rk-lider-nome').innerText = "---"; 
        document.getElementById('rk-lider-vendas').innerText = "0 Vendas"; 
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.abrirModalShare = function() {
    let selPromotor = document.getElementById('select-promotor-share');
    let labelPromotor = document.getElementById('label-promotor-share');
    let selLoja = document.getElementById('select-loja-share');
    let divMarcas = document.getElementById('container-inputs-concorrencia');

    if (usuarioLogado.cargo === "promotor") {
        if (selPromotor) selPromotor.style.display = "none";
        if (labelPromotor) labelPromotor.style.display = "none";
        
        let lojas = usuarioLogado.lojasPermitidas || [];
        lojas.sort((a,b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));
        let htmlLoja = ''; lojas.forEach(l => htmlLoja += `<option value="${l}">${l}</option>`);
        if (selLoja) selLoja.innerHTML = htmlLoja || '<option value="">Nenhuma loja vinculada</option>';
    } else {
        if (selPromotor) selPromotor.style.display = "block";
        if (labelPromotor) labelPromotor.style.display = "block";

        let htmlProm = '<option value="todos">Todos (Visão Geral da Região)</option>';
        let promotores = [];
        for (let k in bancoUsuarios) {
            if (bancoUsuarios[k].cargo === "promotor") {
                if (usuarioLogado.cargo === "supervisor" && bancoUsuarios[k].criadoPor !== usuarioLogado.id) continue;
                if (usuarioLogado.cargo === "regional" && bancoUsuarios[k].regiao !== usuarioLogado.regiao && (!bancoUsuarios[bancoUsuarios[k].criadoPor] || bancoUsuarios[bancoUsuarios[k].criadoPor].regiao !== usuarioLogado.regiao)) continue;
                promotores.push(k);
            }
        }
        promotores.sort((a, b) => (bancoUsuarios[a].nome || a).localeCompare(bancoUsuarios[b].nome || b));
        promotores.forEach(p => { htmlProm += `<option value="${p}">${bancoUsuarios[p].nome || p}</option>`; });
        
        if (selPromotor) { selPromotor.innerHTML = htmlProm; selPromotor.value = "todos"; }
        window.filtrarLojasShare();
    }
    
    let supId = "geral";
    if (usuarioLogado.cargo === "promotor") supId = usuarioLogado.criadoPor;
    else if (usuarioLogado.cargo === "supervisor") supId = usuarioLogado.id;
    
    let vComissaoSup = valoresComissao[supId] || valoresComissao["geral"] || {};
    let marcas = vComissaoSup.marcas_concorrentes || ["Samsung", "Motorola", "Outros"];

    let htmlMarcas = '';
    marcas.forEach(marca => {
        let marcaId = marca.replace(/[^a-zA-Z0-9]/g, '');
        htmlMarcas += `
        <div style="background: var(--bg-container); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; display: flex; flex-direction: column; align-items: flex-start; gap: 6px;">
            <span style="font-size: 12px; font-weight: bold; color: var(--cor-secundaria);">${marca}</span>
            <input type="number" id="input-concorrente-${marcaId}" data-marca="${marca}" placeholder="Vendas" style="width: 100%; padding: 10px; margin: 0; background: var(--bg-fundo); border: 1px solid var(--border-color); border-radius: 8px;">
        </div>`;
    });
    if (divMarcas) divMarcas.innerHTML = htmlMarcas;

    document.getElementById('modal-fechamento-share').classList.add('ativo');
}

window.filtrarLojasShare = function() {
    let selPromotor = document.getElementById('select-promotor-share');
    let selLoja = document.getElementById('select-loja-share');
    if (!selLoja || !selPromotor) return;

    let promAlvo = selPromotor.value;
    let lojas = [];

    if (promAlvo === "todos") {
        if (typeof getLojasDaRegiao === "function") lojas = getLojasDaRegiao(usuarioLogado.id);
        else lojas = Object.keys(lojasConfig); 
    } else { lojas = bancoUsuarios[promAlvo].lojasPermitidas || []; }

    lojas.sort((a,b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));
    let htmlLoja = ''; lojas.forEach(l => htmlLoja += `<option value="${l}">${l}</option>`);
    selLoja.innerHTML = htmlLoja || '<option value="">Nenhuma loja vinculada</option>';
}

async function enviarFechamentoShare() {
    if (!navigator.onLine) { mostrarToast("Sem internet!", "erro"); return; }
    let loja = document.getElementById('select-loja-share').value;
    if (!loja) return mostrarToast("Selecione uma loja.", "alerta");
    
    let totalConcorrencia = 0; let objConcorrentes = {};
    let inputs = document.querySelectorAll('[id^="input-concorrente-"]');
    
    inputs.forEach(inp => {
        let qtd = parseInt(inp.value) || 0;
        let marca = inp.getAttribute('data-marca');
        if (marca) { objConcorrentes[marca] = qtd; totalConcorrencia += qtd; }
    });

    if (totalConcorrencia === 0) return mostrarToast("Preencha as vendas da concorrência.", "alerta");

    const btn = document.getElementById("btn-salvar-share"); btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" style="animation: spin 1s linear infinite;"></i> Salvando na nuvem...'; loadIcons();

    let promotor_fechamento = usuarioLogado.id;
    if (usuarioLogado.cargo !== "promotor") {
        let selProm = document.getElementById('select-promotor-share');
        if (selProm && selProm.value !== "todos") { promotor_fechamento = selProm.value; } 
        else { let dono = Object.keys(bancoUsuarios).find(k => bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].lojasPermitidas && bancoUsuarios[k].lojasPermitidas.includes(loja)); if (dono) promotor_fechamento = dono; }
    }

    let supId = (usuarioLogado && usuarioLogado.criadoPor) ? usuarioLogado.criadoPor : (usuarioLogado ? usuarioLogado.id : 'master');

    let payload = {
        data_fechamento: new Date().toISOString().split('T')[0], loja: loja, promotor_login: promotor_fechamento,
        vendas_oppo: 0, vendas_total_loja: totalConcorrencia, criado_por_supervisor: supId, concorrentes_dados: objConcorrentes 
    };

    try {
        const { error } = await supabaseClient.from('market_share').insert([payload]);
        if (error) { console.error("Erro do Supabase:", error); throw error; }
        mostrarToast("Fechamento registrado com sucesso no banco!", "sucesso");
        document.getElementById('modal-fechamento-share').classList.remove('ativo');
        if (typeof carregarGraficosShare === 'function') carregarGraficosShare();
    } catch (e) { console.error("Erro no Share:", e); mostrarToast("Erro ao registrar fechamento no Supabase.", "erro"); } finally { btn.disabled = false; btn.innerHTML = 'Salvar Fechamento'; loadIcons(); }
}

async function carregarGraficosShare() {
    if (!navigator.onLine) { mostrarToast("Sem conexão.", "erro"); return; }
    mostrarToast("Calculando inteligência de mercado...", "info");
    
    let inputIni = document.getElementById("dash-data-inicio");
    let inputFim = document.getElementById("dash-data-fim");
    let dtInicio = inputIni && inputIni.value ? inputIni.value.trim() : null;
    let dtFim = inputFim && inputFim.value ? inputFim.value.trim() : null;

    try {
        let query = supabaseClient.from('market_share').select('*');
        if (dtInicio && dtInicio !== "") query = query.gte('data_fechamento', dtInicio);
        if (dtFim && dtFim !== "") query = query.lte('data_fechamento', dtFim);
            
        let selReg = document.getElementById('filtro-regional-dash');
        let selSup = document.getElementById('filtro-supervisor-dash');
        let selProm = document.getElementById('filtro-promotor-dash');
        let selLoja = document.getElementById('filtro-loja-dash');
        
        let cReg = document.getElementById('container-filtro-regional-dash'); let isRegVisible = cReg && cReg.style.display !== "none";
        let cSup = document.getElementById('container-filtro-supervisor-dash'); let isSupVisible = cSup && cSup.style.display !== "none";
        let cProm = document.getElementById('container-filtro-promotor-dash'); let isPromVisible = cProm && cProm.style.display !== "none";

        let escopoTexto = "no mercado analisado"; 
        let regAlvo = (usuarioLogado.cargo === "regional") ? usuarioLogado.id : (isRegVisible && selReg ? selReg.value : "todos");
        let supAlvo = (usuarioLogado.cargo === "supervisor") ? usuarioLogado.id : (isSupVisible && selSup ? selSup.value : "todos");
        let promAlvo = (isPromVisible && selProm) ? selProm.value : "todos";

        let lojasDaBusca = new Set();
        if (usuarioLogado.cargo === "promotor") {
            let lp = usuarioLogado.lojasPermitidas || [];
            if (typeof lp === 'string') { try { lp = JSON.parse(lp); } catch(e){ lp = [lp]; } }
            lp.forEach(l => lojasDaBusca.add(l));
            escopoTexto = "nas suas lojas";
        } else if (promAlvo !== "todos") {
            let uP = bancoUsuarios[promAlvo];
            if (uP && uP.lojasPermitidas) uP.lojasPermitidas.forEach(l => lojasDaBusca.add(l));
            escopoTexto = "nas lojas do promotor";
        } else if (supAlvo !== "todos") {
            if (typeof getLojasDaRegiao === "function") { getLojasDaRegiao(supAlvo).forEach(l => lojasDaBusca.add(l)); }
            escopoTexto = "na equipe filtrada";
        } else if (regAlvo !== "todos") {
            for (let k in bancoUsuarios) {
                if (bancoUsuarios[k].cargo === "supervisor" && (bancoUsuarios[k].criadoPor === regAlvo || (bancoUsuarios[regAlvo] && bancoUsuarios[k].regiao === bancoUsuarios[regAlvo].regiao))) {
                    if (typeof getLojasDaRegiao === "function") { getLojasDaRegiao(k).forEach(l => lojasDaBusca.add(l)); }
                }
            }
            escopoTexto = "na região filtrada";
        } else {
            Object.keys(lojasConfig).forEach(l => lojasDaBusca.add(l));
        }

        const { data: dbShare, error } = await query;
        if (error) { console.error("Erro do Supabase:", error); throw error; }

        let resumoGlobal = { oppo: 0, concorrentes: {}, total: 0 };
        let resumoLojas = {};

        if (typeof dadosAcompanhamentoGlobal !== 'undefined') {
            dadosAcompanhamentoGlobal.forEach(row => {
                let match = (row.Vendedor || "").match(/^\[(.*?)\]/);
                let lojaNome = match ? match[1] : "Outras";

                if (lojasDaBusca.size > 0 && !lojasDaBusca.has(lojaNome)) return;
                if (selLoja && selLoja.value !== "todas" && lojaNome !== selLoja.value) return;

                let qtd = (row.Aparelhos || "").split("||").filter(x => x.trim() !== "").length;
                resumoGlobal.oppo += qtd; resumoGlobal.total += qtd; 
                
                if (!resumoLojas[lojaNome]) resumoLojas[lojaNome] = { oppo: 0, total: 0 };
                resumoLojas[lojaNome].oppo += qtd; resumoLojas[lojaNome].total += qtd;
            });
        }

        if (dbShare && dbShare.length > 0) {
            dbShare.forEach(row => {
                if (lojasDaBusca.size > 0 && !lojasDaBusca.has(row.loja)) return;
                if (selLoja && selLoja.value !== "todas" && row.loja !== selLoja.value) return;

                let dadosConc = row.concorrentes_dados || {};
                if (typeof dadosConc === 'string') { try { dadosConc = JSON.parse(dadosConc); } catch(e) { dadosConc = {}; } }

                let totalConcLinha = 0;
                for (let marca in dadosConc) {
                    let qtd = Number(dadosConc[marca]) || 0;
                    resumoGlobal.concorrentes[marca] = (resumoGlobal.concorrentes[marca] || 0) + qtd;
                    totalConcLinha += qtd;
                }
                
                resumoGlobal.total += totalConcLinha;
                if (!resumoLojas[row.loja]) resumoLojas[row.loja] = { oppo: 0, total: 0 };
                resumoLojas[row.loja].total += totalConcLinha;
            });
        }

        if (resumoGlobal.total === 0) {
            if (chartShareGlobal) chartShareGlobal.destroy();
            let txtEl = document.getElementById('texto-resumo-share'); if (txtEl) txtEl.innerHTML = "Nenhum dado registrado neste filtro.";
            let listEl = document.getElementById('lista-temperatura-lojas'); if (listEl) listEl.innerHTML = "<div class='mensagem-vazia'>Sem dados.</div>";
            return;
        }

        renderizarPizzaShare(resumoGlobal, escopoTexto); 
        renderizarTermometroLojas(resumoLojas);

    } catch (e) {
        console.error("Erro no cálculo do Share:", e);
        mostrarToast("Erro ao carregar dados do Market Share.", "erro");
    }
}

function renderizarPizzaShare(resumoGlobal, escopoTexto) {
    if (chartShareGlobal) chartShareGlobal.destroy();
    
    let pctOppo = resumoGlobal.total > 0 ? ((resumoGlobal.oppo / resumoGlobal.total) * 100).toFixed(1) : 0;
    document.getElementById('texto-resumo-share').innerHTML = `A OPPO domina <strong style="font-size: 18px; color: #10b981;">${pctOppo}%</strong> ${escopoTexto}!`;

    let corTexto = document.body.classList.contains('dark-mode') ? '#ffffff' : '#475569';
    let labels = ['OPPO']; let data = [resumoGlobal.oppo]; let bgColors = ['#10b981']; 
    let paleta = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#64748b']; let cIdx = 0;
    let concOrdenados = Object.keys(resumoGlobal.concorrentes).sort((a,b) => resumoGlobal.concorrentes[b] - resumoGlobal.concorrentes[a]);

    concOrdenados.forEach(marca => { labels.push(marca); data.push(resumoGlobal.concorrentes[marca]); bgColors.push(paleta[cIdx % paleta.length]); cIdx++; });

    const ctx = document.getElementById('graficoMarketShare').getContext('2d');
    chartShareGlobal = new Chart(ctx, { type: 'doughnut', plugins: [ChartDataLabels], data: { labels: labels, datasets: [{ data: data, backgroundColor: bgColors, borderWidth: 1, borderColor: document.body.classList.contains('dark-mode') ? '#050a08' : '#ffffff' }] }, options: { maintainAspectRatio: false, responsive: true, plugins: { legend: { position: 'bottom', labels: { color: corTexto, font: { weight: 'bold' } } }, datalabels: { color: '#fff', font: { weight: 'bold', size: 12 }, formatter: (value, ctx) => { let total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0); if (total === 0 || value === 0) return ""; let percentage = ((value / total) * 100).toFixed(1) + "%"; return [`${value} un`, percentage]; } } } } });
}

function renderizarTermometroLojas(resumoLojas) {
    const div = document.getElementById('lista-temperatura-lojas'); let listaLojas = [];
    for (let nomeLoja in resumoLojas) { let r = resumoLojas[nomeLoja]; if (r.total === 0) continue; let pct = (r.oppo / r.total) * 100; listaLojas.push({ nome: nomeLoja, oppo: r.oppo, total: r.total, pct: pct }); }
    if (listaLojas.length === 0) { div.innerHTML = "<div class='mensagem-vazia'>Sem dados de lojas neste período.</div>"; return; }
    listaLojas.sort((a,b) => a.pct - b.pct);
    let html = "";
    listaLojas.forEach(l => {
        let corStatus, iconeStatus, bgAlerta;
        if (l.pct >= 35) { corStatus = "#10b981"; iconeStatus = "trending-up"; bgAlerta = "rgba(16, 185, 129, 0.05)"; } else if (l.pct >= 15) { corStatus = "#f59e0b"; iconeStatus = "thermometer"; bgAlerta = "rgba(245, 158, 11, 0.05)"; } else { corStatus = "#ef4444"; iconeStatus = "alert-triangle"; bgAlerta = "rgba(239, 68, 68, 0.1)"; }
        html += `<div style="background: ${bgAlerta}; border: 1px solid var(--border-color); border-radius: 12px; padding: 15px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; gap: 10px;"><div style="text-align: left; flex: 1;"><strong style="color: var(--cor-texto); font-size: 15px;">${l.nome}</strong><span style="display: block; font-size: 12px; color: var(--cor-secundaria);">OPPO: ${l.oppo} | Total da Loja: ${l.total} un</span></div><div style="text-align: right; color: ${corStatus}; display: flex; flex-direction: column; align-items: flex-end;"><span style="font-size: 22px; font-weight: 900; letter-spacing: -1px; display: flex; align-items: center; gap: 4px;"><i data-lucide="${iconeStatus}" style="margin:0; color: ${corStatus}; width: 20px; height: 20px;"></i>${l.pct.toFixed(1)}%</span><span style="font-size: 10px; font-weight: bold; text-transform: uppercase;">Share</span></div></div>`;
    });
    div.innerHTML = html; loadIcons();
}

async function compartilharDashboard() {
    mostrarToast("Gerando print em alta definição...", "info"); let elemento = document.getElementById('tela-dashboard'); if (!elemento) return;
    try { let canvas = await html2canvas(elemento, { scale: 3, useCORS: true, allowTaint: true, backgroundColor: document.body.classList.contains('dark-mode') ? '#050a08' : '#f1f5f9' }); let link = document.createElement('a'); link.download = `dashboard_oppo_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); mostrarToast("Print salvo no computador com sucesso!", "sucesso"); } catch (e) { console.error("Erro ao tirar print:", e); mostrarToast("Erro ao capturar tela.", "erro"); }
}

function exportarParaCSV(nomeArquivo, dados, colunas) {
    if (dados.length === 0) return mostrarToast("Nenhum dado para exportar", "alerta");
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; csvContent += colunas.join(";") + "\r\n";
    dados.forEach(row => { let linha = colunas.map(col => { return `${row[col] ? String(row[col]).replace(/;/g, ",") : ""}`; }); csvContent += linha.join(";") + "\r\n"; });
    const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `${nomeArquivo}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); mostrarToast("Download iniciado!", "sucesso");
}

function baixarRelatorioAcomp() { if (typeof dadosAcompanhamentoGlobal === 'undefined' || dadosAcompanhamentoGlobal.length === 0) { return mostrarToast("Carregue os dados primeiro.", "alerta"); } exportarParaCSV("Acompanhamento_Vendas", dadosAcompanhamentoGlobal, ["Data", "Vendedor", "Aparelhos", "Status"]); }
function baixarRelatorioHistorico() { if (typeof dadosHistoricoGlobal === 'undefined' || dadosHistoricoGlobal.length === 0) { return mostrarToast("Carregue o histórico primeiro.", "alerta"); } let dadosLimpos = dadosHistoricoGlobal.map(item => ({ Data: item.Data, Tipo: item.Tipo, Status: item.Status, Promotor: item.Promotor, Detalhe: item.Detalhe.replace(/<[^>]*>?/gm, '') })); exportarParaCSV("Historico_Auditoria", dadosLimpos, ["Data", "Tipo", "Status", "Promotor", "Detalhe"]); }

// ==========================================
// PAINEL ADMIN, SEGURANÇA E AUTO-SAVE SETTINGS
// ==========================================
let acaoSegurancaPendente = null;

function solicitarSenhaSeguranca(callbackAcao) {
    acaoSegurancaPendente = callbackAcao;
    let input = document.getElementById('input-senha-seguranca');
    if (input) input.value = '';
    document.getElementById('modal-senha-seguranca').classList.add('ativo');
    if (input) setTimeout(() => input.focus(), 100);
}

function confirmarSenhaSeguranca() {
    let senhaDigitada = document.getElementById('input-senha-seguranca').value.trim();
    if (senhaDigitada === usuarioLogado.senha || usuarioLogado.id === "master") {
        document.getElementById('modal-senha-seguranca').classList.remove('ativo');
        if (acaoSegurancaPendente) { acaoSegurancaPendente(); acaoSegurancaPendente = null; }
    } else { mostrarToast("Senha incorreta! Ação bloqueada.", "erro"); }
}

function fecharModalSenhaSeguranca() { document.getElementById('modal-senha-seguranca').classList.remove('ativo'); acaoSegurancaPendente = null; }

function renderizarSelectRegioes() { let regioesUnicas = new Set(); for (let k in bancoUsuarios) { if (bancoUsuarios[k].regiao) regioesUnicas.add(bancoUsuarios[k].regiao.toUpperCase()); } let sel = document.getElementById('admin-gs-regiao-select'); if (!sel) return; let html = '<option value="">Selecione a Região...</option>'; let regioesArray = Array.from(regioesUnicas).sort(); regioesArray.forEach(r => { html += `<option value="${r}">${r}</option>`; }); html += '<option value="NOVA">➕ Criar Nova Região</option>'; sel.innerHTML = html; }
function verificarNovaRegiao(val) { let inp = document.getElementById('admin-gs-regiao-input'); if(val === 'NOVA') { inp.style.display = 'block'; } else { inp.style.display = 'none'; inp.value = ''; } }

function renderizarSelectVinculo() { 
    let sel = document.getElementById('admin-gs-vinculo-select'); if (!sel) return; 
    let html = '<option value="master">Diretoria (Sem Regional)</option>'; 
    for (let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === "regional" || bancoUsuarios[k].cargo === "gestor") { html += `<option value="${k}">${bancoUsuarios[k].nome || k} (Regional)</option>`; } } 
    sel.innerHTML = html; 
}

function popularFiltroHierarquiaAdmin() {
    let sel = document.getElementById('filtro-hierarquia-admin'); if (!sel) return;
    if (usuarioLogado.id === "master" || usuarioLogado.cargo === "gestor") {
        sel.style.display = "block";
        let html = '<option value="todos">🌍 Ver Toda a Rede</option>';
        for (let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === "regional" || bancoUsuarios[k].cargo === "gestor") { html += `<option value="${k}">🌍 Rede: ${bancoUsuarios[k].nome || k}</option>`; } }
        for (let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === "supervisor") { html += `<option value="${k}">📍 Equipe: ${bancoUsuarios[k].nome || k}</option>`; } }
        sel.innerHTML = html;
    } else { sel.style.display = "none"; }
}

window.verificarAdminCargo = function(val) { 
    let boxVinculo = document.getElementById('container-admin-vinculo'); let boxRegiao = document.getElementById('container-admin-regiao');
    if (val === 'gestor') { if (boxVinculo) boxVinculo.style.display = 'none'; if (boxRegiao) boxRegiao.style.display = 'none'; } 
    else if (val === 'regional') { if (boxVinculo) boxVinculo.style.display = 'none'; if (boxRegiao) boxRegiao.style.display = 'flex'; } 
    else if (val === 'supervisor') { if (boxVinculo) boxVinculo.style.display = 'flex'; if (boxRegiao) boxRegiao.style.display = 'none'; } 
};

function abrirAdmin() { 
    mudarTela('tela-admin'); let selSupFoco = document.getElementById('seletor-foco-sup');
    popularFiltroHierarquiaAdmin();
    
    if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") {
        if(usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master") { document.getElementById('bloco-criar-gestor').style.display = "block"; renderizarSelectRegioes(); renderizarSelectVinculo(); } else { document.getElementById('bloco-criar-gestor').style.display = "none"; }
        document.getElementById('bloco-admin-foco').style.display = "block"; selSupFoco.innerHTML = '<option value="geral">Geral (Padrão da Empresa)</option>'; 
        for(let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === "supervisor" && podeGerenciar(usuarioLogado, k)) { selSupFoco.innerHTML += `<option value="${k}">Equipe: ${bancoUsuarios[k].nome || k}</option>`; } } 
    } else if (usuarioLogado.cargo === "supervisor") {
        document.getElementById('bloco-criar-gestor').style.display = "none"; document.getElementById('bloco-admin-foco').style.display = "block"; 
        selSupFoco.innerHTML = `<option value="${usuarioLogado.id}">Minha Equipe (${usuarioLogado.nome})</option>`; selSupFoco.value = usuarioLogado.id; 
    } else { document.getElementById('bloco-admin-foco').style.display = "none"; document.getElementById('bloco-criar-gestor').style.display = "none"; }
    
    verificarAdminCargo(document.getElementById('admin-gs-cargo') ? document.getElementById('admin-gs-cargo').value : 'supervisor');
    renderizarAdminUsuarios(); renderizarInputsFoco(); renderizarAdminAparelhos(); 
}

function renderizarAdminUsuarios() {
    const div = document.getElementById('lista-admin-supervisores'); let htmlContent = ""; 
    const filtroCargo = document.getElementById('filtro-cargo-admin') ? document.getElementById('filtro-cargo-admin').value : 'todos'; 
    const filtroH = document.getElementById('filtro-hierarquia-admin') ? document.getElementById('filtro-hierarquia-admin').value : 'todos'; 
    const busca = document.getElementById('busca-admin') ? document.getElementById('busca-admin').value.toLowerCase() : '';
    
    for(let l in bancoUsuarios) { 
        let u = bancoUsuarios[l]; if (u.cargo === "promotor" && usuarioLogado.id !== "master") continue; if (!podeGerenciar(usuarioLogado, l) && l !== usuarioLogado.id) continue;
        if (filtroCargo !== 'todos') { if (filtroCargo === 'regional' && u.cargo !== 'regional' && u.cargo !== 'gestor') continue; if (filtroCargo !== 'regional' && u.cargo !== filtroCargo) continue; }
        
        if (filtroH !== 'todos') {
            let hObj = bancoUsuarios[filtroH];
            if (hObj) {
                if (hObj.cargo === "regional" || hObj.cargo === "gestor") {
                    if (l !== filtroH && u.criadoPor !== filtroH && (!bancoUsuarios[u.criadoPor] || bancoUsuarios[u.criadoPor].criadoPor !== filtroH)) continue;
                } else if (hObj.cargo === "supervisor") {
                    if (l !== filtroH && u.criadoPor !== filtroH) continue;
                }
            }
        }

        const nomeUpper = (u.nome || l).toLowerCase(); if (busca && !nomeUpper.includes(busca) && !l.includes(busca)) continue;

        let labelCargo = l === "master" ? "👑 Master" : (u.cargo === "gestor" ? "👔 Gestor" : (u.cargo === "regional" ? "🌎 Regional" : (u.cargo === "supervisor" ? "📍 Supervisor" : "👤 Promotor"))); 
        let chefeNome = bancoUsuarios[u.criadoPor] ? bancoUsuarios[u.criadoPor].nome || u.criadoPor : "Master";
        let subLabel = u.regiao ? ` - Região: ${u.regiao}` : "";
        if (u.cargo === "supervisor" || u.cargo === "promotor") subLabel += ` | Reporta a: <strong style="color:var(--primary);">${chefeNome}</strong>`;

        let btnGerenciar = (u.cargo === "supervisor") ? `<button class="btn-editar" style="background: var(--primary-gradiente); color:white; border:none; padding: 12px; border-radius: 12px; width: 100%; margin-top: 12px; font-weight:bold;" onclick="abrirPainelEquipe('${l}')"><i data-lucide="settings" class="lucide-sm"></i> Gerenciar Equipe de ${u.nome || l}</button>` : (usuarioLogado.id === "master" && u.cargo === "promotor") ? `<button class="btn-editar" style="background: var(--primary-gradiente); color:white; border:none; padding: 12px; border-radius: 12px; width: 100%; margin-top: 12px;" onclick="adminAbrirModalLojas('${l}')"><i data-lucide="settings" class="lucide-sm"></i> Gerenciar Lojas</button>` : ''; 
        let btnRegiao = (usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master") && (u.cargo === "regional" || u.cargo === "gestor") ? `<button class="btn-editar" style="background-color: #8b5cf6; color:white; border:none;" onclick="adminAbrirModalRegiao('${l}')"><i data-lucide="globe"></i> Região</button>` : ""; 
        let btnSenha = `<button class="btn-editar" style="background-color: #f59e0b; color: white; border:none;" onclick="adminAbrirModalSenha('${l}')"><i data-lucide="key"></i> Senha</button>`; 
        let btnExcluir = (usuarioLogado.id === "master" && l !== "master") ? `<button class="btn-excluir" onclick="adminRemoverUsuario('${l}')"><i data-lucide="trash-2"></i></button>` : ""; 
        let btnVinculo = (usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master") && (u.cargo === "supervisor" || u.cargo === "promotor") ? `<button class="btn-editar" style="background-color: #3b82f6; color:white; border:none;" onclick="adminAbrirModalVinculo('${l}')"><i data-lucide="link"></i> Mover</button>` : "";

        htmlContent += `<div class="linha-admin" style="flex-direction: column; align-items: stretch; padding: 16px; background: var(--bg-card); margin-bottom: 12px; border-radius: 16px; border: 1px solid var(--border-color);"><div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px dashed var(--border-color); padding-bottom: 10px; margin-bottom: 10px;"><div style="text-align: left;"><strong style="font-size: 16px;">${u.nome || l} <span style="font-size: 11px; color: var(--cor-secundaria);">(@${l})</span></strong><span style="font-size: 11px; color: var(--cor-secundaria); display:block; margin-top:4px;">${labelCargo}${subLabel}</span></div><div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; max-width: 180px;">${btnRegiao} ${btnVinculo} ${btnSenha} ${btnExcluir}</div></div>${btnGerenciar}</div>`; 
    } div.innerHTML = htmlContent || "<p style='color:var(--cor-secundaria); font-size:13px;'>Nenhum usuário encontrado.</p>"; loadIcons();
}

function adminAbrirModalVinculo(login) { 
    let u = bancoUsuarios[login]; let cargo = u.cargo; 
    document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="link"></i> Mover Colaborador (@${login})`; 
    
    let htmlOptions = ''; 
    if (cargo === 'supervisor') { 
        htmlOptions += `<option value="master">Diretoria (Sem Regional)</option>`; 
        for (let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === 'regional' || bancoUsuarios[k].cargo === 'gestor') { let sel = u.criadoPor === k ? 'selected' : ''; htmlOptions += `<option value="${k}" ${sel}>${bancoUsuarios[k].nome || k} (Regional)</option>`; } } 
    } else if (cargo === 'promotor') { 
        for (let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === 'supervisor') { let sel = u.criadoPor === k ? 'selected' : ''; htmlOptions += `<option value="${k}" ${sel}>${bancoUsuarios[k].nome || k} (Supervisor)</option>`; } } 
    } 
    
    document.getElementById('modal-edicao-corpo').innerHTML = `<label style="font-size: 13px; font-weight: bold; color: var(--cor-secundaria); margin-bottom: 8px; display: block;">Mover para a equipe de:</label><select id="input-edit-vinculo" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--cor-texto);">${htmlOptions}</select>`; 
    
    let btn = document.getElementById('btn-salvar-edicao'); 
    btn.onclick = async function() { 
        let novoPai = document.getElementById('input-edit-vinculo').value; if (!novoPai) return; 
        let txtOriginal = btn.innerHTML; btn.innerHTML = '<i data-lucide="loader-2" style="animation: spin 1s linear infinite;"></i> Transferindo...'; btn.disabled = true; loadIcons();
        try { 
            let novaRegiao = bancoUsuarios[novoPai] ? bancoUsuarios[novoPai].regiao : (cargo === 'supervisor' ? 'GLOBAL' : null); 
            if (cargo === 'promotor') novaRegiao = u.regiao; 
            const { error } = await supabaseClient.from('usuarios').update({ criado_por: novoPai, regiao: novaRegiao }).eq('login', login); 
            if (error) throw error; 
            bancoUsuarios[login].criadoPor = novoPai; 
            if (cargo === 'supervisor') bancoUsuarios[login].regiao = novaRegiao; 
            mostrarToast("Transferência concluída!", "sucesso"); fecharModalEdicao(); renderizarAdminUsuarios(); 
        } catch(e) { console.error(e); mostrarToast("Erro ao transferir no banco.", "erro"); } finally { btn.innerHTML = txtOriginal; btn.disabled = false; loadIcons(); } 
    }; 
    document.getElementById('modal-edicao').classList.add('ativo'); loadIcons(); 
}

function filtrarListaModal(classe, termo) { termo = termo.toLowerCase(); let itens = document.querySelectorAll('.' + classe); itens.forEach(item => { if(item.innerText.toLowerCase().includes(termo)) { item.style.display = "flex"; } else { item.style.display = "none"; } }); }

let usuarioAlvoAcoes = null;

function abrirMenuAcoesUsuario(login, nome) {
    usuarioAlvoAcoes = login;
    document.getElementById('titulo-acoes-usuario').innerHTML = `<i data-lucide="user"></i> ${nome || login}`;
    
    // Adicionado o !important no var(--cor-texto) para garantir a leitura no tema claro
    let htmlBotoes = `
        <button class="btn-sistema" style="background: var(--bg-item); color: var(--cor-texto) !important; box-shadow: none; border: 1px solid var(--border-color); margin: 0; padding: 14px; display: flex; justify-content: flex-start; gap: 10px;" onclick="fecharMenuAcoesUsuario(); adminAbrirModalNome('${login}')"><i data-lucide="edit-3" style="color: var(--primary);"></i> Editar Nome</button>
        <button class="btn-sistema" style="background: var(--bg-item); color: var(--cor-texto) !important; box-shadow: none; border: 1px solid var(--border-color); margin: 0; padding: 14px; display: flex; justify-content: flex-start; gap: 10px;" onclick="fecharMenuAcoesUsuario(); adminAbrirModalSenha('${login}')"><i data-lucide="key" style="color: #f59e0b;"></i> Alterar Senha</button>
        <button class="btn-sistema" style="background: var(--bg-item); color: var(--cor-texto) !important; box-shadow: none; border: 1px solid var(--border-color); margin: 0; padding: 14px; display: flex; justify-content: flex-start; gap: 10px;" onclick="fecharMenuAcoesUsuario(); adminAbrirModalLojas('${login}')"><i data-lucide="store" style="color: #3b82f6;"></i> Vincular Lojas</button>
        <button class="btn-sistema" style="background: var(--bg-item); color: var(--cor-texto) !important; box-shadow: none; border: 1px solid var(--border-color); margin: 0; padding: 14px; display: flex; justify-content: flex-start; gap: 10px;" onclick="fecharMenuAcoesUsuario(); adminAbrirModalMeta('${login}')"><i data-lucide="target" style="color: #8b5cf6;"></i> Metas da Loja</button>
        <button class="btn-sistema" style="background: var(--bg-item); color: var(--cor-texto) !important; box-shadow: none; border: 1px solid var(--border-color); margin: 0; padding: 14px; display: flex; justify-content: flex-start; gap: 10px;" onclick="fecharMenuAcoesUsuario(); adminAbrirModalPermissoes('${login}')"><i data-lucide="shield" style="color: #10b981;"></i> Permissões de App</button>
        <button class="btn-sistema" style="background: rgba(239, 68, 68, 0.1); color: #ef4444 !important; box-shadow: none; border: 1px dashed #ef4444; margin: 0; padding: 14px; display: flex; justify-content: flex-start; gap: 10px;" onclick="fecharMenuAcoesUsuario(); adminRemoverUsuarioModalEquipe('${login}')"><i data-lucide="trash-2"></i> Excluir Promotor</button>
    `;
    
    document.getElementById('botoes-acoes-usuario').innerHTML = htmlBotoes;
    document.getElementById('modal-acoes-usuario').classList.add('ativo');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function fecharMenuAcoesUsuario() { 
    document.getElementById('modal-acoes-usuario').classList.remove('ativo'); 
    usuarioAlvoAcoes = null; 
}

function toggleFormNovoPromotor() {
    let form = document.getElementById('bloco-novo-promotor');
    if (form.style.display === "none") { form.style.display = "block"; } else { form.style.display = "none"; }
}

function abrirPainelEquipe(login) { supervisorGerenciadoAtual = login; let supNome = bancoUsuarios[login].nome || login; let titulo = document.getElementById('titulo-modal-equipe'); if (titulo) titulo.innerHTML = `<i data-lucide="users"></i> Equipe de ${supNome}`; renderizarModalEquipe(); document.getElementById('modal-gerenciar-equipe').classList.add('ativo'); switchTab('equipe-tab-promotores', 'equipe-tab'); loadIcons(); }
function fecharModalEquipe() { document.getElementById('modal-gerenciar-equipe').classList.remove('ativo'); supervisorGerenciadoAtual = null; }

function getLojasDaRegiao(supLogin) {
    let lojas = [];
    for (let l in lojasConfig) {
        if (lojasConfig[l].supervisor === supLogin) { lojas.push(l); } else if (!lojasConfig[l].supervisor) {
            let promotoresDoSup = Object.keys(bancoUsuarios).filter(k => bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].criadoPor === supLogin);
            let pertence = promotoresDoSup.some(p => bancoUsuarios[p].lojasPermitidas && bancoUsuarios[p].lojasPermitidas.includes(l));
            if (pertence) { lojas.push(l); lojasConfig[l].supervisor = supLogin; }
        }
    }
    return lojas.sort((a,b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));
}

function renderizarModalEquipe() {
    if(!supervisorGerenciadoAtual) return;
    let divPromotores = document.getElementById('lista-modal-promotores'); 
    let divLojas = document.getElementById('lista-modal-lojas'); 
    let selLoja = document.getElementById('modal-select-loja'); 
    let lojasDaRegiao = getLojasDaRegiao(supervisorGerenciadoAtual); 
    
    let promotoresArray = [];
    for(let k in bancoUsuarios) { 
        if(bancoUsuarios[k].cargo === "promotor" && (bancoUsuarios[k].criadoPor === supervisorGerenciadoAtual || usuarioLogado.id === "master")) { 
            promotoresArray.push({ login: k, nome: bancoUsuarios[k].nome || k, obj: bancoUsuarios[k] }); 
        } 
    }
    promotoresArray.sort((a, b) => a.nome.localeCompare(b.nome));

    let htmlPromotores = "";
    promotoresArray.forEach(p => {
        let u = p.obj; let k = p.login;
        let qtdLojas = u.lojasPermitidas ? u.lojasPermitidas.length : 0;
        
        htmlPromotores += `
        <div class="item-modal-busca-promotor" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; padding: 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div style="text-align: left;">
                <strong style="font-size:15px; display:block; color: var(--cor-texto);">${u.nome || k}</strong>
                <span style="font-size:11px; color:var(--cor-secundaria);">@${k} • ${qtdLojas} Loja(s) vinculada(s)</span>
            </div>
            <button style="background: transparent; border: none; color: var(--cor-secundaria); padding: 10px; border-radius: 50%; cursor: pointer;" onclick="abrirMenuAcoesUsuario('${k}', '${u.nome || k}')">
                <i data-lucide="more-vertical"></i>
            </button>
        </div>`;
    });
    
    let htmlListaVazia = "<p style='font-size:13px; color:var(--cor-secundaria);'>Nenhum promotor cadastrado.</p>";

    let formPromotorHtml = `
        <button class="btn-sistema" style="width: 100%; margin-bottom: 20px; background: rgba(16, 185, 129, 0.1); color: #10b981 !important; border: 1px dashed #10b981; box-shadow: none;" onclick="toggleFormNovoPromotor()">
            <i data-lucide="user-plus"></i> + Cadastrar Promotor
        </button>
        
        <div id="bloco-novo-promotor" style="display: none; background: var(--bg-item); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color); margin-bottom: 20px;">
            <strong style="font-size: 15px; color: #10b981; display: flex; align-items: center; margin-bottom: 15px;">Novo Perfil</strong>
            <div class="input-admin-row" style="margin-bottom: 8px;"><input type="text" id="modal-promotor-login" placeholder="Login"><input type="text" id="modal-promotor-nome" placeholder="Nome Completo"></div>
            <div class="input-admin-row" style="margin-bottom: 15px;"><input type="text" id="modal-promotor-senha" placeholder="Senha Padrão"></div>
            
            <div style="margin-bottom: 15px; background: var(--bg-container); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color); text-align: left;">
                <span style="font-size: 13px; font-weight: bold; color: #8b5cf6; display: flex; align-items: center; margin-bottom: 12px;"><i data-lucide="shield" class="lucide-sm"></i> Permissões Iniciais:</span>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
                    <label style="cursor: pointer;"><input type="checkbox" id="perm-vendas" checked> Lançar Vendas</label>
                    <label style="cursor: pointer;"><input type="checkbox" id="perm-acomp" checked> Dashboard</label>
                    <label style="cursor: pointer;"><input type="checkbox" id="perm-est-ver" checked> Ver Estoque</label>
                    <label style="cursor: pointer;"><input type="checkbox" id="perm-est-edit" checked> Editar Estoque</label>
                </div>
            </div>
            
            <div style="margin-bottom: 15px; background: var(--bg-container); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color);">
                <span style="font-size: 13px; font-weight: bold; color: var(--cor-secundaria); display: block; margin-bottom: 10px;">Vincular as lojas:</span>
                <div id="modal-promotor-lojas" style="display: grid; grid-template-columns: 1fr; gap: 10px; font-size: 13px; max-height: 150px; overflow-y: auto; text-align: left;"></div>
            </div>
            
            <button class="btn-acao btn-enviar" style="width: 100%; padding:14px; border-radius:12px; font-size:15px; border:none;" onclick="adminAddPromotorEquipe()"><i data-lucide="check" style="margin-right:6px;"></i> Salvar Promotor</button>
        </div>
    `;

    let containerAbaPromotores = document.getElementById('equipe-tab-promotores');
    if (containerAbaPromotores) {
        containerAbaPromotores.innerHTML = `
            <input type="text" placeholder="🔍 Buscar promotor..." onkeyup="filtrarListaModal('item-modal-busca-promotor', this.value)" style="margin-bottom: 15px; width:100%; padding: 12px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--cor-texto);">
            ${formPromotorHtml}
            <div id="lista-modal-promotores" style="max-height: 400px; overflow-y: auto;">${htmlPromotores || htmlListaVazia}</div>
        `;
    }

    let htmlLojas = ""; let htmlSelLoja = "";
    lojasDaRegiao.forEach(loja => {
        let objL = lojasConfig[loja] || { vendedores: [], capa: 0 }; htmlSelLoja += `<option value="${loja}">${loja}</option>`;
        let vends = (objL.vendedores || []).map(v => `<span style="background:var(--bg-item); color:var(--primary); padding:4px 8px; border-radius:6px; font-size:11px; margin-right:6px; border:1px solid var(--primary); display:inline-flex; align-items:center; gap:4px; margin-bottom:4px;">${v} <i data-lucide="x" class="lucide-sm" style="cursor:pointer;" onclick="adminRemoverVendedor('${loja}', '${v}')"></i></span>`).join("");
        htmlLojas += `<div class="item-modal-busca-loja" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 15px; margin-bottom: 10px; text-align: left;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;"><strong style="font-size:15px;"><i data-lucide="store" class="lucide-sm"></i> ${loja}</strong><div style="display:flex; gap:8px;"><button class="btn-editar-meta" onclick="adminAbrirModalCapa('${loja}')"><i data-lucide="layers" class="lucide-sm"></i> Capa: ${objL.capa || 0}</button><button class="btn-excluir" onclick="adminRemoverLoja('${loja}')"><i data-lucide="trash-2" class="lucide-sm"></i></button></div></div><div style="font-size:13px; color:var(--cor-secundaria); margin-top:5px; line-height:1.6;">Vendedores: <br>${vends || 'Nenhum'}</div></div>`;
    });
    if (divLojas) divLojas.innerHTML = htmlLojas || "<p style='font-size:13px; color:var(--cor-secundaria);'>Nenhuma loja na região.</p>"; 
    if (selLoja) selLoja.innerHTML = htmlSelLoja;
    
    let divCheckboxLojas = document.getElementById('modal-promotor-lojas');
    if (divCheckboxLojas) {
        let htmlCheckLojas = lojasDaRegiao.map(l => `<label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" class="check-nova-loja" value="${l}"> ${l}</label>`).join("");
        divCheckboxLojas.innerHTML = htmlCheckLojas || "<i style='font-size:11px;'>Crie lojas primeiro.</i>"; 
    }
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function adminAddPromotorEquipe() {
    let login = document.getElementById('modal-promotor-login').value.trim().toLowerCase(); 
    let nome = document.getElementById('modal-promotor-nome').value.trim(); 
    let senha = document.getElementById('modal-promotor-senha').value.trim(); 
    let meta = 0;
    if(!login || !nome || !senha) return mostrarToast("Preencha login, nome e senha obrigatórios", "alerta"); 
    if(bancoUsuarios[login]) return mostrarToast("Este login já existe no sistema", "erro");
    let lojasSelecionadas = Array.from(document.querySelectorAll('.check-nova-loja:checked')).map(cb => cb.value);
    
    let btnSalvar = event.currentTarget; let textoOriginal = btnSalvar.innerHTML;
    btnSalvar.innerHTML = '<i data-lucide="loader-2" class="lucide-sm" style="animation: spin 1s linear infinite;"></i> Criando...'; btnSalvar.disabled = true; loadIcons();

    try {
        const { error } = await supabaseClient.from('usuarios').insert([{ login: login, nome: nome, senha: senha, cargo: "promotor", meta: meta, criado_por: supervisorGerenciadoAtual, lojas_permitidas: lojasSelecionadas, regiao: bancoUsuarios[supervisorGerenciadoAtual] ? bancoUsuarios[supervisorGerenciadoAtual].regiao : null }]);
        if (error) throw error;
        bancoUsuarios[login] = { nome: nome, senha: senha, cargo: "promotor", meta: meta, metasPorLoja: {}, criadoPor: supervisorGerenciadoAtual, lojasPermitidas: lojasSelecionadas, permissoes: { vendas: document.getElementById('perm-vendas').checked, acomp: document.getElementById('perm-acomp').checked, estoque_ver: document.getElementById('perm-est-ver').checked, estoque_editar: document.getElementById('perm-est-edit').checked } };
        document.getElementById('modal-promotor-login').value = ""; document.getElementById('modal-promotor-nome').value = ""; document.getElementById('modal-promotor-senha').value = ""; 
        renderizarModalEquipe(); mostrarToast("👤 Promotor criado no banco de dados!", "sucesso");
    } catch (e) { console.error(e); mostrarToast("Erro ao criar usuário.", "erro"); } finally { btnSalvar.innerHTML = textoOriginal; btnSalvar.disabled = false; loadIcons(); }
}

async function adminAddGestorSup() {
    let login = document.getElementById('admin-gs-login').value.trim().toLowerCase(); let nome = document.getElementById('admin-gs-nome').value.trim(); let senha = document.getElementById('admin-gs-senha').value.trim(); let cargo = document.getElementById('admin-gs-cargo').value;
    let regiaoSel = document.getElementById('admin-gs-regiao-select') ? document.getElementById('admin-gs-regiao-select').value : ''; let regiaoNova = document.getElementById('admin-gs-regiao-input') ? document.getElementById('admin-gs-regiao-input').value.trim().toUpperCase() : ''; let regiaoFinal = regiaoSel === 'NOVA' ? regiaoNova : regiaoSel;
    let vinculo = document.getElementById('admin-gs-vinculo-select') ? document.getElementById('admin-gs-vinculo-select').value : usuarioLogado.id;
    
    if(!login || !nome || !senha) return mostrarToast("Preencha login, nome e senha!", "alerta"); if(bancoUsuarios[login]) return mostrarToast("Este login já existe!", "erro");
    
    let pai = usuarioLogado.id; let regiaoBanco = null;
    if (cargo === 'gestor') { regiaoBanco = 'GLOBAL'; pai = usuarioLogado.id; } 
    else if (cargo === 'regional') { if (!regiaoFinal) return mostrarToast("Defina a região do Gestor Regional!", "alerta"); regiaoBanco = regiaoFinal; pai = usuarioLogado.id; } 
    else if (cargo === 'supervisor') { pai = vinculo; regiaoBanco = bancoUsuarios[pai] ? bancoUsuarios[pai].regiao : 'GLOBAL'; }

    let btnSalvar = event.currentTarget; let txtOriginal = btnSalvar.innerHTML;
    btnSalvar.innerHTML = '<i data-lucide="loader-2" class="lucide-sm" style="animation: spin 1s linear infinite;"></i> Criando...'; btnSalvar.disabled = true; loadIcons();

    try {
        const { error } = await supabaseClient.from('usuarios').insert([{ login: login, nome: nome, senha: senha, cargo: cargo, meta: 0, criado_por: pai, lojas_permitidas: [], regiao: regiaoBanco }]);
        if (error) throw error;
        bancoUsuarios[login] = { nome: nome, senha: senha, cargo: cargo, regiao: regiaoBanco, criadoPor: pai, meta: 0, lojasPermitidas: [] };
        document.getElementById('admin-gs-login').value = ""; document.getElementById('admin-gs-nome').value = ""; document.getElementById('admin-gs-senha').value = ""; if(document.getElementById('admin-gs-regiao-input')) document.getElementById('admin-gs-regiao-input').value = "";
        if (cargo === 'regional' && typeof renderizarSelectVinculo === "function") { renderizarSelectVinculo(); renderizarSelectRegioes(); }
        renderizarAdminUsuarios(); mostrarToast(cargo.toUpperCase() + " criado com sucesso no banco!", "sucesso");
    } catch(e) { console.error(e); mostrarToast("Erro ao criar perfil no banco.", "erro"); } finally { btnSalvar.innerHTML = txtOriginal; btnSalvar.disabled = false; loadIcons(); }
}

async function adminAddLojaEquipe() { 
    let nome = document.getElementById('modal-loja-nome').value.trim(); let capa = parseInt(document.getElementById('modal-loja-capa').value) || 0; 
    if(!nome) return mostrarToast("Preencha o nome da loja", "alerta"); if(lojasConfig[nome]) return mostrarToast("Loja já existe", "erro"); 
    let btnSalvar = event.currentTarget; let textoOriginal = btnSalvar.innerHTML; btnSalvar.innerHTML = '<i data-lucide="loader-2" class="lucide-sm" style="animation: spin 1s linear infinite;"></i> Criando...'; btnSalvar.disabled = true; loadIcons();
    try {
        const { error } = await supabaseClient.from('lojas_config').insert([{ nome_loja: nome, supervisor_login: supervisorGerenciadoAtual, capa: capa, vendedores: [] }]);
        if (error) throw error;
        lojasConfig[nome] = { supervisor: supervisorGerenciadoAtual, capa: capa, vendedores: [] }; 
        document.getElementById('modal-loja-nome').value = ""; document.getElementById('modal-loja-capa').value = ""; renderizarModalEquipe(); mostrarToast("🏪 Loja criada com sucesso!", "sucesso"); 
    } catch (e) { console.error(e); mostrarToast("Erro ao criar loja no banco.", "erro"); } finally { btnSalvar.innerHTML = textoOriginal; btnSalvar.disabled = false; loadIcons(); }
}

async function adminAddVendedorEquipe() { 
    let loja = document.getElementById('modal-select-loja').value; let nomes = document.getElementById('modal-vendedor-nome').value.trim(); 
    if(!loja) return mostrarToast("Selecione uma loja", "alerta"); if(!nomes) return mostrarToast("Preencha o nome do vendedor", "alerta"); 
    if(!lojasConfig[loja]) lojasConfig[loja] = { supervisor: supervisorGerenciadoAtual, capa: 0, vendedores: [] }; 
    let novosVendedores = [...(lojasConfig[loja].vendedores || [])]; let arrayNomes = nomes.split(',').map(n => n.trim()).filter(n => n !== ""); arrayNomes.forEach(n => { if(!novosVendedores.includes(n)) novosVendedores.push(n); }); 
    mostrarToast("Salvando vendedor na nuvem...", "info");
    try { const { error } = await supabaseClient.from('lojas_config').update({ vendedores: novosVendedores }).eq('nome_loja', loja); if (error) throw error; lojasConfig[loja].vendedores = novosVendedores; document.getElementById('modal-vendedor-nome').value = ""; renderizarModalEquipe(); mostrarToast("Vendedores adicionados no banco!", "sucesso"); } catch (e) { console.error(e); mostrarToast("Erro ao salvar no banco.", "erro"); }
}

function adminRemoverUsuarioModalEquipe(login) { solicitarSenhaSeguranca(async () => { mostrarToast("Excluindo promotor da nuvem...", "info"); try { const { error } = await supabaseClient.from('usuarios').delete().eq('login', login); if (error) throw error; delete bancoUsuarios[login]; renderizarModalEquipe(); mostrarToast("Promotor removido permanentemente.", "sucesso"); } catch (e) { console.error(e); mostrarToast("Erro ao excluir no banco.", "erro"); } }); }
function adminRemoverUsuario(login) { solicitarSenhaSeguranca(async () => { mostrarToast("Excluindo usuário da nuvem...", "info"); try { const { error } = await supabaseClient.from('usuarios').delete().eq('login', login); if (error) throw error; delete bancoUsuarios[login]; renderizarAdminUsuarios(); mostrarToast("Usuário excluído permanentemente.", "sucesso"); } catch (e) { console.error(e); mostrarToast("Erro ao excluir no banco.", "erro"); } }); }
function adminRemoverLoja(loja) { solicitarSenhaSeguranca(async () => { mostrarToast("Excluindo loja da nuvem...", "info"); try { const { error } = await supabaseClient.from('lojas_config').delete().eq('nome_loja', loja); if (error) throw error; delete lojasConfig[loja]; for (let k in bancoUsuarios) { if (bancoUsuarios[k].lojasPermitidas) { bancoUsuarios[k].lojasPermitidas = bancoUsuarios[k].lojasPermitidas.filter(l => l !== loja); } } renderizarModalEquipe(); mostrarToast("Loja removida permanentemente.", "sucesso"); } catch (e) { console.error(e); mostrarToast("Erro ao excluir no banco.", "erro"); } }); }
function adminRemoverVendedor(loja, vend) { solicitarSenhaSeguranca(async () => { let novosVendedores = lojasConfig[loja].vendedores.filter(v => v !== vend); mostrarToast("Removendo vendedor na nuvem...", "info"); try { const { error } = await supabaseClient.from('lojas_config').update({ vendedores: novosVendedores }).eq('nome_loja', loja); if (error) throw error; lojasConfig[loja].vendedores = novosVendedores; renderizarModalEquipe(); mostrarToast("Vendedor removido com sucesso!", "sucesso"); } catch (e) { console.error(e); mostrarToast("Erro ao remover no banco.", "erro"); } }); }

// ==========================================
// CADASTRO DE APARELHOS E GRUPOS (AUTO-SAVE)
// ==========================================
function renderizarAdminAparelhos() { let div = document.getElementById('lista-admin-aparelhos'); let html = ""; for(let ap in mapaEmojis) { html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--border-color); font-size:15px; color:var(--cor-texto);"><span><span style="font-size: 20px; margin-right: 8px;">${mapaEmojis[ap]}</span> ${ap.toUpperCase()}</span><button class="btn-excluir" onclick="removerAparelhoGlobal('${ap}')"><i data-lucide="trash-2" class="lucide-sm"></i> Excluir</button></div>`; } div.innerHTML = html || "<p style='color:var(--cor-secundaria); font-size:13px;'>Nenhum aparelho cadastrado.</p>"; loadIcons(); }
function removerAparelhoGlobal(ap) { delete mapaEmojis[ap]; renderizarAdminAparelhos(); salvarConfiguracoesGlobais(true); }
function adminAddAparelho() { let n = document.getElementById('admin-aparelho-nome').value.trim().toLowerCase(); let e = document.getElementById('admin-aparelho-emoji').value.trim(); if(!n || !e) return mostrarToast("Preencha Nome e Emoji", "alerta"); if(mapaEmojis[n]) return mostrarToast("Aparelho já existe", "erro"); mapaEmojis[n] = e; document.getElementById('admin-aparelho-nome').value = ""; document.getElementById('admin-aparelho-emoji').value = ""; renderizarAdminAparelhos(); salvarConfiguracoesGlobais(true); }

function renderizarInputsFoco() {
    const container = document.getElementById('admin-foco-container'); const selSup = document.getElementById('seletor-foco-sup'); 
    if (!container || !selSup) return;
    let supId = selSup.value; let premiumSup = aparelhosPremium[supId] || aparelhosPremium["geral"] || {}; let taxaSup = taxasCoparticipacao[supId] || taxasCoparticipacao["geral"] || 25; let vComissaoSup = valoresComissao[supId] || valoresComissao["geral"] || {}; 
    let grupos = vComissaoSup.grupos || []; let aparelhosCfg = vComissaoSup.aparelhos || {}; let campanhasAtivas = vComissaoSup.campanhasPersonalizadas || []; let marcasConcorrentes = vComissaoSup.marcas_concorrentes || ["Samsung", "Motorola", "Outros"]; let gamificacao = vComissaoSup.gamificacao || { iconeTop1: '👑', iconeMeta: '🎯', iconeFire: '🔥', minFire: 5 };

    document.getElementById('input-taxa-copart').value = taxaSup;

    let htmlGamificacao = `<div style="background: var(--bg-item); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color); margin-top: 20px; text-align: left;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;"><span style="font-size: 14px; font-weight: bold; color: #ef4444;"><i data-lucide="award" class="lucide-sm"></i> Gamificação (Ranking e Troféus)</span></div><div style="display: flex; gap: 10px; flex-wrap: wrap;"><div style="flex: 1; min-width: 120px;"><span style="font-size:11px; font-weight:bold; color:var(--cor-secundaria);">Ícone Top 1:</span><input type="text" id="gami-icone-top1" value="${gamificacao.iconeTop1}" style="padding:10px; margin-top:4px;" onchange="atualizarListaPremiumGlobal()"></div><div style="flex: 1; min-width: 120px;"><span style="font-size:11px; font-weight:bold; color:var(--cor-secundaria);">Ícone Meta:</span><input type="text" id="gami-icone-meta" value="${gamificacao.iconeMeta}" style="padding:10px; margin-top:4px;" onchange="atualizarListaPremiumGlobal()"></div><div style="flex: 1; min-width: 120px;"><span style="font-size:11px; font-weight:bold; color:var(--cor-secundaria);">Ícone "On Fire":</span><input type="text" id="gami-icone-fire" value="${gamificacao.iconeFire}" style="padding:10px; margin-top:4px;" onchange="atualizarListaPremiumGlobal()"></div><div style="flex: 1; min-width: 120px;"><span style="font-size:11px; font-weight:bold; color:var(--cor-secundaria);">Premium p/ Fire:</span><input type="number" id="gami-min-fire" value="${gamificacao.minFire}" style="padding:10px; margin-top:4px;" onchange="atualizarListaPremiumGlobal()"></div></div></div>`;

    let htmlGrupos = '<div style="background: var(--bg-item); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color); margin-top: 20px; text-align: left;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;"><span style="font-size: 15px; font-weight: bold; color: #8b5cf6;"><i data-lucide="layers" class="lucide-sm"></i> Categorias de Comissionamento</span><button class="btn-acao btn-enviar" style="padding: 8px 14px; font-size: 12px; width: auto; background: #8b5cf6;" onclick="adminAddGrupo()"><i data-lucide="plus"></i> Nova Categoria</button></div>';
    if(grupos.length === 0) htmlGrupos += '<span style="font-size:12px; color:var(--cor-secundaria);">Crie categorias para somar o volume de vendas.</span>';
    grupos.forEach((g) => { htmlGrupos += `<div class="bloco-grupo" data-id="${g.id}" style="background:var(--bg-container); padding:15px; border-radius:12px; border: 1px solid var(--border-color); margin-bottom:12px;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;"><input type="text" class="grupo-nome" value="${g.nome}" style="font-weight:bold; color:var(--primary); width:180px; margin:0; padding:8px; border-color:var(--primary);" onchange="adminEditGrupoNome('${g.id}', this.value)"><div style="display:flex; gap:8px;"><button class="btn-editar" style="font-size:11px; padding:6px 10px;" onclick="adminAddNivelGrupo('${g.id}')">+ Nível</button><button class="btn-excluir" style="padding:6px 10px;" onclick="adminRemoverGrupo('${g.id}')"><i data-lucide="trash-2" class="lucide-sm" style="margin:0;"></i></button></div></div>`; g.niveis.forEach((nv, nIdx) => { htmlGrupos += `<div style="display:flex; align-items:center; gap:10px; margin-bottom:8px; font-size:13px; background:var(--bg-item); padding:8px 12px; border-radius:8px; border: 1px dashed var(--border-color);"><span>Nível ${nIdx + 1} - Atingindo</span> <input type="number" value="${nv.meta}" style="width:70px; margin:0; padding:6px; font-weight:bold;" onchange="adminEditGrupoNivel('${g.id}', ${nIdx}, 'meta', this.value)"> <span>unidades.</span><button class="btn-excluir" style="padding:4px 8px; margin-left:auto; font-size:10px;" onclick="adminRemoverNivelGrupo('${g.id}', ${nIdx})"><i data-lucide="x" style="margin:0;"></i></button></div>`; }); htmlGrupos += `</div>`; }); htmlGrupos += '</div>';

    let htmlCampanhas = '<div style="background: var(--bg-item); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color); margin-top: 20px; text-align: left;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;"><span style="font-size: 14px; font-weight: bold; color: #f59e0b;"><i data-lucide="gift" class="lucide-sm"></i> Campanhas Extra</span><button class="btn-acao btn-enviar" style="background-color: #f59e0b; padding: 8px 14px; font-size: 12px; width: auto;" onclick="adicionarLinhaCampanha()"><i data-lucide="plus"></i> Nova Regra</button></div><div id="container-linhas-campanhas" style="display: flex; flex-direction: column; gap: 12px;">';
    if (campanhasAtivas.length === 0) { htmlCampanhas += '<span style="font-size: 13px; color: var(--cor-secundaria); font-style: italic;">Nenhuma campanha ativa.</span>'; }
    campanhasAtivas.forEach((camp, index) => { let optionsAparelhos = '<option value="todos">Qualquer Aparelho</option>'; for (let ap in mapaEmojis) { let sel = camp.aparelho === ap ? "selected" : ""; optionsAparelhos += `<option value="${ap}" ${sel}>${mapaEmojis[ap]} ${ap.toUpperCase()}</option>`; } let optionsPromotores = '<option value="todos">Toda a Equipe</option>'; for (let pk in bancoUsuarios) { if (bancoUsuarios[pk].cargo === "promotor" && (supId === 'geral' || bancoUsuarios[pk].criadoPor === supId)) { let selP = (camp.promotorAlvo === pk) ? "selected" : ""; optionsPromotores += `<option value="${pk}" ${selP}>👤 ${bancoUsuarios[pk].nome || pk}</option>`; } } htmlCampanhas += `<div class="linha-campanha-dinamica" style="background: var(--bg-container); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 10px;"><div style="display: flex; gap: 10px; flex-wrap: wrap;"><select class="camp-aparelho" style="margin-bottom:0; padding:10px; flex:1;" onchange="atualizarListaPremiumGlobal()">${optionsAparelhos}</select><select class="camp-promotor" style="margin-bottom:0; padding:10px; flex:1;" onchange="atualizarListaPremiumGlobal()">${optionsPromotores}</select><button class="btn-excluir" style="padding: 10px;" onclick="removerLinhaCampanha(${index})"><i data-lucide="trash-2" style="margin:0;"></i></button></div><div style="display: flex; gap: 10px; flex-wrap: wrap;"><div style="display: flex; align-items:center; gap:6px; flex:1;"><span style="font-size:11px;">Qtd Min.</span><input type="number" class="camp-qtd" value="${camp.qtdMinima || 1}" style="margin-bottom:0; padding:10px;" onchange="atualizarListaPremiumGlobal()"></div><div style="display: flex; align-items:center; gap:6px; flex:1;"><span style="font-size:11px;">Bônus(R$)</span><input type="number" class="camp-valor" value="${camp.bonus || 0}" style="margin-bottom:0; padding:10px;" onchange="atualizarListaPremiumGlobal()"></div></div></div>`; }); htmlCampanhas += '</div></div>';

    let htmlMarcas = `<div style="background: var(--bg-item); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color); margin-top: 20px; text-align: left;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;"><span style="font-size: 14px; font-weight: bold; color: #3b82f6;"><i data-lucide="pie-chart" class="lucide-sm"></i> Marcas da Concorrência</span><button class="btn-acao btn-enviar" style="background-color: #3b82f6; padding: 8px 14px; font-size: 12px; width: auto;" onclick="adminAddMarcaConcorrente()"><i data-lucide="plus"></i> Nova Marca</button></div><div style="display: flex; gap: 8px; flex-wrap: wrap;">`;
    marcasConcorrentes.forEach((marca, idx) => { htmlMarcas += `<span style="background: var(--bg-container); border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 8px; color: var(--cor-texto);">${marca} <i data-lucide="x" class="lucide-sm" style="cursor:pointer; color:#ef4444;" onclick="adminRemoverMarcaConcorrente(${idx})"></i></span>`; }); htmlMarcas += `</div></div>`;

    let htmlAparelhos = '<div style="font-size: 15px; font-weight: bold; margin: 25px 0 15px 0; text-align: left;"><i data-lucide="smartphone" class="lucide-sm" style="color:var(--primary);"></i> Enquadramento e Valores por Aparelho:</div><div style="display: flex; flex-direction: column; gap: 15px;">';
    for (let ap in mapaEmojis) {
        let isFoco = premiumSup[ap] ? "checked": ""; let cfg = aparelhosCfg[ap] || { tipo: 'nenhum' };
        if (cfg.tipo === undefined) { if (cfg.comissionado === true || cfg.comissionado === 'true') { cfg.tipo = cfg.valorFixo ? 'fixo' : 'nenhum'; } else { cfg.tipo = 'nenhum'; } }
        let optHtml = `<option value="nenhum" ${cfg.tipo==='nenhum'?'selected':''}>❌ Sem Comissão</option><option value="fixo" ${cfg.tipo==='fixo'?'selected':''}>📌 Valor Fixo (Unitário)</option>`;
        grupos.forEach(g => { optHtml += `<option value="grupo_${g.id}" ${cfg.tipo==='grupo' && cfg.grupoId===g.id?'selected':''}>📁 Categoria: ${g.nome}</option>`; });
        htmlAparelhos += `<div style="background: var(--bg-card); padding: 18px; border-radius: 16px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 12px;"><div style="display:flex; justify-content:space-between; align-items:center;"><div style="font-size: 18px; font-weight: 800; display:flex; align-items:center;"><span style="font-size: 24px; margin-right: 10px;">${mapaEmojis[ap]}</span> ${ap.toUpperCase()}</div><label style="display: flex; align-items: center; gap: 8px; cursor: pointer;"><input type="checkbox" class="check-foco-aparelho" value="${ap}" ${isFoco} onchange="atualizarListaPremiumGlobal()" style="width: 18px; height: 18px; margin:0;"><span style="background: var(--primary); color: white; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight:bold;">Definir como Foco</span></label></div><div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;"><div style="flex:2; min-width:180px;"><span style="font-size:11px; font-weight:bold; color:var(--cor-secundaria); display:block; margin-bottom:4px;">Regra de Pagamento:</span><select class="ap-tipo-regra" data-ap="${ap}" style="margin:0; padding:10px; border-color:var(--primary);" onchange="adminMudarTipoComissaoAp('${ap}', this.value)">${optHtml}</select></div>`;
        if (cfg.tipo === 'fixo') { htmlAparelhos += `<div style="flex:1; min-width:100px;"><span style="font-size:11px; font-weight:bold; color:var(--cor-secundaria); display:block; margin-bottom:4px;">Valor Fixo (R$):</span><input type="number" class="ap-valor-fixo" data-ap="${ap}" value="${cfg.valorFixo || 0}" style="margin:0; padding:10px;" onchange="atualizarListaPremiumGlobal()"></div>`; } 
        else if (cfg.tipo === 'grupo') {
            let grupoEncontrado = grupos.find(x => x.id === cfg.grupoId);
            if (grupoEncontrado) {
                htmlAparelhos += `<div style="width: 100%; display: flex; gap: 10px; overflow-x: auto; padding-top: 10px;">`;
                grupoEncontrado.niveis.forEach((nv, nIdx) => { let valorNivelAp = (cfg.valores && cfg.valores[nIdx]) ? cfg.valores[nIdx] : 0; htmlAparelhos += `<div style="flex:1; min-width:110px; background:var(--bg-container); border:1px solid var(--border-color); padding:10px; border-radius:8px;"><span style="font-size:11px; font-weight:bold; color:var(--primary); display:block;">Paga no Nível ${nIdx + 1}:</span><div style="display:flex; align-items:center; gap:4px; margin-top:4px;">R$ <input type="number" class="ap-valor-grupo-nivel" data-ap="${ap}" data-nidx="${nIdx}" value="${valorNivelAp}" style="margin:0; padding:6px; font-weight:bold;" onchange="atualizarListaPremiumGlobal()"></div></div>`; });
                htmlAparelhos += `</div>`;
            }
        }
        htmlAparelhos += `</div></div>`;
    } htmlAparelhos += '</div>'; container.innerHTML = htmlGamificacao + htmlGrupos + htmlCampanhas + htmlMarcas + htmlAparelhos; loadIcons();
}

function atualizarListaPremiumGlobal() {
    let selSup = document.getElementById('seletor-foco-sup').value; let taxaInputs = document.getElementById('input-taxa-copart'); if (taxaInputs) taxasCoparticipacao[selSup] = Number(taxaInputs.value); let pObj = {}; document.querySelectorAll('.check-foco-aparelho').forEach(cb => { if (cb.checked) pObj[cb.value] = 1; }); aparelhosPremium[selSup] = pObj; if (!valoresComissao[selSup]) valoresComissao[selSup] = {};
    valoresComissao[selSup].gamificacao = { iconeTop1: document.getElementById('gami-icone-top1') ? document.getElementById('gami-icone-top1').value : '👑', iconeMeta: document.getElementById('gami-icone-meta') ? document.getElementById('gami-icone-meta').value : '🎯', iconeFire: document.getElementById('gami-icone-fire') ? document.getElementById('gami-icone-fire').value : '🔥', minFire: document.getElementById('gami-min-fire') ? Number(document.getElementById('gami-min-fire').value) : 5 };
    let campanhas = []; document.querySelectorAll('.linha-campanha-dinamica').forEach(bloco => { campanhas.push({ aparelho: bloco.querySelector('.camp-aparelho').value, promotorAlvo: bloco.querySelector('.camp-promotor').value, qtdMinima: Number(bloco.querySelector('.camp-qtd').value), bonus: Number(bloco.querySelector('.camp-valor').value) }); }); valoresComissao[selSup].campanhasPersonalizadas = campanhas;
    if(!valoresComissao[selSup].aparelhos) valoresComissao[selSup].aparelhos = {}; let cfgAp = valoresComissao[selSup].aparelhos;
    document.querySelectorAll('.ap-tipo-regra').forEach(sel => { let ap = sel.getAttribute('data-ap'); let val = sel.value; if (!cfgAp[ap]) cfgAp[ap] = {}; if (val === 'nenhum') { cfgAp[ap] = { tipo: 'nenhum' }; } else if (val === 'fixo') { let inputFixo = document.querySelector(`.ap-valor-fixo[data-ap="${ap}"]`); cfgAp[ap] = { tipo: 'fixo', valorFixo: inputFixo ? Number(inputFixo.value) : 0 }; } else if (val.startsWith('grupo_')) { let gId = val.replace('grupo_', ''); cfgAp[ap] = { tipo: 'grupo', grupoId: gId, valores: {} }; document.querySelectorAll(`.ap-valor-grupo-nivel[data-ap="${ap}"]`).forEach(inp => { let nIdx = inp.getAttribute('data-nidx'); cfgAp[ap].valores[nIdx] = Number(inp.value); }); } });
    salvarConfiguracoesGlobais(false); 
}

function adminAddGrupo() { let selSup = document.getElementById('seletor-foco-sup').value; if (!valoresComissao[selSup]) valoresComissao[selSup] = {}; if (!valoresComissao[selSup].grupos) valoresComissao[selSup].grupos = []; valoresComissao[selSup].grupos.push({ id: 'g' + Date.now(), nome: 'Nova Categoria', niveis: [{ meta: 1 }] }); renderizarInputsFoco(); atualizarListaPremiumGlobal(); }
function adminRemoverGrupo(gId) { let selSup = document.getElementById('seletor-foco-sup').value; valoresComissao[selSup].grupos = valoresComissao[selSup].grupos.filter(g => g.id !== gId); if(valoresComissao[selSup].aparelhos) { for (let ap in valoresComissao[selSup].aparelhos) { let cfg = valoresComissao[selSup].aparelhos[ap]; if (cfg.tipo === 'grupo' && cfg.grupoId === gId) { cfg.tipo = 'nenhum'; delete cfg.grupoId; } } } renderizarInputsFoco(); atualizarListaPremiumGlobal(); }
function adminAddNivelGrupo(gId) { let selSup = document.getElementById('seletor-foco-sup').value; let g = valoresComissao[selSup].grupos.find(x => x.id === gId); if (g) { g.niveis.push({ meta: 10 }); renderizarInputsFoco(); atualizarListaPremiumGlobal(); } }
function adminRemoverNivelGrupo(gId, nIdx) { let selSup = document.getElementById('seletor-foco-sup').value; let g = valoresComissao[selSup].grupos.find(x => x.id === gId); if (g) { g.niveis.splice(nIdx, 1); renderizarInputsFoco(); atualizarListaPremiumGlobal(); } }
function adminEditGrupoNome(gId, val) { let selSup = document.getElementById('seletor-foco-sup').value; let g = valoresComissao[selSup].grupos.find(x => x.id === gId); if (g) { g.nome = val; atualizarListaPremiumGlobal(); } }
function adminEditGrupoNivel(gId, nIdx, field, val) { let selSup = document.getElementById('seletor-foco-sup').value; let g = valoresComissao[selSup].grupos.find(x => x.id === gId); if (g && g.niveis[nIdx]) { g.niveis[nIdx][field] = Number(val); atualizarListaPremiumGlobal(); } }
function adminMudarTipoComissaoAp(ap, val) { atualizarListaPremiumGlobal(); renderizarInputsFoco(); }
function adicionarLinhaCampanha() { let selSup = document.getElementById('seletor-foco-sup').value; if (!valoresComissao[selSup]) valoresComissao[selSup] = {}; if (!valoresComissao[selSup].campanhasPersonalizadas) valoresComissao[selSup].campanhasPersonalizadas = []; valoresComissao[selSup].campanhasPersonalizadas.push({ aparelho: 'todos', promotorAlvo: 'todos', qtdMinima: 1, bonus: 50 }); renderizarInputsFoco(); atualizarListaPremiumGlobal(); }
function removerLinhaCampanha(index) { let selSup = document.getElementById('seletor-foco-sup').value; if (valoresComissao[selSup] && valoresComissao[selSup].campanhasPersonalizadas) { valoresComissao[selSup].campanhasPersonalizadas.splice(index, 1); renderizarInputsFoco(); atualizarListaPremiumGlobal(); } }

function fecharModalEdicao() { document.getElementById('modal-edicao').classList.remove('ativo'); }

// ==========================================
// MODAIS DE EDIÇÃO DE DADOS (ATUALIZAM O DB IMEDIATAMENTE)
// ==========================================

function adminAbrirModalMeta(login) { 
    let u = bancoUsuarios[login];
    document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="target"></i> Metas por Loja (@${login})`; 
    let lojasVinculadas = u.lojasPermitidas || []; let metasLoja = u.metasPorLoja || {}; 
    let html = `<div style="font-size: 13px; color: var(--cor-secundaria); margin-bottom: 15px;">Defina a meta para cada loja que este promotor atende:</div>`;
    lojasVinculadas.forEach(loja => { let metaAtual = metasLoja[loja] || 0; html += `<div style="margin-bottom: 12px; background: var(--bg-item); padding: 10px; border-radius: 8px;"><label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">${loja}:</label><input type="number" class="input-meta-loja" data-loja="${loja}" value="${metaAtual}" style="width:100%; padding:8px;"></div>`; });
    if(lojasVinculadas.length === 0) { html = "<p style='color:var(--cor-secundaria); font-size:13px;'>Este promotor não tem lojas vinculadas.</p>"; }
    document.getElementById('modal-edicao-corpo').innerHTML = html;
    
    let btn = document.getElementById('btn-salvar-edicao'); 
    btn.onclick = async function() { 
        let novasMetas = {}; document.querySelectorAll('.input-meta-loja').forEach(el => { novasMetas[el.getAttribute('data-loja')] = parseInt(el.value) || 0; });
        bancoUsuarios[login].metasPorLoja = novasMetas;
        try { await supabaseClient.from('usuarios').update({ metas_por_loja: novasMetas }).eq('login', login); mostrarToast("Metas por loja salvas na nuvem!", "sucesso"); fecharModalEdicao(); if (document.getElementById('modal-gerenciar-equipe').classList.contains('ativa')) renderizarModalEquipe(); } catch(e) { console.error(e); mostrarToast("Erro ao salvar meta.", "erro"); }
    }; document.getElementById('modal-edicao').classList.add('ativo'); 
}

function adminAbrirModalSenha(login) { document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="key"></i> Senha (@${login})`; document.getElementById('modal-edicao-corpo').innerHTML = `<input type="text" id="input-edit-senha" value="${bancoUsuarios[login].senha}" placeholder="Nova Senha">`; let btn = document.getElementById('btn-salvar-edicao'); btn.onclick = async function() { let val = document.getElementById('input-edit-senha').value.trim(); if(val) { try { await supabaseClient.from('usuarios').update({ senha: val }).eq('login', login); bancoUsuarios[login].senha = val; mostrarToast("Senha alterada na nuvem!", "sucesso"); fecharModalEdicao(); renderizarAdminUsuarios(); if (document.getElementById('modal-gerenciar-equipe').classList.contains('ativa')) renderizarModalEquipe(); } catch(e) { mostrarToast("Erro ao alterar senha.", "erro"); } } }; document.getElementById('modal-edicao').classList.add('ativo'); loadIcons(); }
function adminAbrirModalNome(login) { document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="edit-3"></i> Nome (@${login})`; document.getElementById('modal-edicao-corpo').innerHTML = `<input type="text" id="input-edit-nome" value="${bancoUsuarios[login].nome || login}" placeholder="Nome Completo">`; let btn = document.getElementById('btn-salvar-edicao'); btn.onclick = async function() { let val = document.getElementById('input-edit-nome').value.trim(); if(val) { try { await supabaseClient.from('usuarios').update({ nome: val }).eq('login', login); bancoUsuarios[login].nome = val; mostrarToast("Nome alterado na nuvem!", "sucesso"); fecharModalEdicao(); renderizarAdminUsuarios(); if (document.getElementById('modal-gerenciar-equipe').classList.contains('ativa')) renderizarModalEquipe(); } catch(e) { mostrarToast("Erro ao alterar nome.", "erro"); } } }; document.getElementById('modal-edicao').classList.add('ativo'); loadIcons(); }
function adminAbrirModalRegiao(login) { document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="globe"></i> Região (@${login})`; document.getElementById('modal-edicao-corpo').innerHTML = `<input type="text" id="input-edit-regiao" value="${bancoUsuarios[login].regiao || ''}" placeholder="Nome da Região">`; let btn = document.getElementById('btn-salvar-edicao'); btn.onclick = async function() { let val = document.getElementById('input-edit-regiao').value.trim().toUpperCase(); if(val) { try { await supabaseClient.from('usuarios').update({ regiao: val }).eq('login', login); bancoUsuarios[login].regiao = val; mostrarToast("Região alterada na nuvem!", "sucesso"); fecharModalEdicao(); renderizarAdminUsuarios(); } catch(e) { mostrarToast("Erro ao alterar.", "erro"); } } }; document.getElementById('modal-edicao').classList.add('ativo'); loadIcons(); }
function adminAbrirModalCapa(loja) { document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="layers"></i> Capa (${loja})`; document.getElementById('modal-edicao-corpo').innerHTML = `<input type="number" id="input-edit-capa" value="${lojasConfig[loja].capa || 0}" placeholder="Capa da Loja">`; let btn = document.getElementById('btn-salvar-edicao'); btn.onclick = async function() { let val = parseInt(document.getElementById('input-edit-capa').value) || 0; try { await supabaseClient.from('lojas_config').update({ capa: val }).eq('nome_loja', loja); lojasConfig[loja].capa = val; mostrarToast("Capa alterada na nuvem!", "sucesso"); fecharModalEdicao(); if (document.getElementById('modal-gerenciar-equipe').classList.contains('ativa')) renderizarModalEquipe(); } catch(e) { mostrarToast("Erro ao alterar.", "erro"); } }; document.getElementById('modal-edicao').classList.add('ativo'); loadIcons(); }
function adminAbrirModalPermissoes(login) { let p = bancoUsuarios[login].permissoes || { vendas: true, acomp: true, estoque_ver: true, estoque_editar: true }; document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="shield"></i> Permissões (@${login})`; let html = `<div style="display:flex; flex-direction:column; gap:10px; font-size: 14px; color: var(--cor-texto);"><label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" id="edit-p-vendas" ${p.vendas ? 'checked':''}> Lançar Vendas</label><label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" id="edit-p-acomp" ${p.acomp ? 'checked':''}> Acompanhamento</label><label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" id="edit-p-est-ver" ${p.estoque_ver ? 'checked':''}> Ver Estoque</label><label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" id="edit-p-est-edit" ${p.estoque_editar ? 'checked':''}> Editar Estoque</label></div>`; document.getElementById('modal-edicao-corpo').innerHTML = html; let btn = document.getElementById('btn-salvar-edicao'); btn.onclick = async function() { bancoUsuarios[login].permissoes = { vendas: document.getElementById('edit-p-vendas').checked, acomp: document.getElementById('edit-p-acomp').checked, estoque_ver: document.getElementById('edit-p-est-ver').checked, estoque_editar: document.getElementById('edit-p-est-edit').checked }; mostrarToast("Permissões atualizadas!", "sucesso"); fecharModalEdicao(); }; document.getElementById('modal-edicao').classList.add('ativo'); loadIcons(); }

function adminAbrirModalLojas(login) { 
    document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="store"></i> Lojas (@${login})`; 
    let permitidas = bancoUsuarios[login].lojasPermitidas || []; let supLojas = getLojasDaRegiao(bancoUsuarios[login].criadoPor || usuarioLogado.id); 
    if (usuarioLogado.id === "master" || usuarioLogado.cargo === "gestor") { supLojas = Object.keys(lojasConfig); } 
    let html = '<div style="display:flex; flex-direction:column; gap:8px; max-height:200px; overflow-y:auto; text-align:left; color: var(--cor-texto); font-size:14px;">'; supLojas.forEach(l => { let checked = permitidas.includes(l) ? 'checked' : ''; html += `<label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" class="edit-loja-check" value="${l}" ${checked}> ${l}</label>`; }); html += '</div>'; 
    if(supLojas.length === 0) html = "<p style='font-size:13px; color:var(--cor-secundaria);'>Nenhuma loja disponível.</p>"; document.getElementById('modal-edicao-corpo').innerHTML = html; 
    let btn = document.getElementById('btn-salvar-edicao'); 
    btn.onclick = async function() { let selecionadas = Array.from(document.querySelectorAll('.edit-loja-check:checked')).map(cb => cb.value); mostrarToast("Atualizando lojas...", "info"); try { const { error } = await supabaseClient.from('usuarios').update({ lojas_permitidas: selecionadas }).eq('login', login); if (error) throw error; bancoUsuarios[login].lojasPermitidas = selecionadas; mostrarToast("Lojas vinculadas na nuvem!", "sucesso"); fecharModalEdicao(); if (document.getElementById('modal-gerenciar-equipe').classList.contains('ativa')) renderizarModalEquipe(); } catch(e) { console.error(e); mostrarToast("Erro ao vincular lojas.", "erro"); } }; document.getElementById('modal-edicao').classList.add('ativo'); loadIcons(); 
}

window.adminAddMarcaConcorrente = function() { document.getElementById('input-nova-marca').value = ""; document.getElementById('modal-nova-marca').classList.add('ativo'); loadIcons(); };
window.fecharModalNovaMarca = function() { document.getElementById('modal-nova-marca').classList.remove('ativo'); };
window.confirmarNovaMarca = function() { let selSup = document.getElementById('seletor-foco-sup').value; let novaMarca = document.getElementById('input-nova-marca').value.trim(); if (!novaMarca) return mostrarToast("Digite o nome da marca.", "alerta"); if (!valoresComissao[selSup]) valoresComissao[selSup] = {}; if (!valoresComissao[selSup].marcas_concorrentes) valoresComissao[selSup].marcas_concorrentes = ["Samsung", "Motorola", "Outros"]; valoresComissao[selSup].marcas_concorrentes.push(novaMarca); if (typeof renderizarInputsFoco === "function") renderizarInputsFoco(); if (typeof atualizarListaPremiumGlobal === "function") atualizarListaPremiumGlobal(); mostrarToast("Marca adicionada na nuvem!", "sucesso"); fecharModalNovaMarca(); };
window.adminRemoverMarcaConcorrente = function(idx) { let selSup = document.getElementById('seletor-foco-sup').value; if (valoresComissao[selSup] && valoresComissao[selSup].marcas_concorrentes) { valoresComissao[selSup].marcas_concorrentes.splice(idx, 1); if (typeof renderizarInputsFoco === "function") renderizarInputsFoco(); if (typeof atualizarListaPremiumGlobal === "function") atualizarListaPremiumGlobal(); mostrarToast("Marca removida da nuvem!", "info"); } };