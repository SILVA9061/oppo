// ==========================================
// app.js - PARTE 1 DE 10
// Variáveis Globais, Interface e Navegação
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
let chartShareGlobal = null;
let supervisorGerenciadoAtual = null; 
let mostruariosGlobais = JSON.parse(localStorage.getItem('mostruariosGlobais')) || {}; 
let tipoHistoricoAtual = 'geral'; 
let mostruarioEmEdicao = null; 
let vendaParaCancelar = null;

if (window.NodeList && !NodeList.prototype.forEach) { NodeList.prototype.forEach = Array.prototype.forEach; }

window.addEventListener('offline', () => { mostrarToast("Conexão instável...", "alerta"); });
window.addEventListener('online', () => { ocultarBotaoReconexao(); });

document.addEventListener('DOMContentLoaded', () => {
    loadIcons();
    if(typeof inicializarAPI === "function") inicializarAPI();
});

function mostrarBotaoReconexao() { let painel = document.getElementById('painel-erro-conexao'); if (painel) painel.style.display = 'block'; loadIcons(); }
function ocultarBotaoReconexao() { let painel = document.getElementById('painel-erro-conexao'); if (painel) painel.style.display = 'none'; }

function mostrarToast(msg, tipo = "sucesso") { 
    const container = document.getElementById("toast-container"); 
    const toast = document.createElement("div"); 
    toast.className = `toast ${tipo}`; 
    let icon = '<i data-lucide="check-circle"></i>'; 
    if(tipo === 'erro') icon = '<i data-lucide="x-circle"></i>'; 
    if(tipo === 'alerta') icon = '<i data-lucide="info"></i>'; 
    toast.innerHTML = icon + ' <span>' + msg.replace(/\n/g, '<br>') + '</span>'; 
    container.appendChild(toast); 
    loadIcons(); 
    if(tipo === 'sucesso') vibrar(100); 
    if(tipo === 'erro') vibrar([50, 50, 50]); 
    setTimeout(() => toast.classList.add("show"), 10); 
    setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 300); }, 3000); 
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

function mudarTela(idTela) { 
    let telas = document.querySelectorAll('.tela'); 
    for(let i=0; i<telas.length; i++) { telas[i].classList.remove('ativa'); } 
    let telaAlvo = document.getElementById(idTela); 
    if(telaAlvo) telaAlvo.classList.add('ativa'); 
    
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
        if(idTela === 'tela-batalha') title = "Catálogo Tático"; 
        let hTitle = document.getElementById('header-title-sub'); if(hTitle) hTitle.innerText = title; 
    } 
    
    const container = document.querySelector('.container'); 
    if (container) { 
        if(idTela === 'tela-dashboard' || idTela === 'tela-admin' || idTela === 'tela-historico') { 
            container.classList.add('container-wide'); 
        } else { 
            container.classList.remove('container-wide'); 
        } 
    } 
    setTimeout(() => loadIcons(), 50); 
}

function navAction(acao, btnEl) { 
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('ativo')); 
    if(btnEl) btnEl.classList.add('ativo'); 
    if(acao === 'venda') irParaVendas(); 
    else if(acao === 'acomp') abrirAcompanhamento(); 
    else if(acao === 'dashboard') abrirDashboard(); 
    else if(acao === 'estoque') abrirEstoque(); 
    else if(acao === 'admin') abrirAdmin(); 
    else if(acao === 'batalha') abrirBatalha(); 
}

function navTo(idTela, btnEl) { 
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('ativo')); 
    if(btnEl) btnEl.classList.add('ativo'); 
    mudarTela(idTela); 
}

function switchTab(tabId, groupClass) { 
    document.querySelectorAll(`.${groupClass}-content`).forEach(t => t.style.display = 'none'); 
    document.querySelectorAll(`.${groupClass}-btn`).forEach(b => b.classList.remove('ativo')); 
    document.getElementById(tabId).style.display = 'block'; 
    if(event && event.currentTarget) event.currentTarget.classList.add('ativo'); 
    loadIcons(); 
}

if(localStorage.getItem('temaEscuro') === 'sim') { document.body.classList.add('dark-mode'); }

if ('serviceWorker' in navigator) { 
    window.addEventListener('load', () => { 
        navigator.serviceWorker.register('./sw.js').catch(err => { console.log('Erro no SW', err); }); 
    }); 
}

async function salvarConfiguracoesGlobais(mostrarAviso = true) {
    if (!navigator.onLine) { mostrarToast("Sem conexão.", "erro"); return; }
    let btnSalvarHeader = document.querySelectorAll('.btn-save-memory');
    btnSalvarHeader.forEach(btn => { 
        btn.innerHTML = '<i data-lucide="loader-2" class="lucide-sm" style="animation: spin 1s linear infinite;"></i> Salvando...'; 
    });

    try {
        let payload = {
            id: 'padrao',
            mapa_emojis: mapaEmojis,
            aparelhos_premium: aparelhosPremium,
            taxas_coparticipacao: taxasCoparticipacao,
            valores_comissao: valoresComissao
        };
        
        const { error } = await supabaseClient.from('configuracoes_globais').upsert([payload]);
        if (error) throw error;

        if (mostrarAviso) mostrarToast("Alterações salvas no banco de dados!", "sucesso");
    } catch (e) {
        console.error(e);
        if (mostrarAviso) mostrarToast("Erro ao salvar.", "erro");
    } finally {
        btnSalvarHeader.forEach(btn => { 
            btn.innerHTML = '<i data-lucide="save" class="lucide-sm"></i> Salvar'; 
        });
        loadIcons();
    }
}
// ==========================================
// SISTEMA DE PULL-TO-REFRESH NATIVO (CORRIGIDO)
// ==========================================
let ptrStartY = 0; let ptrCurrentY = 0; let isPulling = false;

document.addEventListener('touchstart', e => {
    if (window.scrollY === 0 || document.documentElement.scrollTop === 0) { 
        ptrStartY = e.touches[0].clientY; 
        isPulling = true; 
    }
}, { passive: true });

document.addEventListener('touchmove', e => {
    if (!isPulling) return;
    
    let currentY = e.touches[0].clientY;
    let diffY = currentY - ptrStartY;

    // Se estamos no topo da página e puxando para baixo
    if (diffY > 0 && (window.scrollY === 0 || document.documentElement.scrollTop === 0)) {
        
        // A MAGIA ACONTECE AQUI: Bloqueia o navegador de recarregar a página inteira
        if (e.cancelable) e.preventDefault(); 
        
        ptrCurrentY = currentY;
        
        if (diffY > 15) {
            let ptr = document.getElementById('ptr-indicator');
            if (!ptr) {
                ptr = document.createElement('div'); ptr.id = 'ptr-indicator';
                ptr.innerHTML = '<i data-lucide="arrow-down" id="ptr-icon" style="margin:0;"></i>';
                document.body.appendChild(ptr);
                if(typeof lucide !== 'undefined') lucide.createIcons();
            }
            
            // Calcula a puxada para a bolinha descer suavemente
            let pullDist = Math.min((diffY - 15) / 2, 60);
            ptr.style.top = pullDist + 'px';
            
            let icon = document.getElementById('ptr-icon');
            if (icon) {
                if (diffY > 90) { // Bateu a distância certa
                    icon.setAttribute('data-lucide', 'refresh-cw'); 
                } else { 
                    icon.setAttribute('data-lucide', 'arrow-down'); 
                }
                if(typeof lucide !== 'undefined') lucide.createIcons();
            }
        }
    } else {
        isPulling = false;
    }
}, { passive: false }); // O "passive: false" é obrigatório para não deixar a página atualizar

document.addEventListener('touchend', e => {
    if (!isPulling) return;
    isPulling = false;
    
    let diffY = ptrCurrentY - ptrStartY;
    let ptr = document.getElementById('ptr-indicator');
    
    if (ptr && diffY > 90) { // Se puxou o suficiente, solta e atualiza!
        ptr.classList.add('refreshing'); 
        ptr.style.top = '40px'; 
        executarRefreshTelaAtual(); 
        
        setTimeout(() => {
            ptr.style.top = '-60px'; 
            ptr.classList.remove('refreshing');
            setTimeout(() => ptr.remove(), 300);
        }, 1500);
    } else if (ptr) { // Se não puxou o suficiente, só esconde
        ptr.style.top = '-60px'; 
        setTimeout(() => ptr.remove(), 300);
    }
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
// ==========================================
// app.js - PARTE 2 DE 10
// Utilitários Matemáticos, Skeletons e Dias Úteis
// ==========================================

function gerarSkeletonHtml(qtd) {
    let html = "";
    for(let i=0; i<qtd; i++) {
        html += '<div class="skeleton-card"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text" style="width: 80%;"></div></div>';
    }
    return html;
}

function calcularDiasUteisRestantes() {
    let hoje = new Date();
    let ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    let diasUteis = 0;
    
    for (let d = hoje.getDate(); d <= ultimoDia.getDate(); d++) {
        let dataAtual = new Date(hoje.getFullYear(), hoje.getMonth(), d);
        let diaSemana = dataAtual.getDay();
        if (diaSemana !== 0 && diaSemana !== 6) {
            diasUteis++;
        }
    }
    return diasUteis;
}

function extrairChaveAparelho(textoBruto) { 
    let semImei = textoBruto.split("→")[0].split("(")[0].replace(/\[Motivo:.*?\]/g, "").trim().toLowerCase(); 
    let chavesOrdenadas = Object.keys(mapaEmojis).sort((a, b) => b.length - a.length);
    for (let i = 0; i < chavesOrdenadas.length; i++) {
        let chave = chavesOrdenadas[i].toLowerCase();
        if (semImei.includes(chave)) return chave;
    }
    return semImei.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim(); 
}

function ehPremium(textoBruto, supervisorId) { 
    let chave = extrairChaveAparelho(textoBruto); 
    let pSup = aparelhosPremium[supervisorId]; 
    if (!pSup || Object.keys(pSup).length === 0) pSup = aparelhosPremium["geral"] || {}; 
    return (pSup[chave] === 1 || pSup[chave] === true); 
}

// ==========================================
// app.js - PARTE 3 DE 10
// Seleção de Equipes, Lojas e Vendedores
// ==========================================

function irParaVendas() {
    let adminRole = (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master" || usuarioLogado.cargo === "supervisor");
    if (adminRole) { 
        let promotoresDele = Object.keys(bancoUsuarios).filter(k => bancoUsuarios[k].cargo === "promotor" && podeGerenciar(usuarioLogado, k)); 
        if(promotoresDele.length === 0) return mostrarToast("Você não possui promotores vinculados.", "alerta"); 
        montarBotoesPromotores(promotoresDele); 
        mudarTela('tela-promotores'); 
    } else { 
        let lojas = usuarioLogado.lojasPermitidas || []; 
        if(lojas.length === 0) return mostrarToast("Você não possui lojas vinculadas.", "alerta"); 
        if(lojas.length === 1) selecionarLoja(lojas[0]); 
        else { montarBotoesLojas(lojas); mudarTela('tela-lojas'); } 
    }
}

function selecionarPromotor(obj) { 
    let lojas = obj.lojasPermitidas || []; 
    if(lojas.length === 0) { mostrarToast("Nenhuma loja vinculada a este promotor.", "alerta"); return; } 
    if (lojas.length === 1) selecionarLoja(lojas[0]); 
    else { montarBotoesLojas(lojas); mudarTela('tela-lojas'); } 
}

function montarBotoesPromotores(listaChaves) { 
    const div = document.getElementById('botoes-promotores-dinamicos'); 
    div.innerHTML = ""; 
    if (!listaChaves || listaChaves.length === 0) { div.innerHTML = "<div class='mensagem-vazia'>Você não tem promotores na sua equipe.</div>"; return; } 
    listaChaves.sort((a, b) => { let nomeA = (bancoUsuarios[a].nome || a).toLowerCase(); let nomeB = (bancoUsuarios[b].nome || b).toLowerCase(); return nomeA.localeCompare(nomeB); }); 
    listaChaves.forEach(k => { 
        let btn = document.createElement('button'); 
        btn.className = "btn-sistema"; 
        btn.innerHTML = `<i data-lucide="user" class="lucide-sm"></i> Equipe ${bancoUsuarios[k].nome || k}`; 
        btn.onclick = () => selecionarPromotor(bancoUsuarios[k]); div.appendChild(btn); 
    }); 
    loadIcons(); 
}

function montarBotoesLojas(arr) { 
    const div = document.getElementById('botoes-lojas-dinamicos'); 
    div.innerHTML = ""; 
    let arrOrdenado = arr.sort((a, b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})); 
    arrOrdenado.forEach(l => { 
        let btn = document.createElement('button'); 
        btn.className = "btn-sistema"; 
        btn.innerHTML = `<i data-lucide="store" class="lucide-sm"></i> ${l}`; 
        btn.onclick = () => selecionarLoja(l); div.appendChild(btn); 
    }); 
    loadIcons(); 
}

function selecionarLoja(nomeLoja) {
    lojaAtual = nomeLoja; 
    document.getElementById('titulo-loja-ativa').innerText = lojaAtual; 
    document.getElementById('nome-promotor-ativo').innerText = getPromotorDaLoja(nomeLoja); 
    vendedorSelecionadoVenda = null; 
    pendenciasVendaMultipla = []; 
    renderizarVendedoresVenda(); 
    
    const btn = document.getElementById('btn-trocar-loja'); 
    let adminRole = (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master" || usuarioLogado.cargo === "supervisor");
    if (adminRole) { 
        btn.style.display = "flex"; 
        btn.innerHTML = '<i data-lucide="refresh-ccw"></i> Trocar Equipe/Loja'; 
        btn.onclick = () => mudarTela('tela-promotores'); 
    } else if (usuarioLogado.lojasPermitidas && usuarioLogado.lojasPermitidas.length > 1) { 
        btn.style.display = "flex"; 
        btn.innerHTML = '<i data-lucide="refresh-ccw"></i> Trocar de Loja'; 
        btn.onclick = () => mudarTela('tela-lojas'); 
    } else { 
        btn.style.display = "none"; 
    }
    carregarCards(); atualizarTelaConferencia(); mudarTela('tela-venda'); loadIcons();
}

function getPromotorDaLoja(loja) { 
    for (let k in bancoUsuarios) { 
        if (bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].lojasPermitidas && bancoUsuarios[k].lojasPermitidas.includes(loja)) { 
            return bancoUsuarios[k].nome || k; 
        } 
    } 
    return "Promotor Indefinido"; 
}

function renderizarVendedoresVenda() { 
    const div = document.getElementById('grid-vendedores'); div.innerHTML = ""; 
    const listaVendedores = (lojasConfig[lojaAtual] && lojasConfig[lojaAtual].vendedores) ? lojasConfig[lojaAtual].vendedores : []; 
    if(listaVendedores.length === 0) { 
        div.innerHTML = "<span style='color:var(--cor-secundaria); font-size:13px;'>Nenhum vendedor cadastrado nesta loja.</span>"; 
        return; 
    } 
    let vendedoresOrdenados = [...listaVendedores].sort((a, b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})); 
    vendedoresOrdenados.forEach(v => { 
        let isAtivo = (vendedorSelecionadoVenda === v) ? "ativo" : ""; 
        div.innerHTML += `<div class="card-vendedor-venda ${isAtivo}" onclick="toggleVendedorVenda('${v}')">${v}</div>`; 
    }); 
    loadIcons(); 
}

function toggleVendedorVenda(nome) { 
    if(vendedorSelecionadoVenda === nome) vendedorSelecionadoVenda = null; 
    else vendedorSelecionadoVenda = nome; 
    renderizarVendedoresVenda(); 
}
// ==========================================
// app.js - PARTE 4 DE 10
// Carrinho de Vendas, IMEIs e Envio Seguro (Com Trava de Estoque)
// ==========================================

function carregarCards() { 
    const div = document.getElementById("grid-aparelhos"); let html = ""; 
    for (let ap in mapaEmojis) { 
        html += `<div class="item-aparelho"><div class="card-aparelho" onclick="iniciarSelecaoAparelho('${ap}')"><span class="emoji-card">${mapaEmojis[ap]}</span></div><span class="nome-card">${ap.toUpperCase()}</span></div>`; 
    } 
    div.innerHTML = html; 
}

function iniciarSelecaoAparelho(ap) { 
    if (!vendedorSelecionadoVenda) return mostrarToast("Selecione UM vendedor primeiro!", "alerta"); 
    aparelhoEmSelecao = { nome: ap.toUpperCase(), emoji: mapaEmojis[ap] }; 
    document.getElementById('modal-titulo-aparelho').innerHTML = `${aparelhoEmSelecao.emoji} ${aparelhoEmSelecao.nome}`; 
    document.getElementById('input-imei').value = ""; 
    document.getElementById('modal-imei').classList.add('ativo'); 
}

function confirmarImei(comImei) { 
    let imei = comImei ? document.getElementById('input-imei').value.trim() : ""; 
    document.getElementById('modal-imei').classList.remove('ativo'); 
    pendenciasVendaMultipla.push({ vendedor: vendedorSelecionadoVenda, aparelho: aparelhoEmSelecao.nome, emoji: aparelhoEmSelecao.emoji, imei: imei }); 
    aparelhoEmSelecao = null; 
    vendedorSelecionadoVenda = null; 
    renderizarVendedoresVenda(); 
    atualizarTelaConferencia(); 
}

function atualizarTelaConferencia() { 
    const div = document.getElementById("area-conferencia"); 
    const lista = document.getElementById("lista-pendentes"); 
    if (pendenciasVendaMultipla.length > 0) { 
        div.style.display = "block"; 
        lista.innerHTML = pendenciasVendaMultipla.map(p => `<div class="item-pendente" style="display:flex; flex-direction:column; align-items:flex-start; gap:4px;"><div style="font-size:11px; color:var(--cor-secundaria);"><i data-lucide="user" class="lucide-sm"></i> Vend: ${p.vendedor}</div><div style="font-weight:bold;"><i data-lucide="check" class="lucide-sm" style="color: #10b981;"></i> ${p.emoji} ${p.aparelho} ${p.imei ? `(IMEI: ${p.imei})` : ''}</div></div>`).join(""); 
    } else { 
        div.style.display = "none"; lista.innerHTML = ""; 
    } 
    loadIcons(); 
}

function limparPendentes() { pendenciasVendaMultipla = []; atualizarTelaConferencia(); }

async function enviarParaBanco() {
    if (!navigator.onLine) { mostrarToast("Sem internet!", "erro"); mostrarBotaoReconexao(); return; }
    if (pendenciasVendaMultipla.length === 0) return;

    const btn = document.getElementById("btn-enviar-venda");
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" style="animation: spin 2s linear infinite;"></i> Validando Estoque...';
    loadIcons();

    let contagemNecessaria = {};
    pendenciasVendaMultipla.forEach(p => {
        let nomeAparelhoFormatado = `${p.emoji} ${p.aparelho}`;
        contagemNecessaria[nomeAparelhoFormatado] = (contagemNecessaria[nomeAparelhoFormatado] || 0) + 1;
    });

    try {
        let aparelhosSemEstoque = [];
        
        for (let apNome in contagemNecessaria) {
            const { data: estItem } = await supabaseClient
                .from('estoque')
                .select('quantidade')
                .eq('loja', lojaAtual)
                .eq('aparelho', apNome)
                .maybeSingle();
            
            let qtdAtual = estItem ? (estItem.quantidade || 0) : 0;
            let qtdExigida = contagemNecessaria[apNome];

            if (qtdAtual < qtdExigida) {
                aparelhosSemEstoque.push(`• ${apNome} (Estoque: ${qtdAtual} | Vendendo: ${qtdExigida})`);
            }
        }

        if (aparelhosSemEstoque.length > 0) {
            mostrarToast(`ESTOQUE INSUFICIENTE!\nCorrija a auditoria:\n\n${aparelhosSemEstoque.join('\n')}`, "erro");
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="send"></i> Enviar';
            loadIcons();
            return; 
        }

        btn.innerHTML = '<i data-lucide="loader-2" style="animation: spin 2s linear infinite;"></i> Salvando Venda...';
        loadIcons();

        let vendasInsert = [];
        pendenciasVendaMultipla.forEach(p => {
            let nomeAparelhoFormatado = `${p.emoji} ${p.aparelho}`;
            vendasInsert.push({
                promotor_login: usuarioLogado.id,
                loja: lojaAtual,
                vendedor: p.vendedor,
                aparelhos_vendidos: nomeAparelhoFormatado + (p.imei ? ` → IMEI: ${p.imei}` : ""),
                data_venda: new Date().toISOString(),
                status: 'Realizado'
            });
        });

        const { error: errV } = await supabaseClient.from('vendas').insert(vendasInsert);
        if (errV) throw errV;

        for (let apNome in contagemNecessaria) {
             const { data: estItem } = await supabaseClient.from('estoque').select('*').eq('loja', lojaAtual).eq('aparelho', apNome).maybeSingle();
             if (estItem) {
                 let novaQtd = (estItem.quantidade || 0) - contagemNecessaria[apNome];
                 await supabaseClient.from('estoque').update({ quantidade: novaQtd }).eq('id', estItem.id);
             }
        }

        mostrarToast("Vendas registradas no banco!", "sucesso");
        limparPendentes();
    } catch (e) {
        console.error(e);
        mostrarToast("Erro ao registrar venda.", "erro");
        mostrarBotaoReconexao();
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="send"></i> Enviar';
        loadIcons();
    }
}
// ==========================================
// app.js - PARTE 5 DE 10
// Acompanhamento e Listas de Vendas Agrupadas
// ==========================================

function abrirAcompanhamento() { 
    mudarTela('tela-acompanhamento'); 
    if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") { 
        promotorFiltroAtual = "todos"; 
    } else { 
        promotorFiltroAtual = usuarioLogado.id; 
    } 
    subPromotorFiltroAtual = "todos"; 
    renderizarFiltroPromotores(); 
    carregarDadosDoBanco(); 
}

function renderizarFiltroPromotores() { 
    const div = document.getElementById("seletor-promotores"); 
    const divSub = document.getElementById("seletor-sub-promotores"); 
    
    if (usuarioLogado.cargo === "promotor") { 
        div.innerHTML = `<div class="card-promotor-filtro ativo"><i data-lucide="user" class="lucide-sm"></i> ${usuarioLogado.nome} (Suas Lojas)</div>`; 
        if(divSub) divSub.style.display = "none"; 
        loadIcons(); 
        return; 
    } 
    
    let html = `<div class="card-promotor-filtro ${promotorFiltroAtual === 'todos' ? 'ativo' : ''}" onclick="setFiltroPromotor('todos')"><i data-lucide="layout-dashboard" class="lucide-sm"></i> Visão Geral (Todas)</div>`; 
    
    if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") { 
        for (let key in bancoUsuarios) { 
            if (bancoUsuarios[key].cargo === "supervisor") { 
                if(podeGerenciar(usuarioLogado, key)) { 
                    html += `<div class="card-promotor-filtro ${promotorFiltroAtual === key ? 'ativo' : ''}" onclick="setFiltroPromotor('${key}')"><i data-lucide="users" class="lucide-sm"></i> Equipe ${bancoUsuarios[key].nome || key}</div>`; 
                } 
            } 
        } 
        if (promotorFiltroAtual !== 'todos' && bancoUsuarios[promotorFiltroAtual]) { 
            let htmlSub = `<div class="card-promotor-filtro ${subPromotorFiltroAtual === 'todos' ? 'ativo' : ''}" style="${subPromotorFiltroAtual === 'todos' ? 'background-color: var(--primary); border-color: var(--primary); color: white;' : 'background-color: var(--bg-item); color: var(--cor-secundaria); border-color: var(--border-color);'}" onclick="setSubFiltroPromotor('todos')"><i data-lucide="users" class="lucide-sm"></i> Todas (Equipe)</div>`; 
            for (let key in bancoUsuarios) { 
                if (bancoUsuarios[key].cargo === "promotor" && bancoUsuarios[key].criadoPor === promotorFiltroAtual) { 
                    let isAt = subPromotorFiltroAtual === key; 
                    htmlSub += `<div class="card-promotor-filtro ${isAt ? 'ativo' : ''}" style="${isAt ? 'background-color: var(--primary); border-color: var(--primary); color: white;' : 'background-color: var(--bg-item); color: var(--cor-secundaria); border-color: var(--border-color);'}" onclick="setSubFiltroPromotor('${key}')"><i data-lucide="user" class="lucide-sm"></i> ${bancoUsuarios[key].nome || key}</div>`; 
                } 
            } 
            if(divSub) { divSub.innerHTML = htmlSub; divSub.style.display = "flex"; } 
        } else { 
            if(divSub) divSub.style.display = "none"; 
        } 
    } else if (usuarioLogado.cargo === "supervisor") { 
        html = `<div class="card-promotor-filtro ${promotorFiltroAtual === 'todos' ? 'ativo' : ''}" onclick="setFiltroPromotor('todos')"><i data-lucide="layout-dashboard" class="lucide-sm"></i> Visão Geral (Sua Equipe)</div>`; 
        for (let key in bancoUsuarios) { 
            if (bancoUsuarios[key].cargo === "promotor" && bancoUsuarios[key].criadoPor === usuarioLogado.id) { 
                html += `<div class="card-promotor-filtro ${promotorFiltroAtual === key ? 'ativo' : ''}" onclick="setFiltroPromotor('${key}')"><i data-lucide="user" class="lucide-sm"></i> ${bancoUsuarios[key].nome || key}</div>`; 
            } 
        } 
        if(divSub) divSub.style.display = "none"; 
    } 
    div.innerHTML = html; loadIcons(); 
}

function setFiltroPromotor(id) { promotorFiltroAtual = id; subPromotorFiltroAtual = "todos"; renderizarFiltroPromotores(); renderizarListaAcompanhamento(); }
function setSubFiltroPromotor(id) { subPromotorFiltroAtual = id; renderizarFiltroPromotores(); renderizarListaAcompanhamento(); }

function renderizarListaAcompanhamento() {
    const div = document.getElementById("lista-agrupada"); 
    if (dadosAcompanhamentoGlobal.length === 0) return div.innerHTML = `<div class="mensagem-vazia">Nenhuma venda registrada.</div>`;
    
    let promotoresGrupos = {}; 
    dadosAcompanhamentoGlobal.forEach(row => {
        let match = (row["Vendedor"] || "").match(/^\[(.*?)\]\s*(.*)$/); 
        let loja = match ? match[1] : "Outras Lojas"; 
        let vend = match ? match[2] : row["Vendedor"];
        
        let promotoresDaLoja = []; 
        for(let key in bancoUsuarios) { 
            if (bancoUsuarios[key].cargo === "promotor" && bancoUsuarios[key].lojasPermitidas && bancoUsuarios[key].lojasPermitidas.includes(loja)) { 
                promotoresDaLoja.push(key); 
            } 
        }
        if (promotoresDaLoja.length === 0) promotoresDaLoja.push("sem_promotor");
        
        promotoresDaLoja.forEach(pKey => {
            if (usuarioLogado.cargo === "supervisor") { 
                if (pKey === "sem_promotor") return; 
                if (bancoUsuarios[pKey].criadoPor !== usuarioLogado.id) return; 
                if (promotorFiltroAtual !== "todos" && pKey !== promotorFiltroAtual) return; 
            } else if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") { 
                if (promotorFiltroAtual !== "todos") { 
                    if (pKey === "sem_promotor") return; 
                    if (bancoUsuarios[pKey].criadoPor !== promotorFiltroAtual) return; 
                    if (subPromotorFiltroAtual !== "todos" && pKey !== subPromotorFiltroAtual) return; 
                } else { 
                    if (pKey !== "sem_promotor" && !podeGerenciar(usuarioLogado, bancoUsuarios[pKey].criadoPor)) return; 
                } 
            } else if (usuarioLogado.cargo === "promotor") { 
                if (pKey !== usuarioLogado.id) return; 
            }
            
            if (!promotoresGrupos[pKey]) promotoresGrupos[pKey] = { lojas: {} }; 
            if (!promotoresGrupos[pKey].lojas[loja]) promotoresGrupos[pKey].lojas[loja] = []; 
            promotoresGrupos[pKey].lojas[loja].push({ vendedor: vend, aparelhosStr: row["Aparelhos"] || "" });
        });
    });
    
    if (Object.keys(promotoresGrupos).length === 0) return div.innerHTML = `<div class="mensagem-vazia">Nenhuma venda encontrada no filtro.</div>`;
    
    let html = "";
    for (let pKey in promotoresGrupos) {
        let nomePromotor = pKey === "sem_promotor" ? "Lojas Sem Promotor Atribuído" : (bancoUsuarios[pKey].nome || pKey); 
        let totalPromotor = 0; 
        let htmlLojas = "";
        let lojasDoPromotorOrd = Object.keys(promotoresGrupos[pKey].lojas).sort((a,b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));
        
        for (let i=0; i<lojasDoPromotorOrd.length; i++) {
            let loja = lojasDoPromotorOrd[i]; let totalLoja = 0; let consVend = {};
            promotoresGrupos[pKey].lojas[loja].forEach(item => { 
                let arr = item.aparelhosStr.split("||").map(x => x.trim()).filter(x => x !== ""); 
                totalLoja += arr.length; 
                if (!consVend[item.vendedor]) consVend[item.vendedor] = { nome: item.vendedor, qtd: 0, ap: [] }; 
                consVend[item.vendedor].qtd += arr.length; 
                consVend[item.vendedor].ap.push(...arr); 
            });
            
            totalPromotor += totalLoja;
            let vendOrd = Object.values(consVend).sort((a, b) => b.qtd - a.qtd); 
            let htmlVend = ""; let rank = 1; let ult = -1;
            
            vendOrd.forEach((v) => { 
                if (ult !== -1 && v.qtd < ult) rank++; ult = v.qtd; 
                let cRank = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-outros'; 
                
                let listaAp = v.ap.map(ap => {
                    let imeiMatch = ap.match(/IMEI:\s*(.*?)(\)|$)/);
                    let imei = imeiMatch ? imeiMatch[1].trim() : "";
                    let textoSemImei = ap.replace(/\(IMEI:.*?\)/g, "").replace(/IMEI:.*/g, "").trim();
                    let emoji = textoSemImei.substring(0, 2).trim();
                    let modelo = textoSemImei.substring(2).trim();
                    return `<div class="item-vendido"><div class="item-vendido-topo"><div class="emoji-badge">${emoji}</div><span class="aparelho-nome">${modelo}</span></div>${imei ? `<span class="imei-texto">IMEI: ${imei}</span>` : ''}</div>`;
                }).join(""); 

                htmlVend += `<div class="vendedor-bloco"><div class="vendedor-cabecalho"><div><span class="badge-rank ${cRank}">${rank}º</span> <strong style="color:var(--cor-texto);">${v.nome}:</strong></div><span class="vendedor-quantidade">${v.qtd} un</span></div><div class="vendedor-itens-box">${listaAp}</div></div>`; 
            });
            htmlLojas += `<div class="loja-card-acompanhamento"><div class="loja-titulo"><span><i data-lucide="store" class="lucide-sm"></i> ${loja}</span><span class="loja-badge-total">Total: ${totalLoja} un</span></div>${htmlVend}</div>`;
        }
        html += `<div style="margin-bottom: 25px; border-radius: 16px; box-shadow: 0 4px 10px var(--shadow-color); overflow: hidden; text-align: left; border: 1px solid var(--border-color);"><div style="background: ${pKey === 'sem_promotor' ? '#64748b' : 'var(--primary-gradiente)'}; color: white; padding: 16px 20px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;"><span style="font-size: 15px; display:flex; align-items:center;"><i data-lucide="user"></i> Promotor: ${nomePromotor}</span><span style="background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 20px; font-size: 13px;">Total: ${totalPromotor} un</span></div><div style="background: var(--bg-card); padding: 20px 15px 5px 15px; border-top: none; border-radius: 0 0 16px 16px;">${htmlLojas}</div></div>`;
    } 
    div.innerHTML = html; loadIcons();
}

async function carregarDadosDoBanco() {
    const div = document.getElementById("lista-agrupada");
    let btn = document.getElementById("btn-atualizar-acomp");
    if(btn) btn.innerHTML = '<i data-lucide="loader-2" class="lucide-sm" style="animation: spin 2s linear infinite;"></i> Atualizando...';
    loadIcons();
    if(div) div.innerHTML = gerarSkeletonHtml(5);

    try {
        const { data, error } = await supabaseClient.from('vendas')
            .select('*')
            .neq('status', 'Cancelado')
            .neq('status', 'Auditoria') // TRAVA: Ignora registros de estoque
            .order('data_venda', { ascending: false });
            
        if (error) throw error;

        dadosAcompanhamentoGlobal = data
            // TRAVA BLINDADA: Filtra qualquer coisa que contenha [AUDITORIA]
            .filter(row => !(row.aparelhos_vendidos || "").toUpperCase().includes('[AUDITORIA]'))
            .map(row => ({
                Vendedor: `[${row.loja}] ${row.vendedor}`,
                Aparelhos: row.aparelhos_vendidos,
                Data: row.data_venda,
                Status: row.status || "Realizado"
            }));
            
        if (typeof renderizarListaAcompanhamento === "function") renderizarListaAcompanhamento();
    } catch (err) {
        console.error(err);
        if(div) div.innerHTML = `<p style="color:red; text-align:center;">Erro ao carregar.</p>`;
        mostrarBotaoReconexao();
    } finally {
        if(btn) btn.innerHTML = '<i data-lucide="refresh-cw"></i> Atualizar';
        loadIcons();
    }
}
// ==========================================
// app.js - PARTE 6 DE 10
// Histórico, Filtros de Data, Estorno e Acordeão
// ==========================================

function abrirHistorico(tipo) { 
    tipoHistoricoAtual = tipo; 
    mudarTela('tela-historico'); 
    
    let selSup = document.getElementById('filtro-sup-historico'); 
    if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") { 
        document.getElementById('container-filtro-sup-historico').style.display = "block"; 
        let htmlOp = '<option value="todos">Todas as Regiões</option>'; 
        for(let k in bancoUsuarios) { 
            if(bancoUsuarios[k].cargo === "supervisor" && podeGerenciar(usuarioLogado, k)) { 
                htmlOp += `<option value="${k}">Equipe: ${bancoUsuarios[k].nome || k}</option>`; 
            } 
        } 
        selSup.innerHTML = htmlOp; 
    } else { 
        document.getElementById('container-filtro-sup-historico').style.display = "none"; 
    } 
    
    mudouSupHistorico(); 
    carregarHistoricoDoBanco(); 
}

function mudouSupHistorico() { 
    let selSup = document.getElementById('filtro-sup-historico').value; 
    let selProm = document.getElementById('filtro-promotor-historico'); 
    let htmlOp = '<option value="todos">Todos da Equipe</option>'; 
    let supAlvo = (usuarioLogado.cargo === "supervisor") ? usuarioLogado.id : selSup; 
    
    if (supAlvo && supAlvo !== "todos") { 
        for(let k in bancoUsuarios) { 
            if(bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].criadoPor === supAlvo) { 
                htmlOp += `<option value="${k}">${bancoUsuarios[k].nome || k}</option>`; 
            } 
        } 
    } 
    selProm.innerHTML = htmlOp; 
    aplicarFiltroHistorico(); 
}

async function carregarHistoricoDoBanco(forcarNuvem = false) {
    const div = document.getElementById("lista-historico");
    if (!forcarNuvem && dadosHistoricoGlobal.length > 0) { renderizarListaHistorico(); return; }
    div.innerHTML = gerarSkeletonHtml(5);
    loadIcons();

    try {
        const { data, error } = await supabaseClient.from('vendas').select('*').order('data_venda', { ascending: false }).limit(500);
        if (error) throw error;

        dadosHistoricoGlobal = data.map(row => ({
            id_banco: row.id, 
            Tipo: row.status === 'Auditoria' ? 'Auditoria' : 'Venda',
            Status: row.status || "Realizado",
            Data: row.data_venda,
            Promotor: row.promotor_login,
            loja_banco: row.loja,
            aparelhos_banco: row.aparelhos_vendidos,
            Detalhe: row.status === 'Auditoria' ? row.aparelhos_vendidos : `Venda: ${row.aparelhos_vendidos} | [${row.loja}] ${row.vendedor}`
        }));
        renderizarListaHistorico();
    } catch (e) {
        console.error(e);
        div.innerHTML = "Erro ao carregar histórico.";
        mostrarBotaoReconexao();
    }
}

async function executarCancelamentoVenda() {
    if (!vendaParaCancelar) return;
    
    let venda = dadosHistoricoGlobal[vendaParaCancelar.index]; 
    if (!venda.id_banco) return mostrarToast("Erro: ID da venda não encontrado.", "erro");

    mostrarToast("Iniciando estorno...", "info");

    try {
        const { error: errUpdate } = await supabaseClient.from('vendas').update({ status: 'Cancelado' }).eq('id', venda.id_banco);
        if (errUpdate) throw errUpdate;

        let loja = venda.loja_banco; 
        let listaAparelhos = venda.aparelhos_banco.split("||").map(x => x.trim()).filter(x => x !== "");
        
        let contagemEstoqueDevolucao = {};
        listaAparelhos.forEach(ap => {
            let nomeLimpo = ap.split(" →")[0].trim();
            contagemEstoqueDevolucao[nomeLimpo] = (contagemEstoqueDevolucao[nomeLimpo] || 0) + 1;
        });

        for (let apNome in contagemEstoqueDevolucao) {
            const { data: estItem } = await supabaseClient.from('estoque').select('*').eq('loja', loja).eq('aparelho', apNome).maybeSingle();
            if (estItem) {
                let novaQtd = (estItem.quantidade || 0) + contagemEstoqueDevolucao[apNome];
                await supabaseClient.from('estoque').update({ quantidade: novaQtd }).eq('id', estItem.id);
            }
        }
        
        mostrarToast("Venda cancelada e estoque estornado com sucesso!", "sucesso");
        carregarHistoricoDoBanco(true); 
        
    } catch (e) {
        console.error("Erro no cancelamento:", e);
        mostrarToast("Erro ao estornar a venda.", "erro");
    } finally {
        vendaParaCancelar = null;
    }
}

async function executarDesfazerCancelamento(indexHist) {
    let venda = dadosHistoricoGlobal[indexHist]; 
    if (!venda || !venda.id_banco) return mostrarToast("Erro: ID da venda não encontrado.", "erro");

    mostrarToast("Revertendo estorno...", "info");

    try {
        const { error: errUpdate } = await supabaseClient.from('vendas').update({ status: 'Realizado' }).eq('id', venda.id_banco);
        if (errUpdate) throw errUpdate;

        let loja = venda.loja_banco; 
        let listaAparelhos = venda.aparelhos_banco.split("||").map(x => x.trim()).filter(x => x !== "");
        
        let contagemEstoqueRetirada = {};
        listaAparelhos.forEach(ap => {
            let nomeLimpo = ap.split(" →")[0].trim();
            contagemEstoqueRetirada[nomeLimpo] = (contagemEstoqueRetirada[nomeLimpo] || 0) + 1;
        });

        for (let apNome in contagemEstoqueRetirada) {
            const { data: estItem } = await supabaseClient.from('estoque').select('*').eq('loja', loja).eq('aparelho', apNome).maybeSingle();
            if (estItem) {
                let novaQtd = (estItem.quantidade || 0) - contagemEstoqueRetirada[apNome];
                if(novaQtd < 0) novaQtd = 0;
                await supabaseClient.from('estoque').update({ quantidade: novaQtd }).eq('id', estItem.id);
            }
        }
        
        mostrarToast("Estorno revertido com sucesso!", "sucesso");
        carregarHistoricoDoBanco(true); 
    } catch (e) {
        console.error("Erro ao desfazer:", e);
        mostrarToast("Erro ao desfazer o estorno.", "erro");
    }
}

function abrirModalCancelarVenda(indexHist, pLogin) { 
    vendaParaCancelar = { index: indexHist, login: pLogin }; 
    let inputSenha = document.getElementById('senha-confirmacao-cancelamento'); 
    if (inputSenha) inputSenha.value = ""; 
    let modal = document.getElementById('modal-cancelar-venda'); 
    if (modal) modal.classList.add('ativo'); 
}

function fecharModalCancelarVenda() { 
    let modal = document.getElementById('modal-cancelar-venda'); 
    if (modal) modal.classList.remove('ativo'); 
    vendaParaCancelar = null; 
}

function validarECancelarVenda() { 
    let inputSenha = document.getElementById('senha-confirmacao-cancelamento'); 
    let senhaDigitada = inputSenha ? inputSenha.value.trim() : ""; 
    if (senhaDigitada !== usuarioLogado.senha && usuarioLogado.id !== "master") { 
        return mostrarToast("Senha incorreta. Estorno negado.", "erro"); 
    } 
    if(inputSenha) inputSenha.value = ""; 
    let modal = document.getElementById('modal-cancelar-venda'); 
    if (modal) modal.classList.remove('ativo'); 
    executarCancelamentoVenda(); 
}

let limiteHistorico = 50; 
function aplicarFiltroHistorico() { limiteHistorico = 50; renderizarListaHistorico(); }

// FUNÇÃO DO ACORDEÃO (ABRIR E FECHAR CARD)
window.toggleAcordeaoHistorico = function(btn, id) {
    let content = document.getElementById(id);
    if(content.classList.contains('expandido')) {
        content.classList.remove('expandido'); btn.classList.remove('aberto');
    } else {
        content.classList.add('expandido'); btn.classList.add('aberto');
    }
};

function renderizarListaHistorico() { 
    const div = document.getElementById("lista-historico"); 
    let dataInicio = document.getElementById('filtro-data-inicio-historico') ? document.getElementById('filtro-data-inicio-historico').value : ""; 
    let dataFim = document.getElementById('filtro-data-fim-historico') ? document.getElementById('filtro-data-fim-historico').value : ""; 
    let supAlvo = (usuarioLogado.cargo === "supervisor") ? usuarioLogado.id : document.getElementById('filtro-sup-historico').value; 
    let promAlvo = document.getElementById('filtro-promotor-historico').value; 
    let ocultarCancelados = document.getElementById('filtro-ocultar-cancelados') ? document.getElementById('filtro-ocultar-cancelados').checked : false; 
    let apenasCancelados = document.getElementById('filtro-apenas-cancelados') ? document.getElementById('filtro-apenas-cancelados').checked : false; 
    
    if(apenasCancelados) { 
        if(document.getElementById('filtro-ocultar-cancelados')) document.getElementById('filtro-ocultar-cancelados').checked = false; 
        ocultarCancelados = false; 
    } 
    
    let filtrados = []; 
    dadosHistoricoGlobal.forEach((row, index) => { 
        let isCancelado = row.Status === "Cancelado"; 
        if (ocultarCancelados && isCancelado) return; 
        if (apenasCancelados && row.Tipo !== 'Auditoria' && !isCancelado) return; 
        
        let isEstoque = row.Tipo === 'Auditoria'; 
        if (tipoHistoricoAtual === 'estoque' && !isEstoque) return; 
        if (tipoHistoricoAtual === 'geral' && isEstoque) return; 
        
        if (usuarioLogado.id !== "master" && row.Promotor !== usuarioLogado.id) { 
            if (!podeGerenciar(usuarioLogado, row.Promotor)) return; 
        } 
        
        let pObj = bancoUsuarios[row.Promotor]; 
        if (supAlvo && supAlvo !== "todos") { 
            if (row.Promotor !== supAlvo && (!pObj || pObj.criadoPor !== supAlvo)) return; 
        } 
        if (promAlvo && promAlvo !== "todos" && row.Promotor !== promAlvo) return; 
        
        if(dataInicio && row.Data) { 
            let dt = new Date(dataInicio + "T00:00:00"); 
            if(new Date(row.Data) < dt) return; 
        } 
        if(dataFim && row.Data) { 
            let dt = new Date(dataFim + "T23:59:59"); 
            if(new Date(row.Data) > dt) return; 
        } 
        
        filtrados.push({row: row, originalIndex: index, pLogin: row.Promotor, isEstoque: isEstoque, detalhe: row.Detalhe, isCancelado: isCancelado, dataLinha: row.Data}); 
    }); 
    
    let filtrados_total = filtrados.length; 
    filtrados = filtrados.slice(0, limiteHistorico); 
    
    if(filtrados_total === 0) { 
        div.innerHTML = "<div class='mensagem-vazia'>Nenhuma ação encontrada.</div>"; 
        return; 
    } 
    
    let html = ""; 
    filtrados.forEach(item => { 
        let dataFormatada = "Sem Data"; 
        if (item.dataLinha) { 
            let d = new Date(item.dataLinha); 
            if(!isNaN(d)) dataFormatada = d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR').slice(0, 5); 
        } 
        
        let nomePromotor = bancoUsuarios[item.pLogin] ? bancoUsuarios[item.pLogin].nome : item.pLogin; 
        if (!nomePromotor) nomePromotor = "Usuário Desconhecido"; 
        
        let opacidade = item.isCancelado ? "opacity: 0.7; filter: grayscale(0.8);" : ""; 
        let bgCard = item.isCancelado ? "background: var(--bg-fundo);" : "background: var(--bg-card);"; 
        let bordaCard = item.isCancelado ? "border: 1px dashed #ef4444;" : "border: 1px solid var(--border-color);"; 
        let estiloTexto = item.isCancelado ? "text-decoration: line-through; color: var(--cor-secundaria);" : "color: var(--cor-texto);"; 
        let badgeCancelado = item.isCancelado ? `<div style="background: #fee2e2; color: #ef4444; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; margin-bottom: 8px; display: inline-block;">ESTORNADO</div>` : ""; 
        let icone = item.isEstoque ? '<i data-lucide="package" style="color:#f59e0b;" class="lucide-sm"></i>' : '<i data-lucide="shopping-bag" style="color:#10b981;" class="lucide-sm"></i>'; 
        if (item.isCancelado) icone = '<i data-lucide="slash" style="color: #ef4444;" class="lucide-sm"></i>'; 
        
        // CÁLCULO INTELIGENTE DO ACORDEÃO (SEPARA TÍTULO E DETALHES IMEIs)
        let textoBase = item.detalhe.replace(/\[CANCELADO\]/ig, '').trim();
        let tituloResumo = textoBase; let textoEscondido = "";
        
        if (textoBase.includes('→')) {
            let partes = textoBase.split('→'); tituloResumo = partes[0].replace('Venda:', '').trim(); textoEscondido = "→ " + partes.slice(1).join('→').trim();
        } else if (textoBase.includes('|')) {
            let partes = textoBase.split('|'); tituloResumo = partes[0].replace('Venda:', '').trim(); textoEscondido = "| " + partes.slice(1).join('|').trim();
        } else if (textoBase.includes(': De ')) {
            let partes = textoBase.split(': De '); tituloResumo = partes[0].trim(); textoEscondido = "De " + partes[1].trim();
        }

        let htmlCorpoVenda = "";
        if (textoEscondido !== "") {
            htmlCorpoVenda = `
                <div style="display: flex; flex-direction: column; width: 100%;">
                    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; width: 100%;">
                        <div style="display:flex; align-items:flex-start; gap:8px;">${icone} <strong style="font-size:14px;">${tituloResumo}</strong></div>
                        <button class="btn-expandir-historico" onclick="toggleAcordeaoHistorico(this, 'acordeao-${item.originalIndex}')" style="background:var(--bg-fundo); border:1px solid var(--border-color); color:var(--cor-secundaria); padding:4px 8px; border-radius:6px; cursor:pointer;">
                            <i data-lucide="chevron-down" style="margin:0; transition: transform 0.3s; width:14px; height:14px;"></i>
                        </button>
                    </div>
                    <div id="acordeao-${item.originalIndex}" class="historico-detalhes">
                        <div style="padding: 12px; background: var(--bg-fundo); border-radius: 8px; margin-top: 8px; font-size: 12px; font-weight: 500; color: var(--cor-secundaria); word-break: break-word; border: 1px solid var(--border-color);">
                            ${textoEscondido}
                        </div>
                    </div>
                </div>`;
        } else {
            htmlCorpoVenda = `<div style="display: flex; align-items: flex-start; gap: 8px;">${icone} <span style="word-break: break-word; font-weight:bold;">${textoBase}</span></div>`;
        }
        
        let btnAcao = ""; 
        let adminRole = (usuarioLogado.cargo === "supervisor" || usuarioLogado.cargo === "regional" || usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master"); 
        
        if (tipoHistoricoAtual === 'geral' && adminRole && !item.isEstoque) { 
            if (!item.isCancelado) { 
                btnAcao = `<button onclick="abrirModalCancelarVenda(${item.originalIndex}, '${item.pLogin}')" style="background: transparent; color: #ef4444; border: 1px solid rgba(239,68,68,0.3); padding: 10px 15px; border-radius: 8px; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 5px;"><i data-lucide="x-circle" class="lucide-sm"></i> Estornar</button>`; 
            } else { 
                btnAcao = `<button onclick="executarDesfazerCancelamento(${item.originalIndex})" style="background: var(--bg-item); color: #10b981; border: 1px solid rgba(16,185,129,0.3); padding: 10px 15px; border-radius: 8px; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 5px;"><i data-lucide="rotate-ccw" class="lucide-sm"></i> Desfazer</button>`; 
            } 
        } 
        
        html += `
        <div class="swipe-container" style="${opacidade} ${bordaCard}">
            <div class="swipe-actions">
                ${btnAcao}
            </div>
            <div class="swipe-content" style="${bgCard} padding: 16px; display: flex; flex-direction: column; gap: 8px;">
                ${badgeCancelado}
                
                <div style="display: flex; flex-direction: column; gap: 4px; text-align: left;">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <span style="font-size: 11px; font-weight: bold; color: var(--cor-secundaria);">${dataFormatada}</span>
                    </div>
                    <div style="font-size: 13px; font-weight: bold; color: var(--primary); display: flex; align-items: center; gap: 4px; word-break: break-word; overflow: hidden;">
                        <i data-lucide="user" class="lucide-sm" style="flex-shrink: 0;"></i> 
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;">${nomePromotor}</span>
                    </div>
                </div>

                <!-- CORPO DA VENDA (COM ACORDEÃO) -->
                <div style="font-size: 14px; ${estiloTexto} text-align: left; display: flex;">
                    ${htmlCorpoVenda}
                </div>

                <div style="font-size: 10px; color: var(--cor-secundaria); text-align: center; margin-top: 5px; opacity: 0.6; display: ${btnAcao !== '' ? 'block' : 'none'};" class="texto-deslize-mobile">
                    <i data-lucide="chevrons-left" class="lucide-sm"></i> Deslize para a esquerda para ações
                </div>
            </div>
        </div>`;
    }); 
    
    div.innerHTML = html; 
    
    document.querySelectorAll('.swipe-content').forEach(el => {
        let startX = 0;
        el.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, {passive: true});
        el.addEventListener('touchmove', e => {
            let diff = startX - e.touches[0].clientX;
            // Bloqueia o deslize horizontal se o botão do acordeão foi clicado para não estornar sem querer
            if (e.target.closest('.btn-expandir-historico') || e.target.closest('.historico-detalhes')) return;
            if (diff > 40) { el.style.transform = 'translateX(-130px)'; } 
            else if (diff < -40) { el.style.transform = 'translateX(0)'; } 
        }, {passive: true});
    });

    loadIcons(); 
    if (filtrados_total > limiteHistorico) { 
        div.innerHTML += `<button class="btn-sistema" style="margin-top: 15px; background: var(--bg-item); color: var(--primary); border: 1px solid var(--primary);" onclick="limiteHistorico += 50; renderizarListaHistorico();">Carregar mais históricos...</button>`; 
    } 
}

function setFiltroDataRapidoDash(tipo) {
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
    
    if (tipo === 'hoje') {
        let strHoje = formatarData(hoje);
        inputInicio.value = strHoje;
        inputFim.value = strHoje;
    } else if (tipo === 'ontem') {
        let ontem = new Date();
        ontem.setDate(hoje.getDate() - 1);
        let strOntem = formatarData(ontem);
        inputInicio.value = strOntem;
        inputFim.value = strOntem;
    } else if (tipo === 'semana') {
        let inicioSemana = new Date();
        inicioSemana.setDate(hoje.getDate() - 7);
        inputInicio.value = formatarData(inicioSemana);
        inputFim.value = formatarData(hoje);
    } else if (tipo === 'mes') {
        let inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        inputInicio.value = formatarData(inicioMes);
        inputFim.value = formatarData(hoje);
    } else if (tipo === 'limpar') {
        inputInicio.value = "";
        inputFim.value = "";
    }
    
    abrirDashboard();
    carregarGraficosShare();
}
// ==========================================
// app.js - PARTE 7 DE 10
// Gestão de Estoque, Mostruários e Rupturas
// ==========================================

function fecharModalConfirmMostruario() { document.getElementById('modal-confirm-mostruario').classList.remove('ativo'); mostruarioEmEdicao = null; }
function fecharModalPromptMostruario() { document.getElementById('modal-prompt-mostruario').classList.remove('ativo'); mostruarioEmEdicao = null; }

function executarRemoverMostruario() { 
    if (!mostruarioEmEdicao) return; 
    delete mostruariosGlobais[mostruarioEmEdicao.key]; 
    localStorage.setItem('mostruariosGlobais', JSON.stringify(mostruariosGlobais)); 
    renderizarListaEstoque(); 
    mostrarToast("Status removido.", "info"); 
    fecharModalConfirmMostruario(); 
}

function executarAddMostruario() { 
    if (!mostruarioEmEdicao) return; 
    let obs = document.getElementById('input-obs-mostruario').value; 
    mostruariosGlobais[mostruarioEmEdicao.key] = obs.trim() !== "" ? obs.trim() : true; 
    localStorage.setItem('mostruariosGlobais', JSON.stringify(mostruariosGlobais)); 
    renderizarListaEstoque(); 
    mostrarToast("Marcado como mostruário!", "sucesso"); 
    fecharModalPromptMostruario(); 
}

function toggleMostruario(loja, ap) { 
    let k = `${loja}_${ap}`; 
    mostruarioEmEdicao = { loja: loja, ap: ap, key: k }; 
    if (mostruariosGlobais[k]) { 
        document.getElementById('texto-confirm-mostruario').innerHTML = `Deseja DESMARCAR o <b>${ap}</b> como mostruário na loja <b>${loja}</b>?`; 
        document.getElementById('modal-confirm-mostruario').classList.add('ativo'); 
    } else { 
        document.getElementById('texto-prompt-mostruario').innerHTML = `Marcando <b>${ap}</b> como MOSTRUÁRIO na loja <b>${loja}</b>.`; 
        document.getElementById('input-obs-mostruario').value = ""; 
        document.getElementById('modal-prompt-mostruario').classList.add('ativo'); 
    } 
}

function abrirEstoque() { 
    mudarTela('tela-estoque'); 
    promotorEstoqueFiltroAtual = (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") ? "todos" : usuarioLogado.id; 
    renderizarFiltroPromotoresEstoque(); 
    carregarEstoqueDoBanco(); 
}

async function carregarEstoqueDoBanco() {
    let btn = document.getElementById("btn-atualizar-estoque");
    if(btn) btn.innerHTML = '<i data-lucide="loader-2" style="animation: spin 2s linear infinite;"></i> Atualizando...';
    loadIcons();
    document.getElementById("lista-estoque-agrupada").innerHTML = gerarSkeletonHtml(4);

    try {
        const { data, error } = await supabaseClient.from('estoque').select('*');
        if (error) throw error;

        dadosEstoqueGlobal = data.map(row => ({
            Loja: row.loja,
            Aparelho: row.aparelho,
            Quantidade: row.quantidade
        }));
        renderizarListaEstoque();
    } catch (err) {
        console.error(err);
        document.getElementById("lista-estoque-agrupada").innerHTML = `<p style="color:red;">Erro ao carregar estoque.</p>`;
        mostrarBotaoReconexao();
    } finally {
        if(btn) btn.innerHTML = '<i data-lucide="refresh-cw"></i> Atualizar Estoque';
        loadIcons();
    }
}

function renderizarFiltroPromotoresEstoque() { 
    const div = document.getElementById("seletor-promotores-estoque"); 
    if (usuarioLogado.cargo === "promotor") { 
        div.innerHTML = `<div class="card-promotor-filtro ativo"><i data-lucide="user" class="lucide-sm"></i> ${usuarioLogado.nome}</div>`; 
        loadIcons(); return; 
    } 
    let html = `<div class="card-promotor-filtro ${promotorEstoqueFiltroAtual === 'todos' ? 'ativo' : ''}" onclick="setFiltroPromotorEstoque('todos')"><i data-lucide="layout-dashboard" class="lucide-sm"></i> Visão Geral (Todas)</div>`; 
    if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") { 
        for (let key in bancoUsuarios) { 
            if (bancoUsuarios[key].cargo === "supervisor") { 
                if (podeGerenciar(usuarioLogado, key)) { 
                    html += `<div class="card-promotor-filtro ${promotorEstoqueFiltroAtual === key ? 'ativo' : ''}" onclick="setFiltroPromotorEstoque('${key}')"><i data-lucide="users" class="lucide-sm"></i> Equipe ${bancoUsuarios[key].nome || key}</div>`; 
                } 
            } 
        } 
    } else if (usuarioLogado.cargo === "supervisor") { 
        for (let key in bancoUsuarios) { 
            if (bancoUsuarios[key].cargo === "promotor" && bancoUsuarios[key].criadoPor === usuarioLogado.id) { 
                html += `<div class="card-promotor-filtro ${promotorEstoqueFiltroAtual === key ? 'ativo' : ''}" onclick="setFiltroPromotorEstoque('${key}')"><i data-lucide="user" class="lucide-sm"></i> ${bancoUsuarios[key].nome || key}</div>`; 
            } 
        } 
    } 
    div.innerHTML = html; loadIcons(); 
}

function setFiltroPromotorEstoque(id) { 
    promotorEstoqueFiltroAtual = id; 
    renderizarFiltroPromotoresEstoque(); 
    renderizarListaEstoque(); 
}

function renderizarListaEstoque() { 
    pendenciasEstoque = {}; 
    document.getElementById("area-conferencia-estoque").style.display = "none"; 
    let lojasEstoque = {}; 
    let lojasAtivas = []; 
    let mostrarZerados = document.getElementById('check-mostrar-zerados').checked; 
    let termoBusca = document.getElementById('busca-estoque') ? document.getElementById('busca-estoque').value.toLowerCase() : ""; 
    
    if (promotorEstoqueFiltroAtual === "todos" && (usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master")) { 
        lojasAtivas = Object.keys(lojasConfig); 
    } else if (promotorEstoqueFiltroAtual === "todos" && usuarioLogado.cargo === "regional") { 
        for (let k in bancoUsuarios) { 
            if (bancoUsuarios[k].cargo === "promotor" && podeGerenciar(usuarioLogado, k)) { 
                bancoUsuarios[k].lojasPermitidas.forEach(l => { if(!lojasAtivas.includes(l)) lojasAtivas.push(l); }); 
            } 
        } 
    } else if (promotorEstoqueFiltroAtual === "todos" && usuarioLogado.cargo === "supervisor") { 
        for (let k in bancoUsuarios) { 
            if (bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].criadoPor === usuarioLogado.id) { 
                bancoUsuarios[k].lojasPermitidas.forEach(l => { if(!lojasAtivas.includes(l)) lojasAtivas.push(l); }); 
            } 
        } 
    } else { 
        let fObj = bancoUsuarios[promotorEstoqueFiltroAtual]; 
        if (fObj && fObj.cargo === "supervisor") { 
            for (let k in bancoUsuarios) { 
                if (bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].criadoPor === promotorEstoqueFiltroAtual) { 
                    bancoUsuarios[k].lojasPermitidas.forEach(l => { if(!lojasAtivas.includes(l)) lojasAtivas.push(l); }); 
                } 
            } 
        } else if (fObj && fObj.cargo === "promotor") { 
            lojasAtivas = fObj.lojasPermitidas; 
        } 
    } 
    lojasAtivas.sort((a,b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})); 
    
    let selectLojaEst = document.getElementById('filtro-loja-estoque'); 
    if (selectLojaEst) { 
        let valAtual = selectLojaEst.value; 
        let htmlOptions = '<option value="todas">Todas as Lojas</option>'; 
        lojasAtivas.forEach(l => { htmlOptions += `<option value="${l}" ${l === valAtual ? 'selected' : ''}>${l}</option>`; }); 
        selectLojaEst.innerHTML = htmlOptions; 
        if (selectLojaEst.value !== 'todas') { lojasAtivas = lojasAtivas.filter(l => l === selectLojaEst.value); } 
    } 
    
    lojasAtivas.forEach(loja => { 
        lojasEstoque[loja] = {}; 
        for (let ap in mapaEmojis) lojasEstoque[loja][`${mapaEmojis[ap]} ${ap.toUpperCase()}`] = 0; 
    }); 
    
    dadosEstoqueGlobal.forEach(row => { 
        if (lojasEstoque[row["Loja"]]) { 
            let chave = extrairChaveAparelho(row["Aparelho"] || ""); 
            if (chave && mapaEmojis[chave]) { 
                let nomeOficial = `${mapaEmojis[chave]} ${chave.toUpperCase()}`; 
                if (lojasEstoque[row["Loja"]][nomeOficial] !== undefined) { 
                    lojasEstoque[row["Loja"]][nomeOficial] += Number(row["Quantidade"]) || 0; 
                } 
            } 
        } 
    }); 
    
    let html = ""; 
    let totalRupturas = 0;
    let totalBaixoEstoque = 0;

    for (let loja in lojasEstoque) { 
        let totalLoja = 0; let htmlItens = ""; 
        for (let apNome in lojasEstoque[loja]) { 
            if (termoBusca && !apNome.toLowerCase().includes(termoBusca)) continue; 
            let qtd = lojasEstoque[loja][apNome]; 
            
            if (qtd === 0) totalRupturas++;
            else if (qtd > 0 && qtd < 3) totalBaixoEstoque++;

            if (qtd === 0 && !mostrarZerados) continue; 
            totalLoja += qtd; 
            
            let btnId = (loja + apNome).replace(/[^a-zA-Z0-9]/g, ''); 
            let kMostruario = `${loja}_${apNome}`; 
            let isMostruario = mostruariosGlobais[kMostruario]; 
            
            if (qtd !== 1 && isMostruario) { 
                delete mostruariosGlobais[kMostruario]; 
                isMostruario = false; 
                localStorage.setItem('mostruariosGlobais', JSON.stringify(mostruariosGlobais)); 
            } 
            
            let btnMostruarioHtml = ""; 
            if (qtd === 1) { 
                if (isMostruario) { 
                    btnMostruarioHtml = `<span onclick="toggleMostruario('${loja}', '${apNome}')" style="cursor:pointer; font-size:10px; background:#ef4444; color:white; padding:4px 8px; border-radius:12px; margin-left:8px; font-weight:bold;">🔴 Mostruário</span>`; 
                } else { 
                    btnMostruarioHtml = `<span onclick="toggleMostruario('${loja}', '${apNome}')" style="cursor:pointer; font-size:10px; background:var(--bg-fundo); border:1px solid var(--border-color); color:var(--cor-secundaria); padding:4px 8px; border-radius:12px; margin-left:8px;">⚪ Marcar Mostruário</span>`; 
                } 
            } 
            
            let htmlControles = ""; 
            let permEstoquePromotor = (usuarioLogado.cargo === "promotor") ? (usuarioLogado.permissoes ? usuarioLogado.permissoes.estoque_editar : true) : false; 
            let adminRole = (usuarioLogado.cargo === "supervisor" || usuarioLogado.cargo === "regional" || usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master"); 
            let badgeStyle = ""; let iconeAlerta = ""; 
            
            if (qtd > 0 && qtd < 3) { badgeStyle = "background-color: #fee2e2; color: #ef4444; border-color: #ef4444;"; iconeAlerta = " 🔥"; } 
            
            if (permEstoquePromotor || adminRole) { 
                htmlControles = `<button class="btn-est" onclick="alterarEstoque('${loja}', '${apNome}', -1, '${btnId}')">-</button><span class="qtd-badge" id="badge-${btnId}" style="${badgeStyle}">${qtd}${iconeAlerta}</span><button class="btn-est" onclick="alterarEstoque('${loja}', '${apNome}', 1, '${btnId}')">+</button>`; 
            } else { 
                htmlControles = `<span class="qtd-badge" style="${badgeStyle}">${qtd} un${iconeAlerta}</span>`; 
            } 
            htmlItens += `<div class="card-estoque-pop"><div class="header-pop"><span style="font-weight: bold; font-size: 15px;">${apNome} ${btnMostruarioHtml}</span></div><div style="display: flex; justify-content: space-between; align-items: center;"><span style="font-size: 13px; color: var(--cor-secundaria);">Quantidade:</span><div class="estoque-controles">${htmlControles}</div></div></div>`; 
        } 
        if(htmlItens !== "") { 
            html += `<div class="loja-card-acompanhamento" style="background: transparent; border: none; box-shadow: none; padding: 0;"><div class="loja-titulo" style="margin-bottom: 15px; border-radius: 12px;"><span><i data-lucide="store" class="lucide-sm"></i> ${loja}</span><span class="loja-badge-total">Total: ${totalLoja} un</span></div><div>${htmlItens}</div></div>`; 
        } 
    } 

    let bannerAlertaHtml = "";
    if (totalRupturas > 0 || totalBaixoEstoque > 0) {
        bannerAlertaHtml = `
        <div style="background:rgba(239, 68, 68, 0.08); border:1px solid rgba(239, 68, 68, 0.3); border-radius:12px; padding:14px 16px; margin-bottom:15px; text-align:left; display:flex; align-items:center; gap:12px;">
            <i data-lucide="alert-triangle" style="color:#ef4444; width:24px; height:24px; flex-shrink:0;"></i>
            <div style="font-size:13px; color:var(--cor-texto); line-height:1.4;">
                <strong>Alerta Operacional:</strong> Há <span style="color:#ef4444; font-weight:bold;">${totalRupturas} itens em ruptura (0 un)</span> e <span style="color:#f59e0b; font-weight:bold;">${totalBaixoEstoque} itens em nível crítico (< 3 un)</span> nas lojas filtradas.
            </div>
        </div>`;
    }

    document.getElementById("lista-estoque-agrupada").innerHTML = bannerAlertaHtml + (html || `<div class='mensagem-vazia'>Nenhum estoque para exibir.</div>`); 
    atualizarTelaConferenciaEstoque(); loadIcons(); 
}

function alterarEstoque(loja, ap, delta, id) { 
    let k = `${loja}|${ap}`; 
    if (!pendenciasEstoque[k]) { 
        let linha = dadosEstoqueGlobal.find(r => r.Loja === loja && r.Aparelho === ap); 
        pendenciasEstoque[k] = { loja: loja, aparelho: ap, qtdOriginal: linha ? Number(linha.Quantidade) : 0, novaQtd: 0, deltaTotal: 0 }; 
    } 
    let p = pendenciasEstoque[k]; 
    p.deltaTotal += delta; 
    p.novaQtd = p.qtdOriginal + p.deltaTotal; 
    if (p.novaQtd < 0) { p.novaQtd = 0; p.deltaTotal = -p.qtdOriginal; } 
    let badge = document.getElementById(`badge-${id}`); 
    if(badge) { 
        badge.innerText = p.novaQtd; 
        badge.style.backgroundColor = p.deltaTotal !== 0 ? "#fef3c7" : "transparent"; 
        badge.style.color = p.deltaTotal !== 0 ? "#b45309" : "var(--cor-texto)"; 
    } 
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
        let ultima = localStorage.getItem('ultimaConferencia_' + usuarioLogado.id); 
        if (usuarioLogado.cargo === "promotor" && ultima !== hoje) { 
            if(btnOk) btnOk.style.display = "block"; 
        } else { 
            if(btnOk) btnOk.style.display = "none"; 
        } 
    } 
}

function limparConferenciaEstoque() { renderizarListaEstoque(); }
function verificarMotivoEstoque() { 
    let chaves = Object.keys(pendenciasEstoque).filter(k => pendenciasEstoque[k].deltaTotal !== 0); 
    if (chaves.length === 0) return; 
    let adminRole = (usuarioLogado.cargo === "supervisor" || usuarioLogado.cargo === "regional" || usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master"); 
    if (adminRole) { executarEnvioEstoque("Ajuste Gerencial"); } else { document.getElementById('modal-motivo-estoque').classList.add('ativo'); } 
}
function confirmarEnvioEstoqueMotivo() { document.getElementById('modal-motivo-estoque').classList.remove('ativo'); executarEnvioEstoque(document.getElementById('select-motivo-estoque').value); }

async function executarEnvioEstoque(motivoSelecionado) {
    if (!navigator.onLine) { mostrarToast("Sem internet!", "erro"); mostrarBotaoReconexao(); return; }
    const btn = document.getElementById("btn-enviar-estoque");
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" style="animation: spin 2s linear infinite;"></i> Atualizando...';
    loadIcons();

    let chaves = Object.keys(pendenciasEstoque).filter(k => pendenciasEstoque[k].deltaTotal !== 0);
    let qtdAlterada = chaves.length;

    try {
        for (let i = 0; i < chaves.length; i++) {
            let p = pendenciasEstoque[chaves[i]];
            const { data: estItem } = await supabaseClient.from('estoque').select('*').eq('loja', p.loja).eq('aparelho', p.aparelho).maybeSingle();
            
            if (estItem) {
                await supabaseClient.from('estoque').update({ quantidade: p.novaQtd }).eq('id', estItem.id);
            } else {
                await supabaseClient.from('estoque').insert({ loja: p.loja, aparelho: p.aparelho, quantidade: p.novaQtd });
            }

            await supabaseClient.from('vendas').insert([{
                promotor_login: usuarioLogado.id,
                loja: p.loja,
                vendedor: motivoSelecionado || "Ajuste Manual",
                aparelhos_vendidos: `[Auditoria] ${p.aparelho}: De ${p.qtdOriginal} para ${p.novaQtd} un`,
                data_venda: new Date().toISOString(),
                status: 'Auditoria' 
            }]);
        }
        localStorage.setItem('ultimaConferencia_' + usuarioLogado.id, new Date().toLocaleDateString('pt-BR'));
        mostrarToast(`Correção Enviada!<br>${qtdAlterada} modelos alterados.`, "sucesso");
        carregarEstoqueDoBanco();
    } catch (e) {
        console.error(e);
        mostrarToast("Erro ao atualizar estoque.", "erro");
        mostrarBotaoReconexao();
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="upload-cloud"></i> Enviar Atualização';
        loadIcons();
    }
}
async function enviarConferenciaDiaria() { 
    if (!navigator.onLine) { 
        mostrarToast("Sem internet para confirmar.", "erro"); 
        return; 
    }

    let btn = document.getElementById('btn-conferencia-ok');
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" style="animation: spin 1s linear infinite;"></i> Registrando...';
        loadIcons();
    }

    try {
        // Envia o registro de conferência para o banco de dados como uma "Auditoria"
        const { error } = await supabaseClient.from('vendas').insert([{
            promotor_login: usuarioLogado.id,
            loja: document.getElementById('filtro-loja-estoque') ? document.getElementById('filtro-loja-estoque').value : "Múltiplas",
            vendedor: "Conferência Diária",
            aparelhos_vendidos: "[Auditoria] Estoque conferido e validado sem alterações.",
            data_venda: new Date().toISOString(),
            status: 'Auditoria' 
        }]);

        if (error) throw error;

        // Salva localmente para esconder o botão hoje
        localStorage.setItem('ultimaConferencia_' + usuarioLogado.id, new Date().toLocaleDateString('pt-BR')); 
        document.getElementById('container-btn-conferencia-ok').style.display = "none"; 
        
        mostrarToast("Conferência registrada na nuvem com sucesso!", "sucesso"); 
        
    } catch (e) {
        console.error("Erro ao registrar conferência:", e);
        mostrarToast("Erro ao registrar conferência no sistema.", "erro");
    } finally {
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="check-square" class="lucide-lg"></i> Confirmar Conferência Diária';
            loadIcons();
        }
    }
}// ==========================================
// app.js - PARTE 8 DE 10
// Dashboard, Filtros Dinâmicos e Coleta de Métricas
// ==========================================

function forcarAtualizacaoDashboard() { 
    mostrarToast("Buscando dados atualizados...", "info"); 
    let icone = document.getElementById('icon-refresh-dash'); 
    if(icone) icone.style.animation = "spin 1s linear infinite"; 
    abrirDashboard(); 
    carregarGraficosShare(); 
}

function atualizarFiltroPromotorDash() { 
    let selSup = document.getElementById('filtro-supervisor-dash'); 
    let supVal = selSup ? selSup.value : "todos"; 
    let selProm = document.getElementById('filtro-promotor-dash'); 
    if(!selProm) return; 
    
    let promotorAtual = selProm.value; 
    let htmlOp = '<option value="todos">Todos da Equipe</option>'; 
    let supAlvo = (usuarioLogado.cargo === "supervisor") ? usuarioLogado.id : supVal; 
    
    if (supAlvo && supAlvo !== "todos") { 
        for(let k in bancoUsuarios) { 
            if (bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].criadoPor === supAlvo) { 
                htmlOp += `<option value="${k}">${bancoUsuarios[k].nome || k}</option>`; 
            } 
        } 
    } 
    selProm.innerHTML = htmlOp; 
    if (Array.from(selProm.options).some(opt => opt.value === promotorAtual)) { 
        selProm.value = promotorAtual; 
    } 
}

function atualizarFiltroLojaDash() {
    let selProm = document.getElementById('filtro-promotor-dash');
    let selLoja = document.getElementById('filtro-loja-dash');
    if (!selLoja) return; 
    
    let htmlOp = '<option value="todas">Todas as Lojas</option>';
    let lojasDaBusca = [];
    
    if (usuarioLogado.cargo === "promotor") {
        lojasDaBusca = usuarioLogado.lojasPermitidas || [];
        if (typeof lojasDaBusca === 'string') { try { lojasDaBusca = JSON.parse(lojasDaBusca); } catch(e) { lojasDaBusca = [lojasDaBusca]; } }
    } else {
        let promotorAtual = selProm ? selProm.value : "todos";
        if (promotorAtual && promotorAtual !== "todos") {
            let userP = bancoUsuarios[promotorAtual];
            if (userP && userP.lojasPermitidas) lojasDaBusca = userP.lojasPermitidas;
        } else {
            let selSup = document.getElementById('filtro-supervisor-dash') ? document.getElementById('filtro-supervisor-dash').value : "todos";
            let supAlvo = (usuarioLogado.cargo === "supervisor") ? usuarioLogado.id : selSup;
            if (supAlvo && supAlvo !== "todos" && typeof getLojasDaRegiao === "function") {
                lojasDaBusca = getLojasDaRegiao(supAlvo);
            } else {
                lojasDaBusca = Object.keys(lojasConfig);
            }
        }
    }
    lojasDaBusca.sort().forEach(l => { htmlOp += `<option value="${l}">${l}</option>`; });
    selLoja.innerHTML = htmlOp;
}

window.mudouSupervisorDash = function() { atualizarFiltroPromotorDash(); atualizarFiltroLojaDash(); abrirDashboard(); carregarGraficosShare(); };
window.mudouPromotorDash = function() { atualizarFiltroLojaDash(); abrirDashboard(); carregarGraficosShare(); };

function abrirDashboard() { 
    mudarTela('tela-dashboard'); 
    let selSup = document.getElementById('filtro-supervisor-dash'); 
    window.confettiDisparado = false; 
    
    if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") { 
        document.getElementById('container-filtro-supervisor-dash').style.display = "block"; 
        document.getElementById('container-filtro-promotor-dash').style.display = "block"; 
        if(selSup && selSup.options.length <= 1) { 
            let htmlOp = '<option value="todos">Todas as Regiões (Geral)</option>'; 
            for(let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === "supervisor") { if (podeGerenciar(usuarioLogado, k)) { htmlOp += `<option value="${k}">Equipe: ${bancoUsuarios[k].nome || k}</option>`; } } } 
            selSup.innerHTML = htmlOp; 
        } 
    } else if (usuarioLogado.cargo === "supervisor") { 
        document.getElementById('container-filtro-supervisor-dash').style.display = "none"; 
        document.getElementById('container-filtro-promotor-dash').style.display = "block"; 
    } else { 
        document.getElementById('container-filtro-supervisor-dash').style.display = "none"; 
        document.getElementById('container-filtro-promotor-dash').style.display = "none"; 
    } 
    
    if (document.getElementById('filtro-promotor-dash') && document.getElementById('filtro-promotor-dash').options.length <= 1) { atualizarFiltroPromotorDash(); } 
    if (document.getElementById('filtro-loja-dash') && document.getElementById('filtro-loja-dash').options.length <= 1) { atualizarFiltroLojaDash(); } 

    document.getElementById("total-comissao-geral").innerText = "R$ ****"; 
    document.getElementById("icone-olho-comissao").innerHTML = '<i data-lucide="eye" style="margin:0;"></i>'; 
    loadIcons(); 
    document.getElementById("total-vendas-geral").innerText = "..."; 
    
    // TRATAMENTO BLINDADO DE DATAS PARA O SUPABASE
    let inputDtIni = document.getElementById("dash-data-inicio");
    let inputDtFim = document.getElementById("dash-data-fim");
    
    let dtInicio = inputDtIni && inputDtIni.value ? inputDtIni.value : null;
    let dtFim = inputDtFim && inputDtFim.value ? inputDtFim.value : null;
    
    let query = supabaseClient.from('vendas').select('*').neq('status', 'Cancelado').neq('status', 'Auditoria');

    if (dtInicio) { query = query.gte('data_venda', dtInicio + 'T00:00:00'); }
    if (dtFim) { query = query.lte('data_venda', dtFim + 'T23:59:59'); }

    query.then(({ data, error }) => {
        if (error) throw error;
        
        let dados = (data || [])
            // TRAVA ABSOLUTA: Remove tudo que for auditoria antes de gerar os gráficos e metas
            .filter(row => !(row.aparelhos_vendidos || "").toUpperCase().includes('[AUDITORIA]'))
            .map(row => ({
                promotor_login: row.promotor_login, 
                loja: row.loja,
                Vendedor: `[${row.loja}] ${row.vendedor}`,
                Aparelhos: row.aparelhos_vendidos,
                Data: row.data_venda
            }));
        
        dadosAcompanhamentoGlobal = dados; 
        gerarGraficos(dados);
    }).catch(e => { 
        console.error("Erro ao gerar Dashboard:", e);
        document.getElementById("total-vendas-geral").innerText = "Erro!"; 
        if (e.message && (e.message.includes('fetch') || e.message.includes('network'))) {
            mostrarBotaoReconexao(); 
        } else {
            mostrarToast("Erro interno na montagem dos gráficos.", "erro");
        }
    }).finally(() => { 
        let icone = document.getElementById('icon-refresh-dash'); 
        if(icone) icone.style.animation = "none"; 
        loadIcons(); 
    }); 
}
function toggleComissao() { let elComissao = document.getElementById("total-comissao-geral"); let iconeOlho = document.getElementById("icone-olho-comissao"); if (elComissao.innerText === "R$ ****") { elComissao.innerText = elComissao.dataset.valor || "R$ 0,00"; iconeOlho.innerHTML = '<i data-lucide="eye-off" style="margin:0;"></i>'; } else { elComissao.innerText = "R$ ****"; iconeOlho.innerHTML = '<i data-lucide="eye" style="margin:0;"></i>'; } loadIcons(); }
function isCampaignActiveInMonth(startStr, endStr, mesSelecionado) { return true; }

// ==========================================
// SEÇÃO DO DASHBOARD COMPLETA (GERAR GRÁFICOS)
// ==========================================
function gerarGraficos(dadosVendas) {
    if (!dadosVendas) dadosVendas = []; 
    let totalGeral = 0; let vendasPorLoja = {}; let vendasPorModelo = {}; let metricas = {}; let modelosFocoVendidos = {}; let rankingPorLoja = {}; 
    let supervisorFoco = "todos"; let promotorFoco = "todos"; let lojaFoco = "todas";
    
    let containerSup = document.getElementById('container-filtro-supervisor-dash');
    let isSupVisible = containerSup && containerSup.style.display !== "none";
    let containerProm = document.getElementById('container-filtro-promotor-dash');
    let isPromVisible = containerProm && containerProm.style.display !== "none";

    if (usuarioLogado.cargo === "promotor") { 
        supervisorFoco = bancoUsuarios[usuarioLogado.id].criadoPor || "todos"; 
        promotorFoco = usuarioLogado.id; 
    } else { 
        if (usuarioLogado.cargo === "supervisor") {
            supervisorFoco = usuarioLogado.id; 
        } else if (isSupVisible && document.getElementById('filtro-supervisor-dash')) { 
            supervisorFoco = document.getElementById('filtro-supervisor-dash').value; 
        }
        if (isPromVisible && document.getElementById('filtro-promotor-dash')) { 
            promotorFoco = document.getElementById('filtro-promotor-dash').value || "todos"; 
        } 
    }

    let elLoja = document.getElementById('filtro-loja-dash');
    if (elLoja) lojaFoco = elLoja.value || "todas";

    let agrupamento = (supervisorFoco === "todos") ? "supervisor" : "promotor"; 
    let visualizarVendedores = (promotorFoco !== "todos" || lojaFoco !== "todas"); 
    
    if (agrupamento === "supervisor") { 
        for (let k in bancoUsuarios) { 
            if (bancoUsuarios[k].cargo === "supervisor" && podeGerenciar(usuarioLogado, k)) { 
                let nomeSup = bancoUsuarios[k].nome || k; 
                metricas[nomeSup] = { login: k, nome: nomeSup, metaPremium: 0, metaIndividual: 0, realizadoPremium: 0, realizadoGeral: 0, modelosPremiumVendidos: {}, modelosVendidosGeral: {}, comissaoAcumulada: 0, metasLinhas: bancoUsuarios[k].metasLinhas || [], realizadoLinhas: {} }; 
            } 
        } 
    }

    for (let k in bancoUsuarios) { 
        if (bancoUsuarios[k].cargo === "promotor") { 
            let supDoPromotor = bancoUsuarios[k].criadoPor; 
            if (supervisorFoco !== "todos" && supDoPromotor !== supervisorFoco) continue; 
            if (promotorFoco !== "todos" && k !== promotorFoco) continue; 
            if (supervisorFoco === "todos" && !podeGerenciar(usuarioLogado, k)) continue; 
            
            let metaIndPromotor = bancoUsuarios[k].meta || 0; 
            let metaPremPromotor = 0;
            if (bancoUsuarios[k].metaPremiumAbs !== undefined && bancoUsuarios[k].metaPremiumAbs !== "") {
                metaPremPromotor = Number(bancoUsuarios[k].metaPremiumAbs);
            } else {
                let taxaSup = taxasCoparticipacao[supDoPromotor] || taxasCoparticipacao["geral"] || 25; 
                metaPremPromotor = Math.round(metaIndPromotor * (taxaSup / 100)); 
            }
            
            if (agrupamento === "supervisor") { 
                if (supDoPromotor && bancoUsuarios[supDoPromotor]) { 
                    let nomeSup = bancoUsuarios[supDoPromotor].nome || supDoPromotor; 
                    if(metricas[nomeSup]) { metricas[nomeSup].metaPremium += metaPremPromotor; metricas[nomeSup].metaIndividual += metaIndPromotor; } 
                } 
            } else { 
                let pNome = bancoUsuarios[k].nome || k; 
                metricas[pNome] = { login: k, nome: pNome, metaPremium: metaPremPromotor, metaIndividual: metaIndPromotor, realizadoPremium: 0, realizadoGeral: 0, modelosPremiumVendidos: {}, modelosVendidosGeral: {}, comissaoAcumulada: 0, metasLinhas: bancoUsuarios[k].metasLinhas || [], realizadoLinhas: {} }; 
            } 
        } 
    }

    dadosVendas.forEach(row => {
        let loja = row.loja || "Outras"; 
        let pKey = row.promotor_login; 
        if (lojaFoco !== "todas" && loja !== lojaFoco) return;
        let pertenceAoEscopo = false;
        if (promotorFoco === "todos") { if (supervisorFoco === "todos") { if (podeGerenciar(usuarioLogado, pKey)) pertenceAoEscopo = true; } else { if (bancoUsuarios[pKey] && bancoUsuarios[pKey].criadoPor === supervisorFoco) pertenceAoEscopo = true; } } else { if (pKey === promotorFoco) pertenceAoEscopo = true; }
        if (!pertenceAoEscopo) return; 

        let match = (row.Vendedor || "").match(/^\[(.*?)\]\s*(.*)$/); 
        let vendNome = match ? match[2] : row.Vendedor;
        let lista = (row.Aparelhos || "").split("||").map(x => x.trim()).filter(x => x !== ""); 
        let qtd = lista.length; 
        
        totalGeral += qtd; 
        if (!vendasPorLoja[loja]) vendasPorLoja[loja] = 0; 
        vendasPorLoja[loja] += qtd;
        
        if (visualizarVendedores) { 
            if (!rankingPorLoja[loja]) rankingPorLoja[loja] = {}; 
            let multVend = vendNome.split(" e "); 
            multVend.forEach(vN => { 
                let v = vN.trim(); 
                if (!rankingPorLoja[loja][v]) rankingPorLoja[loja][v] = { qtdGeral: 0, qtdPremium: 0 }; 
                rankingPorLoja[loja][v].qtdGeral += qtd; 
            }); 
        }

        lista.forEach(ap => { 
            let chaveKey = extrairChaveAparelho(ap); 
            let modeloFormatado = (mapaEmojis[chaveKey] ? mapaEmojis[chaveKey] + " " : "") + chaveKey.toUpperCase();
            let nomeApUpper = ap.toUpperCase();
            
            if (!vendasPorModelo[modeloFormatado]) vendasPorModelo[modeloFormatado] = 0; 
            vendasPorModelo[modeloFormatado] += 1; 
            
            let checkPrem = ehPremium(ap, supervisorFoco !== "todos" ? supervisorFoco : "geral");
            if (visualizarVendedores && checkPrem) { vendNome.split(" e ").forEach(vN => { rankingPorLoja[loja][vN.trim()].qtdPremium += 1; }); }

            let processarLinha = (nomeAvo) => {
                if (metricas[nomeAvo]) {
                    metricas[nomeAvo].realizadoGeral += 1; 
                    metricas[nomeAvo].modelosVendidosGeral[chaveKey] = (metricas[nomeAvo].modelosVendidosGeral[chaveKey] || 0) + 1; 
                    
                    if (metricas[nomeAvo].metasLinhas) {
                        metricas[nomeAvo].metasLinhas.forEach(ml => {
                            let arrModelosDestaLinha = ml.linha.split(',').map(s => s.trim());
                            let matchNoGrupo = arrModelosDestaLinha.some(mod => nomeApUpper.includes(mod));
                            if (matchNoGrupo) { 
                                metricas[nomeAvo].realizadoLinhas[ml.linha] = (metricas[nomeAvo].realizadoLinhas[ml.linha] || 0) + 1; 
                            }
                        });
                    }
                    if (checkPrem) { 
                        metricas[nomeAvo].realizadoPremium += 1; 
                        modelosFocoVendidos[modeloFormatado] = (modelosFocoVendidos[modeloFormatado] || 0) + 1; 
                        metricas[nomeAvo].modelosPremiumVendidos[chaveKey] = (metricas[nomeAvo].modelosPremiumVendidos[chaveKey] || 0) + 1; 
                    } 
                }
            };

            if (agrupamento === "supervisor") { 
                let supKey = bancoUsuarios[pKey] ? bancoUsuarios[pKey].criadoPor : null;
                if (supKey) {
                    let userSup = bancoUsuarios[supKey]; 
                    let nomeSup = userSup ? (userSup.nome || supKey) : supKey; 
                    processarLinha(nomeSup);
                }
            } else { 
                let userP = bancoUsuarios[pKey]; 
                let pNome = userP ? (userP.nome || pKey) : pKey; 
                processarLinha(pNome);
            }
        });
    });

    let mesFiltro = ""; 
    Object.values(metricas).forEach(m => {
        let comissaoUser = 0; let supkey = m.login; 
        if (bancoUsuarios[m.login] && bancoUsuarios[m.login].cargo === "promotor") { supkey = bancoUsuarios[m.login].criadoPor; }
        
        let vComissaoSup = valoresComissao[supkey] || valoresComissao["geral"] || {}; 
        let grupos = vComissaoSup.grupos || []; let aparelhosCfg = vComissaoSup.aparelhos || {}; let campanhasAtivas = vComissaoSup.campanhasPersonalizadas || [];

        let volumePorGrupo = {}; grupos.forEach(g => volumePorGrupo[g.id] = 0);
        for(let modChave in m.modelosVendidosGeral) { 
            let qtdMod = m.modelosVendidosGeral[modChave]; let cfg = aparelhosCfg[modChave] || { tipo: 'nenhum' }; 
            if (cfg.tipo === 'grupo' && cfg.grupoId && volumePorGrupo[cfg.grupoId] !== undefined) { volumePorGrupo[cfg.grupoId] += qtdMod; } 
        }

        for(let modChave in m.modelosVendidosGeral) { 
            let qtdMod = m.modelosVendidosGeral[modChave]; let cfg = aparelhosCfg[modChave] || { tipo: 'nenhum' }; 
            if (cfg.tipo === 'fixo') { comissaoUser += (qtdMod * (Number(cfg.valorFixo) || 0)); } 
            else if (cfg.tipo === 'grupo' && cfg.grupoId) {
                let g = grupos.find(x => x.id === cfg.grupoId);
                if (g && cfg.valores) {
                    let volumeTotalGrupo = volumePorGrupo[cfg.grupoId] || 0; let nivelAlcancadoIdx = null; let maiorMeta = -1;
                    g.niveis.forEach((nv, idx) => { if (volumeTotalGrupo >= Number(nv.meta) && Number(nv.meta) >= maiorMeta) { nivelAlcancadoIdx = idx; maiorMeta = Number(nv.meta); } });
                    if (nivelAlcancadoIdx !== null) { let payout = Number(cfg.valores[nivelAlcancadoIdx]) || 0; comissaoUser += (qtdMod * payout); }
                }
            } 
            else if (cfg.tipo === undefined && (cfg.comissionado === true || cfg.comissionado === 'true')) {
                let niveisGlobais = vComissaoSup.niveis || [{ id: 'l1', meta: 0 }, { id: 'l2', meta: 10 }];
                let nivelAlcancado = 'l1'; let maiorMeta = -1; 
                niveisGlobais.forEach(nv => { let metaParaNivel = (cfg[nv.id + '_meta'] !== undefined && cfg[nv.id + '_meta'] !== "") ? Number(cfg[nv.id + '_meta']) : nv.meta; if (m.realizadoGeral >= metaParaNivel && metaParaNivel >= maiorMeta) { nivelAlcancado = nv.id; maiorMeta = metaParaNivel; } }); 
                let payout = 0; if (cfg[nivelAlcancado] !== undefined && cfg[nivelAlcancado] !== "") { payout = Number(cfg[nivelAlcancado]); } else if (cfg['l1'] !== undefined && cfg['l1'] !== "") { payout = Number(cfg['l1']); } 
                comissaoUser += (qtdMod * payout);
            }
        }

        campanhasAtivas.forEach(camp => { 
            if (isCampaignActiveInMonth(camp.dataInicio, camp.dataFim, mesFiltro)) { 
                if (camp.promotorAlvo && camp.promotorAlvo !== 'todos' && camp.promotorAlvo !== m.login) { return; } 
                let qtdParaBater = 0; if (camp.aparelho === 'todos') { qtdParaBater = m.realizadoPremium; } else { qtdParaBater = m.modelosVendidosGeral[camp.aparelho] || 0; } 
                if (qtdParaBater >= Number(camp.qtdMinima)) { comissaoUser += (qtdParaBater * Number(camp.bonus)); } 
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
    elComissao.dataset.valor = valorFormatado; 
    elComissao.innerText = "R$ ****"; 
    document.getElementById("icone-olho-comissao").innerHTML = '<i data-lucide="eye" style="margin:0;"></i>'; 
    loadIcons();

    let supAlvoParaFoco = (supervisorFoco !== "todos") ? supervisorFoco : "geral"; let pSup = aparelhosPremium[supAlvoParaFoco]; if (!pSup || Object.keys(pSup).length === 0) pSup = aparelhosPremium["geral"] || {}; let listaFocoAtuais = Object.keys(pSup).filter(k => pSup[k]).map(k => `<span style="display:inline-block; background:var(--bg-item); color:var(--cor-texto); padding:4px 8px; border-radius:6px; margin:2px; border: 1px solid var(--border-color); font-weight:bold;">${mapaEmojis[k] || ''} ${k.toUpperCase()}</span>`); document.getElementById("lista-foco-ativo-dash").innerHTML = listaFocoAtuais.length > 0 ? listaFocoAtuais.join("") : "<span style='color:var(--cor-secundaria); font-style:italic;'>Nenhum aparelho configurado como Foco.</span>";

    let totalFocoVendidoGeral = Object.values(modelosFocoVendidos).reduce((a, b) => a + b, 0); let metaFocoSomaGeral = Object.values(metricas).reduce((acc, m) => acc + m.metaPremium, 0); let pctMetaFocoGeral = metaFocoSomaGeral > 0 ? ((totalFocoVendidoGeral / metaFocoSomaGeral) * 100).toFixed(1) : 0; let pctCopartGeral = totalGeral > 0 ? ((totalFocoVendidoGeral / totalGeral) * 100).toFixed(1) : 0;
    let listaFocoHtml = ""; for(let mod in modelosFocoVendidos) { listaFocoHtml += `<span style="display:inline-block; background:var(--bg-item); color:var(--primary); padding:4px 8px; border-radius:6px; margin:2px; font-weight:bold; border: 1px solid var(--border-color);">${mod}: ${modelosFocoVendidos[mod]} un</span> `; } let htmlDetalhesCopart = `<div style="display: flex; flex-direction: column; gap: 8px;"><div style="display: flex; justify-content: space-between; font-size: 13px;"><span><i data-lucide="star" class="lucide-sm"></i> Foco Vendidos: <strong>${totalFocoVendidoGeral} un</strong></span><span style="color: #10b981; font-weight: bold;">Meta: ${pctMetaFocoGeral}%</span></div><div style="display: flex; justify-content: space-between; font-size: 13px;"><span><i data-lucide="pie-chart" class="lucide-sm"></i> Coparticipação Geral: <strong>${pctCopartGeral}%</strong></span></div><div style="margin-top: 5px;"><strong style="font-size: 11px; color: var(--cor-secundaria); display: block; margin-bottom: 3px;">Foco Vendidos no Período:</strong><div>${listaFocoHtml || "<span style='color:var(--cor-secundaria); font-style:italic;'>Nenhum foco vendido.</span>"}</div></div></div>`; document.getElementById("detalhe-coparticipacao-cards").innerHTML = htmlDetalhesCopart; loadIcons();

    let htmlRank = ""; let promOrd = []; 
    if (visualizarVendedores) {
        document.getElementById("titulo-ranking-dash").innerHTML = '<i data-lucide="award"></i> Ranking de Vendedores por Loja'; let lojasDoRanking = Object.keys(rankingPorLoja).sort((a,b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));
        if (lojasDoRanking.length === 0) { htmlRank = "<span style='font-size:13px; color:var(--cor-secundaria);'>Nenhuma venda registrada.</span>"; } else {
            lojasDoRanking.forEach(lojaRank => {
                htmlRank += `<h5 style="color: var(--primary); margin-top: 15px; margin-bottom: 5px; border-bottom: 1px solid var(--border-color); padding-bottom: 5px; text-align: left; font-size: 14px;"><i data-lucide="store" class="lucide-sm"></i> ${lojaRank}</h5>`;
                let vendedoresDaLoja = rankingPorLoja[lojaRank]; let vendOrd = Object.keys(vendedoresDaLoja).sort((a,b) => vendedoresDaLoja[b].qtdGeral - vendedoresDaLoja[a].qtdGeral); let rNum = 1; let uQtd = -1;
                vendOrd.forEach(v => { let m = vendedoresDaLoja[v]; if(uQtd !== -1 && m.qtdGeral < uQtd) rNum++; uQtd = m.qtdGeral; let bC = rNum === 1 ? 'rank-1' : rNum === 2 ? 'rank-2' : rNum === 3 ? 'rank-3' : 'rank-outros'; let pctFocoVendedor = m.qtdGeral > 0 ? ((m.qtdPremium / m.qtdGeral) * 100).toFixed(1) : 0; htmlRank += `<div style="display:flex;flex-direction:column;padding:8px 0;border-bottom:1px dashed var(--border-color);"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><div style="display:flex;align-items:center;gap:10px;"><span class="badge-rank ${bC}">${rNum}º</span><strong style="font-size: 14px;"><i data-lucide="user" class="lucide-sm"></i> ${v}</strong></div><span style="background:var(--bg-item);color:var(--primary);font-weight:bold;padding:4px 10px;border-radius:6px;font-size:13px;">${m.qtdGeral} un</span></div><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--cor-secundaria);background:var(--bg-item);padding:4px 8px;border-radius:4px;"><span>Foco Vendido: <strong>${m.qtdPremium} un</strong> (<span style="color:#10b981;">${pctFocoVendedor}% Foco</span>)</span></div></div>`; });
            });
        }
    } else {
        document.getElementById("titulo-ranking-dash").innerHTML = (agrupamento === "supervisor") ? '<i data-lucide="award"></i> Ranking de Equipes (vs Meta)' : '<i data-lucide="award"></i> Ranking de Promotores (vs Meta Individual)'; 
        promOrd = Object.keys(metricas).sort((a,b) => metricas[b].realizadoGeral - metricas[a].realizadoGeral); let rNum = 1; let uQtd = -1;
        
        // Pega as configurações de Gamificação da equipe
        let supAlvoGami = (supervisorFoco !== "todos") ? supervisorFoco : "geral";
        let configGami = (valoresComissao[supAlvoGami] && valoresComissao[supAlvoGami].gamificacao) ? valoresComissao[supAlvoGami].gamificacao : { iconeTop1: '👑', iconeMeta: '🎯', iconeFire: '🔥', minFire: 5 };

        promOrd.forEach(p => { 
            let m = metricas[p]; if(uQtd !== -1 && m.realizadoGeral < uQtd) rNum++; uQtd = m.realizadoGeral; let bC = rNum === 1 ? 'rank-1' : rNum === 2 ? 'rank-2' : rNum === 3 ? 'rank-3' : 'rank-outros'; let metaAlvo = m.metaIndividual; let pctHit = metaAlvo > 0 ? ((m.realizadoGeral / metaAlvo) * 100).toFixed(1) : 0; let corHit = pctHit >= 100 ? '#10b981' : '#ef4444'; let labelMetaRanking = agrupamento === "supervisor" ? "Meta Acumulada" : "Meta Individual"; let pctFocoVendedor = m.realizadoGeral > 0 ? ((m.realizadoPremium / m.realizadoGeral) * 100).toFixed(1) : 0; 
            
            // --- INÍCIO: SISTEMA DE GAMIFICAÇÃO & GLOW ---
            let iconesGami = "";
            if (rNum === 1 && m.realizadoGeral > 0) iconesGami += `<span title="Top 1" style="margin-left: 6px; font-size: 16px; filter: drop-shadow(0px 0px 4px rgba(255, 215, 0, 0.8));">${configGami.iconeTop1}</span>`;
            if (pctHit >= 100 && metaAlvo > 0) iconesGami += `<span title="Meta Batida" style="margin-left: 4px; font-size: 16px; filter: drop-shadow(0px 0px 4px rgba(16, 185, 129, 0.8));">${configGami.iconeMeta}</span>`;
            if (m.realizadoPremium >= configGami.minFire && configGami.minFire > 0) iconesGami += `<span title="On Fire (Premium)" style="margin-left: 4px; font-size: 16px; filter: drop-shadow(0px 0px 4px rgba(245, 158, 11, 0.8));">${configGami.iconeFire}</span>`;
            
            // Animação CSS para quem bateu a meta (Glow effect)
            let styleGlow = (pctHit >= 100 && metaAlvo > 0) 
                ? "background: linear-gradient(135deg, rgba(16,185,129,0.08) 0%, transparent 100%); border: 1px solid rgba(16,185,129,0.3); border-left: 4px solid #10b981;" 
                : "border-bottom: 1px dashed var(--border-color); border-left: 4px solid transparent;";
            // --- FIM: SISTEMA DE GAMIFICAÇÃO & GLOW ---

            let htmlMetasExtras = "";
            if (m.metasLinhas && m.metasLinhas.length > 0) {
                htmlMetasExtras += `<div style="display:flex; flex-direction:column; gap:8px; margin-top:10px; border-top:1px dashed var(--border-color); padding-top:10px;">`;
                m.metasLinhas.forEach(ml => {
                    let real = m.realizadoLinhas[ml.linha] || 0;
                    let pctL = ml.qtd > 0 ? Math.min(100, Math.round((real / ml.qtd) * 100)) : 0;
                    let corL = real >= ml.qtd ? '#10b981' : (real > 0 ? '#f59e0b' : 'var(--cor-secundaria)');
                    
                    htmlMetasExtras += `
                    <div style="display:flex; flex-direction:column; gap:4px; font-size:11px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:var(--cor-texto);">Alvo <strong style="color:var(--primary);">${ml.linha.replace(/,/g, ' + ')}</strong>:</span>
                            <span style="font-weight:bold; color:${corL};">${real} / ${ml.qtd} un (${pctL}%)</span>
                        </div>
                        <div style="background:var(--bg-fundo); border-radius:4px; height:6px; width:100%; overflow:hidden; border:1px solid var(--border-color);">
                            <div style="background:${corL}; width:${pctL}%; height:100%;"></div>
                        </div>
                    </div>`;
                });
                htmlMetasExtras += `</div>`;
            }

            // HTML DO CARD MODIFICADO PARA RECEBER OS ÍCONES E O GLOW
            htmlRank += `<div style="display:flex;flex-direction:column;padding:12px 10px; border-radius: 8px; margin-bottom: 6px; transition: all 0.3s ease; ${styleGlow}"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><div style="display:flex;align-items:center;gap:10px;"><span class="badge-rank ${bC}">${rNum}º</span><strong style="font-size: 15px; display:flex; align-items:center;"><i data-lucide="${agrupamento === 'supervisor' ? 'users' : 'user'}" class="lucide-sm"></i> ${p} ${iconesGami}</strong></div><span style="background:var(--bg-item);color:var(--primary);font-weight:bold;padding:4px 10px;border-radius:6px;font-size:14px;">${m.realizadoGeral} un</span></div><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--cor-secundaria);background:var(--bg-item);padding:4px 8px;border-radius:4px;"><span>🎯 ${labelMetaRanking}: <strong>${metaAlvo} un</strong></span><span style="color: ${corHit}; font-weight: bold;">${pctHit}% Concluído</span></div><div style="font-size:11px; color:var(--cor-secundaria); text-align:left; padding-left:4px; margin-top:4px;">Alvo Premium/Foco: <strong style="color:#10b981;">${m.realizadoPremium} / ${m.metaPremium} un</strong></div>${htmlMetasExtras}</div>`; 
        });
    }
    document.getElementById("lista-ranking-promotores").innerHTML = htmlRank || "<span style='font-size:13px; color:var(--cor-secundaria);'>Nenhuma venda registrada.</span>"; loadIcons();

    try {
        if (chartCoparticipacao) chartCoparticipacao.destroy(); if (chartCapa) chartCapa.destroy(); if (chartLojas) chartLojas.destroy(); if (chartModelos) chartModelos.destroy();
        let corTextoGrafico = document.body.classList.contains('dark-mode') ? '#f8fafc' : '#64748b'; Chart.defaults.color = corTextoGrafico; const pluginsArr = typeof ChartDataLabels !== 'undefined' ? [ChartDataLabels] : []; let labelsProm = Object.keys(metricas); let metasArr = labelsProm.map(p => metricas[p].metaPremium); let maxMeta = metasArr.length > 0 ? Math.max(...metasArr) : 10; if(maxMeta === -Infinity || maxMeta < 1) maxMeta = 10; 
        let widthProm = Math.max(100, labelsProm.length * 18); let wrapCapa = document.getElementById('wrap-graficoMetaPremiumCapa'); if(wrapCapa) wrapCapa.style.minWidth = widthProm + '%'; let wrapCopart = document.getElementById('wrap-graficoCoparticipacaoPromotores'); if(wrapCopart) wrapCopart.style.minWidth = widthProm + '%';

        const ctxCapa = document.getElementById('graficoMetaPremiumCapa').getContext('2d'); chartCapa = new Chart(ctxCapa, { type: 'bar', plugins: pluginsArr, data: { labels: labelsProm, datasets: [{ label: 'Meta Foco (un)', data: labelsProm.map(p => metricas[p].metaPremium), backgroundColor: '#c0c0c0' }, { label: 'Realizado Foco', data: labelsProm.map(p => metricas[p].realizadoPremium), backgroundColor: '#f59e0b' }]}, options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 45 } }, plugins: { legend: { position: 'bottom' }, datalabels: { anchor: 'end', align: 'top', offset: 4, formatter: (val, ctx) => { if (ctx.datasetIndex === 0) return val + ' un'; let p = ctx.chart.data.labels[ctx.dataIndex]; let m = metricas[p]; let pct = m.metaPremium > 0 ? ((val / m.metaPremium) * 100).toFixed(1) : 0; return [`${val} un`, `(${pct}%)`]; }, font: { weight: 'bold', size: 10 }, color: corTextoGrafico, textAlign: 'center' } }, scales: { y: { beginAtZero: true, suggestedMax: maxMeta * 1.3 } } } });
        const ctxCopart = document.getElementById('graficoCoparticipacaoPromotores').getContext('2d'); chartCoparticipacao = new Chart(ctxCopart, { type: 'bar', plugins: pluginsArr, data: { labels: labelsProm, datasets: [{ label: '% Coparticipação', data: labelsProm.map(p => metricas[p].realizadoGeral > 0 ? ((metricas[p].realizadoPremium / metricas[p].realizadoGeral) * 100).toFixed(1) : 0), backgroundColor: '#0086ff' }] }, options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 45 } }, plugins: { legend: { display: false }, tooltip: { padding: 12, callbacks: { label: function(context) { let p = context.chart.data.labels[context.dataIndex]; let m = metricas[p]; let linhas = [`Coparticipação: ${context.raw}% (${m.realizadoPremium} de ${m.realizadoGeral} un)`]; if (m.realizadoPremium > 0) { linhas.push('-------------------------'); linhas.push('Aparelhos Foco Vendidos:'); for (let mod in m.modelosPremiumVendidos) { linhas.push(`• ${m.modelosPremiumVendidos[mod]}x ${mod}`); } } return linhas; } } }, datalabels: { anchor: 'end', align: 'top', offset: 4, formatter: (val, ctx) => { let p = ctx.chart.data.labels[ctx.dataIndex]; let m = metricas[p]; return [`${val}%`, `(${m.realizadoPremium} de ${m.realizadoGeral} un)`]; }, font: { weight: 'bold', size: 10 }, color: corTextoGrafico, textAlign: 'center' } }, scales: { y: { beginAtZero: true, suggestedMax: 100 } } } });

        let lojasSort = Object.keys(vendasPorLoja).sort((a,b) => a.localeCompare(b, undefined, {numeric:true, sensitivity:'base'})); 
        let widthLojas = Math.max(100, lojasSort.length * 18); let wrapLojas = document.getElementById('wrap-graficoVendasLoja'); if(wrapLojas) wrapLojas.style.minWidth = widthLojas + '%';
        const ctxLojas = document.getElementById('graficoVendasLoja').getContext('2d'); chartLojas = new Chart(ctxLojas, { type: 'bar', plugins: pluginsArr, data: { labels: lojasSort, datasets: [{ data: lojasSort.map(l => vendasPorLoja[l]), backgroundColor: '#10b981', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 20 } }, scales: { x: { ticks: { display: false }, grid: { display: false } }, y: { beginAtZero: true } }, plugins: { legend: { display: false }, tooltip: { padding: 12, callbacks: { title: function(context) { return '🏪 ' + context[0].label; }, afterTitle: function(context) { let nomePromotor = getPromotorDaLoja(context[0].label); return '👤 Promotor: ' + nomePromotor; }, label: function(context) { return 'Total Vendido: ' + context.raw + ' un'; } } }, datalabels: { anchor: 'end', align: 'top', color: corTextoGrafico, font: { weight: 'bold' }, formatter: (val) => val + ' un' } } } });

        // --- ANÁLISE DE CAPA DA LOJA VS REALIZADO ---
        let htmlCapaLojas = "";
        for (let loja in vendasPorLoja) {
            let vendido = vendasPorLoja[loja];
            let capaLoja = lojasConfig[loja] && lojasConfig[loja].capa ? lojasConfig[loja].capa : 0;
            if (capaLoja > 0) {
                let pctCapa = Math.min(100, Math.round((vendido / capaLoja) * 100));
                let corCapa = pctCapa >= 100 ? '#10b981' : (pctCapa >= 50 ? '#f59e0b' : '#ef4444');
                htmlCapaLojas += `
                <div style="display:flex; flex-direction:column; gap:4px; margin-bottom:8px; font-size:12px; background:var(--bg-item); padding:10px 12px; border-radius:8px; border:1px solid var(--border-color);">
                    <div style="display:flex; justify-content:space-between; font-weight:bold;">
                        <span>🏪 ${loja}</span>
                        <span style="color:${corCapa};">${vendido} / ${capaLoja} un (${pctCapa}% da Capa)</span>
                    </div>
                    <div style="background:var(--bg-fundo); border-radius:4px; height:6px; width:100%; overflow:hidden; border:1px solid var(--border-color);">
                        <div style="background:${corCapa}; width:${pctCapa}%; height:100%;"></div>
                    </div>
                </div>`;
            }
        }
        
        let containerCapaId = 'resumo-capa-lojas-dash';
        let containerCapaEl = document.getElementById(containerCapaId);
        if (!containerCapaEl && document.getElementById('wrap-graficoVendasLoja')) {
            let wrapLojas = document.getElementById('wrap-graficoVendasLoja').parentElement.parentElement;
            containerCapaEl = document.createElement('div');
            containerCapaEl.id = containerCapaId;
            containerCapaEl.style.cssText = "margin-top: 20px; border-top: 1px dashed var(--border-color); padding-top: 15px; text-align: left;";
            wrapLojas.appendChild(containerCapaEl);
        }
        if (containerCapaEl) {
            containerCapaEl.innerHTML = htmlCapaLojas ? `<h5 style="color:var(--cor-texto); margin-bottom:10px; font-size:13px;"><i data-lucide="layers" class="lucide-sm"></i> Ocupação da Capa por Loja:</h5>${htmlCapaLojas}` : "";
        }

        let topModelos = Object.entries(vendasPorModelo).sort((a, b) => b[1] - a[1]); 
        const ctxModelos = document.getElementById('graficoTopModelos').getContext('2d'); 
        const paletaCores = ['#0086ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#38bdf8', '#fb923c', '#f472b6', '#2dd4bf', '#a78bfa', '#e879f9', '#94a3b8', '#fb7185', '#34d399', '#fbbf24', '#c084fc', '#4ade80'];
        
        chartModelos = new Chart(ctxModelos, { 
            type: 'doughnut', 
            plugins: pluginsArr, 
            data: { 
                labels: topModelos.map(m => `${m[0]}`), 
                datasets: [{ 
                    data: topModelos.map(m => m[1]), 
                    backgroundColor: topModelos.map((_, index) => paletaCores[index % paletaCores.length]) 
                }] 
            }, 
            options: { 
                maintainAspectRatio: false, 
                responsive: true, 
                plugins: { 
                    legend: { position: 'bottom', labels: { color: corTextoGrafico } }, 
                    datalabels: { color: '#fff', font: { weight: 'bold', size: 12 }, formatter: (value) => value > 0 ? value + ' un' : '' } 
                } 
            } 
        });
        
        setTimeout(() => {
            if(document.getElementById('tela-dashboard').classList.contains('ativa')) {
                let isTop1 = false;
                if (!visualizarVendedores && promOrd.length > 0) { if (promOrd[0] === usuarioLogado.nome || promOrd[0] === usuarioLogado.id) isTop1 = true; }
                if (isTop1 && !window.confettiDisparado) { typeof confetti === "function" && confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#0086ff', '#10b981', '#f59e0b', '#ffd700'] }); window.confettiDisparado = true; mostrarToast("🏆 Parabéns! Você está em 1º Lugar no ranking!", "sucesso"); }
            }
        }, 500);

    } catch(errG) { console.error("Erro interno nos gráficos:", errG); }
}
// ==========================================
// app.js - PARTE 9 DE 10
// Market Share, Termômetro de Lojas e Função de Print (html2canvas)
// ==========================================

async function carregarGraficosShare() {
    if (!navigator.onLine) { mostrarToast("Sem conexão.", "erro"); return; }
    mostrarToast("Calculando inteligência de mercado...", "info");
    
    let dtInicio = document.getElementById("dash-data-inicio") ? document.getElementById("dash-data-inicio").value : null;
    let dtFim = document.getElementById("dash-data-fim") ? document.getElementById("dash-data-fim").value : null;

    try {
        let query = supabaseClient.from('market_share').select('*');
        if (dtInicio) query = query.gte('data_fechamento', dtInicio);
        if (dtFim) query = query.lte('data_fechamento', dtFim);
            
        let selSup = document.getElementById('filtro-supervisor-dash');
        let selProm = document.getElementById('filtro-promotor-dash');
        let selLoja = document.getElementById('filtro-loja-dash');
        
        let containerSup = document.getElementById('container-filtro-supervisor-dash');
        let isSupVisible = containerSup && containerSup.style.display !== "none";
        
        let containerProm = document.getElementById('container-filtro-promotor-dash');
        let isPromVisible = containerProm && containerProm.style.display !== "none";

        let escopoTexto = "no mercado analisado"; 

        let supAlvo = "todos";
        if (usuarioLogado.cargo === "supervisor") {
            supAlvo = usuarioLogado.id; 
        } else if (isSupVisible && selSup && selSup.value !== "todos") {
            supAlvo = selSup.value; 
        }

        if (usuarioLogado.cargo === "promotor") {
            query = query.eq('promotor_login', usuarioLogado.id);
            escopoTexto = "nas suas lojas";
        } else {
            if (supAlvo !== "todos") {
                query = query.eq('criado_por_supervisor', supAlvo);
                escopoTexto = "na equipe filtrada";
            }
            if (isPromVisible && selProm && selProm.value !== "todos") {
                query = query.eq('promotor_login', selProm.value);
                escopoTexto = "nas lojas do promotor";
            }
        }

        if (selLoja && selLoja.value !== "todas") {
             query = query.eq('loja', selLoja.value);
             escopoTexto = "nesta loja"; 
        }
        
        const { data: dbShare, error } = await query;
        if (error) throw error;

        let resumoGlobal = { oppo: 0, concorrentes: {}, total: 0 };
        let resumoLojas = {};

        let lojasDaBusca = [];
        if (usuarioLogado.cargo === "promotor") {
            lojasDaBusca = usuarioLogado.lojasPermitidas || [];
            if (typeof lojasDaBusca === 'string') { try { lojasDaBusca = JSON.parse(lojasDaBusca); } catch(e) { lojasDaBusca = [lojasDaBusca]; } }
        } else {
            let promotorAtual = (isPromVisible && selProm) ? selProm.value : "todos";
            if (promotorAtual !== "todos") {
                let userP = bancoUsuarios[promotorAtual];
                if (userP && userP.lojasPermitidas) lojasDaBusca = userP.lojasPermitidas;
            } else if (supAlvo !== "todos" && typeof getLojasDaRegiao === "function") {
                lojasDaBusca = getLojasDaRegiao(supAlvo);
            } else {
                lojasDaBusca = Object.keys(lojasConfig);
            }
        }

        if (typeof dadosAcompanhamentoGlobal !== 'undefined') {
            dadosAcompanhamentoGlobal.forEach(row => {
                let match = (row.Vendedor || "").match(/^\[(.*?)\]/);
                let lojaNome = match ? match[1] : "Outras";
                
                if (!lojasDaBusca.includes(lojaNome)) return;
                if (selLoja && selLoja.value !== "todas" && lojaNome !== selLoja.value) return;

                let qtd = (row.Aparelhos || "").split("||").filter(x => x.trim() !== "").length;
                resumoGlobal.oppo += qtd;
                resumoGlobal.total += qtd; 
                
                if (!resumoLojas[lojaNome]) resumoLojas[lojaNome] = { oppo: 0, total: 0 };
                resumoLojas[lojaNome].oppo += qtd;
                resumoLojas[lojaNome].total += qtd;
            });
        }

        if (dbShare) {
            dbShare.forEach(row => {
                let dadosConc = row.concorrentes_dados || {};
                let totalConcLinha = 0;
                for (let marca in dadosConc) {
                    let qtd = dadosConc[marca];
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
            document.getElementById('texto-resumo-share').innerHTML = "Nenhum dado registrado neste filtro.";
            document.getElementById('lista-temperatura-lojas').innerHTML = "<div class='mensagem-vazia'>Sem dados.</div>";
            return;
        }

        renderizarPizzaShare(resumoGlobal, escopoTexto); 
        renderizarTermometroLojas(resumoLojas);

    } catch (e) {
        console.error("Erro no cálculo do Share:", e);
        mostrarToast("Erro ao carregar inteligência.", "erro");
    }
}

function renderizarPizzaShare(resumoGlobal, escopoTexto) {
    if (chartShareGlobal) chartShareGlobal.destroy();
    
    let pctOppo = resumoGlobal.total > 0 ? ((resumoGlobal.oppo / resumoGlobal.total) * 100).toFixed(1) : 0;
    document.getElementById('texto-resumo-share').innerHTML = `A OPPO domina <strong style="font-size: 18px; color: #10b981;">${pctOppo}%</strong> ${escopoTexto}!`;

    let corTexto = document.body.classList.contains('dark-mode') ? '#ffffff' : '#475569';
    let labels = ['OPPO'];
    let data = [resumoGlobal.oppo];
    let bgColors = ['#10b981']; 
    
    let paleta = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#64748b'];
    let cIdx = 0;

    let concOrdenados = Object.keys(resumoGlobal.concorrentes).sort((a,b) => resumoGlobal.concorrentes[b] - resumoGlobal.concorrentes[a]);

    concOrdenados.forEach(marca => {
        labels.push(marca);
        data.push(resumoGlobal.concorrentes[marca]);
        bgColors.push(paleta[cIdx % paleta.length]);
        cIdx++;
    });

    const ctx = document.getElementById('graficoMarketShare').getContext('2d');
    chartShareGlobal = new Chart(ctx, {
        type: 'doughnut',
        plugins: [ChartDataLabels],
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: bgColors,
                borderWidth: 1,
                borderColor: document.body.classList.contains('dark-mode') ? '#050a08' : '#ffffff'
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: corTexto, font: { weight: 'bold' } } },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 12 },
                    formatter: (value, ctx) => {
                        let total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        if (total === 0 || value === 0) return "";
                        let percentage = ((value / total) * 100).toFixed(1) + "%";
                        return [`${value} un`, percentage];
                    }
                }
            }
        }
    });
}

function renderizarTermometroLojas(resumoLojas) {
    const div = document.getElementById('lista-temperatura-lojas');
    let listaLojas = [];
    
    for (let nomeLoja in resumoLojas) {
        let r = resumoLojas[nomeLoja];
        if (r.total === 0) continue;
        let pct = (r.oppo / r.total) * 100;
        listaLojas.push({ nome: nomeLoja, oppo: r.oppo, total: r.total, pct: pct });
    }
    
    if (listaLojas.length === 0) {
        div.innerHTML = "<div class='mensagem-vazia'>Sem dados de lojas neste período.</div>";
        return;
    }

    listaLojas.sort((a,b) => a.pct - b.pct);
    
    let html = "";
    listaLojas.forEach(l => {
        let corStatus, iconeStatus, bgAlerta;
        
        if (l.pct >= 35) {
            corStatus = "#10b981"; iconeStatus = "trending-up"; bgAlerta = "rgba(16, 185, 129, 0.05)";
        } else if (l.pct >= 15) {
            corStatus = "#f59e0b"; iconeStatus = "thermometer"; bgAlerta = "rgba(245, 158, 11, 0.05)";
        } else {
            corStatus = "#ef4444"; iconeStatus = "alert-triangle"; bgAlerta = "rgba(239, 68, 68, 0.1)";
        }

        html += `
        <div style="background: ${bgAlerta}; border: 1px solid var(--border-color); border-radius: 12px; padding: 15px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <div style="text-align: left; flex: 1;">
                <strong style="color: var(--cor-texto); font-size: 15px;">${l.nome}</strong>
                <span style="display: block; font-size: 12px; color: var(--cor-secundaria);">OPPO: ${l.oppo} | Total da Loja: ${l.total} un</span>
            </div>
            <div style="text-align: right; color: ${corStatus}; display: flex; flex-direction: column; align-items: flex-end;">
                <span style="font-size: 22px; font-weight: 900; letter-spacing: -1px; display: flex; align-items: center; gap: 4px;">
                    <i data-lucide="${iconeStatus}" style="margin:0; color: ${corStatus}; width: 20px; height: 20px;"></i>
                    ${l.pct.toFixed(1)}%
                </span>
                <span style="font-size: 10px; font-weight: bold; text-transform: uppercase;">Share</span>
            </div>
        </div>
        `;
    });
    
    div.innerHTML = html;
    loadIcons();
}

// ================= FUNÇÃO DE COMPARTILHAR/PRINT CORRIGIDA =================
async function compartilharDashboard() {
    mostrarToast("Gerando print em alta definição...", "info");
    let elemento = document.getElementById('tela-dashboard');
    if (!elemento) return;
    
    try {
        // Aumentamos a escala para 3 e ajustamos para máxima nitidez dos gráficos e textos
        let canvas = await html2canvas(elemento, { 
            scale: 3, 
            useCORS: true,
            allowTaint: true,
            backgroundColor: document.body.classList.contains('dark-mode') ? '#050a08' : '#f1f5f9'
        });
        
        // Força o download direto para o computador, salvando na pasta de downloads sem menus automáticos
        let link = document.createElement('a');
        link.download = `dashboard_oppo_${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
        
        mostrarToast("Print salvo no computador com sucesso!", "sucesso");
    } catch (e) {
        console.error("Erro ao tirar print:", e);
        mostrarToast("Erro ao capturar tela.", "erro");
    }
}
// ==========================================
// app.js - PARTE 10 DE 10
// Painel Admin, Modais Inteligentes, Batalha e Exportação
// ==========================================

function renderizarSelectRegioes() { let regioesUnicas = new Set(); for (let k in bancoUsuarios) { if (bancoUsuarios[k].regiao) regioesUnicas.add(bancoUsuarios[k].regiao.toUpperCase()); } let sel = document.getElementById('admin-gs-regiao-select'); if (!sel) return; let html = '<option value="">Selecione a Região...</option>'; let regioesArray = Array.from(regioesUnicas).sort(); regioesArray.forEach(r => { html += `<option value="${r}">${r}</option>`; }); html += '<option value="NOVA">➕ Criar Nova Região</option>'; sel.innerHTML = html; }
function verificarNovaRegiao(val) { let inp = document.getElementById('admin-gs-regiao-input'); if(val === 'NOVA') { inp.style.display = 'block'; } else { inp.style.display = 'none'; inp.value = ''; } }

function abrirAdmin() { 
    mudarTela('tela-admin'); let selSupFoco = document.getElementById('seletor-foco-sup');
    if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") {
        if(usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master") { document.getElementById('bloco-criar-gestor').style.display = "block"; renderizarSelectRegioes(); } else { document.getElementById('bloco-criar-gestor').style.display = "none"; }
        document.getElementById('bloco-admin-foco').style.display = "block"; selSupFoco.innerHTML = '<option value="geral">Geral (Padrão da Empresa)</option>'; 
        for(let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === "supervisor" && podeGerenciar(usuarioLogado, k)) { selSupFoco.innerHTML += `<option value="${k}">Equipe: ${bancoUsuarios[k].nome || k}</option>`; } } 
    } 
    else if (usuarioLogado.cargo === "supervisor") {
        document.getElementById('bloco-criar-gestor').style.display = "none"; document.getElementById('bloco-admin-foco').style.display = "block"; 
        selSupFoco.innerHTML = `<option value="${usuarioLogado.id}">Minha Equipe (${usuarioLogado.nome})</option>`; selSupFoco.value = usuarioLogado.id; 
    } 
    else { document.getElementById('bloco-admin-foco').style.display = "none"; document.getElementById('bloco-criar-gestor').style.display = "none"; }
    
    if (usuarioLogado.cargo === "regional") { document.getElementById('container-admin-regiao').style.display = 'none'; }
    renderizarAdminUsuarios(); renderizarInputsFoco(); renderizarAdminAparelhos(); 
}

function renderizarAdminUsuarios() {
    const div = document.getElementById('lista-admin-supervisores'); let htmlContent = ""; const filtroCargo = document.getElementById('filtro-cargo-admin') ? document.getElementById('filtro-cargo-admin').value : 'todos'; const busca = document.getElementById('busca-admin') ? document.getElementById('busca-admin').value.toLowerCase() : '';
    for(let l in bancoUsuarios) { 
        let u = bancoUsuarios[l]; 
        if (u.cargo === "promotor" && usuarioLogado.id !== "master") continue; if (!podeGerenciar(usuarioLogado, l) && l !== usuarioLogado.id) continue;
        if (filtroCargo !== 'todos') { if (filtroCargo === 'regional' && u.cargo !== 'regional' && u.cargo !== 'gestor') continue; if (filtroCargo !== 'regional' && u.cargo !== filtroCargo) continue; }
        const nomeUpper = (u.nome || l).toLowerCase(); if (busca && !nomeUpper.includes(busca) && !l.includes(busca)) continue;

        let labelCargo = l === "master" ? "👑 Master" : (u.cargo === "gestor" ? "👔 Gestor" : (u.cargo === "regional" ? "🌎 Regional" : (u.cargo === "supervisor" ? "📍 Supervisor" : "👤 Promotor"))); let subLabel = u.regiao ? ` - Região: ${u.regiao}` : "";
        let btnGerenciar = (u.cargo === "supervisor") ? `<button class="btn-editar" style="background: var(--primary-gradiente); color:white; border:none; padding: 12px; border-radius: 12px; width: 100%; margin-top: 12px; font-weight:bold;" onclick="abrirPainelEquipe('${l}')"><i data-lucide="settings" class="lucide-sm"></i> Gerenciar Equipe de ${u.nome || l}</button>` : (usuarioLogado.id === "master" && u.cargo === "promotor") ? `<button class="btn-editar" style="background: var(--primary-gradiente); color:white; border:none; padding: 12px; border-radius: 12px; width: 100%; margin-top: 12px;" onclick="adminAbrirModalLojas('${l}')"><i data-lucide="settings" class="lucide-sm"></i> Gerenciar Lojas</button>` : ''; 
        let btnRegiao = (usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master") ? `<button class="btn-editar" style="background-color: #8b5cf6; color:white; border:none;" onclick="adminAbrirModalRegiao('${l}')"><i data-lucide="globe"></i> Região</button>` : ""; 
        let btnSenha = `<button class="btn-editar" style="background-color: #f59e0b; color: white; border:none;" onclick="adminAbrirModalSenha('${l}')"><i data-lucide="key"></i> Senha</button>`; let btnExcluir = (usuarioLogado.id === "master" && l !== "master") ? `<button class="btn-excluir" onclick="adminRemoverUsuario('${l}')"><i data-lucide="trash-2"></i></button>` : ""; 
        htmlContent += `<div class="linha-admin" style="flex-direction: column; align-items: stretch; padding: 16px; background: var(--bg-card); margin-bottom: 12px; border-radius: 16px; border: 1px solid var(--border-color);"><div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-color); padding-bottom: 10px; margin-bottom: 10px;"><div style="text-align: left;"><strong style="font-size: 16px;">${u.nome || l} <span style="font-size: 11px; color: var(--cor-secundaria);">(@${l})</span></strong><span style="font-size: 12px; font-weight: bold; color: var(--primary);">${labelCargo}${subLabel}</span></div><div style="display: flex; gap: 8px;">${btnRegiao} ${btnSenha} ${btnExcluir}</div></div>${btnGerenciar}</div>`; 
    } div.innerHTML = htmlContent || "<p style='color:var(--cor-secundaria); font-size:13px;'>Nenhum usuário encontrado.</p>"; loadIcons();
}

function filtrarListaModal(classe, termo) { termo = termo.toLowerCase(); let itens = document.querySelectorAll('.' + classe); itens.forEach(item => { if(item.innerText.toLowerCase().includes(termo)) { item.style.display = "block"; } else { item.style.display = "none"; } }); }

function abrirPainelEquipe(login) {
    supervisorGerenciadoAtual = login;
    let supNome = bancoUsuarios[login].nome || login;
    let titulo = document.getElementById('titulo-modal-equipe');
    if (titulo) titulo.innerHTML = `<i data-lucide="users"></i> Equipe de ${supNome}`;
    renderizarModalEquipe();
    document.getElementById('modal-gerenciar-equipe').classList.add('ativo');
    switchTab('equipe-tab-promotores', 'equipe-tab');
    loadIcons();
}

function fecharModalEquipe() { document.getElementById('modal-gerenciar-equipe').classList.remove('ativo'); supervisorGerenciadoAtual = null; }

function getLojasDaRegiao(supLogin) {
    let lojas = [];
    for (let l in lojasConfig) {
        if (lojasConfig[l].supervisor === supLogin) {
            lojas.push(l);
        } else if (!lojasConfig[l].supervisor) {
            let promotoresDoSup = Object.keys(bancoUsuarios).filter(k => bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].criadoPor === supLogin);
            let pertence = promotoresDoSup.some(p => bancoUsuarios[p].lojasPermitidas && bancoUsuarios[p].lojasPermitidas.includes(l));
            if (pertence) { lojas.push(l); lojasConfig[l].supervisor = supLogin; }
        }
    }
    return lojas.sort((a,b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));
}

function renderizarModalEquipe() {
    if(!supervisorGerenciadoAtual) return;
    let divPromotores = document.getElementById('lista-modal-promotores'); let divLojas = document.getElementById('lista-modal-lojas'); let selLoja = document.getElementById('modal-select-loja'); let lojasDaRegiao = getLojasDaRegiao(supervisorGerenciadoAtual); 
    let promotoresArray = [];
    for(let k in bancoUsuarios) { if(bancoUsuarios[k].cargo === "promotor" && (bancoUsuarios[k].criadoPor === supervisorGerenciadoAtual || usuarioLogado.id === "master")) { promotoresArray.push({ login: k, nome: bancoUsuarios[k].nome || k, obj: bancoUsuarios[k] }); } }
    promotoresArray.sort((a, b) => a.nome.localeCompare(b.nome));

    let htmlPromotores = "";
    promotoresArray.forEach(p => {
        let u = p.obj; let k = p.login;
        htmlPromotores += `<div class="item-modal-busca-promotor" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 15px; margin-bottom: 10px; text-align: left;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;"><strong style="font-size:15px;"><i data-lucide="user" class="lucide-sm"></i> ${u.nome || k} (@${k})</strong><div style="display:flex; gap:8px;"><button class="btn-editar" style="background:#f59e0b; color:#fff;" onclick="adminAbrirModalSenha('${k}')"><i data-lucide="key" class="lucide-sm"></i></button><button class="btn-editar" style="background:var(--primary); color:white;" onclick="adminAbrirModalNome('${k}')"><i data-lucide="edit-3" class="lucide-sm"></i></button><button class="btn-editar" style="background:#8b5cf6; color:white;" onclick="adminAbrirModalPermissoes('${k}')"><i data-lucide="shield" class="lucide-sm"></i></button><button class="btn-excluir" onclick="adminRemoverUsuarioModalEquipe('${k}')"><i data-lucide="trash-2" class="lucide-sm"></i></button></div></div><div style="font-size:13px; color:var(--cor-secundaria); display:flex; justify-content:space-between;"><span>Meta Padrão: <strong>${u.meta || 0}</strong> <button class="btn-editar-meta" onclick="adminAbrirModalMeta('${k}')"><i data-lucide="target" class="lucide-sm"></i></button></span><span>Lojas: <strong>${u.lojasPermitidas ? u.lojasPermitidas.length : 0}</strong> <button class="btn-editar" onclick="adminAbrirModalLojas('${k}')"><i data-lucide="store" class="lucide-sm"></i></button></span></div></div>`;
    });
    divPromotores.innerHTML = htmlPromotores || "<p style='font-size:13px; color:var(--cor-secundaria);'>Nenhum promotor cadastrado.</p>";

    let htmlLojas = ""; let htmlSelLoja = "";
    lojasDaRegiao.forEach(loja => {
        let objL = lojasConfig[loja] || { vendedores: [], capa: 0 }; htmlSelLoja += `<option value="${loja}">${loja}</option>`;
        let vends = (objL.vendedores || []).map(v => `<span style="background:var(--bg-item); color:var(--primary); padding:4px 8px; border-radius:6px; font-size:11px; margin-right:6px; border:1px solid var(--primary); display:inline-flex; align-items:center; gap:4px; margin-bottom:4px;">${v} <i data-lucide="x" class="lucide-sm" style="cursor:pointer;" onclick="adminRemoverVendedor('${loja}', '${v}')"></i></span>`).join("");
        htmlLojas += `<div class="item-modal-busca-loja" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 15px; margin-bottom: 10px; text-align: left;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;"><strong style="font-size:15px;"><i data-lucide="store" class="lucide-sm"></i> ${loja}</strong><div style="display:flex; gap:8px;"><button class="btn-editar-meta" onclick="adminAbrirModalCapa('${loja}')"><i data-lucide="layers" class="lucide-sm"></i> Capa: ${objL.capa || 0}</button><button class="btn-excluir" onclick="adminRemoverLoja('${loja}')"><i data-lucide="trash-2" class="lucide-sm"></i></button></div></div><div style="font-size:13px; color:var(--cor-secundaria); margin-top:5px; line-height:1.6;">Vendedores: <br>${vends || 'Nenhum'}</div></div>`;
    });
    divLojas.innerHTML = htmlLojas || "<p style='font-size:13px; color:var(--cor-secundaria);'>Nenhuma loja na região.</p>"; selLoja.innerHTML = htmlSelLoja;
    
    let divCheckboxLojas = document.getElementById('modal-promotor-lojas');
    let htmlCheckLojas = lojasDaRegiao.map(l => `<label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" class="check-nova-loja" value="${l}"> ${l}</label>`).join("");
    divCheckboxLojas.innerHTML = htmlCheckLojas || "<i style='font-size:11px;'>Crie lojas primeiro.</i>"; loadIcons();
}

function adminAddPromotorEquipe() {
    let login = document.getElementById('modal-promotor-login').value.trim().toLowerCase();
    let nome = document.getElementById('modal-promotor-nome').value.trim();
    let senha = document.getElementById('modal-promotor-senha').value.trim();
    let meta = parseInt(document.getElementById('modal-promotor-meta').value) || 0;
    if(!login || !nome || !senha) return mostrarToast("Preencha login, nome e senha obrigatórios", "alerta");
    if(bancoUsuarios[login]) return mostrarToast("Este login já existe no sistema", "erro");
    let lojasSelecionadas = Array.from(document.querySelectorAll('.check-nova-loja:checked')).map(cb => cb.value);
    bancoUsuarios[login] = { nome: nome, senha: senha, cargo: "promotor", meta: meta, criadoPor: supervisorGerenciadoAtual, lojasPermitidas: lojasSelecionadas, permissoes: { vendas: document.getElementById('perm-vendas').checked, acomp: document.getElementById('perm-acomp').checked, estoque_ver: document.getElementById('perm-est-ver').checked, estoque_editar: document.getElementById('perm-est-edit').checked } };
    document.getElementById('modal-promotor-login').value = ""; document.getElementById('modal-promotor-nome').value = ""; document.getElementById('modal-promotor-senha').value = ""; document.getElementById('modal-promotor-meta').value = "";
    renderizarModalEquipe(); mostrarToast("Promotor criado! Lembre-se de clicar em SALVAR no topo.", "sucesso");
}

function adminAddGestorSup() {
    let login = document.getElementById('admin-gs-login').value.trim().toLowerCase();
    let nome = document.getElementById('admin-gs-nome').value.trim();
    let senha = document.getElementById('admin-gs-senha').value.trim();
    let cargo = document.getElementById('admin-gs-cargo').value;
    let regiaoSel = document.getElementById('admin-gs-regiao-select').value;
    let regiaoNova = document.getElementById('admin-gs-regiao-input').value.trim().toUpperCase();
    let regiaoFinal = regiaoSel === 'NOVA' ? regiaoNova : regiaoSel;
    if(!login || !nome || !senha) return mostrarToast("Preencha login, nome e senha!", "alerta");
    if(bancoUsuarios[login]) return mostrarToast("Este login já existe!", "erro");
    if(cargo !== 'gestor' && !regiaoFinal) return mostrarToast("Defina a região da equipe!", "alerta");
    bancoUsuarios[login] = { nome: nome, senha: senha, cargo: cargo, regiao: cargo === 'gestor' ? 'GLOBAL' : regiaoFinal, criadoPor: usuarioLogado.id, meta: 0 };
    document.getElementById('admin-gs-login').value = ""; document.getElementById('admin-gs-nome').value = ""; document.getElementById('admin-gs-senha').value = ""; if(document.getElementById('admin-gs-regiao-input')) document.getElementById('admin-gs-regiao-input').value = "";
    renderizarAdminUsuarios(); mostrarToast(cargo.toUpperCase() + " criado com sucesso! Clique em SALVAR no topo.", "sucesso");
}

function adminAddLojaEquipe() { let nome = document.getElementById('modal-loja-nome').value.trim(); let capa = parseInt(document.getElementById('modal-loja-capa').value) || 0; if(!nome) return mostrarToast("Preencha o nome da loja", "alerta"); if(lojasConfig[nome]) return mostrarToast("Loja já existe", "erro"); lojasConfig[nome] = { supervisor: supervisorGerenciadoAtual, capa: capa, vendedores: [] }; document.getElementById('modal-loja-nome').value = ""; document.getElementById('modal-loja-capa').value = ""; renderizarModalEquipe(); mostrarToast("Loja criada. Clique em 'Salvar'.", "info"); }
function adminAddVendedorEquipe() { let loja = document.getElementById('modal-select-loja').value; let nomes = document.getElementById('modal-vendedor-nome').value.trim(); if(!loja) return mostrarToast("Selecione uma loja", "alerta"); if(!nomes) return mostrarToast("Preencha o nome do vendedor", "alerta"); if(!lojasConfig[loja]) lojasConfig[loja] = { supervisor: supervisorGerenciadoAtual, capa: 0, vendedores: [] }; if(!lojasConfig[loja].vendedores) lojasConfig[loja].vendedores = []; let arrayNomes = nomes.split(',').map(n => n.trim()).filter(n => n !== ""); arrayNomes.forEach(n => { if(!lojasConfig[loja].vendedores.includes(n)) lojasConfig[loja].vendedores.push(n); }); document.getElementById('modal-vendedor-nome').value = ""; renderizarModalEquipe(); mostrarToast("Vendedor vinculado. Clique em 'Salvar'.", "info"); }
function adminRemoverUsuarioModalEquipe(login) { if(confirm("Excluir promotor?")) { delete bancoUsuarios[login]; renderizarModalEquipe(); mostrarToast("Promotor removido.", "info"); } }
function adminRemoverLoja(loja) { if(confirm("Excluir loja?")) { delete lojasConfig[loja]; for(let k in bancoUsuarios) { if(bancoUsuarios[k].lojasPermitidas) bancoUsuarios[k].lojasPermitidas = bancoUsuarios[k].lojasPermitidas.filter(l => l !== loja); } renderizarModalEquipe(); mostrarToast("Loja removida.", "info"); } }
function adminRemoverVendedor(loja, vend) { lojasConfig[loja].vendedores = lojasConfig[loja].vendedores.filter(v => v !== vend); renderizarModalEquipe(); mostrarToast("Vendedor removido.", "info"); }
function adminRemoverUsuario(login) { if(confirm(`Excluir usuário ${login}?`)) { delete bancoUsuarios[login]; renderizarAdminUsuarios(); mostrarToast("Usuário excluído. Clique em 'Salvar'.", "info"); } }

function renderizarAdminAparelhos() {
    let div = document.getElementById('lista-admin-aparelhos'); let html = "";
    for(let ap in mapaEmojis) { html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--border-color); font-size:15px; color:var(--cor-texto);"><span><span style="font-size: 20px; margin-right: 8px;">${mapaEmojis[ap]}</span> ${ap.toUpperCase()}</span><button class="btn-excluir" onclick="removerAparelhoGlobal('${ap}')"><i data-lucide="trash-2" class="lucide-sm"></i> Excluir</button></div>`; }
    div.innerHTML = html || "<p style='color:var(--cor-secundaria); font-size:13px;'>Nenhum aparelho cadastrado.</p>"; loadIcons();
}

function removerAparelhoGlobal(ap) { delete mapaEmojis[ap]; renderizarAdminAparelhos(); mostrarToast("Aparelho excluído. Clique em 'Salvar'.", "info"); }

function adminAddAparelho() {
    let n = document.getElementById('admin-aparelho-nome').value.trim().toLowerCase(); let e = document.getElementById('admin-aparelho-emoji').value.trim();
    if(!n || !e) return mostrarToast("Preencha Nome e Emoji", "alerta"); if(mapaEmojis[n]) return mostrarToast("Aparelho já existe", "erro");
    mapaEmojis[n] = e; document.getElementById('admin-aparelho-nome').value = ""; document.getElementById('admin-aparelho-emoji').value = ""; renderizarAdminAparelhos(); mostrarToast("Aparelho adicionado. Clique em 'Salvar'.", "info");
}

// SUBSTITUIR NA PARTE 10
function renderizarInputsFoco() {
    const container = document.getElementById('admin-foco-container'); const selSup = document.getElementById('seletor-foco-sup'); 
    if (!container || !selSup) return;
    let supId = selSup.value; let premiumSup = aparelhosPremium[supId] || aparelhosPremium["geral"] || {}; let taxaSup = taxasCoparticipacao[supId] || taxasCoparticipacao["geral"] || 25; let vComissaoSup = valoresComissao[supId] || valoresComissao["geral"] || {}; 
    let grupos = vComissaoSup.grupos || []; let aparelhosCfg = vComissaoSup.aparelhos || {}; let campanhasAtivas = vComissaoSup.campanhasPersonalizadas || [];
    let marcasConcorrentes = vComissaoSup.marcas_concorrentes || ["Samsung", "Motorola", "Outros"];
    let gamificacao = vComissaoSup.gamificacao || { iconeTop1: '👑', iconeMeta: '🎯', iconeFire: '🔥', minFire: 5 };

    document.getElementById('input-taxa-copart').value = taxaSup;

    // NOVO BLOCO DE GAMIFICAÇÃO AQUI
    let htmlGamificacao = `<div style="background: var(--bg-item); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color); margin-top: 20px; text-align: left;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;"><span style="font-size: 14px; font-weight: bold; color: #ef4444;"><i data-lucide="award" class="lucide-sm"></i> Gamificação (Ranking e Troféus)</span></div><div style="display: flex; gap: 10px; flex-wrap: wrap;"><div style="flex: 1; min-width: 120px;"><span style="font-size:11px; font-weight:bold; color:var(--cor-secundaria);">Ícone Top 1:</span><input type="text" id="gami-icone-top1" value="${gamificacao.iconeTop1}" style="padding:10px; margin-top:4px;" onchange="atualizarListaPremiumGlobal()"></div><div style="flex: 1; min-width: 120px;"><span style="font-size:11px; font-weight:bold; color:var(--cor-secundaria);">Ícone Meta:</span><input type="text" id="gami-icone-meta" value="${gamificacao.iconeMeta}" style="padding:10px; margin-top:4px;" onchange="atualizarListaPremiumGlobal()"></div><div style="flex: 1; min-width: 120px;"><span style="font-size:11px; font-weight:bold; color:var(--cor-secundaria);">Ícone "On Fire":</span><input type="text" id="gami-icone-fire" value="${gamificacao.iconeFire}" style="padding:10px; margin-top:4px;" onchange="atualizarListaPremiumGlobal()"></div><div style="flex: 1; min-width: 120px;"><span style="font-size:11px; font-weight:bold; color:var(--cor-secundaria);">Premium p/ Fire:</span><input type="number" id="gami-min-fire" value="${gamificacao.minFire}" style="padding:10px; margin-top:4px;" onchange="atualizarListaPremiumGlobal()"></div></div></div>`;

    let htmlGrupos = '<div style="background: var(--bg-item); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color); margin-top: 20px; text-align: left;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;"><span style="font-size: 15px; font-weight: bold; color: #8b5cf6;"><i data-lucide="layers" class="lucide-sm"></i> Categorias de Comissionamento</span><button class="btn-acao btn-enviar" style="padding: 8px 14px; font-size: 12px; width: auto; background: #8b5cf6;" onclick="adminAddGrupo()"><i data-lucide="plus"></i> Nova Categoria</button></div>';
    if(grupos.length === 0) htmlGrupos += '<span style="font-size:12px; color:var(--cor-secundaria);">Crie categorias para somar o volume de vendas.</span>';
    grupos.forEach((g) => {
        htmlGrupos += `<div class="bloco-grupo" data-id="${g.id}" style="background:var(--bg-container); padding:15px; border-radius:12px; border: 1px solid var(--border-color); margin-bottom:12px;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;"><input type="text" class="grupo-nome" value="${g.nome}" style="font-weight:bold; color:var(--primary); width:180px; margin:0; padding:8px; border-color:var(--primary);" onchange="adminEditGrupoNome('${g.id}', this.value)"><div style="display:flex; gap:8px;"><button class="btn-editar" style="font-size:11px; padding:6px 10px;" onclick="adminAddNivelGrupo('${g.id}')">+ Nível</button><button class="btn-excluir" style="padding:6px 10px;" onclick="adminRemoverGrupo('${g.id}')"><i data-lucide="trash-2" class="lucide-sm" style="margin:0;"></i></button></div></div>`;
        g.niveis.forEach((nv, nIdx) => { htmlGrupos += `<div style="display:flex; align-items:center; gap:10px; margin-bottom:8px; font-size:13px; background:var(--bg-item); padding:8px 12px; border-radius:8px; border: 1px dashed var(--border-color);"><span>Nível ${nIdx + 1} - Atingindo</span> <input type="number" value="${nv.meta}" style="width:70px; margin:0; padding:6px; font-weight:bold;" onchange="adminEditGrupoNivel('${g.id}', ${nIdx}, 'meta', this.value)"> <span>unidades.</span><button class="btn-excluir" style="padding:4px 8px; margin-left:auto; font-size:10px;" onclick="adminRemoverNivelGrupo('${g.id}', ${nIdx})"><i data-lucide="x" style="margin:0;"></i></button></div>`; });
        htmlGrupos += `</div>`;
    });
    htmlGrupos += '</div>';

    let htmlCampanhas = '<div style="background: var(--bg-item); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color); margin-top: 20px; text-align: left;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;"><span style="font-size: 14px; font-weight: bold; color: #f59e0b;"><i data-lucide="gift" class="lucide-sm"></i> Campanhas Extra</span><button class="btn-acao btn-enviar" style="background-color: #f59e0b; padding: 8px 14px; font-size: 12px; width: auto;" onclick="adicionarLinhaCampanha()"><i data-lucide="plus"></i> Nova Regra</button></div><div id="container-linhas-campanhas" style="display: flex; flex-direction: column; gap: 12px;">';
    if (campanhasAtivas.length === 0) { htmlCampanhas += '<span style="font-size: 13px; color: var(--cor-secundaria); font-style: italic;">Nenhuma campanha ativa.</span>'; }
    campanhasAtivas.forEach((camp, index) => {
        let optionsAparelhos = '<option value="todos">Qualquer Aparelho</option>'; for (let ap in mapaEmojis) { let sel = camp.aparelho === ap ? "selected" : ""; optionsAparelhos += `<option value="${ap}" ${sel}>${mapaEmojis[ap]} ${ap.toUpperCase()}</option>`; }
        let optionsPromotores = '<option value="todos">Toda a Equipe</option>'; for (let pk in bancoUsuarios) { if (bancoUsuarios[pk].cargo === "promotor" && (supId === 'geral' || bancoUsuarios[pk].criadoPor === supId)) { let selP = (camp.promotorAlvo === pk) ? "selected" : ""; optionsPromotores += `<option value="${pk}" ${selP}>👤 ${bancoUsuarios[pk].nome || pk}</option>`; } }
        htmlCampanhas += `<div class="linha-campanha-dinamica" style="background: var(--bg-container); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 10px;"><div style="display: flex; gap: 10px; flex-wrap: wrap;"><select class="camp-aparelho" style="margin-bottom:0; padding:10px; flex:1;" onchange="atualizarListaPremiumGlobal()">${optionsAparelhos}</select><select class="camp-promotor" style="margin-bottom:0; padding:10px; flex:1;" onchange="atualizarListaPremiumGlobal()">${optionsPromotores}</select><button class="btn-excluir" style="padding: 10px;" onclick="removerLinhaCampanha(${index})"><i data-lucide="trash-2" style="margin:0;"></i></button></div><div style="display: flex; gap: 10px; flex-wrap: wrap;"><div style="display: flex; align-items:center; gap:6px; flex:1;"><span style="font-size:11px;">Qtd Min.</span><input type="number" class="camp-qtd" value="${camp.qtdMinima || 1}" style="margin-bottom:0; padding:10px;" onchange="atualizarListaPremiumGlobal()"></div><div style="display: flex; align-items:center; gap:6px; flex:1;"><span style="font-size:11px;">Bônus(R$)</span><input type="number" class="camp-valor" value="${camp.bonus || 0}" style="margin-bottom:0; padding:10px;" onchange="atualizarListaPremiumGlobal()"></div></div></div>`;
    }); 
    htmlCampanhas += '</div></div>';

    let htmlMarcas = `<div style="background: var(--bg-item); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color); margin-top: 20px; text-align: left;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;"><span style="font-size: 14px; font-weight: bold; color: #3b82f6;"><i data-lucide="pie-chart" class="lucide-sm"></i> Marcas da Concorrência</span><button class="btn-acao btn-enviar" style="background-color: #3b82f6; padding: 8px 14px; font-size: 12px; width: auto;" onclick="adminAddMarcaConcorrente()"><i data-lucide="plus"></i> Nova Marca</button></div><div style="display: flex; gap: 8px; flex-wrap: wrap;">`;
    marcasConcorrentes.forEach((marca, idx) => {
        htmlMarcas += `<span style="background: var(--bg-container); border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 8px; color: var(--cor-texto);">${marca} <i data-lucide="x" class="lucide-sm" style="cursor:pointer; color:#ef4444;" onclick="adminRemoverMarcaConcorrente(${idx})"></i></span>`;
    });
    htmlMarcas += `</div></div>`;

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
                grupoEncontrado.niveis.forEach((nv, nIdx) => {
                    let valorNivelAp = (cfg.valores && cfg.valores[nIdx]) ? cfg.valores[nIdx] : 0;
                    htmlAparelhos += `<div style="flex:1; min-width:110px; background:var(--bg-container); border:1px solid var(--border-color); padding:10px; border-radius:8px;"><span style="font-size:11px; font-weight:bold; color:var(--primary); display:block;">Paga no Nível ${nIdx + 1}:</span><div style="display:flex; align-items:center; gap:4px; margin-top:4px;">R$ <input type="number" class="ap-valor-grupo-nivel" data-ap="${ap}" data-nidx="${nIdx}" value="${valorNivelAp}" style="margin:0; padding:6px; font-weight:bold;" onchange="atualizarListaPremiumGlobal()"></div></div>`;
                });
                htmlAparelhos += `</div>`;
            }
        }
        htmlAparelhos += `</div></div>`;
    }
    htmlAparelhos += '</div>';
    
    // AQUI INJETAMOS A GAMIFICAÇÃO TAMBÉM
    container.innerHTML = htmlGamificacao + htmlGrupos + htmlCampanhas + htmlMarcas + htmlAparelhos; 
    loadIcons();
}

function atualizarListaPremiumGlobal() {
    let selSup = document.getElementById('seletor-foco-sup').value;
    let taxaInputs = document.getElementById('input-taxa-copart'); if (taxaInputs) taxasCoparticipacao[selSup] = Number(taxaInputs.value);
    
    let pObj = {}; document.querySelectorAll('.check-foco-aparelho').forEach(cb => { if (cb.checked) pObj[cb.value] = 1; }); aparelhosPremium[selSup] = pObj;
    if (!valoresComissao[selSup]) valoresComissao[selSup] = {};
    
    // SALVANDO A GAMIFICAÇÃO
    valoresComissao[selSup].gamificacao = {
        iconeTop1: document.getElementById('gami-icone-top1') ? document.getElementById('gami-icone-top1').value : '👑',
        iconeMeta: document.getElementById('gami-icone-meta') ? document.getElementById('gami-icone-meta').value : '🎯',
        iconeFire: document.getElementById('gami-icone-fire') ? document.getElementById('gami-icone-fire').value : '🔥',
        minFire: document.getElementById('gami-min-fire') ? Number(document.getElementById('gami-min-fire').value) : 5
    };

    let campanhas = []; document.querySelectorAll('.linha-campanha-dinamica').forEach(bloco => { campanhas.push({ aparelho: bloco.querySelector('.camp-aparelho').value, promotorAlvo: bloco.querySelector('.camp-promotor').value, qtdMinima: Number(bloco.querySelector('.camp-qtd').value), bonus: Number(bloco.querySelector('.camp-valor').value) }); }); valoresComissao[selSup].campanhasPersonalizadas = campanhas;
    
    if(!valoresComissao[selSup].aparelhos) valoresComissao[selSup].aparelhos = {};
    let cfgAp = valoresComissao[selSup].aparelhos;

    document.querySelectorAll('.ap-tipo-regra').forEach(sel => {
         let ap = sel.getAttribute('data-ap'); let val = sel.value; if (!cfgAp[ap]) cfgAp[ap] = {};
         if (val === 'nenhum') { cfgAp[ap] = { tipo: 'nenhum' }; } 
         else if (val === 'fixo') { let inputFixo = document.querySelector(`.ap-valor-fixo[data-ap="${ap}"]`); cfgAp[ap] = { tipo: 'fixo', valorFixo: inputFixo ? Number(inputFixo.value) : 0 }; } 
         else if (val.startsWith('grupo_')) { 
              let gId = val.replace('grupo_', ''); cfgAp[ap] = { tipo: 'grupo', grupoId: gId, valores: {} };
              document.querySelectorAll(`.ap-valor-grupo-nivel[data-ap="${ap}"]`).forEach(inp => { let nIdx = inp.getAttribute('data-nidx'); cfgAp[ap].valores[nIdx] = Number(inp.value); });
         }
    });
}

function adminAddGrupo() { let selSup = document.getElementById('seletor-foco-sup').value; if (!valoresComissao[selSup]) valoresComissao[selSup] = {}; if (!valoresComissao[selSup].grupos) valoresComissao[selSup].grupos = []; valoresComissao[selSup].grupos.push({ id: 'g' + Date.now(), nome: 'Nova Categoria', niveis: [{ meta: 1 }] }); renderizarInputsFoco(); atualizarListaPremiumGlobal(); }
function adminRemoverGrupo(gId) { let selSup = document.getElementById('seletor-foco-sup').value; valoresComissao[selSup].grupos = valoresComissao[selSup].grupos.filter(g => g.id !== gId); if(valoresComissao[selSup].aparelhos) { for (let ap in valoresComissao[selSup].aparelhos) { let cfg = valoresComissao[selSup].aparelhos[ap]; if (cfg.tipo === 'grupo' && cfg.grupoId === gId) { cfg.tipo = 'nenhum'; delete cfg.grupoId; } } } renderizarInputsFoco(); atualizarListaPremiumGlobal(); }
function adminAddNivelGrupo(gId) { let selSup = document.getElementById('seletor-foco-sup').value; let g = valoresComissao[selSup].grupos.find(x => x.id === gId); if (g) { g.niveis.push({ meta: 10 }); renderizarInputsFoco(); atualizarListaPremiumGlobal(); } }
function adminRemoverNivelGrupo(gId, nIdx) { let selSup = document.getElementById('seletor-foco-sup').value; let g = valoresComissao[selSup].grupos.find(x => x.id === gId); if (g) { g.niveis.splice(nIdx, 1); renderizarInputsFoco(); atualizarListaPremiumGlobal(); } }
function adminEditGrupoNome(gId, val) { let selSup = document.getElementById('seletor-foco-sup').value; let g = valoresComissao[selSup].grupos.find(x => x.id === gId); if (g) { g.nome = val; atualizarListaPremiumGlobal(); } }
function adminEditGrupoNivel(gId, nIdx, field, val) { let selSup = document.getElementById('seletor-foco-sup').value; let g = valoresComissao[selSup].grupos.find(x => x.id === gId); if (g && g.niveis[nIdx]) { g.niveis[nIdx][field] = Number(val); atualizarListaPremiumGlobal(); } }
function adminMudarTipoComissaoAp(ap, val) { atualizarListaPremiumGlobal(); renderizarInputsFoco(); }

function atualizarListaPremiumGlobal() {
    let selSup = document.getElementById('seletor-foco-sup').value;
    let taxaInputs = document.getElementById('input-taxa-copart'); if (taxaInputs) taxasCoparticipacao[selSup] = Number(taxaInputs.value);
    
    let pObj = {}; document.querySelectorAll('.check-foco-aparelho').forEach(cb => { if (cb.checked) pObj[cb.value] = 1; }); aparelhosPremium[selSup] = pObj;
    if (!valoresComissao[selSup]) valoresComissao[selSup] = {};
    
    let campanhas = []; document.querySelectorAll('.linha-campanha-dinamica').forEach(bloco => { campanhas.push({ aparelho: bloco.querySelector('.camp-aparelho').value, promotorAlvo: bloco.querySelector('.camp-promotor').value, qtdMinima: Number(bloco.querySelector('.camp-qtd').value), bonus: Number(bloco.querySelector('.camp-valor').value) }); }); valoresComissao[selSup].campanhasPersonalizadas = campanhas;
    
    if(!valoresComissao[selSup].aparelhos) valoresComissao[selSup].aparelhos = {};
    let cfgAp = valoresComissao[selSup].aparelhos;

    document.querySelectorAll('.ap-tipo-regra').forEach(sel => {
         let ap = sel.getAttribute('data-ap'); let val = sel.value; if (!cfgAp[ap]) cfgAp[ap] = {};
         if (val === 'nenhum') { cfgAp[ap] = { tipo: 'nenhum' }; } 
         else if (val === 'fixo') { let inputFixo = document.querySelector(`.ap-valor-fixo[data-ap="${ap}"]`); cfgAp[ap] = { tipo: 'fixo', valorFixo: inputFixo ? Number(inputFixo.value) : 0 }; } 
         else if (val.startsWith('grupo_')) { 
              let gId = val.replace('grupo_', ''); cfgAp[ap] = { tipo: 'grupo', grupoId: gId, valores: {} };
              document.querySelectorAll(`.ap-valor-grupo-nivel[data-ap="${ap}"]`).forEach(inp => { let nIdx = inp.getAttribute('data-nidx'); cfgAp[ap].valores[nIdx] = Number(inp.value); });
         }
    });
}

function adicionarLinhaCampanha() { let selSup = document.getElementById('seletor-foco-sup').value; if (!valoresComissao[selSup]) valoresComissao[selSup] = {}; if (!valoresComissao[selSup].campanhasPersonalizadas) valoresComissao[selSup].campanhasPersonalizadas = []; valoresComissao[selSup].campanhasPersonalizadas.push({ aparelho: 'todos', promotorAlvo: 'todos', qtdMinima: 1, bonus: 50 }); renderizarInputsFoco(); }
function removerLinhaCampanha(index) { let selSup = document.getElementById('seletor-foco-sup').value; if (valoresComissao[selSup] && valoresComissao[selSup].campanhasPersonalizadas) { valoresComissao[selSup].campanhasPersonalizadas.splice(index, 1); renderizarInputsFoco(); atualizarListaPremiumGlobal(); } }

function fecharModalEdicao() { document.getElementById('modal-edicao').classList.remove('ativo'); }

window.opcoesInteligentesMeta = function() {
    let options = `<option value="" disabled selected>+ Clique para adicionar modelo...</option>`;
    options += `<optgroup label="Famílias (Agrupados)">`;
    options += `<option value="RENO">📱 Toda a Linha RENO</option>`;
    options += `<option value=" A">📱 Toda a Linha A</option>`; 
    options += `</optgroup>`;
    options += `<optgroup label="Aparelhos Específicos">`;
    for (let ap in mapaEmojis) {
        let nomeUpper = ap.toUpperCase();
        options += `<option value="${nomeUpper}">${mapaEmojis[ap]} ${nomeUpper}</option>`;
    }
    options += `</optgroup>`;
    return options;
};

function adminAbrirModalMeta(login) { 
    document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="target"></i> Metas (@${login})`; 
    
    let metaGeral = bancoUsuarios[login].meta || 0;
    let metaPremAbs = bancoUsuarios[login].metaPremiumAbs !== undefined ? bancoUsuarios[login].metaPremiumAbs : '';
    let metasLinhas = bancoUsuarios[login].metasLinhas || [];

    let linhasHtml = '';
    metasLinhas.forEach((m) => {
        linhasHtml += `
        <div class="linha-meta-especifica" style="display:flex; gap:8px; margin-bottom:12px; align-items:flex-start;">
            <div style="flex:2; display:flex; flex-direction:column; gap:4px;">
                <div style="display:flex; border: 1px solid var(--border-color); border-radius: 8px; overflow:hidden; background:var(--bg-input);">
                    <input type="text" class="input-linha-nome" value="${m.linha}" readonly placeholder="Modelos agrupados..." style="border:none; padding:10px; width:100%; font-size:11px; font-weight:bold; color:var(--primary); background:transparent; margin:0;">
                    <button class="btn-excluir" onclick="this.previousElementSibling.value=''" style="padding:10px; border-radius:0; background:transparent;"><i data-lucide="x" style="margin:0; color:#ef4444; width:14px;"></i></button>
                </div>
                <select onchange="if(this.value){ let inp = this.previousElementSibling.querySelector('.input-linha-nome'); inp.value = inp.value ? inp.value + ', ' + this.value : this.value; this.selectedIndex = 0; }" style="margin:0; padding:8px; border-radius:8px; border-color:var(--primary); font-size:11px; background: var(--bg-item); color: var(--cor-texto);">
                    ${window.opcoesInteligentesMeta()}
                </select>
            </div>
            <input type="number" class="input-linha-qtd" value="${m.qtd}" placeholder="Qtd" style="flex:0.6; margin:0; padding:10px; border-radius:8px; height: 36px; text-align:center;">
            <button class="btn-excluir" onclick="this.parentElement.remove()" style="padding:10px; border-radius:8px; height: 36px;"><i data-lucide="trash-2" style="margin:0;"></i></button>
        </div>`;
    });

    document.getElementById('modal-edicao-corpo').innerHTML = `
        <div style="background: var(--bg-item); padding: 15px; border-radius: 12px; margin-bottom: 15px; border: 1px solid var(--border-color);">
            <label style="font-size: 13px; font-weight: bold; color: var(--cor-texto); display: flex; align-items: center; gap:6px; margin-bottom: 8px;"><i data-lucide="shopping-bag" class="lucide-sm" style="color:var(--primary);"></i> Meta Global da Loja (Volume):</label>
            <input type="number" id="input-edit-meta" value="${metaGeral}" placeholder="Ex: 50" style="margin-bottom: 0; font-size: 16px; font-weight: bold;">
        </div>
        
        <div style="background: rgba(16, 185, 129, 0.05); padding: 15px; border-radius: 12px; margin-bottom: 15px; border: 1px dashed #10b981;">
            <label style="font-size: 13px; font-weight: bold; color: #10b981; display: flex; align-items: center; gap:6px; margin-bottom: 8px;"><i data-lucide="star" class="lucide-sm"></i> Meta Foco/Premium Específica:</label>
            <input type="number" id="input-edit-prem-abs" value="${metaPremAbs}" placeholder="Vazio = Usa a % da Equipe" style="margin-bottom: 0; border-color: #10b981; font-weight: bold;">
        </div>
        
        <div style="border-top: 1px dashed var(--border-color); padding-top: 15px; margin-top: 15px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <label style="font-size: 13px; font-weight: bold; color: var(--primary); margin:0; display: flex; align-items: center; gap:6px;"><i data-lucide="smartphone" class="lucide-sm"></i> Bolsões de Meta (Mix):</label>
                <button class="btn-editar" onclick="adicionarInputLinhaMeta()" style="padding:6px 10px; font-size:11px; background:var(--primary); color:white;"><i data-lucide="plus" class="lucide-sm"></i> Linha</button>
            </div>
            <div id="container-metas-linhas">
                ${linhasHtml}
            </div>
        </div>
    `; 
    
    let btn = document.getElementById('btn-salvar-edicao'); 
    btn.onclick = function() { 
        let valMeta = parseInt(document.getElementById('input-edit-meta').value) || 0; 
        let valPremAbs = document.getElementById('input-edit-prem-abs').value.trim();
        
        let arrayLinhas = [];
        document.querySelectorAll('.linha-meta-especifica').forEach(el => {
            let nomeLinha = el.querySelector('.input-linha-nome').value.trim().toUpperCase();
            let qtdLinha = parseInt(el.querySelector('.input-linha-qtd').value) || 0;
            if (nomeLinha && qtdLinha > 0) { arrayLinhas.push({ linha: nomeLinha, qtd: qtdLinha }); }
        });

        bancoUsuarios[login].meta = valMeta; 
        bancoUsuarios[login].metasLinhas = arrayLinhas;
        
        if (valPremAbs !== "") { bancoUsuarios[login].metaPremiumAbs = parseInt(valPremAbs); } 
        else { delete bancoUsuarios[login].metaPremiumAbs; }
        
        mostrarToast("Metas Inteligentes atualizadas!", "sucesso"); 
        fecharModalEdicao(); 
        if (document.getElementById('modal-gerenciar-equipe').classList.contains('ativa')) renderizarModalEquipe(); 
    }; 
    document.getElementById('modal-edicao').classList.add('ativo'); 
    loadIcons(); 
}

window.adicionarInputLinhaMeta = function() {
    let container = document.getElementById('container-metas-linhas');
    let div = document.createElement('div');
    div.className = 'linha-meta-especifica';
    div.style.cssText = 'display:flex; gap:8px; margin-bottom:12px; align-items:flex-start; animation: fadeIn 0.3s;';
    div.innerHTML = `
        <div style="flex:2; display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; border: 1px solid var(--border-color); border-radius: 8px; overflow:hidden; background:var(--bg-input);">
                <input type="text" class="input-linha-nome" readonly placeholder="Adicione modelos abaixo 👇" style="border:none; padding:10px; width:100%; font-size:11px; font-weight:bold; color:var(--primary); background:transparent; margin:0;">
                <button class="btn-excluir" onclick="this.previousElementSibling.value=''" style="padding:10px; border-radius:0; background:transparent;"><i data-lucide="x" style="margin:0; color:#ef4444; width:14px;"></i></button>
            </div>
            <select onchange="if(this.value){ let inp = this.previousElementSibling.querySelector('.input-linha-nome'); inp.value = inp.value ? inp.value + ', ' + this.value : this.value; this.selectedIndex = 0; }" style="margin:0; padding:8px; border-radius:8px; border-color:var(--primary); font-size:11px; background: var(--bg-item); color: var(--cor-texto);">
                ${window.opcoesInteligentesMeta()}
            </select>
        </div>
        <input type="number" class="input-linha-qtd" placeholder="Qtd" style="flex:0.6; margin:0; padding:10px; border-radius:8px; height: 36px; text-align:center;">
        <button class="btn-excluir" onclick="this.parentElement.remove()" style="padding:10px; border-radius:8px; height: 36px;"><i data-lucide="trash-2" style="margin:0;"></i></button>
    `;
    container.appendChild(div);
    loadIcons();
}

function adminAbrirModalSenha(login) { document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="key"></i> Senha (@${login})`; document.getElementById('modal-edicao-corpo').innerHTML = `<input type="text" id="input-edit-senha" value="${bancoUsuarios[login].senha}" placeholder="Nova Senha">`; let btn = document.getElementById('btn-salvar-edicao'); btn.onclick = function() { let val = document.getElementById('input-edit-senha').value.trim(); if(val) { bancoUsuarios[login].senha = val; mostrarToast("Senha alterada!", "sucesso"); fecharModalEdicao(); renderizarAdminUsuarios(); if (document.getElementById('modal-gerenciar-equipe').classList.contains('ativa')) renderizarModalEquipe(); } }; document.getElementById('modal-edicao').classList.add('ativo'); loadIcons(); }
function adminAbrirModalNome(login) { document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="edit-3"></i> Nome (@${login})`; document.getElementById('modal-edicao-corpo').innerHTML = `<input type="text" id="input-edit-nome" value="${bancoUsuarios[login].nome || login}" placeholder="Nome Completo">`; let btn = document.getElementById('btn-salvar-edicao'); btn.onclick = function() { let val = document.getElementById('input-edit-nome').value.trim(); if(val) { bancoUsuarios[login].nome = val; mostrarToast("Nome alterada!", "sucesso"); fecharModalEdicao(); renderizarAdminUsuarios(); if (document.getElementById('modal-gerenciar-equipe').classList.contains('ativa')) renderizarModalEquipe(); } }; document.getElementById('modal-edicao').classList.add('ativo'); loadIcons(); }
function adminAbrirModalRegiao(login) { document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="globe"></i> Região (@${login})`; document.getElementById('modal-edicao-corpo').innerHTML = `<input type="text" id="input-edit-regiao" value="${bancoUsuarios[login].regiao || ''}" placeholder="Nome da Região">`; let btn = document.getElementById('btn-salvar-edicao'); btn.onclick = function() { let val = document.getElementById('input-edit-regiao').value.trim().toUpperCase(); if(val) { bancoUsuarios[login].regiao = val; mostrarToast("Região alterada!", "sucesso"); fecharModalEdicao(); renderizarAdminUsuarios(); } }; document.getElementById('modal-edicao').classList.add('ativo'); loadIcons(); }
function adminAbrirModalCapa(loja) { document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="layers"></i> Capa (${loja})`; document.getElementById('modal-edicao-corpo').innerHTML = `<input type="number" id="input-edit-capa" value="${lojasConfig[loja].capa || 0}" placeholder="Capa da Loja">`; let btn = document.getElementById('btn-salvar-edicao'); btn.onclick = function() { let val = parseInt(document.getElementById('input-edit-capa').value) || 0; lojasConfig[loja].capa = val; mostrarToast("Capa alterada!", "sucesso"); fecharModalEdicao(); if (document.getElementById('modal-gerenciar-equipe').classList.contains('ativa')) renderizarModalEquipe(); }; document.getElementById('modal-edicao').classList.add('ativo'); loadIcons(); }
function adminAbrirModalPermissoes(login) { let p = bancoUsuarios[login].permissoes || { vendas: true, acomp: true, estoque_ver: true, estoque_editar: true }; document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="shield"></i> Permissões (@${login})`; let html = `<div style="display:flex; flex-direction:column; gap:10px; font-size: 14px; color: var(--cor-texto);">`; html += `<label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" id="edit-p-vendas" ${p.vendas ? 'checked':''}> Lançar Vendas</label>`; html += `<label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" id="edit-p-acomp" ${p.acomp ? 'checked':''}> Acompanhamento</label>`; html += `<label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" id="edit-p-est-ver" ${p.estoque_ver ? 'checked':''}> Ver Estoque</label>`; html += `<label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" id="edit-p-est-edit" ${p.estoque_editar ? 'checked':''}> Editar Estoque</label></div>`; document.getElementById('modal-edicao-corpo').innerHTML = html; let btn = document.getElementById('btn-salvar-edicao'); btn.onclick = function() { bancoUsuarios[login].permissoes = { vendas: document.getElementById('edit-p-vendas').checked, acomp: document.getElementById('edit-p-acomp').checked, estoque_ver: document.getElementById('edit-p-est-ver').checked, estoque_editar: document.getElementById('edit-p-est-edit').checked }; mostrarToast("Permissões atualizadas!", "sucesso"); fecharModalEdicao(); }; document.getElementById('modal-edicao').classList.add('ativo'); loadIcons(); }

function adminAbrirModalLojas(login) { 
    document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="store"></i> Lojas (@${login})`; 
    let permitidas = bancoUsuarios[login].lojasPermitidas || []; 
    let supLojas = getLojasDaRegiao(bancoUsuarios[login].criadoPor || usuarioLogado.id); 
    if (usuarioLogado.id === "master" || usuarioLogado.cargo === "gestor") { supLojas = Object.keys(lojasConfig); } 
    let html = '<div style="display:flex; flex-direction:column; gap:8px; max-height:200px; overflow-y:auto; text-align:left; color: var(--cor-texto); font-size:14px;">'; 
    supLojas.forEach(l => { 
        let checked = permitidas.includes(l) ? 'checked' : ''; 
        html += `<label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" class="edit-loja-check" value="${l}" ${checked}> ${l}</label>`; 
    }); 
    html += '</div>'; 
    if(supLojas.length === 0) html = "<p style='font-size:13px; color:var(--cor-secundaria);'>Nenhuma loja disponível.</p>"; 
    document.getElementById('modal-edicao-corpo').innerHTML = html; 
    
    let btn = document.getElementById('btn-salvar-edicao'); 
    btn.onclick = function() { 
        let selecionadas = Array.from(document.querySelectorAll('.edit-loja-check:checked')).map(cb => cb.value); 
        bancoUsuarios[login].lojasPermitidas = selecionadas; 
        mostrarToast("Lojas atualizadas!", "sucesso"); 
        fecharModalEdicao(); 
        if (document.getElementById('modal-gerenciar-equipe').classList.contains('ativa')) renderizarModalEquipe(); 
    }; 
    document.getElementById('modal-edicao').classList.add('ativo'); 
    loadIcons(); 
}

window.adminAddMarcaConcorrente = function() { document.getElementById('input-nova-marca').value = ""; document.getElementById('modal-nova-marca').classList.add('ativo'); loadIcons(); };
window.fecharModalNovaMarca = function() { document.getElementById('modal-nova-marca').classList.remove('ativo'); };

window.confirmarNovaMarca = function() {
    let selSup = document.getElementById('seletor-foco-sup').value;
    let novaMarca = document.getElementById('input-nova-marca').value.trim();
    if (!novaMarca) return mostrarToast("Digite o nome da marca.", "alerta");
    if (!valoresComissao[selSup]) valoresComissao[selSup] = {};
    if (!valoresComissao[selSup].marcas_concorrentes) valoresComissao[selSup].marcas_concorrentes = ["Samsung", "Motorola", "Outros"];
    valoresComissao[selSup].marcas_concorrentes.push(novaMarca);
    if (typeof renderizarInputsFoco === "function") renderizarInputsFoco();
    if (typeof atualizarListaPremiumGlobal === "function") atualizarListaPremiumGlobal();
    mostrarToast("Marca adicionada! Clique em 'Salvar' no topo.", "sucesso");
    fecharModalNovaMarca();
};

window.adminRemoverMarcaConcorrente = function(idx) {
    let selSup = document.getElementById('seletor-foco-sup').value;
    if (valoresComissao[selSup] && valoresComissao[selSup].marcas_concorrentes) {
        valoresComissao[selSup].marcas_concorrentes.splice(idx, 1);
        if (typeof renderizarInputsFoco === "function") renderizarInputsFoco();
        if (typeof atualizarListaPremiumGlobal === "function") atualizarListaPremiumGlobal();
    }
};

async function abrirBatalha() {
    mudarTela('tela-batalha');
    const grid = document.getElementById('grid-batalha-aparelhos');
    if (!grid) return; 
    let html = "";
    for (let ap in mapaEmojis) {
        html += `<div class="item-aparelho" onclick="carregarCardTatico('${ap}')" style="cursor: pointer;"><div class="card-aparelho" style="width: 75px; height: 75px;"><span class="emoji-card" style="font-size: 32px;">${mapaEmojis[ap]}</span></div><span class="nome-card" style="font-size: 11px;">${ap.toUpperCase()}</span></div>`;
    }
    grid.innerHTML = html || "<div class='mensagem-vazia'>Nenhum aparelho cadastrado.</div>";
    document.getElementById('card-tatico-detalhe').style.display = "none";
    loadIcons();
}

async function carregarCardTatico(aparelhoNome) {
    mostrarToast(`Buscando táticas para ${aparelhoNome.toUpperCase()}...`, "info");
    let supId = usuarioLogado.criadoPor || "geral";
    if (usuarioLogado.cargo === "supervisor") supId = usuarioLogado.id;
    if (usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master") supId = "geral";
    
    try {
        const { data } = await supabaseClient.from('catalogo_batalha').select('*').eq('supervisor_login', supId).eq('aparelho_chave', aparelhoNome.toLowerCase()).single();
        let argumentos = "Nenhum argumento cadastrado pelo supervisor para este aparelho ainda.";
        let contra = "Nenhum contra-ataque cadastrado.";
        let pdfUrl = "";
        
        if (data) { argumentos = data.argumentos || argumentos; contra = data.contra_ataque || contra; pdfUrl = data.pdf_url || ""; }
        
        document.getElementById('batalha-titulo-aparelho').innerHTML = `${mapaEmojis[aparelhoNome] || ''} ${aparelhoNome.toUpperCase()}`;
        document.getElementById('batalha-texto-argumentos').innerText = argumentos;
        document.getElementById('batalha-texto-contra').innerText = contra;
        
        let containerPdf = document.getElementById('container-pdf-batalha');
        if (pdfUrl) { document.getElementById('link-pdf-batalha').href = pdfUrl; containerPdf.style.display = "block"; } else { containerPdf.style.display = "none"; }
        
        document.getElementById('card-tatico-detalhe').style.display = "block";
        loadIcons();
    } catch (e) {
        console.error("Erro ao carregar card tático:", e);
        document.getElementById('batalha-titulo-aparelho').innerHTML = `${mapaEmojis[aparelhoNome] || ''} ${aparelhoNome.toUpperCase()}`;
        document.getElementById('batalha-texto-argumentos').innerText = "Cadastre os argumentos na aba Ajustes.";
        document.getElementById('batalha-texto-contra').innerText = "Cadastre os contra-ataques na aba Ajustes.";
        document.getElementById('container-pdf-batalha').style.display = "none";
        document.getElementById('card-tatico-detalhe').style.display = "block";
        loadIcons();
    }
}

function abrirModalFechamento() {
    let selLoja = document.getElementById('select-loja-share');
    let htmlLojas = ''; let lojas = [];
    
    if (usuarioLogado.cargo === "promotor") {
        lojas = usuarioLogado.lojasPermitidas || [];
        if (typeof lojas === 'string') { try { lojas = JSON.parse(lojas); } catch(e) { lojas = [lojas]; } }
    } else if (usuarioLogado.cargo === "supervisor" && typeof getLojasDaRegiao === "function") { lojas = getLojasDaRegiao(usuarioLogado.id); } 
    else { lojas = Object.keys(lojasConfig); }

    if (!lojas || lojas.length === 0) return mostrarToast("Nenhuma loja encontrada na sua região.", "alerta");
    
    lojas.sort().forEach(l => { let nomePromotor = getPromotorDaLoja(l); htmlLojas += `<option value="${l}">${l} (👤 ${nomePromotor})</option>`; });
    selLoja.innerHTML = htmlLojas;

    let supId = usuarioLogado.criadoPor || "geral";
    if (usuarioLogado.cargo === "supervisor") supId = usuarioLogado.id;
    let vComissao = valoresComissao[supId] || valoresComissao["geral"] || {};
    let marcas = vComissao.marcas_concorrentes || ["Samsung", "Motorola", "Outros"];
    
    let containerMarcas = document.getElementById('container-inputs-concorrencia');
    let htmlInputs = "";
    marcas.forEach((marca, idx) => { htmlInputs += `<div><span style="font-size: 11px; font-weight: bold; color: var(--cor-secundaria);">${marca}</span><input type="number" id="input-concorrente-${idx}" data-marca="${marca}" placeholder="Qtd" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); text-align: center; margin: 0;"></div>`; });
    if (containerMarcas) containerMarcas.innerHTML = htmlInputs;

    document.getElementById('modal-fechamento-share').classList.add('ativo');
    loadIcons();
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
        objConcorrentes[marca] = qtd;
        totalConcorrencia += qtd;
    });

    if (totalConcorrencia === 0) return mostrarToast("Preencha as vendas da concorrência.", "alerta");

    const btn = document.getElementById("btn-salvar-share");
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" style="animation: spin 1s linear infinite;"></i> Salvando...';
    loadIcons();

    let payload = {
        data_fechamento: new Date().toISOString().split('T')[0],
        loja: loja,
        promotor_login: usuarioLogado.id,
        vendas_oppo: 0, 
        vendas_total_loja: totalConcorrencia, 
        criado_por_supervisor: usuarioLogado.criadoPor || usuarioLogado.id,
        concorrentes_dados: objConcorrentes 
    };

    try {
        const { error } = await supabaseClient.from('market_share').insert([payload]);
        if (error) throw error;
        mostrarToast("Fechamento registrado com sucesso!", "sucesso");
        document.getElementById('modal-fechamento-share').classList.remove('ativo');
    } catch (e) {
        console.error("Erro no Share:", e);
        mostrarToast("Erro ao registrar fechamento.", "erro");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Salvar Fechamento';
        loadIcons();
    }
}

// ================= EXPORTAÇÃO DE RELATÓRIOS (EXCEL/CSV) =================
function exportarParaCSV(nomeArquivo, dados, colunas) {
    if (dados.length === 0) return mostrarToast("Nenhum dado para exportar", "alerta");
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += colunas.join(";") + "\r\n";
    dados.forEach(row => {
        let linha = colunas.map(col => {
            let info = row[col] ? String(row[col]).replace(/;/g, ",") : "";
            return `${info}`;
        });
        csvContent += linha.join(";") + "\r\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${nomeArquivo}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    mostrarToast("Download iniciado!", "sucesso");
}

function baixarRelatorioAcomp() {
    if (typeof dadosAcompanhamentoGlobal === 'undefined' || dadosAcompanhamentoGlobal.length === 0) {
        return mostrarToast("Carregue os dados primeiro.", "alerta");
    }
    exportarParaCSV("Acompanhamento_Vendas", dadosAcompanhamentoGlobal, ["Data", "Vendedor", "Aparelhos", "Status"]);
}

function baixarRelatorioHistorico() {
    if (typeof dadosHistoricoGlobal === 'undefined' || dadosHistoricoGlobal.length === 0) {
        return mostrarToast("Carregue o histórico primeiro.", "alerta");
    }
    let dadosLimpos = dadosHistoricoGlobal.map(item => ({
        Data: item.Data,
        Tipo: item.Tipo,
        Status: item.Status,
        Promotor: item.Promotor,
        Detalhe: item.Detalhe.replace(/<[^>]*>?/gm, '')
    }));
    exportarParaCSV("Historico_Auditoria", dadosLimpos, ["Data", "Tipo", "Status", "Promotor", "Detalhe"]);
}

// ==========================================
// CORREÇÃO DEFINITIVA: GESTÃO DE EQUIPES, LOJAS E PROMOTORES (COM LEGADO)
// ==========================================

let supervisorEmEdicao = null;

function abrirModalGerenciarEquipe(supId) {
    supervisorEmEdicao = supId;
    let nomeSup = bancoUsuarios[supId] ? bancoUsuarios[supId].nome : supId;
    document.getElementById('titulo-modal-equipe').innerHTML = `<i data-lucide="users"></i> Equipe: ${nomeSup}`;
    document.getElementById('modal-gerenciar-equipe').classList.add('ativo');
    
    switchTab('equipe-tab-promotores', 'equipe-tab');
    
    renderizarModalPromotores();
    renderizarModalLojas();
    renderizarCheckboxLojas();
    renderizarSelectLojasModal();
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function fecharModalEquipe() {
    let modal = document.getElementById('modal-gerenciar-equipe');
    if(modal) modal.classList.remove('ativo');
    supervisorEmEdicao = null;
}

// INTELIGÊNCIA DE RESGATE DE LOJAS ANTIGAS:
function podeVerLojaNoModal(nomeLoja) {
    // Master vê tudo
    if (supervisorEmEdicao === 'geral' || usuarioLogado.id === 'master') return true;
    
    let cfg = lojasConfig[nomeLoja];
    if (!cfg) return false;
    
    // 1. Se a loja já for registrada oficialmente na região dele
    if (cfg.regiao === supervisorEmEdicao) return true;
    
    // 2. Se a loja for antiga (legada) e ainda não tem dono no banco de dados
    if (!cfg.regiao) return true;
    
    // 3. Trava de segurança: Se algum promotor dele atende essa loja, ele deve poder ver
    for (let k in bancoUsuarios) {
        let p = bancoUsuarios[k];
        if (p.cargo === "promotor" && p.criadoPor === supervisorEmEdicao && p.lojasPermitidas && p.lojasPermitidas.includes(nomeLoja)) {
            return true;
        }
    }
    return false;
}

function renderizarCheckboxLojas() {
    let container = document.getElementById('modal-promotor-lojas');
    if (!container) return;
    let html = "";
    let lojasDestaRegiao = [];
    
    for (let l in lojasConfig) {
        if (podeVerLojaNoModal(l)) {
            lojasDestaRegiao.push(l);
        }
    }
    
    lojasDestaRegiao.sort().forEach(l => {
        html += `<label style="display:flex; align-items:center; gap:8px; padding:8px; background:var(--bg-fundo); border-radius:8px; border:1px solid var(--border-color); cursor:pointer; width:100%;"><input type="checkbox" class="check-loja-promotor" value="${l}" style="width:18px; height:18px; margin:0;"> <span style="font-weight:bold; color:var(--primary);">${l}</span></label>`;
    });
    
    if (lojasDestaRegiao.length === 0) {
        html = "<span style='color:#ef4444; font-size:12px; font-weight:bold;'>Nenhuma loja encontrada! Vá na aba 'Lojas & Vends' e crie as lojas primeiro.</span>";
    }
    container.innerHTML = html;
}

function adminAddLojaEquipe() {
    let nomeLoja = document.getElementById('modal-loja-nome').value.trim();
    let capaLoja = Number(document.getElementById('modal-loja-capa').value) || 0;

    if (!nomeLoja) return mostrarToast("Digite o nome da loja.", "alerta");
    
    if (!lojasConfig[nomeLoja]) {
        lojasConfig[nomeLoja] = { capa: capaLoja, vendedores: [], regiao: supervisorEmEdicao };
    } else {
        lojasConfig[nomeLoja].capa = capaLoja;
        lojasConfig[nomeLoja].regiao = supervisorEmEdicao; // Se já existia (antiga), ele "rouba" a posse para a região dele
    }

    document.getElementById('modal-loja-nome').value = "";
    document.getElementById('modal-loja-capa').value = "";
    
    mostrarToast("Loja criada e vinculada com sucesso!", "sucesso");
    
    renderizarModalLojas();
    renderizarCheckboxLojas();
    renderizarSelectLojasModal();
    salvarConfiguracoesGlobais(false);
}

function adminAddPromotorEquipe() {
    let login = document.getElementById('modal-promotor-login').value.trim();
    let nome = document.getElementById('modal-promotor-nome').value.trim();
    let senha = document.getElementById('modal-promotor-senha').value.trim();
    let meta = Number(document.getElementById('modal-promotor-meta').value) || 0;
    
    if (!login || !nome) return mostrarToast("Preencha login e nome.", "alerta");
    
    let lojasPermitidas = [];
    document.querySelectorAll('.check-loja-promotor').forEach(cb => {
        if (cb.checked) lojasPermitidas.push(cb.value);
    });

    if (lojasPermitidas.length === 0) return mostrarToast("Selecione pelo menos uma loja para o promotor!", "alerta");

    if (!bancoUsuarios[login]) bancoUsuarios[login] = {};
    
    bancoUsuarios[login].cargo = "promotor";
    bancoUsuarios[login].nome = nome;
    if(senha) bancoUsuarios[login].senha = senha;
    else if(!bancoUsuarios[login].senha) bancoUsuarios[login].senha = "123456"; 
    
    bancoUsuarios[login].meta = meta;
    bancoUsuarios[login].criadoPor = supervisorEmEdicao;
    bancoUsuarios[login].lojasPermitidas = lojasPermitidas;
    
    bancoUsuarios[login].permissoes = {
        vendas: document.getElementById('perm-vendas') ? document.getElementById('perm-vendas').checked : true,
        acomp: document.getElementById('perm-acomp') ? document.getElementById('perm-acomp').checked : true,
        estoqueView: document.getElementById('perm-est-ver') ? document.getElementById('perm-est-ver').checked : true,
        estoqueEdit: document.getElementById('perm-est-edit') ? document.getElementById('perm-est-edit').checked : true
    };

    // ADOÇÃO AUTOMÁTICA: As lojas antigas que ele vinculou ao promotor agora são da região dele
    lojasPermitidas.forEach(l => {
        if (lojasConfig[l] && !lojasConfig[l].regiao) {
            lojasConfig[l].regiao = supervisorEmEdicao;
        }
    });

    mostrarToast("Promotor criado/atualizado com sucesso!", "sucesso");
    
    document.getElementById('modal-promotor-login').value = "";
    document.getElementById('modal-promotor-nome').value = "";
    document.getElementById('modal-promotor-senha').value = "";
    document.getElementById('modal-promotor-meta').value = "";
    document.querySelectorAll('.check-loja-promotor').forEach(cb => cb.checked = false);
    
    renderizarModalPromotores();
    salvarConfiguracoesGlobais(false);
}

function adminAddVendedorEquipe() {
    let lojaSelecionada = document.getElementById('modal-select-loja').value;
    let nomes = document.getElementById('modal-vendedor-nome').value.split(',').map(n => n.trim()).filter(n => n !== "");
    
    if (!lojaSelecionada || nomes.length === 0) return mostrarToast("Selecione a loja e digite pelo menos um nome.", "alerta");
    if (!lojasConfig[lojaSelecionada].vendedores) lojasConfig[lojaSelecionada].vendedores = [];
    
    nomes.forEach(n => {
        if (!lojasConfig[lojaSelecionada].vendedores.includes(n)) {
            lojasConfig[lojaSelecionada].vendedores.push(n);
        }
    });
    
    document.getElementById('modal-vendedor-nome').value = "";
    mostrarToast("Vendedores adicionados!", "sucesso");
    renderizarModalLojas();
    salvarConfiguracoesGlobais(false);
}

function renderizarSelectLojasModal() {
    let sel = document.getElementById('modal-select-loja');
    if (!sel) return;
    let html = '<option value="">Selecione uma loja...</option>';
    for (let l in lojasConfig) {
        if (podeVerLojaNoModal(l)) {
            html += `<option value="${l}">${l}</option>`;
        }
    }
    sel.innerHTML = html;
}

function renderizarModalPromotores() {
    let container = document.getElementById('lista-modal-promotores');
    if (!container) return;
    let html = "";
    
    for (let k in bancoUsuarios) {
        if (bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].criadoPor === supervisorEmEdicao) {
            let p = bancoUsuarios[k];
            let lojasStr = p.lojasPermitidas && p.lojasPermitidas.length > 0 ? p.lojasPermitidas.join(', ') : 'Nenhuma';
            html += `
            <div class="item-modal-busca-promotor" style="background:var(--bg-container); border:1px solid var(--border-color); padding:15px; border-radius:12px; margin-bottom:10px; text-align:left;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color:var(--primary); font-size:15px;"><i data-lucide="user" class="lucide-sm"></i> ${p.nome || k}</strong>
                    <button onclick="excluirPromotorEquipe('${k}')" style="background:transparent; border:none; color:#ef4444; cursor:pointer; padding:5px;"><i data-lucide="trash-2"></i></button>
                </div>
                <div style="font-size:11px; color:var(--cor-secundaria); margin-top:5px;">Login: <strong>${k}</strong> | Senha: <strong>${p.senha}</strong></div>
                <div style="font-size:11px; color:var(--cor-secundaria); margin-top:5px;">Lojas: <strong style="color:#10b981;">${lojasStr}</strong></div>
            </div>`;
        }
    }
    if (html === "") html = "<div style='font-size:13px; color:var(--cor-secundaria); text-align:center;'>Nenhum promotor cadastrado na equipe.</div>";
    container.innerHTML = html;
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function renderizarModalLojas() {
    let container = document.getElementById('lista-modal-lojas');
    if (!container) return;
    let html = "";
    
    for (let l in lojasConfig) {
        if (podeVerLojaNoModal(l)) {
            let vends = lojasConfig[l].vendedores && lojasConfig[l].vendedores.length > 0 ? lojasConfig[l].vendedores.join(', ') : 'Nenhum';
            html += `
            <div class="item-modal-busca-loja" style="background:var(--bg-container); border:1px solid var(--border-color); padding:15px; border-radius:12px; margin-bottom:10px; text-align:left;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color:#10b981; font-size:15px;"><i data-lucide="store" class="lucide-sm"></i> ${l}</strong>
                    <button onclick="excluirLojaEquipe('${l}')" style="background:transparent; border:none; color:#ef4444; cursor:pointer; padding:5px;"><i data-lucide="trash-2"></i></button>
                </div>
                <div style="font-size:11px; color:var(--cor-secundaria); margin-top:5px;">Capa Total: <strong>${lojasConfig[l].capa || 0}</strong></div>
                <div style="font-size:11px; color:var(--cor-secundaria); margin-top:5px;">Vendedores: <strong style="color:#f59e0b;">${vends}</strong></div>
            </div>`;
        }
    }
    if (html === "") html = "<div style='font-size:13px; color:var(--cor-secundaria); text-align:center;'>Nenhuma loja cadastrada na região.</div>";
    container.innerHTML = html;
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function excluirPromotorEquipe(login) {
    if(confirm(`Tem certeza que deseja excluir o promotor ${login}?`)) {
        delete bancoUsuarios[login];
        renderizarModalPromotores();
        mostrarToast("Promotor excluído.", "info");
        salvarConfiguracoesGlobais(false);
    }
}

function excluirLojaEquipe(nomeLoja) {
    if(confirm(`Tem certeza que deseja excluir a loja ${nomeLoja}?`)) {
        delete lojasConfig[nomeLoja];
        for(let k in bancoUsuarios) {
            if(bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].lojasPermitidas) {
                bancoUsuarios[k].lojasPermitidas = bancoUsuarios[k].lojasPermitidas.filter(l => l !== nomeLoja);
            }
        }
        renderizarModalLojas();
        renderizarCheckboxLojas();
        renderizarSelectLojasModal();
        mostrarToast("Loja excluída.", "info");
        salvarConfiguracoesGlobais(false);
    }
}


