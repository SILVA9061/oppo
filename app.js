// ==========================================
// app.js - Lógica de Interface e Interação
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
window.addEventListener('online', () => { ocultarBotaoReconexao(); tentarReconectarAgora(); });

document.addEventListener('DOMContentLoaded', () => {
    loadIcons();
    if(typeof inicializarAPI === "function") inicializarAPI();
});

function mostrarBotaoReconexao() { let painel = document.getElementById('painel-erro-conexao'); if (painel) painel.style.display = 'block'; loadIcons(); }
function ocultarBotaoReconexao() { let painel = document.getElementById('painel-erro-conexao'); if (painel) painel.style.display = 'none'; }
function mostrarToast(msg, tipo = "sucesso") { const container = document.getElementById("toast-container"); const toast = document.createElement("div"); toast.className = `toast ${tipo}`; let icon = '<i data-lucide="check-circle"></i>'; if(tipo === 'erro') icon = '<i data-lucide="x-circle"></i>'; if(tipo === 'alerta') icon = '<i data-lucide="info"></i>'; toast.innerHTML = icon + ' <span>' + msg.replace(/\n/g, '<br>') + '</span>'; container.appendChild(toast); loadIcons(); if(tipo === 'sucesso') vibrar(100); if(tipo === 'erro') vibrar([50, 50, 50]); setTimeout(() => toast.classList.add("show"), 10); setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 300); }, 3000); }
function vibrar(padrao) { if(navigator.vibrate) navigator.vibrate(padrao); }
function loadIcons() { if(typeof lucide !== 'undefined') { lucide.createIcons(); } let isDark = document.body.classList.contains('dark-mode'); let icone = document.getElementById('icone-tema'); if(icone) icone.setAttribute('data-lucide', isDark ? 'sun' : 'moon'); let iconeSub = document.getElementById('icone-tema-sub'); if(iconeSub) iconeSub.setAttribute('data-lucide', isDark ? 'sun' : 'moon'); if(typeof lucide !== 'undefined') { lucide.createIcons(); } }
function toggleTema() { document.body.classList.toggle('dark-mode'); localStorage.setItem('temaEscuro', document.body.classList.contains('dark-mode') ? 'sim' : 'nao'); loadIcons(); if (document.getElementById('tela-dashboard').classList.contains('ativa')) abrirDashboard(); }
function mudarTela(idTela) { let telas = document.querySelectorAll('.tela'); for(let i=0; i<telas.length; i++) { telas[i].classList.remove('ativa'); } let telaAlvo = document.getElementById(idTela); if(telaAlvo) telaAlvo.classList.add('ativa'); if (idTela === 'tela-menu' || idTela === 'tela-login') { let hHome = document.getElementById('header-view-home'); if(hHome) hHome.style.display = 'flex'; let hBack = document.getElementById('header-view-back'); if(hBack) hBack.style.display = 'none'; } else { let hHome = document.getElementById('header-view-home'); if(hHome) hHome.style.display = 'none'; let hBack = document.getElementById('header-view-back'); if(hBack) hBack.style.display = 'flex'; let title = "Portal OPPO"; if(idTela === 'tela-promotores' || idTela === 'tela-lojas') title = "Equipe / Loja"; if(idTela === 'tela-venda') title = "Nova Venda"; if(idTela === 'tela-acompanhamento') title = "Acompanhamento"; if(idTela === 'tela-estoque') title = "Estoque"; if(idTela === 'tela-historico') title = "Histórico"; if(idTela === 'tela-dashboard') title = "Dashboard"; if(idTela === 'tela-admin') title = "Ajustes"; let hTitle = document.getElementById('header-title-sub'); if(hTitle) hTitle.innerText = title; } const container = document.querySelector('.container'); if (container) { if(idTela === 'tela-dashboard' || idTela === 'tela-admin' || idTela === 'tela-historico') { container.classList.add('container-wide'); } else { container.classList.remove('container-wide'); } } setTimeout(() => loadIcons(), 50); }
function navAction(acao, btnEl) { document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('ativo')); if(btnEl) btnEl.classList.add('ativo'); if(acao === 'venda') irParaVendas(); else if(acao === 'acomp') abrirAcompanhamento(); else if(acao === 'dashboard') abrirDashboard(); else if(acao === 'estoque') abrirEstoque(); else if(acao === 'admin') abrirAdmin(); }
function navTo(idTela, btnEl) { document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('ativo')); if(btnEl) btnEl.classList.add('ativo'); mudarTela(idTela); }
function switchTab(tabId, groupClass) { document.querySelectorAll(`.${groupClass}-content`).forEach(t => t.style.display = 'none'); document.querySelectorAll(`.${groupClass}-btn`).forEach(b => b.classList.remove('ativo')); document.getElementById(tabId).style.display = 'block'; event.currentTarget.classList.add('ativo'); loadIcons(); }
if(localStorage.getItem('temaEscuro') === 'sim') { document.body.classList.add('dark-mode'); }

// ================= VENDAS E LOJAS =================
function irParaVendas() {
    let adminRole = (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master" || usuarioLogado.cargo === "supervisor");
    if (adminRole) { let promotoresDele = Object.keys(bancoUsuarios).filter(k => bancoUsuarios[k].cargo === "promotor" && podeGerenciar(usuarioLogado, k)); if(promotoresDele.length === 0) return mostrarToast("Você não possui promotores vinculados.", "alerta"); montarBotoesPromotores(promotoresDele); mudarTela('tela-promotores'); } 
    else { let lojas = usuarioLogado.lojasPermitidas || []; if(lojas.length === 0) return mostrarToast("Você não possui lojas vinculadas.", "alerta"); if(lojas.length === 1) selecionarLoja(lojas[0]); else { montarBotoesLojas(lojas); mudarTela('tela-lojas'); } }
}

function selecionarPromotor(obj) { let lojas = obj.lojasPermitidas || []; if(lojas.length === 0) { mostrarToast("Nenhuma loja vinculada a este promotor.", "alerta"); return; } if (lojas.length === 1) selecionarLoja(lojas[0]); else { montarBotoesLojas(lojas); mudarTela('tela-lojas'); } }

function montarBotoesPromotores(listaChaves) { const div = document.getElementById('botoes-promotores-dinamicos'); div.innerHTML = ""; if (!listaChaves || listaChaves.length === 0) { div.innerHTML = "<div class='mensagem-vazia'>Você não tem promotores na sua equipe.</div>"; return; } listaChaves.sort((a, b) => { let nomeA = (bancoUsuarios[a].nome || a).toLowerCase(); let nomeB = (bancoUsuarios[b].nome || b).toLowerCase(); return nomeA.localeCompare(nomeB); }); listaChaves.forEach(k => { let btn = document.createElement('button'); btn.className = "btn-sistema"; btn.innerHTML = `<i data-lucide="user" class="lucide-sm"></i> Equipe ${bancoUsuarios[k].nome || k}`; btn.onclick = () => selecionarPromotor(bancoUsuarios[k]); div.appendChild(btn); }); loadIcons(); }
function montarBotoesLojas(arr) { const div = document.getElementById('botoes-lojas-dinamicos'); div.innerHTML = ""; let arrOrdenado = arr.sort((a, b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})); arrOrdenado.forEach(l => { let btn = document.createElement('button'); btn.className = "btn-sistema"; btn.innerHTML = `<i data-lucide="store" class="lucide-sm"></i> ${l}`; btn.onclick = () => selecionarLoja(l); div.appendChild(btn); }); loadIcons(); }

function selecionarLoja(nomeLoja) {
    lojaAtual = nomeLoja; document.getElementById('titulo-loja-ativa').innerText = lojaAtual; document.getElementById('nome-promotor-ativo').innerText = getPromotorDaLoja(nomeLoja); 
    vendedorSelecionadoVenda = null; pendenciasVendaMultipla = []; 
    renderizarVendedoresVenda(); const btn = document.getElementById('btn-trocar-loja'); let adminRole = (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master" || usuarioLogado.cargo === "supervisor");
    if (adminRole) { btn.style.display = "flex"; btn.innerHTML = '<i data-lucide="refresh-ccw"></i> Trocar Equipe/Loja'; btn.onclick = () => mudarTela('tela-promotores'); } else if (usuarioLogado.lojasPermitidas && usuarioLogado.lojasPermitidas.length > 1) { btn.style.display = "flex"; btn.innerHTML = '<i data-lucide="refresh-ccw"></i> Trocar de Loja'; btn.onclick = () => mudarTela('tela-lojas'); } else { btn.style.display = "none"; }
    carregarCards(); atualizarTelaConferencia(); mudarTela('tela-venda'); loadIcons();
}

function getPromotorDaLoja(loja) { for (let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].lojasPermitidas && bancoUsuarios[k].lojasPermitidas.includes(loja)) { return bancoUsuarios[k].nome || k; } } return "Promotor Indefinido"; }

function renderizarVendedoresVenda() { const div = document.getElementById('grid-vendedores'); div.innerHTML = ""; const listaVendedores = (lojasConfig[lojaAtual] && lojasConfig[lojaAtual].vendedores) ? lojasConfig[lojaAtual].vendedores : []; if(listaVendedores.length === 0) { div.innerHTML = "<span style='color:var(--cor-secundaria); font-size:13px;'>Nenhum vendedor cadastrado nesta loja.</span>"; return; } let vendedoresOrdenados = [...listaVendedores].sort((a, b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})); vendedoresOrdenados.forEach(v => { let isAtivo = (vendedorSelecionadoVenda === v) ? "ativo" : ""; div.innerHTML += `<div class="card-vendedor-venda ${isAtivo}" onclick="toggleVendedorVenda('${v}')">${v}</div>`; }); loadIcons(); }
function toggleVendedorVenda(nome) { if(vendedorSelecionadoVenda === nome) vendedorSelecionadoVenda = null; else vendedorSelecionadoVenda = nome; renderizarVendedoresVenda(); }
function carregarCards() { const div = document.getElementById("grid-aparelhos"); let html = ""; for (let ap in mapaEmojis) { html += `<div class="item-aparelho"><div class="card-aparelho" onclick="iniciarSelecaoAparelho('${ap}')"><span class="emoji-card">${mapaEmojis[ap]}</span></div><span class="nome-card">${ap.toUpperCase()}</span></div>`; } div.innerHTML = html; }
function iniciarSelecaoAparelho(ap) { if (!vendedorSelecionadoVenda) return mostrarToast("Selecione UM vendedor primeiro!", "alerta"); aparelhoEmSelecao = { nome: ap.toUpperCase(), emoji: mapaEmojis[ap] }; document.getElementById('modal-titulo-aparelho').innerHTML = `${aparelhoEmSelecao.emoji} ${aparelhoEmSelecao.nome}`; document.getElementById('input-imei').value = ""; document.getElementById('modal-imei').classList.add('ativo'); }
function confirmarImei(comImei) { let imei = comImei ? document.getElementById('input-imei').value.trim() : ""; document.getElementById('modal-imei').classList.remove('ativo'); pendenciasVendaMultipla.push({ vendedor: vendedorSelecionadoVenda, aparelho: aparelhoEmSelecao.nome, emoji: aparelhoEmSelecao.emoji, imei: imei }); aparelhoEmSelecao = null; vendedorSelecionadoVenda = null; renderizarVendedoresVenda(); atualizarTelaConferencia(); }
function atualizarTelaConferencia() { const div = document.getElementById("area-conferencia"); const lista = document.getElementById("lista-pendentes"); if (pendenciasVendaMultipla.length > 0) { div.style.display = "block"; lista.innerHTML = pendenciasVendaMultipla.map(p => `<div class="item-pendente" style="display:flex; flex-direction:column; align-items:flex-start; gap:4px;"><div style="font-size:11px; color:var(--cor-secundaria);"><i data-lucide="user" class="lucide-sm"></i> Vend: ${p.vendedor}</div><div style="font-weight:bold;"><i data-lucide="check" class="lucide-sm" style="color: #10b981;"></i> ${p.emoji} ${p.aparelho} ${p.imei ? `(IMEI: ${p.imei})` : ''}</div></div>`).join(""); } else { div.style.display = "none"; lista.innerHTML = ""; } loadIcons(); }
function limparPendentes() { pendenciasVendaMultipla = []; atualizarTelaConferencia(); }

// ================= ACOMPANHAMENTO E EMOJIS BADGES =================
function abrirAcompanhamento() { mudarTela('tela-acompanhamento'); if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") { promotorFiltroAtual = "todos"; } else { promotorFiltroAtual = usuarioLogado.id; } subPromotorFiltroAtual = "todos"; renderizarFiltroPromotores(); carregarDadosDoBanco(); }
function renderizarFiltroPromotores() { const div = document.getElementById("seletor-promotores"); const divSub = document.getElementById("seletor-sub-promotores"); if (usuarioLogado.cargo === "promotor") { div.innerHTML = `<div class="card-promotor-filtro ativo"><i data-lucide="user" class="lucide-sm"></i> ${usuarioLogado.nome} (Suas Lojas)</div>`; if(divSub) divSub.style.display = "none"; loadIcons(); return; } let html = `<div class="card-promotor-filtro ${promotorFiltroAtual === 'todos' ? 'ativo' : ''}" onclick="setFiltroPromotor('todos')"><i data-lucide="layout-dashboard" class="lucide-sm"></i> Visão Geral (Todas)</div>`; if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") { for (let key in bancoUsuarios) { if (bancoUsuarios[key].cargo === "supervisor") { if(podeGerenciar(usuarioLogado, key)) { html += `<div class="card-promotor-filtro ${promotorFiltroAtual === key ? 'ativo' : ''}" onclick="setFiltroPromotor('${key}')"><i data-lucide="users" class="lucide-sm"></i> Equipe ${bancoUsuarios[key].nome || key}</div>`; } } } if (promotorFiltroAtual !== 'todos' && bancoUsuarios[promotorFiltroAtual]) { let htmlSub = `<div class="card-promotor-filtro ${subPromotorFiltroAtual === 'todos' ? 'ativo' : ''}" style="${subPromotorFiltroAtual === 'todos' ? 'background-color: var(--primary); border-color: var(--primary); color: white;' : 'background-color: var(--bg-item); color: var(--cor-secundaria); border-color: var(--border-color);'}" onclick="setSubFiltroPromotor('todos')"><i data-lucide="users" class="lucide-sm"></i> Todas (Equipe)</div>`; for (let key in bancoUsuarios) { if (bancoUsuarios[key].cargo === "promotor" && bancoUsuarios[key].criadoPor === promotorFiltroAtual) { let isAt = subPromotorFiltroAtual === key; htmlSub += `<div class="card-promotor-filtro ${isAt ? 'ativo' : ''}" style="${isAt ? 'background-color: var(--primary); border-color: var(--primary); color: white;' : 'background-color: var(--bg-item); color: var(--cor-secundaria); border-color: var(--border-color);'}" onclick="setSubFiltroPromotor('${key}')"><i data-lucide="user" class="lucide-sm"></i> ${bancoUsuarios[key].nome || key}</div>`; } } if(divSub) { divSub.innerHTML = htmlSub; divSub.style.display = "flex"; } } else { if(divSub) divSub.style.display = "none"; } } else if (usuarioLogado.cargo === "supervisor") { html = `<div class="card-promotor-filtro ${promotorFiltroAtual === 'todos' ? 'ativo' : ''}" onclick="setFiltroPromotor('todos')"><i data-lucide="layout-dashboard" class="lucide-sm"></i> Visão Geral (Sua Equipe)</div>`; for (let key in bancoUsuarios) { if (bancoUsuarios[key].cargo === "promotor" && bancoUsuarios[key].criadoPor === usuarioLogado.id) { html += `<div class="card-promotor-filtro ${promotorFiltroAtual === key ? 'ativo' : ''}" onclick="setFiltroPromotor('${key}')"><i data-lucide="user" class="lucide-sm"></i> ${bancoUsuarios[key].nome || key}</div>`; } } if(divSub) divSub.style.display = "none"; } div.innerHTML = html; loadIcons(); }
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
            if (usuarioLogado.cargo === "supervisor") { if (pKey === "sem_promotor") return; if (bancoUsuarios[pKey].criadoPor !== usuarioLogado.id) return; if (promotorFiltroAtual !== "todos" && pKey !== promotorFiltroAtual) return; } else if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") { if (promotorFiltroAtual !== "todos") { if (pKey === "sem_promotor") return; if (bancoUsuarios[pKey].criadoPor !== promotorFiltroAtual) return; if (subPromotorFiltroAtual !== "todos" && pKey !== subPromotorFiltroAtual) return; } else { if (pKey !== "sem_promotor" && !podeGerenciar(usuarioLogado, bancoUsuarios[pKey].criadoPor)) return; } } else if (usuarioLogado.cargo === "promotor") { if (pKey !== usuarioLogado.id) return; }
            if (!promotoresGrupos[pKey]) promotoresGrupos[pKey] = { lojas: {} }; if (!promotoresGrupos[pKey].lojas[loja]) promotoresGrupos[pKey].lojas[loja] = []; promotoresGrupos[pKey].lojas[loja].push({ vendedor: vend, aparelhosStr: row["Aparelhos"] || "" });
        });
    });
    if (Object.keys(promotoresGrupos).length === 0) return div.innerHTML = `<div class="mensagem-vazia">Nenhuma venda encontrada no filtro.</div>`;
    let html = "";
    for (let pKey in promotoresGrupos) {
        let nomePromotor = pKey === "sem_promotor" ? "Lojas Sem Promotor Atribuído" : (bancoUsuarios[pKey].nome || pKey); let totalPromotor = 0; let htmlLojas = "";
        let lojasDoPromotorOrd = Object.keys(promotoresGrupos[pKey].lojas).sort((a,b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));
        for (let i=0; i<lojasDoPromotorOrd.length; i++) {
            let loja = lojasDoPromotorOrd[i]; let totalLoja = 0; let consVend = {};
            promotoresGrupos[pKey].lojas[loja].forEach(item => { let arr = item.aparelhosStr.split("||").map(x => x.trim()).filter(x => x !== ""); totalLoja += arr.length; if (!consVend[item.vendedor]) consVend[item.vendedor] = { nome: item.vendedor, qtd: 0, ap: [] }; consVend[item.vendedor].qtd += arr.length; consVend[item.vendedor].ap.push(...arr); });
            totalPromotor += totalLoja;
            let vendOrd = Object.values(consVend).sort((a, b) => b.qtd - a.qtd); let htmlVend = ""; let rank = 1; let ult = -1;
            vendOrd.forEach((v) => { 
                if (ult !== -1 && v.qtd < ult) rank++; ult = v.qtd; let cRank = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-outros'; 
                
                let listaAp = v.ap.map(ap => {
                    let imeiMatch = ap.match(/IMEI:\s*(.*?)(\)|$)/);
                    let imei = imeiMatch ? imeiMatch[1].trim() : "";
                    let textoSemImei = ap.replace(/\(IMEI:.*?\)/g, "").replace(/IMEI:.*/g, "").trim();
                    let emoji = textoSemImei.substring(0, 2).trim();
                    let modelo = textoSemImei.substring(2).trim();
                    return `
                    <div class="item-vendido">
                        <div class="item-vendido-topo">
                            <div class="emoji-badge">${emoji}</div>
                            <span class="aparelho-nome">${modelo}</span>
                        </div>
                        ${imei ? `<span class="imei-texto">IMEI: ${imei}</span>` : ''}
                    </div>`;
                }).join(""); 

                htmlVend += `<div class="vendedor-bloco"><div class="vendedor-cabecalho"><div><span class="badge-rank ${cRank}">${rank}º</span> <strong style="color:var(--cor-texto);">${v.nome}:</strong></div><span class="vendedor-quantidade">${v.qtd} un</span></div><div class="vendedor-itens-box">${listaAp}</div></div>`; 
            });
            htmlLojas += `<div class="loja-card-acompanhamento"><div class="loja-titulo"><span><i data-lucide="store" class="lucide-sm"></i> ${loja}</span><span class="loja-badge-total">Total: ${totalLoja} un</span></div>${htmlVend}</div>`;
        }
        html += `<div style="margin-bottom: 25px; border-radius: 16px; box-shadow: 0 4px 10px var(--shadow-color); overflow: hidden; text-align: left; border: 1px solid var(--border-color);"><div style="background: ${pKey === 'sem_promotor' ? '#64748b' : 'var(--primary-gradiente)'}; color: white; padding: 16px 20px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;"><span style="font-size: 15px; display:flex; align-items:center;"><i data-lucide="user"></i> Promotor: ${nomePromotor}</span><span style="background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 20px; font-size: 13px;">Total: ${totalPromotor} un</span></div><div style="background: var(--bg-card); padding: 20px 15px 5px 15px; border-top: none; border-radius: 0 0 16px 16px;">${htmlLojas}</div></div>`;
    } div.innerHTML = html; loadIcons();
}

// ================= ESTOQUE & MOSTRUÁRIO =================
function fecharModalConfirmMostruario() { document.getElementById('modal-confirm-mostruario').classList.remove('ativo'); mostruarioEmEdicao = null; }
function fecharModalPromptMostruario() { document.getElementById('modal-prompt-mostruario').classList.remove('ativo'); mostruarioEmEdicao = null; }
function executarRemoverMostruario() { if (!mostruarioEmEdicao) return; delete mostruariosGlobais[mostruarioEmEdicao.key]; localStorage.setItem('mostruariosGlobais', JSON.stringify(mostruariosGlobais)); renderizarListaEstoque(); mostrarToast("Status removido.", "info"); fecharModalConfirmMostruario(); }
function executarAddMostruario() { if (!mostruarioEmEdicao) return; let obs = document.getElementById('input-obs-mostruario').value; mostruariosGlobais[mostruarioEmEdicao.key] = obs.trim() !== "" ? obs.trim() : true; localStorage.setItem('mostruariosGlobais', JSON.stringify(mostruariosGlobais)); renderizarListaEstoque(); mostrarToast("Marcado como mostruário!", "sucesso"); fecharModalPromptMostruario(); }
function toggleMostruario(loja, ap) { let k = `${loja}_${ap}`; mostruarioEmEdicao = { loja: loja, ap: ap, key: k }; if (mostruariosGlobais[k]) { document.getElementById('texto-confirm-mostruario').innerHTML = `Deseja DESMARCAR o <b>${ap}</b> como mostruário na loja <b>${loja}</b>?`; document.getElementById('modal-confirm-mostruario').classList.add('ativo'); } else { document.getElementById('texto-prompt-mostruario').innerHTML = `Marcando <b>${ap}</b> como MOSTRUÁRIO na loja <b>${loja}</b>.`; document.getElementById('input-obs-mostruario').value = ""; document.getElementById('modal-prompt-mostruario').classList.add('ativo'); } }
function abrirEstoque() { mudarTela('tela-estoque'); promotorEstoqueFiltroAtual = (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") ? "todos" : usuarioLogado.id; renderizarFiltroPromotoresEstoque(); carregarEstoqueDoBanco(); }
function renderizarFiltroPromotoresEstoque() { const div = document.getElementById("seletor-promotores-estoque"); if (usuarioLogado.cargo === "promotor") { div.innerHTML = `<div class="card-promotor-filtro ativo"><i data-lucide="user" class="lucide-sm"></i> ${usuarioLogado.nome}</div>`; loadIcons(); return; } let html = `<div class="card-promotor-filtro ${promotorEstoqueFiltroAtual === 'todos' ? 'ativo' : ''}" onclick="setFiltroPromotorEstoque('todos')"><i data-lucide="layout-dashboard" class="lucide-sm"></i> Visão Geral (Todas)</div>`; if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") { for (let key in bancoUsuarios) { if (bancoUsuarios[key].cargo === "supervisor") { if (podeGerenciar(usuarioLogado, key)) { html += `<div class="card-promotor-filtro ${promotorEstoqueFiltroAtual === key ? 'ativo' : ''}" onclick="setFiltroPromotorEstoque('${key}')"><i data-lucide="users" class="lucide-sm"></i> Equipe ${bancoUsuarios[key].nome || key}</div>`; } } } } else if (usuarioLogado.cargo === "supervisor") { for (let key in bancoUsuarios) { if (bancoUsuarios[key].cargo === "promotor" && bancoUsuarios[key].criadoPor === usuarioLogado.id) { html += `<div class="card-promotor-filtro ${promotorEstoqueFiltroAtual === key ? 'ativo' : ''}" onclick="setFiltroPromotorEstoque('${key}')"><i data-lucide="user" class="lucide-sm"></i> ${bancoUsuarios[key].nome || key}</div>`; } } } div.innerHTML = html; loadIcons(); }
function setFiltroPromotorEstoque(id) { promotorEstoqueFiltroAtual = id; renderizarFiltroPromotoresEstoque(); renderizarListaEstoque(); }
function renderizarListaEstoque() { pendenciasEstoque = {}; document.getElementById("area-conferencia-estoque").style.display = "none"; let lojasEstoque = {}; let lojasAtivas = []; let mostrarZerados = document.getElementById('check-mostrar-zerados').checked; let termoBusca = document.getElementById('busca-estoque') ? document.getElementById('busca-estoque').value.toLowerCase() : ""; if (promotorEstoqueFiltroAtual === "todos" && (usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master")) { lojasAtivas = Object.keys(lojasConfig); } else if (promotorEstoqueFiltroAtual === "todos" && usuarioLogado.cargo === "regional") { for (let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === "promotor" && podeGerenciar(usuarioLogado, k)) { bancoUsuarios[k].lojasPermitidas.forEach(l => { if(!lojasAtivas.includes(l)) lojasAtivas.push(l); }); } } } else if (promotorEstoqueFiltroAtual === "todos" && usuarioLogado.cargo === "supervisor") { for (let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].criadoPor === usuarioLogado.id) { bancoUsuarios[k].lojasPermitidas.forEach(l => { if(!lojasAtivas.includes(l)) lojasAtivas.push(l); }); } } } else { let fObj = bancoUsuarios[promotorEstoqueFiltroAtual]; if (fObj && fObj.cargo === "supervisor") { for (let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].criadoPor === promotorEstoqueFiltroAtual) { bancoUsuarios[k].lojasPermitidas.forEach(l => { if(!lojasAtivas.includes(l)) lojasAtivas.push(l); }); } } } else if (fObj && fObj.cargo === "promotor") { lojasAtivas = fObj.lojasPermitidas; } } lojasAtivas.sort((a,b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})); let selectLojaEst = document.getElementById('filtro-loja-estoque'); if (selectLojaEst) { let valAtual = selectLojaEst.value; let htmlOptions = '<option value="todas">Todas as Lojas</option>'; lojasAtivas.forEach(l => { htmlOptions += `<option value="${l}" ${l === valAtual ? 'selected' : ''}>${l}</option>`; }); selectLojaEst.innerHTML = htmlOptions; if (selectLojaEst.value !== 'todas') { lojasAtivas = lojasAtivas.filter(l => l === selectLojaEst.value); } } lojasAtivas.forEach(loja => { lojasEstoque[loja] = {}; for (let ap in mapaEmojis) lojasEstoque[loja][`${mapaEmojis[ap]} ${ap.toUpperCase()}`] = 0; }); dadosEstoqueGlobal.forEach(row => { if (lojasEstoque[row["Loja"]]) { let chave = extrairChaveAparelho(row["Aparelho"] || ""); if (chave && mapaEmojis[chave]) { let nomeOficial = `${mapaEmojis[chave]} ${chave.toUpperCase()}`; if (lojasEstoque[row["Loja"]][nomeOficial] !== undefined) { lojasEstoque[row["Loja"]][nomeOficial] += Number(row["Quantidade"]) || 0; } } } }); let html = ""; for (let loja in lojasEstoque) { let totalLoja = 0; let htmlItens = ""; for (let apNome in lojasEstoque[loja]) { if (termoBusca && !apNome.toLowerCase().includes(termoBusca)) continue; let qtd = lojasEstoque[loja][apNome]; if (qtd === 0 && !mostrarZerados) continue; totalLoja += qtd; let btnId = (loja + apNome).replace(/[^a-zA-Z0-9]/g, ''); let kMostruario = `${loja}_${apNome}`; let isMostruario = mostruariosGlobais[kMostruario]; if (qtd !== 1 && isMostruario) { delete mostruariosGlobais[kMostruario]; isMostruario = false; localStorage.setItem('mostruariosGlobais', JSON.stringify(mostruariosGlobais)); } let btnMostruarioHtml = ""; if (qtd === 1) { if (isMostruario) { btnMostruarioHtml = `<span onclick="toggleMostruario('${loja}', '${apNome}')" style="cursor:pointer; font-size:10px; background:#ef4444; color:white; padding:4px 8px; border-radius:12px; margin-left:8px; font-weight:bold;">🔴 Mostruário</span>`; } else { btnMostruarioHtml = `<span onclick="toggleMostruario('${loja}', '${apNome}')" style="cursor:pointer; font-size:10px; background:var(--bg-fundo); border:1px solid var(--border-color); color:var(--cor-secundaria); padding:4px 8px; border-radius:12px; margin-left:8px;">⚪ Marcar Mostruário</span>`; } } let htmlControles = ""; let permEstoquePromotor = (usuarioLogado.cargo === "promotor") ? (usuarioLogado.permissoes ? usuarioLogado.permissoes.estoque_editar : true) : false; let adminRole = (usuarioLogado.cargo === "supervisor" || usuarioLogado.cargo === "regional" || usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master"); let badgeStyle = ""; let iconeAlerta = ""; if (qtd > 0 && qtd < 3) { badgeStyle = "background-color: #fee2e2; color: #ef4444; border-color: #ef4444;"; iconeAlerta = " 🔥"; } if (permEstoquePromotor || adminRole) { htmlControles = `<button class="btn-est" onclick="alterarEstoque('${loja}', '${apNome}', -1, '${btnId}')">-</button><span class="qtd-badge" id="badge-${btnId}" style="${badgeStyle}">${qtd}${iconeAlerta}</span><button class="btn-est" onclick="alterarEstoque('${loja}', '${apNome}', 1, '${btnId}')">+</button>`; } else { htmlControles = `<span class="qtd-badge" style="${badgeStyle}">${qtd} un${iconeAlerta}</span>`; } htmlItens += `<div class="card-estoque-pop"><div class="header-pop"><span style="font-weight: bold; font-size: 15px;">${apNome} ${btnMostruarioHtml}</span></div><div style="display: flex; justify-content: space-between; align-items: center;"><span style="font-size: 13px; color: var(--cor-secundaria);">Quantidade:</span><div class="estoque-controles">${htmlControles}</div></div></div>`; } if(htmlItens !== "") { html += `<div class="loja-card-acompanhamento" style="background: transparent; border: none; box-shadow: none; padding: 0;"><div class="loja-titulo" style="margin-bottom: 15px; border-radius: 12px;"><span><i data-lucide="store" class="lucide-sm"></i> ${loja}</span><span class="loja-badge-total">Total: ${totalLoja} un</span></div><div>${htmlItens}</div></div>`; } } document.getElementById("lista-estoque-agrupada").innerHTML = html || `<div class="mensagem-vazia">Nenhum estoque para exibir.</div>`; atualizarTelaConferenciaEstoque(); loadIcons(); }
function alterarEstoque(loja, ap, delta, id) { let k = `${loja}|${ap}`; if (!pendenciasEstoque[k]) { let linha = dadosEstoqueGlobal.find(r => r.Loja === loja && r.Aparelho === ap); pendenciasEstoque[k] = { loja: loja, aparelho: ap, qtdOriginal: linha ? Number(linha.Quantidade) : 0, novaQtd: 0, deltaTotal: 0 }; } let p = pendenciasEstoque[k]; p.deltaTotal += delta; p.novaQtd = p.qtdOriginal + p.deltaTotal; if (p.novaQtd < 0) { p.novaQtd = 0; p.deltaTotal = -p.qtdOriginal; } let badge = document.getElementById(`badge-${id}`); if(badge) { badge.innerText = p.novaQtd; badge.style.backgroundColor = p.deltaTotal !== 0 ? "#fef3c7" : "transparent"; badge.style.color = p.deltaTotal !== 0 ? "#b45309" : "var(--cor-texto)"; } atualizarTelaConferenciaEstoque(); }
function atualizarTelaConferenciaEstoque() { const div = document.getElementById("area-conferencia-estoque"); const lista = document.getElementById("lista-pendentes-estoque"); const btnOk = document.getElementById('container-btn-conferencia-ok'); let html = ""; let tem = false; for (let k in pendenciasEstoque) { let p = pendenciasEstoque[k]; if (p.deltaTotal !== 0) { tem = true; html += `<div style="background: var(--bg-container); border: 1px solid var(--border-color); padding: 12px; border-radius: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 13px;"><span>📍 [${p.loja}] ${p.aparelho}</span><span>De: <strong>${p.qtdOriginal}</strong> ➔ Para: <span style="color: var(--primary); font-weight: bold;">${p.novaQtd} un</span></span></div>`; } } if (tem) { div.style.display = "block"; lista.innerHTML = html; if(btnOk) btnOk.style.display = "none"; } else { div.style.display = "none"; lista.innerHTML = ""; let hoje = new Date().toLocaleDateString('pt-BR'); let ultima = localStorage.getItem('ultimaConferencia_' + usuarioLogado.id); if (usuarioLogado.cargo === "promotor" && ultima !== hoje) { if(btnOk) btnOk.style.display = "block"; } else { if(btnOk) btnOk.style.display = "none"; } } }
function limparConferenciaEstoque() { renderizarListaEstoque(); }
function verificarMotivoEstoque() { let chaves = Object.keys(pendenciasEstoque).filter(k => pendenciasEstoque[k].deltaTotal !== 0); if (chaves.length === 0) return; let adminRole = (usuarioLogado.cargo === "supervisor" || usuarioLogado.cargo === "regional" || usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master"); if (adminRole) { executarEnvioEstoque("Ajuste Gerencial"); } else { document.getElementById('modal-motivo-estoque').classList.add('ativo'); } }
function confirmarEnvioEstoqueMotivo() { document.getElementById('modal-motivo-estoque').classList.remove('ativo'); let motivoSelecionado = document.getElementById('select-motivo-estoque').value; executarEnvioEstoque(motivoSelecionado); }

// ================= HISTÓRICO =================
function extrairChaveAparelho(textoBruto) { let semImei = textoBruto.split("→")[0].split("(")[0].replace(/\[Motivo:.*?\]/g, "").trim().toLowerCase(); for (let chave in mapaEmojis) { if (semImei.includes(chave.toLowerCase())) { return chave.toLowerCase(); } } return semImei.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim(); }
function ehPremium(textoBruto, supervisorId) { let chave = extrairChaveAparelho(textoBruto); let pSup = aparelhosPremium[supervisorId]; if (!pSup || Object.keys(pSup).length === 0) pSup = aparelhosPremium["geral"] || {}; return (pSup[chave] === 1 || pSup[chave] === true); }
function abrirHistorico(tipo) { tipoHistoricoAtual = tipo; mudarTela('tela-historico'); let selSup = document.getElementById('filtro-sup-historico'); if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") { document.getElementById('container-filtro-sup-historico').style.display = "block"; let htmlOp = '<option value="todos">Todas as Regiões</option>'; for(let k in bancoUsuarios) { if(bancoUsuarios[k].cargo === "supervisor" && podeGerenciar(usuarioLogado, k)) { htmlOp += `<option value="${k}">Equipe: ${bancoUsuarios[k].nome || k}</option>`; } } selSup.innerHTML = htmlOp; } else { document.getElementById('container-filtro-sup-historico').style.display = "none"; } mudouSupHistorico(); carregarHistoricoDoBanco(); }
function mudouSupHistorico() { let selSup = document.getElementById('filtro-sup-historico').value; let selProm = document.getElementById('filtro-promotor-historico'); let htmlOp = '<option value="todos">Todos da Equipe</option>'; let supAlvo = (usuarioLogado.cargo === "supervisor") ? usuarioLogado.id : selSup; if (supAlvo && supAlvo !== "todos") { for(let k in bancoUsuarios) { if(bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].criadoPor === supAlvo) { htmlOp += `<option value="${k}">${bancoUsuarios[k].nome || k}</option>`; } } } selProm.innerHTML = htmlOp; aplicarFiltroHistorico(); }
let limiteHistorico = 50; function aplicarFiltroHistorico() { limiteHistorico = 50; renderizarListaHistorico(); }
function abrirModalCancelarVenda(indexHist, pLogin) { vendaParaCancelar = { index: indexHist, login: pLogin }; let inputSenha = document.getElementById('senha-confirmacao-cancelamento'); if (inputSenha) inputSenha.value = ""; let modal = document.getElementById('modal-cancelar-venda'); if (modal) modal.classList.add('ativo'); }
function fecharModalCancelarVenda() { let modal = document.getElementById('modal-cancelar-venda'); if (modal) modal.classList.remove('ativo'); vendaParaCancelar = null; }
function validarECancelarVenda() { let inputSenha = document.getElementById('senha-confirmacao-cancelamento'); let senhaDigitada = inputSenha ? inputSenha.value.trim() : ""; if (senhaDigitada !== usuarioLogado.senha && usuarioLogado.id !== "master") { return mostrarToast("Senha incorreta. Estorno negado.", "erro"); } if(inputSenha) inputSenha.value = ""; let modal = document.getElementById('modal-cancelar-venda'); if (modal) modal.classList.remove('ativo'); executarCancelamentoVenda(); }
function renderizarListaHistorico() { const div = document.getElementById("lista-historico"); let dataInicio = document.getElementById('filtro-data-inicio-historico').value; let dataFim = document.getElementById('filtro-data-fim-historico').value; let supAlvo = (usuarioLogado.cargo === "supervisor") ? usuarioLogado.id : document.getElementById('filtro-sup-historico').value; let promAlvo = document.getElementById('filtro-promotor-historico').value; let ocultarCancelados = document.getElementById('filtro-ocultar-cancelados') ? document.getElementById('filtro-ocultar-cancelados').checked : false; let apenasCancelados = document.getElementById('filtro-apenas-cancelados') ? document.getElementById('filtro-apenas-cancelados').checked : false; if(apenasCancelados) { document.getElementById('filtro-ocultar-cancelados').checked = false; ocultarCancelados = false; } let filtrados = []; dadosHistoricoGlobal.forEach((row, index) => { if (row.excluidoApp) return; let tipoAcao = row.Tipo || row.tipo || "venda"; let pLogin = row.promotor_login || row.Promotor || ""; let dataLinha = row.data_venda || row.Data || ""; let detalhe = row.Detalhe || row.detalhes || `Venda: ${row.aparelhos_vendidos} | [${row.loja}] ${row.vendedor}`; let isCancelado = row.status === "Cancelado" || row.Status === "Cancelado" || detalhe.toLowerCase().includes('cancel'); if (ocultarCancelados && isCancelado) return; if (apenasCancelados && !isCancelado) return; let isEstoque = tipoAcao.toLowerCase().includes('estoque') || tipoAcao.toLowerCase().includes('auditoria'); if (tipoHistoricoAtual === 'estoque' && !isEstoque) return; if (tipoHistoricoAtual === 'geral' && isEstoque) return; if (usuarioLogado.id !== "master" && pLogin !== usuarioLogado.id) { if (!podeGerenciar(usuarioLogado, pLogin)) return; } let pObj = bancoUsuarios[pLogin]; if (supAlvo && supAlvo !== "todos") { if (pLogin !== supAlvo && (!pObj || pObj.criadoPor !== supAlvo)) return; } if (promAlvo && promAlvo !== "todos" && pLogin !== promAlvo) return; if(dataInicio && dataLinha) { let dt = new Date(dataInicio + "T00:00:00"); if(new Date(dataLinha) < dt) return; } if(dataFim && dataLinha) { let dt = new Date(dataFim + "T23:59:59"); if(new Date(dataLinha) > dt) return; } filtrados.push({row: row, originalIndex: index, pLogin: pLogin, isEstoque: isEstoque, detalhe: detalhe, isCancelado: isCancelado, dataLinha: dataLinha}); }); let filtrados_total = filtrados.length; filtrados = filtrados.slice(0, limiteHistorico); if(filtrados_total === 0) { div.innerHTML = "<div class='mensagem-vazia'>Nenhuma ação encontrada.</div>"; return; } let html = ""; filtrados.forEach(item => { let dataFormatada = "Sem Data"; if (item.dataLinha) { let d = new Date(item.dataLinha); if(!isNaN(d)) dataFormatada = d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR').slice(0, 5); } let nomePromotor = bancoUsuarios[item.pLogin] ? bancoUsuarios[item.pLogin].nome : item.pLogin; if (!nomePromotor) nomePromotor = "Usuário Desconhecido"; let textoDetalheLimpo = item.detalhe.replace(/\[CANCELADO\]/ig, '').trim(); let opacidade = item.isCancelado ? "opacity: 0.7; filter: grayscale(0.8);" : ""; let bgCard = item.isCancelado ? "background: var(--bg-fundo);" : "background: var(--bg-card);"; let bordaCard = item.isCancelado ? "border: 1px dashed #ef4444;" : "border: 1px solid var(--border-color);"; let estiloTexto = item.isCancelado ? "text-decoration: line-through; color: var(--cor-secundaria);" : "color: var(--cor-texto);"; let badgeCancelado = item.isCancelado ? `<div style="background: #fee2e2; color: #ef4444; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; margin-bottom: 8px; display: inline-block;">ESTORNADO</div>` : ""; let icone = item.isEstoque ? '<i data-lucide="package" style="color:#f59e0b;" class="lucide-sm"></i>' : '<i data-lucide="shopping-bag" style="color:#10b981;" class="lucide-sm"></i>'; if (item.isCancelado) icone = '<i data-lucide="slash" style="color: #ef4444;" class="lucide-sm"></i>'; let btnAcao = ""; let adminRole = (usuarioLogado.cargo === "supervisor" || usuarioLogado.cargo === "regional" || usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master"); if (tipoHistoricoAtual === 'geral' && adminRole) { if (!item.isCancelado) { btnAcao = `<button onclick="abrirModalCancelarVenda(${item.originalIndex}, '${item.pLogin}')" style="background: transparent; color: #ef4444; border: 1px solid rgba(239,68,68,0.3); padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;"><i data-lucide="x-circle" class="lucide-sm"></i> Cancelar</button>`; } else { btnAcao = `<button onclick="executarDesfazerCancelamento(${item.originalIndex})" style="background: var(--bg-item); color: #10b981; border: 1px solid rgba(16,185,129,0.3); padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;"><i data-lucide="rotate-ccw" class="lucide-sm"></i> Desfazer</button>`; } } html += `<div style="${opacidade} ${bgCard} ${bordaCard} padding: 16px; border-radius: 12px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px;">${badgeCancelado}<div style="display: flex; justify-content: space-between; align-items:center;"><span style="font-size:12px; font-weight:bold; color:var(--cor-secundaria);">${dataFormatada}</span><span style="font-size: 13px; font-weight:bold; color:var(--primary);"><i data-lucide="user" class="lucide-sm"></i> ${nomePromotor}</span></div><div style="font-size:14px; ${estiloTexto} display: flex; align-items: flex-start; justify-content: space-between; gap:8px;"><div style="display: flex; align-items: flex-start; gap: 8px;">${icone} <span>${textoDetalheLimpo}</span></div></div><div style="display: flex; justify-content: flex-end; margin-top: 4px;">${btnAcao}</div></div>`; }); div.innerHTML = html; loadIcons(); if (filtrados_total > limiteHistorico) { div.innerHTML += `<button class="btn-sistema" style="margin-top: 15px; background: var(--bg-item); color: var(--primary); border: 1px solid var(--primary);" onclick="limiteHistorico += 50; renderizarListaHistorico();">Carregar mais históricos...</button>`; } }
function forcarAtualizacaoDashboard() { mostrarToast("Buscando dados atualizados...", "info"); let icone = document.getElementById('icon-refresh-dash'); if(icone) icone.style.animation = "spin 1s linear infinite"; abrirDashboard(); carregarGraficosShare(); }

// ==========================================
// FILTROS EM CASCATA DO DASHBOARD
// ==========================================
function atualizarFiltroPromotorDash() { let selSup = document.getElementById('filtro-supervisor-dash'); let supVal = selSup ? selSup.value : "todos"; let selProm = document.getElementById('filtro-promotor-dash'); if(!selProm) return; let promotorAtual = selProm.value; let htmlOp = '<option value="todos">Todos da Equipe</option>'; let supAlvo = (usuarioLogado.cargo === "supervisor") ? usuarioLogado.id : supVal; if (supAlvo && supAlvo !== "todos") { for(let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].criadoPor === supAlvo) { htmlOp += `<option value="${k}">${bancoUsuarios[k].nome || k}</option>`; } } } selProm.innerHTML = htmlOp; if (Array.from(selProm.options).some(opt => opt.value === promotorAtual)) { selProm.value = promotorAtual; } }
function atualizarFiltroLojaDash() {
    let selProm = document.getElementById('filtro-promotor-dash');
    let selLoja = document.getElementById('filtro-loja-dash');
    if (!selLoja) return;
    
    let htmlOp = '<option value="todas">Todas as Lojas</option>';
    let lojasDaBusca = [];
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
    lojasDaBusca.sort().forEach(l => { htmlOp += `<option value="${l}">${l}</option>`; });
    selLoja.innerHTML = htmlOp;
}

window.mudouSupervisorDash = function() { 
    atualizarFiltroPromotorDash(); 
    atualizarFiltroLojaDash();
    abrirDashboard(); 
    carregarGraficosShare();
};

window.mudouPromotorDash = function() {
    atualizarFiltroLojaDash();
    abrirDashboard();
    carregarGraficosShare();
};

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
    
    supabaseClient.from('vendas').select('*').neq('status', 'Cancelado').then(({ data, error }) => {
        if (error) throw error;
        let dados = data.map(row => ({
            Vendedor: `[${row.loja}] ${row.vendedor}`,
            Aparelhos: row.aparelhos_vendidos,
            Data: row.data_venda
        }));
        dadosAcompanhamentoGlobal = dados; 
        gerarGraficos(dados);
    }).catch(e => { 
        console.error(e);
        document.getElementById("total-vendas-geral").innerText = "Erro!"; 
        mostrarBotaoReconexao(); 
    }).finally(() => { 
        let icone = document.getElementById('icon-refresh-dash'); 
        if(icone) icone.style.animation = "none"; 
        loadIcons(); 
    }); 
}

function toggleComissao() { let elComissao = document.getElementById("total-comissao-geral"); let iconeOlho = document.getElementById("icone-olho-comissao"); if (elComissao.innerText === "R$ ****") { elComissao.innerText = elComissao.dataset.valor || "R$ 0,00"; iconeOlho.innerHTML = '<i data-lucide="eye-off" style="margin:0;"></i>'; } else { elComissao.innerText = "R$ ****"; iconeOlho.innerHTML = '<i data-lucide="eye" style="margin:0;"></i>'; } loadIcons(); }
function isCampaignActiveInMonth(startStr, endStr, mesSelecionado) { if (!startStr && !endStr) return true; let partes = mesSelecionado.split('/'); if(partes.length < 2) return true; let m = parseInt(partes[0], 10); let y = parseInt(partes[1], 10); let dtStart = startStr ? new Date(startStr + "T00:00:00") : new Date(2000, 0, 1); let dtEnd = endStr ? new Date(endStr + "T23:59:59") : new Date(2100, 0, 1); let startOfMonth = new Date(y, m - 1, 1); let endOfMonth = new Date(y, m, 0, 23, 59, 59); return dtStart <= endOfMonth && dtEnd >= startOfMonth; }

function gerarGraficos(dadosVendas) {
    if (!dadosVendas) dadosVendas = []; let totalGeral = 0; let vendasPorLoja = {}; let vendasPorModelo = {}; let metricas = {}; let modelosFocoVendidos = {}; let rankingPorLoja = {}; 
    let supervisorFoco = "todos"; let promotorFoco = "todos"; let lojaFoco = "todas";
    
    if (usuarioLogado.cargo === "promotor") { supervisorFoco = bancoUsuarios[usuarioLogado.id].criadoPor || "todos"; promotorFoco = usuarioLogado.id; } 
    else { if (usuarioLogado.cargo === "supervisor") supervisorFoco = usuarioLogado.id; else if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") supervisorFoco = document.getElementById('filtro-supervisor-dash').value; if (document.getElementById('container-filtro-promotor-dash').style.display !== "none") { promotorFoco = document.getElementById('filtro-promotor-dash').value || "todos"; } }

    let elLoja = document.getElementById('filtro-loja-dash');
    if (elLoja) lojaFoco = elLoja.value || "todas";

    let agrupamento = (supervisorFoco === "todos") ? "supervisor" : "promotor"; let visualizarVendedores = (promotorFoco !== "todos" || lojaFoco !== "todas"); 
    
    if (agrupamento === "supervisor") { for (let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === "supervisor") { if(podeGerenciar(usuarioLogado, k)) { let nomeSup = bancoUsuarios[k].nome || k; metricas[nomeSup] = { login: k, nome: nomeSup, metaPremium: 0, metaIndividual: 0, realizadoPremium: 0, realizadoGeral: 0, modelosPremiumVendidos: {}, modelosVendidosGeral: {}, comissaoAcumulada: 0 }; } } } }

    for (let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === "promotor") { let supDoPromotor = bancoUsuarios[k].criadoPor; if (supervisorFoco !== "todos" && supDoPromotor !== supervisorFoco) continue; if (promotorFoco !== "todos" && k !== promotorFoco) continue; if (supervisorFoco === "todos" && !podeGerenciar(usuarioLogado, k)) continue; let metaIndPromotor = bancoUsuarios[k].meta || 0; let taxaSup = taxasCoparticipacao[supDoPromotor] || taxasCoparticipacao["geral"] || 25; let metaPremPromotor = metaIndPromotor * (taxaSup / 100); if (agrupamento === "supervisor") { if (supDoPromotor && bancoUsuarios[supDoPromotor]) { let nomeSup = bancoUsuarios[supDoPromotor].nome || supDoPromotor; if(metricas[nomeSup]) { metricas[nomeSup].metaPremium += metaPremPromotor; metricas[nomeSup].metaIndividual += metaIndPromotor; } } } else { let pNome = bancoUsuarios[k].nome || k; metricas[pNome] = { login: k, nome: pNome, metaPremium: metaPremPromotor, metaIndividual: metaIndPromotor, realizadoPremium: 0, realizadoGeral: 0, modelosPremiumVendidos: {}, modelosVendidosGeral: {}, comissaoAcumulada: 0 }; } } }

    dadosVendas.forEach(row => {
        let match = (row["Vendedor"] || "").match(/^\[(.*?)\]\s*(.*)$/); let loja = match ? match[1] : "Outras"; let vendNome = match ? match[2] : row["Vendedor"];
        
        if (lojaFoco !== "todas" && loja !== lojaFoco) return;
        
        let lista = (row["Aparelhos"] || "").split("||").map(x => x.trim()).filter(x => x !== ""); let qtd = lista.length; let pertenceAoEscopo = false; let promotoresImpactados = new Set(); let supervisoresImpactados = new Set();
        for (let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].lojasPermitidas && bancoUsuarios[k].lojasPermitidas.includes(loja)) { if (supervisorFoco === "todos" || bancoUsuarios[k].criadoPor === supervisorFoco) { if (promotorFoco === "todos" || k === promotorFoco) { if (podeGerenciar(usuarioLogado, k)) { pertenceAoEscopo = true; promotoresImpactados.add(k); if(bancoUsuarios[k].criadoPor) supervisoresImpactados.add(bancoUsuarios[k].criadoPor); } } } } }
        if (!pertenceAoEscopo) return; totalGeral += qtd; if (!vendasPorLoja[loja]) vendasPorLoja[loja] = 0; vendasPorLoja[loja] += qtd;
        if (visualizarVendedores) { if (!rankingPorLoja[loja]) rankingPorLoja[loja] = {}; let multVend = vendNome.split(" e "); multVend.forEach(vN => { let v = vN.trim(); if (!rankingPorLoja[loja][v]) rankingPorLoja[loja][v] = { qtdGeral: 0, qtdPremium: 0 }; rankingPorLoja[loja][v].qtdGeral += qtd; }); }

        lista.forEach(ap => { 
            let chaveKey = extrairChaveAparelho(ap); let modeloFormatado = (mapaEmojis[chaveKey] ? mapaEmojis[chaveKey] + " " : "") + chaveKey.toUpperCase();
            if (!vendasPorModelo[modeloFormatado]) vendasPorModelo[modeloFormatado] = 0; vendasPorModelo[modeloFormatado] += 1; 
            let checkPrem = ehPremium(ap, supervisorFoco !== "todos" ? supervisorFoco : "geral");
            if (visualizarVendedores && checkPrem) { vendNome.split(" e ").forEach(vN => { rankingPorLoja[loja][vN.trim()].qtdPremium += 1; }); }

            if (agrupamento === "supervisor") { supervisoresImpactados.forEach(supKey => { let userSup = bancoUsuarios[supKey]; let nomeSup = userSup ? (userSup.nome || supKey) : supKey; if (metricas[nomeSup]) { metricas[nomeSup].realizadoGeral += 1; metricas[nomeSup].modelosVendidosGeral[chaveKey] = (metricas[nomeSup].modelosVendidosGeral[chaveKey] || 0) + 1; if (checkPrem) { metricas[nomeSup].realizadoPremium += 1; modelosFocoVendidos[modeloFormatado] = (modelosFocoVendidos[modeloFormatado] || 0) + 1; metricas[nomeSup].modelosPremiumVendidos[chaveKey] = (metricas[nomeSup].modelosPremiumVendidos[chaveKey] || 0) + 1; } } }); } else { promotoresImpactados.forEach(pKey => { let userP = bancoUsuarios[pKey]; let pNome = userP ? (userP.nome || pKey) : pKey; let supKey = userP ? userP.criadoPor : "geral"; if (metricas[pNome]) { metricas[pNome].realizadoGeral += 1; metricas[pNome].modelosVendidosGeral[chaveKey] = (metricas[pNome].modelosVendidosGeral[chaveKey] || 0) + 1; if (checkPrem) { metricas[pNome].realizadoPremium += 1; modelosFocoVendidos[modeloFormatado] = (modelosFocoVendidos[modeloFormatado] || 0) + 1; metricas[pNome].modelosPremiumVendidos[chaveKey] = (metricas[pNome].modelosPremiumVendidos[chaveKey] || 0) + 1; } } }); }
        });
    });

    let mesFiltro = document.getElementById("seletor-mes-dash").value;
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

    let dataReferencia = new Date(); let diasParaMedia = 1; if (mesFiltro !== "") { let partes = mesFiltro.split('/'); let ms = parseInt(partes[0], 10); let yr = parseInt(partes[1], 10); if (dataReferencia.getMonth() + 1 === ms && dataReferencia.getFullYear() === yr) { diasParaMedia = dataReferencia.getDate(); } else { diasParaMedia = new Date(yr, ms, 0).getDate(); } } else { diasParaMedia = dataReferencia.getDate(); } if (diasParaMedia < 1) diasParaMedia = 1; let mediaDiaria = totalGeral > 0 ? (totalGeral / diasParaMedia).toFixed(1) : 0;
    
    document.getElementById("total-vendas-geral").innerText = `${totalGeral} un`; document.getElementById("media-diaria-geral").innerText = `${mediaDiaria} un`;
    let comissaoTotalGeral = Object.values(metricas).reduce((acc, m) => acc + (m.comissaoAcumulada || 0), 0); let valorFormatado = `R$ ${comissaoTotalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`; let elComissao = document.getElementById("total-comissao-geral"); elComissao.dataset.valor = valorFormatado; elComissao.innerText = "R$ ****"; document.getElementById("icone-olho-comissao").innerHTML = '<i data-lucide="eye" style="margin:0;"></i>'; loadIcons();

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
        promOrd.forEach(p => { let m = metricas[p]; if(uQtd !== -1 && m.realizadoGeral < uQtd) rNum++; uQtd = m.realizadoGeral; let bC = rNum === 1 ? 'rank-1' : rNum === 2 ? 'rank-2' : rNum === 3 ? 'rank-3' : 'rank-outros'; let metaAlvo = m.metaIndividual; let pctHit = metaAlvo > 0 ? ((m.realizadoGeral / metaAlvo) * 100).toFixed(1) : 0; let corHit = pctHit >= 100 ? '#10b981' : '#ef4444'; let labelMetaRanking = agrupamento === "supervisor" ? "Meta Acumulada" : "Meta Individual"; let pctFocoVendedor = m.realizadoGeral > 0 ? ((m.realizadoPremium / m.realizadoGeral) * 100).toFixed(1) : 0; htmlRank += `<div style="display:flex;flex-direction:column;padding:12px 0;border-bottom:1px dashed var(--border-color);"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><div style="display:flex;align-items:center;gap:10px;"><span class="badge-rank ${bC}">${rNum}º</span><strong style="font-size: 15px;"><i data-lucide="${agrupamento === 'supervisor' ? 'users' : 'user'}" class="lucide-sm"></i> ${p}</strong></div><span style="background:var(--bg-item);color:var(--primary);font-weight:bold;padding:4px 10px;border-radius:6px;font-size:14px;">${m.realizadoGeral} un</span></div><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--cor-secundaria);background:var(--bg-item);padding:4px 8px;border-radius:4px;"><span>🎯 ${labelMetaRanking}: <strong>${metaAlvo} un</strong></span><span style="color: ${corHit}; font-weight: bold;">${pctHit}% Concluído</span></div><div style="font-size:11px; color:var(--cor-secundaria); text-align:left; padding-left:4px; margin-top:2px;">Coparticipação Foco: <strong>${m.realizadoPremium} un</strong> (<span style="color:#10b981;">${pctFocoVendedor}%</span>)</div></div>`; });
    }
    document.getElementById("lista-ranking-promotores").innerHTML = htmlRank || "<span style='font-size:13px; color:var(--cor-secundaria);'>Nenhuma venda registrada.</span>"; loadIcons();

    try {
        if (chartCoparticipacao) chartCoparticipacao.destroy(); if (chartCapa) chartCapa.destroy(); if (chartLojas) chartLojas.destroy(); if (chartModelos) chartModelos.destroy();
        let corTextoGrafico = document.body.classList.contains('dark-mode') ? '#f8fafc' : '#64748b'; Chart.defaults.color = corTextoGrafico; const pluginsArr = typeof ChartDataLabels !== 'undefined' ? [ChartDataLabels] : []; let labelsProm = Object.keys(metricas); let metasArr = labelsProm.map(p => metricas[p].metaPremium); let maxMeta = metasArr.length > 0 ? Math.max(...metasArr) : 10; if(maxMeta === -Infinity || maxMeta < 1) maxMeta = 10; 
        let widthProm = Math.max(100, labelsProm.length * 18); let wrapCapa = document.getElementById('wrap-graficoMetaPremiumCapa'); if(wrapCapa) wrapCapa.style.minWidth = widthProm + '%'; let wrapCopart = document.getElementById('wrap-graficoCoparticipacaoPromotores'); if(wrapCopart) wrapCopart.style.minWidth = widthProm + '%';

        const ctxCapa = document.getElementById('graficoMetaPremiumCapa').getContext('2d'); chartCapa = new Chart(ctxCapa, { type: 'bar', plugins: pluginsArr, data: { labels: labelsProm, datasets: [{ label: 'Meta Foco (un)', data: labelsProm.map(p => Math.round(metricas[p].metaPremium * 10) / 10), backgroundColor: '#c0c0c0' }, { label: 'Realizado Foco', data: labelsProm.map(p => metricas[p].realizadoPremium), backgroundColor: '#f59e0b' }]}, options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 45 } }, plugins: { legend: { position: 'bottom' }, datalabels: { anchor: 'end', align: 'top', offset: 4, formatter: (val, ctx) => { if (ctx.datasetIndex === 0) return val + ' un'; let p = ctx.chart.data.labels[ctx.dataIndex]; let m = metricas[p]; let pct = m.metaPremium > 0 ? ((val / m.metaPremium) * 100).toFixed(1) : 0; return [`${val} un`, `(${pct}%)`]; }, font: { weight: 'bold', size: 10 }, color: corTextoGrafico, textAlign: 'center' } }, scales: { y: { beginAtZero: true, suggestedMax: maxMeta * 1.3 } } } });
        const ctxCopart = document.getElementById('graficoCoparticipacaoPromotores').getContext('2d'); chartCoparticipacao = new Chart(ctxCopart, { type: 'bar', plugins: pluginsArr, data: { labels: labelsProm, datasets: [{ label: '% Coparticipação', data: labelsProm.map(p => metricas[p].realizadoGeral > 0 ? ((metricas[p].realizadoPremium / metricas[p].realizadoGeral) * 100).toFixed(1) : 0), backgroundColor: '#0086ff' }] }, options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 45 } }, plugins: { legend: { display: false }, tooltip: { padding: 12, callbacks: { label: function(context) { let p = context.chart.data.labels[context.dataIndex]; let m = metricas[p]; let linhas = [`Coparticipação: ${context.raw}% (${m.realizadoPremium} de ${m.realizadoGeral} un)`]; if (m.realizadoPremium > 0) { linhas.push('-------------------------'); linhas.push('Aparelhos Foco Vendidos:'); for (let mod in m.modelosPremiumVendidos) { linhas.push(`• ${m.modelosPremiumVendidos[mod]}x ${mod}`); } } return linhas; } } }, datalabels: { anchor: 'end', align: 'top', offset: 4, formatter: (val, ctx) => { let p = ctx.chart.data.labels[ctx.dataIndex]; let m = metricas[p]; return [`${val}%`, `(${m.realizadoPremium} de ${m.realizadoGeral} un)`]; }, font: { weight: 'bold', size: 10 }, color: corTextoGrafico, textAlign: 'center' } }, scales: { y: { beginAtZero: true, suggestedMax: 100 } } } });

        let lojasSort = Object.keys(vendasPorLoja).sort((a,b) => a.localeCompare(b, undefined, {numeric:true, sensitivity:'base'})); 
        let widthLojas = Math.max(100, lojasSort.length * 18); let wrapLojas = document.getElementById('wrap-graficoVendasLoja'); if(wrapLojas) wrapLojas.style.minWidth = widthLojas + '%';
        const ctxLojas = document.getElementById('graficoVendasLoja').getContext('2d'); chartLojas = new Chart(ctxLojas, { type: 'bar', plugins: pluginsArr, data: { labels: lojasSort, datasets: [{ data: lojasSort.map(l => vendasPorLoja[l]), backgroundColor: '#10b981', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 20 } }, scales: { x: { ticks: { display: false }, grid: { display: false } }, y: { beginAtZero: true } }, plugins: { legend: { display: false }, tooltip: { padding: 12, callbacks: { title: function(context) { return '🏪 ' + context[0].label; }, afterTitle: function(context) { let nomePromotor = getPromotorDaLoja(context[0].label); return '👤 Promotor: ' + nomePromotor; }, label: function(context) { return 'Total Vendido: ' + context.raw + ' un'; } } }, datalabels: { anchor: 'end', align: 'top', color: corTextoGrafico, font: { weight: 'bold' }, formatter: (val) => val + ' un' } } } });

        let topModelos = Object.entries(vendasPorModelo).sort((a, b) => b[1] - a[1]).slice(0, 5); const ctxModelos = document.getElementById('graficoTopModelos').getContext('2d'); chartModelos = new Chart(ctxModelos, { type: 'doughnut', plugins: pluginsArr, data: { labels: topModelos.map(m => `${m[0]}`), datasets: [{ data: topModelos.map(m => m[1]), backgroundColor: ['#0086ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] }] }, options: { maintainAspectRatio: false, responsive: true, plugins: { legend: { position: 'bottom', labels: { color: corTextoGrafico } }, datalabels: { color: '#fff', font: { weight: 'bold', size: 12 }, formatter: (value) => value > 0 ? value + ' un' : '' } } } });
        
        setTimeout(() => {
            if(document.getElementById('tela-dashboard').classList.contains('ativa')) {
                let isTop1 = false;
                if (!visualizarVendedores && promOrd.length > 0) { if (promOrd[0] === usuarioLogado.nome || promOrd[0] === usuarioLogado.id) isTop1 = true; }
                if (isTop1 && !window.confettiDisparado) { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#0086ff', '#10b981', '#f59e0b', '#ffd700'] }); window.confettiDisparado = true; mostrarToast("🏆 Parabéns! Você está em 1º Lugar no ranking!", "sucesso"); }
            }
        }, 500);

    } catch(errG) { console.error("Erro interno nos gráficos:", errG); }
}

// ================= ADMIN & CONFIGURAÇÕES =================
function renderizarSelectRegioes() {
    let regioesUnicas = new Set(); for (let k in bancoUsuarios) { if (bancoUsuarios[k].regiao) regioesUnicas.add(bancoUsuarios[k].regiao.toUpperCase()); } let sel = document.getElementById('admin-gs-regiao-select'); if (!sel) return; let html = '<option value="">Selecione a Região...</option>'; let regioesArray = Array.from(regioesUnicas).sort(); regioesArray.forEach(r => { html += `<option value="${r}">${r}</option>`; }); html += '<option value="NOVA">➕ Criar Nova Região</option>'; sel.innerHTML = html;
}
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

function fecharModalEquipe() {
    document.getElementById('modal-gerenciar-equipe').classList.remove('ativo');
    supervisorGerenciadoAtual = null;
}

function getLojasDaRegiao(supLogin) {
    let lojas = [];
    for (let l in lojasConfig) {
        if (lojasConfig[l].supervisor === supLogin) {
            lojas.push(l);
        } else if (!lojasConfig[l].supervisor) {
            let promotoresDoSup = Object.keys(bancoUsuarios).filter(k => bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].criadoPor === supLogin);
            let pertence = promotoresDoSup.some(p => bancoUsuarios[p].lojasPermitidas && bancoUsuarios[p].lojasPermitidas.includes(l));
            if (pertence) {
                lojas.push(l);
                lojasConfig[l].supervisor = supLogin;
            }
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
    bancoUsuarios[login] = {
        nome: nome, senha: senha, cargo: "promotor", meta: meta, criadoPor: supervisorGerenciadoAtual, lojasPermitidas: lojasSelecionadas,
        permissoes: { vendas: document.getElementById('perm-vendas').checked, acomp: document.getElementById('perm-acomp').checked, estoque_ver: document.getElementById('perm-est-ver').checked, estoque_editar: document.getElementById('perm-est-edit').checked }
    };
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

function renderizarInputsFoco() {
    const container = document.getElementById('admin-foco-container'); const selSup = document.getElementById('seletor-foco-sup'); 
    if (!container || !selSup) return;
    let supId = selSup.value; let premiumSup = aparelhosPremium[supId] || aparelhosPremium["geral"] || {}; let taxaSup = taxasCoparticipacao[supId] || taxasCoparticipacao["geral"] || 25; let vComissaoSup = valoresComissao[supId] || valoresComissao["geral"] || {}; 
    let grupos = vComissaoSup.grupos || []; let aparelhosCfg = vComissaoSup.aparelhos || {}; let campanhasAtivas = vComissaoSup.campanhasPersonalizadas || [];
    
    let marcasConcorrentes = vComissaoSup.marcas_concorrentes || ["Samsung", "Motorola", "Outros"];

    document.getElementById('input-taxa-copart').value = taxaSup;

    let htmlGrupos = '<div style="background: var(--bg-item); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color); margin-top: 20px; text-align: left;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;"><span style="font-size: 15px; font-weight: bold; color: #8b5cf6;"><i data-lucide="layers" class="lucide-sm"></i> Categorias de Comissionamento</span><button class="btn-acao btn-enviar" style="padding: 8px 14px; font-size: 12px; width: auto; background: #8b5cf6;" onclick="adminAddGrupo()"><i data-lucide="plus"></i> Nova Categoria</button></div>';
    if(grupos.length === 0) htmlGrupos += '<span style="font-size:12px; color:var(--cor-secundaria);">Crie categorias (ex: Linha Intermediária, Linha Premium) para somar o volume de vendas.</span>';
    grupos.forEach((g, gIdx) => {
        htmlGrupos += `<div class="bloco-grupo" data-id="${g.id}" style="background:var(--bg-container); padding:15px; border-radius:12px; border: 1px solid var(--border-color); margin-bottom:12px;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;"><input type="text" class="grupo-nome" value="${g.nome}" style="font-weight:bold; color:var(--primary); width:180px; margin:0; padding:8px; border-color:var(--primary);" onchange="adminEditGrupoNome('${g.id}', this.value)"><div style="display:flex; gap:8px;"><button class="btn-editar" style="font-size:11px; padding:6px 10px;" onclick="adminAddNivelGrupo('${g.id}')">+ Adicionar Nível de Meta</button><button class="btn-excluir" style="padding:6px 10px;" onclick="adminRemoverGrupo('${g.id}')"><i data-lucide="trash-2" class="lucide-sm" style="margin:0;"></i></button></div></div>`;
        g.niveis.forEach((nv, nIdx) => { htmlGrupos += `<div style="display:flex; align-items:center; gap:10px; margin-bottom:8px; font-size:13px; background:var(--bg-item); padding:8px 12px; border-radius:8px; border: 1px dashed var(--border-color);"><span>Nível ${nIdx + 1} - Atingindo</span> <input type="number" value="${nv.meta}" style="width:70px; margin:0; padding:6px; font-weight:bold;" onchange="adminEditGrupoNivel('${g.id}', ${nIdx}, 'meta', this.value)"> <span>unidades.</span><button class="btn-excluir" style="padding:4px 8px; margin-left:auto; font-size:10px;" onclick="adminRemoverNivelGrupo('${g.id}', ${nIdx})"><i data-lucide="x" style="margin:0;"></i></button></div>`; });
        htmlGrupos += `</div>`;
    });
    htmlGrupos += '</div>';

    let htmlCampanhas = '<div style="background: var(--bg-item); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color); margin-top: 20px; text-align: left;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;"><span style="font-size: 14px; font-weight: bold; color: #f59e0b;"><i data-lucide="gift" class="lucide-sm"></i> Campanhas Extra</span><button class="btn-acao btn-enviar" style="background-color: #f59e0b; padding: 8px 14px; font-size: 12px; width: auto;" onclick="adicionarLinhaCampanha()"><i data-lucide="plus"></i> Nova Regra</button></div><div id="container-linhas-campanhas" style="display: flex; flex-direction: column; gap: 12px;">';
    if (campanhasAtivas.length === 0) { htmlCampanhas += '<span style="font-size: 13px; color: var(--cor-secundaria); font-style: italic;">Nenhuma campanha ativa.</span>'; }
    campanhasAtivas.forEach((camp, index) => {
        let optionsAparelhos = '<option value="todos">Qualquer Aparelho (Bate Foco)</option>'; for (let ap in mapaEmojis) { let sel = camp.aparelho === ap ? "selected" : ""; optionsAparelhos += `<option value="${ap}" ${sel}>${mapaEmojis[ap]} ${ap.toUpperCase()}</option>`; }
        let optionsPromotores = '<option value="todos">Toda a Equipe</option>'; for (let pk in bancoUsuarios) { if (bancoUsuarios[pk].cargo === "promotor" && (supId === 'geral' || bancoUsuarios[pk].criadoPor === supId)) { let selP = (camp.promotorAlvo === pk) ? "selected" : ""; optionsPromotores += `<option value="${pk}" ${selP}>👤 ${bancoUsuarios[pk].nome || pk}</option>`; } }
        htmlCampanhas += `<div class="linha-campanha-dinamica" style="background: var(--bg-container); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 10px;"><div style="display: flex; gap: 10px; flex-wrap: wrap;"><select class="camp-aparelho" style="margin-bottom:0; padding:10px; flex:1;" onchange="atualizarListaPremiumGlobal()">${optionsAparelhos}</select><select class="camp-promotor" style="margin-bottom:0; padding:10px; flex:1;" onchange="atualizarListaPremiumGlobal()">${optionsPromotores}</select><button class="btn-excluir" style="padding: 10px;" onclick="removerLinhaCampanha(${index})"><i data-lucide="trash-2" style="margin:0;"></i></button></div><div style="display: flex; gap: 10px; flex-wrap: wrap;"><div style="display: flex; align-items:center; gap:6px; flex:1;"><span style="font-size:11px;">Qtd Min.</span><input type="number" class="camp-qtd" value="${camp.qtdMinima || 1}" style="margin-bottom:0; padding:10px;" onchange="atualizarListaPremiumGlobal()"></div><div style="display: flex; align-items:center; gap:6px; flex:1;"><span style="font-size:11px;">Bônus(R$)</span><input type="number" class="camp-valor" value="${camp.bonus || 0}" style="margin-bottom:0; padding:10px;" onchange="atualizarListaPremiumGlobal()"></div></div></div>`;
    }); 
    htmlCampanhas += '</div></div>';

    let htmlMarcas = `<div style="background: var(--bg-item); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color); margin-top: 20px; text-align: left;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <span style="font-size: 14px; font-weight: bold; color: #3b82f6;"><i data-lucide="pie-chart" class="lucide-sm"></i> Marcas da Concorrência</span>
            <button class="btn-acao btn-enviar" style="background-color: #3b82f6; padding: 8px 14px; font-size: 12px; width: auto;" onclick="adminAddMarcaConcorrente()"><i data-lucide="plus"></i> Nova Marca</button>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">`;
    marcasConcorrentes.forEach((marca, idx) => {
        htmlMarcas += `<span style="background: var(--bg-container); border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 8px; color: var(--cor-texto);">${marca} <i data-lucide="x" class="lucide-sm" style="cursor:pointer; color:#ef4444;" onclick="adminRemoverMarcaConcorrente(${idx})"></i></span>`;
    });
    htmlMarcas += `</div><span style="font-size: 11px; color: var(--cor-secundaria); display: block; margin-top: 10px;">Essas marcas aparecerão no aplicativo dos seus promotores na hora de lançar o fechamento.</span></div>`;

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
    container.innerHTML = htmlGrupos + htmlCampanhas + htmlMarcas + htmlAparelhos; loadIcons();
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

function adminAbrirModalSenha(login) { 
    document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="key"></i> Senha (@${login})`; 
    document.getElementById('modal-edicao-corpo').innerHTML = `<input type="text" id="input-edit-senha" value="${bancoUsuarios[login].senha}" placeholder="Nova Senha">`; 
    let btn = document.getElementById('btn-salvar-edicao'); 
    btn.onclick = function() { 
        let val = document.getElementById('input-edit-senha').value.trim(); 
        if(val) { 
            bancoUsuarios[login].senha = val; 
            mostrarToast("Senha alterada!", "sucesso"); 
            fecharModalEdicao(); 
            renderizarAdminUsuarios(); 
            if (document.getElementById('modal-gerenciar-equipe').classList.contains('ativo')) renderizarModalEquipe(); 
        } 
    }; 
    document.getElementById('modal-edicao').classList.add('ativo'); 
    loadIcons(); 
}

function adminAbrirModalNome(login) { 
    document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="edit-3"></i> Nome (@${login})`; 
    document.getElementById('modal-edicao-corpo').innerHTML = `<input type="text" id="input-edit-nome" value="${bancoUsuarios[login].nome || login}" placeholder="Nome Completo">`; 
    let btn = document.getElementById('btn-salvar-edicao'); 
    btn.onclick = function() { 
        let val = document.getElementById('input-edit-nome').value.trim(); 
        if(val) { 
            bancoUsuarios[login].nome = val; 
            mostrarToast("Nome alterada!", "sucesso"); 
            fecharModalEdicao(); 
            renderizarAdminUsuarios(); 
            if (document.getElementById('modal-gerenciar-equipe').classList.contains('ativo')) renderizarModalEquipe(); 
        } 
    }; 
    document.getElementById('modal-edicao').classList.add('ativo'); 
    loadIcons(); 
}

function adminAbrirModalRegiao(login) { 
    document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="globe"></i> Região (@${login})`; 
    document.getElementById('modal-edicao-corpo').innerHTML = `<input type="text" id="input-edit-regiao" value="${bancoUsuarios[login].regiao || ''}" placeholder="Nome da Região">`; 
    let btn = document.getElementById('btn-salvar-edicao'); 
    btn.onclick = function() { 
        let val = document.getElementById('input-edit-regiao').value.trim().toUpperCase(); 
        if(val) { 
            bancoUsuarios[login].regiao = val; 
            mostrarToast("Região alterada!", "sucesso"); 
            fecharModalEdicao(); 
            renderizarAdminUsuarios(); 
        } 
    }; 
    document.getElementById('modal-edicao').classList.add('ativo'); 
    loadIcons(); 
}

function adminAbrirModalMeta(login) { 
    document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="target"></i> Meta (@${login})`; 
    document.getElementById('modal-edicao-corpo').innerHTML = `<input type="number" id="input-edit-meta" value="${bancoUsuarios[login].meta || 0}" placeholder="Meta Mensal">`; 
    let btn = document.getElementById('btn-salvar-edicao'); 
    btn.onclick = function() { 
        let val = parseInt(document.getElementById('input-edit-meta').value) || 0; 
        bancoUsuarios[login].meta = val; 
        mostrarToast("Meta alterada!", "sucesso"); 
        fecharModalEdicao(); 
        if (document.getElementById('modal-gerenciar-equipe').classList.contains('ativo')) renderizarModalEquipe(); 
    }; 
    document.getElementById('modal-edicao').classList.add('ativo'); 
    loadIcons(); 
}

function adminAbrirModalCapa(loja) { 
    document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="layers"></i> Capa (${loja})`; 
    document.getElementById('modal-edicao-corpo').innerHTML = `<input type="number" id="input-edit-capa" value="${lojasConfig[loja].capa || 0}" placeholder="Capa da Loja">`; 
    let btn = document.getElementById('btn-salvar-edicao'); 
    btn.onclick = function() { 
        let val = parseInt(document.getElementById('input-edit-capa').value) || 0; 
        lojasConfig[loja].capa = val; 
        mostrarToast("Capa alterada!", "sucesso"); 
        fecharModalEdicao(); 
        if (document.getElementById('modal-gerenciar-equipe').classList.contains('ativo')) renderizarModalEquipe(); 
    }; 
    document.getElementById('modal-edicao').classList.add('ativo'); 
    loadIcons(); 
}

function adminAbrirModalPermissoes(login) { 
    let p = bancoUsuarios[login].permissoes || { vendas: true, acomp: true, estoque_ver: true, estoque_editar: true }; 
    document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="shield"></i> Permissões (@${login})`; 
    let html = `<div style="display:flex; flex-direction:column; gap:10px; font-size: 14px; color: var(--cor-texto);">`; 
    html += `<label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" id="edit-p-vendas" ${p.vendas ? 'checked':''}> Lançar Vendas</label>`; 
    html += `<label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" id="edit-p-acomp" ${p.acomp ? 'checked':''}> Acompanhamento</label>`; 
    html += `<label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" id="edit-p-est-ver" ${p.estoque_ver ? 'checked':''}> Ver Estoque</label>`; 
    html += `<label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" id="edit-p-est-edit" ${p.estoque_editar ? 'checked':''}> Editar Estoque</label></div>`; 
    document.getElementById('modal-edicao-corpo').innerHTML = html; 
    let btn = document.getElementById('btn-salvar-edicao'); 
    btn.onclick = function() { 
        bancoUsuarios[login].permissoes = { 
            vendas: document.getElementById('edit-p-vendas').checked, 
            acomp: document.getElementById('edit-p-acomp').checked, 
            estoque_ver: document.getElementById('edit-p-est-ver').checked, 
            estoque_editar: document.getElementById('edit-p-est-edit').checked 
        }; 
        mostrarToast("Permissões atualizadas!", "sucesso"); 
        fecharModalEdicao(); 
    }; 
    document.getElementById('modal-edicao').classList.add('ativo'); 
    loadIcons(); 
}

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
        if (document.getElementById('modal-gerenciar-equipe').classList.contains('ativo')) renderizarModalEquipe(); 
    }; 
    document.getElementById('modal-edicao').classList.add('ativo'); 
    loadIcons(); 
}

if ('serviceWorker' in navigator) { 
    window.addEventListener('load', () => { 
        navigator.serviceWorker.register('./sw.js')
        .then(reg => { console.log('Service worker registrado!'); })
        .catch(err => { console.log('Erro no Service Worker', err); }); 
    }); 
}

async function carregarDadosDoBanco() {
    const div = document.getElementById("lista-agrupada");
    let btn = document.getElementById("btn-atualizar-acomp");
    if(btn) btn.innerHTML = '<i data-lucide="loader-2" class="lucide-sm" style="animation: spin 2s linear infinite;"></i> Atualizando...';
    loadIcons();
    if(div) div.innerHTML = "Buscando dados no Supabase...";

    try {
        const { data, error } = await supabaseClient.from('vendas').select('*').neq('status', 'Cancelado').order('data_venda', { ascending: false });
        if (error) throw error;

        dadosAcompanhamentoGlobal = data.map(row => ({
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

async function carregarEstoqueDoBanco() {
    let btn = document.getElementById("btn-atualizar-estoque");
    if(btn) btn.innerHTML = '<i data-lucide="loader-2" style="animation: spin 2s linear infinite;"></i> Atualizando...';
    loadIcons();
    document.getElementById("lista-estoque-agrupada").innerHTML = "Buscando dados do estoque no Supabase...";

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

async function enviarParaBanco() {
    if (!navigator.onLine) { mostrarToast("Sem internet!", "erro"); mostrarBotaoReconexao(); return; }
    if (pendenciasVendaMultipla.length === 0) return;

    const btn = document.getElementById("btn-enviar-venda");
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" style="animation: spin 2s linear infinite;"></i> Enviando...';
    loadIcons();

    let vendasInsert = [];
    let contagemEstoque = {};

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
        contagemEstoque[nomeAparelhoFormatado] = (contagemEstoque[nomeAparelhoFormatado] || 0) - 1;
    });

    try {
        const { error: errV } = await supabaseClient.from('vendas').insert(vendasInsert);
        if (errV) throw errV;

        for (let apNome in contagemEstoque) {
             const { data: estItem } = await supabaseClient.from('estoque').select('*').eq('loja', lojaAtual).eq('aparelho', apNome).single();
             if (estItem) {
                 let novaQtd = (estItem.quantidade || 0) + contagemEstoque[apNome];
                 await supabaseClient.from('estoque').update({ quantidade: novaQtd }).eq('id', estItem.id);
             } else {
                 await supabaseClient.from('estoque').insert({ loja: lojaAtual, aparelho: apNome, quantidade: contagemEstoque[apNome] });
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
            const { data: estItem } = await supabaseClient.from('estoque').select('*').eq('loja', p.loja).eq('aparelho', p.aparelho).single();
            if (estItem) {
                await supabaseClient.from('estoque').update({ quantidade: p.novaQtd }).eq('id', estItem.id);
            } else {
                await supabaseClient.from('estoque').insert({ loja: p.loja, aparelho: p.aparelho, quantidade: p.novaQtd });
            }
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

async function carregarHistoricoDoBanco(forcarNuvem = false) {
    const div = document.getElementById("lista-historico");
    if (!forcarNuvem && dadosHistoricoGlobal.length > 0) { renderizarListaHistorico(); return; }
    div.innerHTML = '<i data-lucide="loader-2" class="lucide-sm" style="animation: spin 2s linear infinite;"></i> Carregando nuvem...';
    loadIcons();

    try {
        const { data, error } = await supabaseClient.from('vendas').select('*').order('data_venda', { ascending: false }).limit(500);
        if (error) throw error;

        dadosHistoricoGlobal = data.map(row => ({
            Tipo: "Venda",
            Status: row.status || "Realizado",
            Data: row.data_venda,
            Promotor: row.promotor_login,
            Detalhe: `Venda: ${row.aparelhos_vendidos} | [${row.loja}] ${row.vendedor}`
        }));
        renderizarListaHistorico();
    } catch (e) {
        console.error(e);
        div.innerHTML = "Erro ao carregar histórico.";
        mostrarBotaoReconexao();
    }
}

async function salvarConfiguracoesGlobais(mostrarAviso = true) {
    if (!navigator.onLine) { mostrarToast("Sem conexão.", "erro"); return; }
    let btnSalvarHeader = document.querySelectorAll('.btn-save-memory');
    btnSalvarHeader.forEach(btn => { btn.innerHTML = '<i data-lucide="loader-2" class="lucide-sm" style="animation: spin 1s linear infinite;"></i> Salvando...'; });

    try {
        let payload = {
            id: 'padrao',
            mapa_emojis: mapaEmojis,
            aparelhos_premium: aparelhosPremium,
            taxas_coparticipacao: taxasCoparticipacao,
            valores_comissao: valoresComissao
        };
        
        await supabaseClient.from('configuracoes_globais').upsert([payload]);
        if(mostrarAviso) mostrarToast("💾 Alterações salvas no Supabase!", "sucesso");
    } catch (e) {
        console.error(e);
        if(mostrarAviso) mostrarToast("Erro ao salvar.", "erro");
    } finally {
        btnSalvarHeader.forEach(btn => { btn.innerHTML = '<i data-lucide="save" class="lucide-sm"></i> Salvar'; });
        loadIcons();
    }
}

function compartilharDashboard() {
    mostrarToast("Preparando o dashboard para a foto...", "info");
    let btnShare = document.querySelector('button[title="Compartilhar Print"]');
    if(btnShare) btnShare.innerHTML = '<i data-lucide="loader-2" style="animation: spin 1s linear infinite; margin: 0;"></i>';
    loadIcons();

    let divDash = document.getElementById("tela-dashboard");
    let corFundo = document.body.classList.contains('dark-mode') ? '#050a08' : '#f1f5f9';

    let wrappersScroll = divDash.querySelectorAll('div[style*="overflow-x: auto"]');
    let estilosOriginais = [];

    wrappersScroll.forEach((wrap) => {
        estilosOriginais.push({
            overflowX: wrap.style.overflowX,
            width: wrap.style.width
        });
        wrap.style.overflowX = 'visible';
        wrap.style.width = wrap.scrollWidth + 'px'; 
    });

    setTimeout(() => {
        html2canvas(divDash, {
            backgroundColor: corFundo,
            scale: 1, 
            useCORS: true,
            logging: false
        }).then(canvas => {
            let imgData = canvas.toDataURL("image/png");
            let link = document.createElement('a');
            link.download = `Resultados_OPPO_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.png`;
            link.href = imgData;
            link.click();
            mostrarToast("Foto salva com sucesso!", "sucesso");
        }).catch(e => {
            mostrarToast("Erro ao gerar imagem.", "erro");
            console.error(e);
        }).finally(() => {
            wrappersScroll.forEach((wrap, i) => {
                wrap.style.overflowX = estilosOriginais[i].overflowX;
                wrap.style.width = estilosOriginais[i].width;
            });
            
            if (chartCoparticipacao) chartCoparticipacao.resize();
            if (chartCapa) chartCapa.resize();
            if (chartLojas) chartLojas.resize();
            if (chartModelos) chartModelos.resize();
            if (typeof chartShareGlobal !== 'undefined' && chartShareGlobal) chartShareGlobal.resize();

            if(btnShare) btnShare.innerHTML = '<i data-lucide="camera" style="margin: 0;"></i>';
            loadIcons();
        });
    }, 800); 
}

function baixarRelatorioAcomp() {
    if (dadosAcompanhamentoGlobal.length === 0) return mostrarToast("Sem dados para exportar.", "alerta");
    let csv = "\uFEFFVendedor;Aparelhos Vendidos;Data;Status\n";
    dadosAcompanhamentoGlobal.forEach(r => {
        let vend = r.Vendedor ? r.Vendedor.replace(/;/g, ',').replace(/\n/g, ' ') : "";
        let apar = r.Aparelhos ? r.Aparelhos.replace(/;/g, ',').replace(/\n/g, ' ') : "";
        let dt = r.Data ? new Date(r.Data).toLocaleString('pt-BR') : "";
        let st = r.Status || "Realizado";
        csv += `${vend};${apar};${dt};${st}\n`;
    });
    let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    let link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Acompanhamento_OPPO_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`; link.click();
    mostrarToast("Download concluído!", "sucesso");
}

function baixarRelatorioHistorico() {
    if (dadosHistoricoGlobal.length === 0) return mostrarToast("Sem dados para exportar.", "alerta");
    let csv = "\uFEFFTipo;Data;Promotor;Status;Detalhes\n";
    dadosHistoricoGlobal.forEach(r => {
        let tipo = r.Tipo || "";
        let dt = r.Data ? new Date(r.Data).toLocaleString('pt-BR') : "";
        let prom = r.Promotor || "";
        let st = r.Status || "Realizado";
        let det = r.Detalhe ? r.Detalhe.replace(/;/g, ',').replace(/\n/g, ' ') : "";
        csv += `${tipo};${dt};${prom};${st};${det}\n`;
    });
    let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    let link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Auditoria_OPPO_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`; link.click();
    mostrarToast("Download de Auditoria concluído!", "sucesso");
}

function setFiltroDataRapido(tipo) {
    let dtInicio = document.getElementById('filtro-data-inicio-historico');
    let dtFim = document.getElementById('filtro-data-fim-historico');
    let hoje = new Date();
    const formataData = (d) => { let mes = '' + (d.getMonth() + 1); let dia = '' + d.getDate(); let ano = d.getFullYear(); if (mes.length < 2) mes = '0' + mes; if (dia.length < 2) dia = '0' + dia; return [ano, mes, dia].join('-'); };
    if (tipo === 'limpar') { dtInicio.value = ""; dtFim.value = ""; } 
    else if (tipo === 'hoje') { dtInicio.value = formataData(hoje); dtFim.value = formataData(hoje); } 
    else if (tipo === 'ontem') { let ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1); dtInicio.value = formataData(ontem); dtFim.value = formataData(ontem); } 
    else if (tipo === 'semana') { let inicioSemana = new Date(hoje); let day = inicioSemana.getDay(); let diff = inicioSemana.getDate() - day + (day === 0 ? -6 : 1); inicioSemana.setDate(diff); dtInicio.value = formataData(inicioSemana); dtFim.value = formataData(hoje); } 
    else if (tipo === 'mes') { let inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1); let fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0); dtInicio.value = formataData(inicioMes); dtFim.value = formataData(fimMes); }
    aplicarFiltroHistorico();
}

function abrirModalFechamento() {
    let selLoja = document.getElementById('select-loja-share');
    let htmlLojas = '';

    let lojas = [];
    if (usuarioLogado.cargo === "promotor") {
        lojas = usuarioLogado.lojasPermitidas || [];
        if (typeof lojas === 'string') { try { lojas = JSON.parse(lojas); } catch(e) { lojas = [lojas]; } }
    } else if (usuarioLogado.cargo === "supervisor" && typeof getLojasDaRegiao === "function") {
        lojas = getLojasDaRegiao(usuarioLogado.id);
    } else {
        lojas = Object.keys(lojasConfig);
    }

    if (!lojas || lojas.length === 0) return mostrarToast("Nenhuma loja encontrada na sua região.", "alerta");
    
    lojas.sort().forEach(l => { 
        let nomePromotor = getPromotorDaLoja(l); 
        htmlLojas += `<option value="${l}">${l} (👤 ${nomePromotor})</option>`; 
    });
    selLoja.innerHTML = htmlLojas;

    let supId = usuarioLogado.criadoPor || "geral";
    if (usuarioLogado.cargo === "supervisor") supId = usuarioLogado.id;
    let vComissao = valoresComissao[supId] || valoresComissao["geral"] || {};
    let marcas = vComissao.marcas_concorrentes || ["Samsung", "Motorola", "Outros"];
    
    let containerMarcas = document.getElementById('container-inputs-concorrencia');
    let htmlInputs = "";
    marcas.forEach((marca, idx) => {
        htmlInputs += `
        <div>
            <span style="font-size: 11px; font-weight: bold; color: var(--cor-secundaria);">${marca}</span>
            <input type="number" id="input-concorrente-${idx}" data-marca="${marca}" placeholder="Qtd" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); text-align: center; margin: 0;">
        </div>`;
    });
    if (containerMarcas) containerMarcas.innerHTML = htmlInputs;

    document.getElementById('modal-fechamento-share').classList.add('ativo');
    loadIcons();
}

async function enviarFechamentoShare() {
    if (!navigator.onLine) { mostrarToast("Sem internet!", "erro"); return; }
    
    let loja = document.getElementById('select-loja-share').value;
    if (!loja) return mostrarToast("Selecione uma loja.", "alerta");
    
    let totalConcorrencia = 0;
    let objConcorrentes = {};
    
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
        criado_por_supervisor: usuarioLogado.criadoPor,
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

async function carregarGraficosShare() {
    if (!navigator.onLine) { mostrarToast("Sem conexão.", "erro"); return; }
    mostrarToast("Calculando inteligência de mercado...", "info");
    
    let mesDash = document.getElementById("seletor-mes-dash").value;
    let y, m;
    let hoje = new Date();
    
    if (mesDash) {
        let partes = mesDash.split('/');
        m = parseInt(partes[0], 10);
        y = parseInt(partes[1], 10);
    } else {
        m = hoje.getMonth() + 1;
        y = hoje.getFullYear();
    }
    
    let dtInicioVal = [y, String(m).padStart(2,'0'), '01'].join('-');
    let dtFimVal = [y, String(m).padStart(2,'0'), new Date(y, m, 0).getDate()].join('-');

    try {
        let query = supabaseClient.from('market_share').select('*').gte('data_fechamento', dtInicioVal).lte('data_fechamento', dtFimVal);
            
        let selSup = document.getElementById('filtro-supervisor-dash');
        let selProm = document.getElementById('filtro-promotor-dash');
        let selLoja = document.getElementById('filtro-loja-dash');
        
        let escopoTexto = "no mercado analisado"; 

        if (selSup && selSup.style.display !== "none" && selSup.value !== "todos") {
             query = query.eq('criado_por_supervisor', selSup.value); 
             escopoTexto = `na equipe filtrada`;
        }
        if (selProm && selProm.style.display !== "none" && selProm.value !== "todos") {
             query = query.eq('promotor_login', selProm.value); 
             escopoTexto = `nas lojas do promotor`;
        }
        if (selLoja && selLoja.value !== "todas") {
             query = query.eq('loja', selLoja.value);
             escopoTexto = `nesta loja`; 
        }
        
        const { data: dbShare, error } = await query;
        if (error) throw error;

        let resumoGlobal = { oppo: 0, concorrentes: {}, total: 0 };
        let resumoLojas = {};

        if (typeof dadosAcompanhamentoGlobal !== 'undefined') {
            dadosAcompanhamentoGlobal.forEach(row => {
                let match = (row.Vendedor || "").match(/^\[(.*?)\]/);
                let lojaNome = match ? match[1] : "Outras";
                
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
                if (Object.keys(dadosConc).length === 0 && (row.vendas_samsung > 0 || row.vendas_motorola > 0 || row.vendas_outros > 0)) {
                    dadosConc = { "Samsung": row.vendas_samsung || 0, "Motorola": row.vendas_motorola || 0, "Outros": row.vendas_outros || 0 };
                }

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
    
    // Texto Dinâmico do Filtro
    document.getElementById('texto-resumo-share').innerHTML = `A OPPO domina <strong style="font-size: 18px; color: #10b981;">${pctOppo}%</strong> ${escopoTexto}!`;

    let corTexto = document.body.classList.contains('dark-mode') ? '#ffffff' : '#475569';

    // Montagem dinâmica do gráfico
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

// Sub-função: Termômetro de Lojas
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

    // Ordena mostrando as lojas mais fracas primeiro (para foco do supervisor)
    listaLojas.sort((a,b) => a.pct - b.pct);
    
    let html = "";
    listaLojas.forEach(l => {
        let corStatus, iconeStatus, bgAlerta;
        
        // Define as cores dinamicamente dependendo da "Fatia do Bolo"
        if (l.pct >= 35) {
            corStatus = "#10b981"; // Verde (Dominado)
            iconeStatus = "trending-up";
            bgAlerta = "rgba(16, 185, 129, 0.05)";
        } else if (l.pct >= 15) {
            corStatus = "#f59e0b"; // Amarelo (Atenção)
            iconeStatus = "thermometer";
            bgAlerta = "rgba(245, 158, 11, 0.05)";
        } else {
            corStatus = "#ef4444"; // Vermelho (Crítico)
            iconeStatus = "alert-triangle";
            bgAlerta = "rgba(239, 68, 68, 0.1)";
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