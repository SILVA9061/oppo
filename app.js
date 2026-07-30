// URL DA SUA API DO GOOGLE APPS SCRIPT
const URL_DA_SUA_API = "https://script.google.com/macros/s/AKfycbzg7zvtitqzNtB7ghbZ-zg0-W3fTrkAswlORizvAfyPETdbHivMRqvJyrfTEZ36WuXGPQ/exec";

// HELPER GLOBAL - Blinda o sistema contra erros de nome de colunas
const getVal = (obj, possiveisNomes) => {
    if (!obj) return "";
    let chave = Object.keys(obj).find(k => possiveisNomes.includes(k.toLowerCase().trim()));
    return chave ? String(obj[chave]).trim() : "";
};

const noCache = () => "&_t=" + new Date().getTime();

let bancoUsuarios = {}; let lojasConfig = {}; let mapaEmojis = {};
let aparelhosPremium = { "geral": {} }; let taxasCoparticipacao = { "geral": 25 }; let valoresComissao = { "geral": {} };
let dadosHistoricoGlobal = []; let filaOffline = JSON.parse(localStorage.getItem('filaOffline')) || [];
let supervisorGerenciadoAtual = null; let mostruariosGlobais = JSON.parse(localStorage.getItem('mostruariosGlobais')) || {}; 
let tipoHistoricoAtual = 'geral'; let mostruarioEmEdicao = null; 

let usuarioLogado = null; let lojaAtual = ""; let emojisPendentes = []; let aparelhoEmSelecao = null;
let dadosAcompanhamentoGlobal = []; let dadosEstoqueGlobal = []; 
let promotorFiltroAtual = "todos"; let subPromotorFiltroAtual = "todos"; let promotorEstoqueFiltroAtual = "todos"; let usuarioEditandoSenha = null; let pendenciasEstoque = {}; 
let vendedoresSelecionados = [];

window.addEventListener('online', sincronizarFilaOffline);

window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('ativo');
        if (e.target.id === 'modal-confirm-mostruario' || e.target.id === 'modal-prompt-mostruario') mostruarioEmEdicao = null;
        if (e.target.id === 'modal-gerenciar-equipe') supervisorGerenciadoAtual = null;
        if (e.target.id === 'modal-imei') aparelhoEmSelecao = null;
    }
});

window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.ativo').forEach(modal => {
            modal.classList.remove('ativo');
            if (modal.id === 'modal-confirm-mostruario' || modal.id === 'modal-prompt-mostruario') mostruarioEmEdicao = null;
            if (modal.id === 'modal-gerenciar-equipe') supervisorGerenciadoAtual = null;
            if (modal.id === 'modal-imei') aparelhoEmSelecao = null;
        });
    }
});

function limparCacheERecarregar() {
    let btn = document.getElementById('btn-limpar-cache');
    if(btn) btn.innerHTML = '<i data-lucide="loader-2" class="lucide-sm" style="animation: spin 2s linear infinite;"></i> Destruindo Cache...';
    loadIcons();
    
    localStorage.clear();
    sessionStorage.clear();
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for(let registration of registrations) { registration.unregister(); }
        });
    }
    
    mostrarToast("Memória limpa! Reiniciando sistema...", "info");
    setTimeout(() => { window.location.href = window.location.pathname + "?v=" + new Date().getTime(); }, 1500);
}

function injetarBotaoVoltar() {
    if (document.getElementById('btn-voltar-flutuante')) return;
    document.body.insertAdjacentHTML('beforeend', `
        <style>
            #btn-voltar-flutuante:hover { transform: translateX(-3px); box-shadow: 0 6px 20px var(--shadow-color); border-color: #0086ff; }
            #btn-voltar-flutuante:hover i { color: #0086ff !important; }
        </style>
        <div id="btn-voltar-flutuante" onclick="clicouVoltarFlutuante()" style="display: none; position: fixed; top: 20px; left: 20px; width: 44px; height: 44px; background: var(--bg-container); border: 1px solid var(--border-color); border-radius: 14px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15); cursor: pointer; z-index: 9999; align-items: center; justify-content: center; transition: all 0.3s ease;">
            <i data-lucide="arrow-left" style="color: var(--cor-texto); width: 22px; height: 22px; margin: 0; transition: color 0.3s;"></i>
        </div>
    `);
    loadIcons();
}

function clicouVoltarFlutuante() {
    let tela = document.querySelector('.tela.ativa');
    if(!tela) return mudarTela('tela-menu');
    let id = tela.id;

    if (id === 'tela-venda') {
        let btnTrocar = document.getElementById('btn-trocar-loja');
        if (btnTrocar && btnTrocar.style.display !== 'none') { btnTrocar.click(); } else { mudarTela('tela-menu'); }
    } else if (id === 'tela-lojas') {
        voltarDeLojas();
    } else if (id === 'tela-promotores') {
        mudarTela('tela-menu');
    } else {
        mudarTela('tela-menu');
    }
}

function loadIcons() { if(typeof lucide !== 'undefined') { lucide.createIcons(); } }

function toggleTema() {
    document.body.classList.toggle('dark-mode');
    let isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('temaEscuro', isDark ? 'sim' : 'nao');
    
    let btnGlobal = document.getElementById('btn-tema');
    if (btnGlobal) btnGlobal.innerHTML = isDark ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
    
    let iconTemaMenu = document.getElementById('icone-tema-menu');
    if(iconTemaMenu) { iconTemaMenu.setAttribute('data-lucide', isDark ? 'sun' : 'moon'); }
    
    loadIcons();
    if (document.getElementById('tela-dashboard').classList.contains('ativa')) {
        if (dadosAcompanhamentoGlobal.length > 0) gerarGraficosDash(dadosAcompanhamentoGlobal);
    }
}

function mudarTela(idTela) { 
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa')); 
    document.getElementById(idTela).classList.add('ativa'); 
    
    let btnTemaGlobal = document.getElementById('btn-tema');
    if (btnTemaGlobal) btnTemaGlobal.style.display = (idTela === 'tela-menu') ? 'none' : 'block';

    let btnVoltar = document.getElementById('btn-voltar-flutuante');
    if (btnVoltar) {
        btnVoltar.style.display = (idTela === 'tela-login' || idTela === 'tela-menu') ? 'none' : 'flex';
    }

    const container = document.querySelector('.container');
    if(idTela === 'tela-dashboard' || idTela === 'tela-admin' || idTela === 'tela-historico') {
        container.classList.add('container-wide');
    } else {
        container.classList.remove('container-wide');
    }
    setTimeout(() => loadIcons(), 50);
}

function switchTab(tabId, groupClass) {
    document.querySelectorAll(`.${groupClass}-content`).forEach(t => t.style.display = 'none');
    document.querySelectorAll(`.${groupClass}-btn`).forEach(b => b.classList.remove('ativo'));
    document.getElementById(tabId).style.display = 'block';
    event.currentTarget.classList.add('ativo');
    loadIcons();
}

if(localStorage.getItem('temaEscuro') === 'sim') { document.body.classList.add('dark-mode'); document.getElementById('btn-tema').innerHTML = '<i data-lucide="sun"></i>'; }

function inicializarSistema() {
    loadIcons();
    injetarBotaoVoltar();
    
    let btnLogin = document.getElementById('btn-login');
    if (btnLogin && !document.getElementById('btn-limpar-cache')) {
        btnLogin.insertAdjacentHTML('afterend', `
            <button id="btn-limpar-cache" type="button" onclick="limparCacheERecarregar()" style="background: transparent; border: 1px solid var(--border-color); color: var(--cor-secundaria); padding: 12px; border-radius: 12px; width: 100%; margin-top: 15px; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px; font-weight: bold; font-size: 14px; transition: all 0.2s;">
                <i data-lucide="refresh-cw" class="lucide-sm"></i> Forçar Atualização do App
            </button>
        `);
        loadIcons();
    }

    let tempoEsgotado = setTimeout(() => {
        if (document.getElementById('tela-loading').style.display !== 'none') {
            bancoUsuarios["master"] = { nome: "Diretor Master", senha: "Silva_9061", cargo: "master", meta: 0, lojasPermitidas: [] };
            document.getElementById('tela-loading').style.display = 'none'; mudarTela('tela-login');
            mostrarToast("Sem conexão. Entrando em Modo Offline.", "info");
        }
    }, 8000);

    fetch(URL_DA_SUA_API + "?acao=config" + noCache())
    .then(r => { if (!r.ok) throw new Error("Erro na rede"); return r.json(); })
    .then(res => {
        clearTimeout(tempoEsgotado); 
        if (res.status === "sucesso" && res.configuracoes) {
            bancoUsuarios = res.configuracoes.bancoUsuarios || {}; 
            lojasConfig = res.configuracoes.lojasConfig || {}; 
            mapaEmojis = res.configuracoes.mapaEmojis || {};
            
            if (res.configuracoes.aparelhosPremium) {
                if (Array.isArray(res.configuracoes.aparelhosPremium)) { 
                    let novoObjeto = {}; 
                    res.configuracoes.aparelhosPremium.forEach(ap => { novoObjeto[ap] = 1; }); 
                    aparelhosPremium = { "geral": novoObjeto };
                } else { aparelhosPremium = res.configuracoes.aparelhosPremium; }
            }
            if (res.configuracoes.taxasCoparticipacao) { taxasCoparticipacao = res.configuracoes.taxasCoparticipacao; } else { taxasCoparticipacao = { "geral": 25 }; }
            if (res.configuracoes.valoresComissao) { valoresComissao = res.configuracoes.valoresComissao; } else { valoresComissao = { "geral": {} }; }
        }
        
        bancoUsuarios["master"] = { nome: "Diretor Master", senha: "Silva_9061", cargo: "master", meta: 0, lojasPermitidas: [] };
        document.getElementById('tela-loading').style.display = 'none'; mudarTela('tela-login'); setTimeout(sincronizarFilaOffline, 2000);
    }).catch(err => {
        clearTimeout(tempoEsgotado); console.error("Erro na inicialização:", err);
        bancoUsuarios["master"] = { nome: "Diretor Master", senha: "Silva_9061", cargo: "master", meta: 0, lojasPermitidas: [] };
        document.getElementById('tela-loading').style.display = 'none'; mudarTela('tela-login');
        mostrarToast("Iniciando no modo de segurança.", "info");
    });
}
document.addEventListener('DOMContentLoaded', inicializarSistema);

function podeGerenciar(logado, alvoId) {
    if (!logado || !alvoId) return false;
    if (logado.id === "master" || logado.cargo === "master" || logado.cargo === "gestor" || logado.id === alvoId) return true;
    
    let alvo = bancoUsuarios[alvoId]; 
    if (!alvo) return false;

    if (logado.cargo === "regional") {
        let regLogado = (logado.regiao || "").toUpperCase().trim();
        let regAlvo = (alvo.regiao || "").toUpperCase().trim();
        if (regLogado && regAlvo && regLogado === regAlvo) return true;
        if (alvo.criadoPor === logado.id) return true;
        if (alvo.cargo === "promotor" && alvo.criadoPor) {
            let supDoPromotor = bancoUsuarios[alvo.criadoPor];
            if (supDoPromotor && supDoPromotor.regiao) {
                let regSup = supDoPromotor.regiao.toUpperCase().trim();
                if (regSup === regLogado) return true;
            }
        }
        return false;
    }
    if (logado.cargo === "supervisor") return alvo.criadoPor === logado.id;
    return false;
}

function promotorPertenceAoGestor(idPromotor, idGestorFiltro) {
    if (idGestorFiltro === "todos") return true;
    let u = bancoUsuarios[idPromotor];
    if (!u) return false;
    if (idGestorFiltro === "orfaos") return (!u.criadoPor || !bancoUsuarios[u.criadoPor]);
    if (u.criadoPor === idGestorFiltro) return true;
    
    let gestorFiltroObj = bancoUsuarios[idGestorFiltro];
    if (gestorFiltroObj) {
        let fakeLogado = Object.assign({id: idGestorFiltro}, gestorFiltroObj);
        return podeGerenciar(fakeLogado, idPromotor);
    }
    
    return false;
}

function mostrarToast(msg, tipo = "sucesso") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div"); toast.className = `toast ${tipo}`; 
    let icon = tipo === 'sucesso' ? '<i data-lucide="check-circle"></i>' : (tipo === 'erro' ? '<i data-lucide="x-circle"></i>' : '<i data-lucide="info"></i>');
    toast.innerHTML = icon + ' <span>' + msg.replace(/\n/g, '<br>') + '</span>';
    container.appendChild(toast); loadIcons(); setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 300); }, 4000);
}

function getLojasDaRegiao(supId) {
    let lojas = [];
    for (let l in lojasConfig) { if (lojasConfig[l].supervisor === supId) lojas.push(l); }
    if (lojas.length === 0) {
        for (let k in bancoUsuarios) {
            if (bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].criadoPor === supId) {
                bancoUsuarios[k].lojasPermitidas.forEach(loja => { if (!lojas.includes(loja)) { lojas.push(loja); lojasConfig[loja] = { supervisor: supId, capa: 0, vendedores: [] }; } });
            }
        }
    }
    return lojas.sort((a,b) => a.localeCompare(b, undefined, {numeric:true, sensitivity:'base'}));
}

function verificarConferenciaEstoque() {
    if (!usuarioLogado || usuarioLogado.cargo !== "promotor") {
        let badge = document.getElementById('badge-estoque'); if (badge) badge.style.display = 'none'; return;
    }
    let hoje = new Date().toLocaleDateString('pt-BR'); let ultimaConferencia = localStorage.getItem('ultimaConferencia_' + usuarioLogado.id);
    let badge = document.getElementById('badge-estoque');
    if (ultimaConferencia !== hoje) { if (badge) badge.style.display = 'flex'; } else { if (badge) badge.style.display = 'none'; }
}

function filtrarListaLojas(texto, containerId) { texto = texto.toLowerCase(); const labels = document.getElementById(containerId).querySelectorAll('label'); labels.forEach(lbl => { if (lbl.innerText.toLowerCase().includes(texto)) lbl.style.display = 'flex'; else lbl.style.display = 'none'; }); }
function fecharModalEdicao() { document.getElementById('modal-edicao').classList.remove('ativo'); }

// ================= MODAIS ADMIN =================

function obterRegioesUnicas() {
    let regioes = Object.values(bancoUsuarios).map(u => u.regiao).filter(r => r && r.trim() !== "");
    return [...new Set(regioes)].sort();
}

function adminAbrirModalCargo(login) {
    let u = bancoUsuarios[login];
    document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="briefcase"></i> Alterar Cargo`;
    let html = `<label style="font-size:13px; font-weight:bold; color:var(--cor-secundaria); display:block; margin-bottom:5px;">Novo cargo para <b>@${login}</b>:</label>
                <select id="input-edicao-cargo" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--cor-texto);">
                    <option value="promotor" ${u.cargo==='promotor'?'selected':''}>Promotor de Vendas</option>
                    <option value="supervisor" ${u.cargo==='supervisor'?'selected':''}>Supervisor de Equipe</option>
                    <option value="regional" ${u.cargo==='regional'?'selected':''}>Gestor Regional</option>
                    <option value="gestor" ${u.cargo==='gestor'?'selected':''}>Diretor / Master</option>
                </select>`;
    document.getElementById('modal-edicao-corpo').innerHTML = html;
    document.getElementById('btn-salvar-edicao').onclick = function() {
        let novoCargo = document.getElementById('input-edicao-cargo').value;
        bancoUsuarios[login].cargo = novoCargo;
        if(novoCargo === 'supervisor' && !u.criadoPor) u.criadoPor = usuarioLogado.id;
        renderizarAdminUsuarios(); fecharModalEdicao(); salvarConfiguracoesGlobais(false); mostrarToast("Cargo alterado e salvo na nuvem!", "sucesso");
    };
    document.getElementById('modal-edicao').classList.add('ativo'); loadIcons();
}

function adminAbrirModalTransferir(login) {
    let u = bancoUsuarios[login];
    document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="arrow-right-left"></i> Transferir Equipe`;
    let options = "";
    for(let k in bancoUsuarios) {
        if(bancoUsuarios[k].cargo === "supervisor" || bancoUsuarios[k].cargo === "master" || bancoUsuarios[k].cargo === "gestor" || bancoUsuarios[k].cargo === "regional") {
            let selected = (u.criadoPor === k) ? "selected" : "";
            options += `<option value="${k}" ${selected}>Equipe: ${bancoUsuarios[k].nome || k}</option>`;
        }
    }
    let html = `<label style="font-size:13px; font-weight:bold; color:var(--cor-secundaria); display:block; margin-bottom:5px;">Mover o promotor <b>${u.nome || login}</b> para:</label>
                <select id="input-edicao-transferir" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--cor-texto);">${options}</select>`;
    document.getElementById('modal-edicao-corpo').innerHTML = html;
    document.getElementById('btn-salvar-edicao').onclick = function() {
        let novoSup = document.getElementById('input-edicao-transferir').value;
        if(novoSup) {
            bancoUsuarios[login].criadoPor = novoSup;
            if(bancoUsuarios[novoSup].regiao) bancoUsuarios[login].regiao = bancoUsuarios[novoSup].regiao;
            renderizarAdminUsuarios();
            renderizarModalEquipe(); fecharModalEdicao(); salvarConfiguracoesGlobais(false); mostrarToast("Promotor transferido de equipe!", "sucesso");
        }
    };
    document.getElementById('modal-edicao').classList.add('ativo'); loadIcons();
}

function adminAbrirModalRegiao(login) {
    let u = bancoUsuarios[login]; document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="globe"></i> Região - @${login}`;
    let datalistHtml = `<datalist id="lista-regioes">${obterRegioesUnicas().map(r => `<option value="${r}">`).join('')}</datalist>`;
    let html = `${datalistHtml}
                <label style="font-size:13px; font-weight:bold; color:var(--cor-secundaria); display:block; margin-bottom:5px;">Região (Escolha ou Digite nova):</label>
                <input type="text" id="input-edicao-regiao" list="lista-regioes" value="${u.regiao || ''}" style="width: 100%; padding: 10px; text-transform: uppercase;">`;
    document.getElementById('modal-edicao-corpo').innerHTML = html;
    document.getElementById('btn-salvar-edicao').onclick = function() {
        let nova = document.getElementById('input-edicao-regiao').value.trim().toUpperCase(); bancoUsuarios[login].regiao = nova; renderizarAdminUsuarios(); fecharModalEdicao(); salvarConfiguracoesGlobais(false); mostrarToast("Região alterada com sucesso!", "sucesso");
    };
    document.getElementById('modal-edicao').classList.add('ativo'); loadIcons();
}

function adminAbrirModalLojas(login) {
    let u = bancoUsuarios[login]; document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="store"></i> Lojas - ${u.nome || login}`;
    let html = `<input type="text" class="input-busca-loja" placeholder="Pesquisar loja..." onkeyup="filtrarListaLojas(this.value, 'edicao-lojas-container')" style="width: 100%; padding: 10px; margin-bottom: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--cor-texto);"><div id="edicao-lojas-container" style="max-height: 180px; overflow-y: auto; text-align: left;">`;
    
    let lojasOrdenadas = [];
    if (usuarioLogado.cargo === "master" || usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional") {
        lojasOrdenadas = Object.keys(lojasConfig).sort((a,b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));
    } else {
        lojasOrdenadas = getLojasDaRegiao(u.criadoPor);
    }

    if(lojasOrdenadas.length === 0) { html += "<p style='color:var(--cor-secundaria); font-size:13px;'>Nenhuma loja encontrada.</p>"; } 
    else { lojasOrdenadas.forEach(loja => { let isChecked = u.lojasPermitidas.includes(loja) ? "checked" : ""; html += `<label style="display: flex; align-items: center; gap: 8px; cursor: pointer; border-bottom: 1px solid var(--border-color); padding-bottom: 6px; margin-bottom: 6px; font-size: 14px;"><input type="checkbox" class="check-edicao-loja" value="${loja}" ${isChecked}> ${loja}</label>`; }); }
    html += `</div>`; document.getElementById('modal-edicao-corpo').innerHTML = html;
    document.getElementById('btn-salvar-edicao').onclick = function() { let selecionadas = Array.from(document.querySelectorAll('.check-edicao-loja:checked')).map(cb => cb.value); bancoUsuarios[login].lojasPermitidas = selecionadas; renderizarModalEquipe(); fecharModalEdicao(); salvarConfiguracoesGlobais(false); mostrarToast("Lojas alteradas com sucesso!", "sucesso"); }; document.getElementById('modal-edicao').classList.add('ativo'); loadIcons();
}

function adminAbrirModalSenha(login) {
    let u = bancoUsuarios[login]; document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="key"></i> Senha - ${u.nome || login}`;
    let html = `<label style="font-size:13px; font-weight:bold; color:var(--cor-secundaria); display:block; margin-bottom:5px;">Nova Senha:</label><input type="text" id="input-edicao-senha" placeholder="Digite a nova senha" style="width: 100%; padding: 10px;">`;
    document.getElementById('modal-edicao-corpo').innerHTML = html;
    document.getElementById('btn-salvar-edicao').onclick = function() { let nova = document.getElementById('input-edicao-senha').value.trim(); if(nova.length < 3) return mostrarToast("Mínimo 3 caracteres.", "alerta"); bancoUsuarios[login].senha = nova; renderizarAdminUsuarios(); renderizarModalEquipe(); fecharModalEdicao(); salvarConfiguracoesGlobais(false); mostrarToast(`Senha alterada com sucesso!`, "sucesso"); }; document.getElementById('modal-edicao').classList.add('ativo'); loadIcons();
}

function adminAbrirModalMeta(login) {
    let u = bancoUsuarios[login]; document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="target"></i> Meta - ${u.nome || login}`;
    let html = `<label style="font-size:13px; font-weight:bold; color:var(--cor-secundaria); display:block; margin-bottom:5px;">Meta Individual (unidades):</label><input type="number" id="input-edicao-meta" value="${u.meta || 0}" style="width: 100%; padding: 10px;">`;
    document.getElementById('modal-edicao-corpo').innerHTML = html;
    document.getElementById('btn-salvar-edicao').onclick = function() { let val = parseInt(document.getElementById('input-edicao-meta').value); bancoUsuarios[login].meta = isNaN(val) ? 0 : val; renderizarModalEquipe(); fecharModalEdicao(); salvarConfiguracoesGlobais(false); mostrarToast("Meta atualizada com sucesso!", "sucesso"); }; document.getElementById('modal-edicao').classList.add('ativo'); loadIcons();
}

function adminAbrirModalNome(login) {
    let u = bancoUsuarios[login]; document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="edit-3"></i> Nome - @${login}`;
    let html = `<label style="font-size:13px; font-weight:bold; color:var(--cor-secundaria); display:block; margin-bottom:5px;">Novo Nome:</label><input type="text" id="input-edicao-nome" value="${u.nome || ''}" style="width: 100%; padding: 10px;">`;
    document.getElementById('modal-edicao-corpo').innerHTML = html;
    document.getElementById('btn-salvar-edicao').onclick = function() { let novo = document.getElementById('input-edicao-nome').value.trim(); if(novo.length < 2) return mostrarToast("Nome muito curto.", "alerta"); bancoUsuarios[login].nome = novo; renderizarAdminUsuarios(); renderizarModalEquipe(); fecharModalEdicao(); salvarConfiguracoesGlobais(false); mostrarToast(`Nome alterado com sucesso!`, "sucesso"); }; document.getElementById('modal-edicao').classList.add('ativo'); loadIcons();
}

function adminAbrirModalCapa(loja) {
    document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="layers"></i> Editar Capa Total`;
    let html = `<label style="font-size:13px; font-weight:bold; color:var(--cor-secundaria); display:block; margin-bottom:5px;">Capa da loja ${loja}:</label><input type="number" id="input-edicao-capa" value="${lojasConfig[loja].capa || 0}" style="width: 100%; padding: 10px;">`;
    document.getElementById('modal-edicao-corpo').innerHTML = html;
    document.getElementById('btn-salvar-edicao').onclick = function() { let val = parseInt(document.getElementById('input-edicao-capa').value); lojasConfig[loja].capa = isNaN(val) ? 0 : val; renderizarModalEquipe(); fecharModalEdicao(); salvarConfiguracoesGlobais(false); mostrarToast("Capa atualizada com sucesso!", "sucesso"); }; document.getElementById('modal-edicao').classList.add('ativo'); loadIcons();
}

function adminAbrirModalVendedor(loja, vendedorAtual) {
    document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="user-edit"></i> Editar Vendedor`;
    let html = `<label style="font-size:13px; font-weight:bold; color:var(--cor-secundaria); display:block; margin-bottom:5px;">Nome na loja ${loja}:</label><input type="text" id="input-edicao-vendedor" value="${vendedorAtual}" style="width: 100%; padding: 10px;">`;
    document.getElementById('modal-edicao-corpo').innerHTML = html;
    document.getElementById('btn-salvar-edicao').onclick = function() { let novoNome = document.getElementById('input-edicao-vendedor').value.trim(); if(novoNome !== "") { let index = lojasConfig[loja].vendedores.indexOf(vendedorAtual); if (index !== -1) { lojasConfig[loja].vendedores[index] = novoNome; renderizarModalEquipe(); } } fecharModalEdicao(); salvarConfiguracoesGlobais(false); mostrarToast("Vendedor editado com sucesso!", "sucesso"); }; document.getElementById('modal-edicao').classList.add('ativo'); loadIcons();
}

function adminAbrirModalPermissoes(login) {
    let u = bancoUsuarios[login]; let p = u.permissoes || { vendas: true, acomp: true, estoque_ver: true, estoque_editar: true };
    document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="shield"></i> Permissões - @${login}`;
    let html = `
        <div style="display: flex; flex-direction: column; gap: 12px; text-align: left;">
            <label style="cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 14px;"><input type="checkbox" id="edit-perm-vendas" ${p.vendas ? "checked" : ""}> Lançar Vendas</label>
            <label style="cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 14px;"><input type="checkbox" id="edit-perm-acomp" ${p.acomp ? "checked" : ""}> Ver Acompanhamento</label>
            <label style="cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 14px;"><input type="checkbox" id="edit-perm-est-ver" ${p.estoque_ver ? "checked" : ""}> Acessar Tela Estoque</label>
            <label style="cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 14px;"><input type="checkbox" id="edit-perm-est-edit" ${p.estoque_editar ? "checked" : ""}> Editar/Auditar Estoque</label>
        </div>`;
    document.getElementById('modal-edicao-corpo').innerHTML = html;
    document.getElementById('btn-salvar-edicao').onclick = function() { 
        bancoUsuarios[login].permissoes = { vendas: document.getElementById('edit-perm-vendas').checked, acomp: document.getElementById('edit-perm-acomp').checked, estoque_ver: document.getElementById('edit-perm-est-ver').checked, estoque_editar: document.getElementById('edit-perm-est-edit').checked };
        renderizarModalEquipe(); fecharModalEdicao(); salvarConfiguracoesGlobais(false); mostrarToast(`Permissões atualizadas com sucesso!`, "sucesso"); 
    }; 
    document.getElementById('modal-edicao').classList.add('ativo'); loadIcons();
}

function getPromotorDaLoja(nomeLoja) { let promotores = []; for (let key in bancoUsuarios) { let u = bancoUsuarios[key]; if (u.cargo === "promotor" && u.lojasPermitidas.includes(nomeLoja)) { promotores.push(u.nome || (key.charAt(0).toUpperCase() + key.slice(1))); } } return promotores.length > 0 ? promotores.join(", ") : "Não Atribuído"; }

// ================= MENU NOVO E NOTIFICAÇÕES =================

function renderizarMenuPrincipal() {
    let menuDiv = document.getElementById('tela-menu');
    
    let btnTemaGlobal = document.getElementById('btn-tema');
    if (btnTemaGlobal) btnTemaGlobal.style.display = 'none';

    let adminRole = (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master" || usuarioLogado.cargo === "supervisor");
    let perm = usuarioLogado.permissoes || { vendas: true, acomp: true, estoque_ver: true, estoque_editar: true };

    let nomeUser = (usuarioLogado.nome || "").split(" ")[0];
    let cargoTexto = usuarioLogado.id === "master" ? "👑 Diretor Master" : (usuarioLogado.cargo === "gestor" ? "👔 Gestor Geral" : (usuarioLogado.cargo === "regional" ? "🌎 Gestor Regional" : (usuarioLogado.cargo === "supervisor" ? "📍 Supervisor" : "📱 Promotor")));

    let html = `
    <style>
        .menu-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 25px; margin-bottom: 30px; }
        .menu-card { background: var(--bg-item); border: 1px solid var(--border-color); border-radius: 16px; padding: 22px 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 10px rgba(0,0,0,0.02); }
        .menu-card:hover { transform: translateY(-3px); box-shadow: 0 8px 15px var(--shadow-color); border-color: #0086ff; }
        .menu-card:active { transform: scale(0.96); }
        .icon-wrapper { width: 50px; height: 50px; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin-bottom: 5px; transition: all 0.3s; }
        .card-title { font-size: 14px; font-weight: 700; color: var(--cor-texto); text-align: center; line-height: 1.2; letter-spacing: -0.2px;}
        .sino-btn { position: relative; background: var(--bg-item); border: 1px solid var(--border-color); border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition: background 0.2s; }
        .sino-btn:hover { background: var(--bg-card); }
        @keyframes sinoToca {
            0% { transform: rotate(0); }
            10% { transform: rotate(15deg); }
            20% { transform: rotate(-10deg); }
            30% { transform: rotate(5deg); }
            40% { transform: rotate(-5deg); }
            50% { transform: rotate(0); }
            100% { transform: rotate(0); }
        }
        .sino-animado { animation: sinoToca 2s infinite; }
    </style>
    
    <div style="display: flex; justify-content: space-between; align-items: center; text-align: left; margin-bottom: 10px; padding-bottom: 15px; border-bottom: 1px solid var(--bg-item);">
        <div>
            <h2 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Fala, ${nomeUser}!</h2>
            <span style="font-size: 12px; font-weight: 700; color: #0086ff; background: rgba(0, 134, 255, 0.1); padding: 4px 10px; border-radius: 12px;">${cargoTexto}</span>
        </div>
        <div style="display: flex; gap: 12px; align-items: center;">
            ${adminRole ? `
            <div class="sino-btn" onclick="abrirModalNotificacoes()">
                <i data-lucide="bell" id="icone-sino-interno" style="color: var(--cor-texto); width: 22px; height: 22px; margin:0;"></i>
                <span id="badge-sino" style="display:none; position:absolute; top:-4px; right:-4px; background:#dc3545; color:white; border-radius:50%; width:18px; height:18px; font-size:10px; font-weight:900; align-items:center; justify-content:center; border: 2px solid var(--bg-container); box-shadow: 0 2px 4px rgba(220,53,69,0.4);">0</span>
            </div>` : ''}
            <div class="sino-btn" onclick="toggleTema()">
                <i data-lucide="moon" id="icone-tema-menu" style="color: var(--cor-texto); width: 22px; height: 22px; margin:0;"></i>
            </div>
        </div>
    </div>

    <div class="menu-grid">`;

    if (adminRole || perm.vendas) {
        html += `<div class="menu-card" onclick="irParaVendas()">
            <div class="icon-wrapper" style="background: rgba(0, 134, 255, 0.15); color: #0086ff;"><i data-lucide="shopping-bag" style="width:26px; height:26px; margin:0;"></i></div>
            <span class="card-title">Lançar<br>Venda</span>
        </div>`;
    }
    if (adminRole || perm.acomp) {
        html += `<div class="menu-card" onclick="abrirAcompanhamento()">
            <div class="icon-wrapper" style="background: rgba(23, 162, 184, 0.15); color: #17a2b8;"><i data-lucide="bar-chart-2" style="width:26px; height:26px; margin:0;"></i></div>
            <span class="card-title">Acompanhar<br>Vendas</span>
        </div>`;
    }
    if (adminRole || perm.estoque_ver) {
        html += `<div class="menu-card" style="position:relative;" onclick="abrirEstoque()">
            <div class="icon-wrapper" style="background: rgba(111, 66, 193, 0.15); color: #6f42c1;"><i data-lucide="package" style="width:26px; height:26px; margin:0;"></i></div>
            <span class="card-title">Controle de<br>Estoque</span>
            <span id="badge-estoque" style="position:absolute; top: -5px; right: -5px; background-color:#ff9800; color: white; width:20px; height:20px; display:none; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border-radius:50%; box-shadow: 0 2px 5px rgba(255,152,0,0.4); border: 2px solid var(--bg-item);">!</span>
        </div>`;
    }
    if (adminRole) {
        html += `<div class="menu-card" onclick="abrirHistorico('geral')">
            <div class="icon-wrapper" style="background: rgba(108, 117, 125, 0.15); color: #6c757d;"><i data-lucide="clock" style="width:26px; height:26px; margin:0;"></i></div>
            <span class="card-title">Histórico<br>da Equipe</span>
        </div>`;
        html += `<div class="menu-card" onclick="abrirHistorico('estoque')">
            <div class="icon-wrapper" style="background: rgba(255, 152, 0, 0.15); color: #ff9800;"><i data-lucide="search" style="width:26px; height:26px; margin:0;"></i></div>
            <span class="card-title">Auditoria<br>de Estoque</span>
        </div>`;
        html += `<div class="menu-card" onclick="abrirDashboard()">
            <div class="icon-wrapper" style="background: rgba(40, 167, 69, 0.15); color: #28a745;"><i data-lucide="pie-chart" style="width:26px; height:26px; margin:0;"></i></div>
            <span class="card-title">Dashboard<br>& Metas</span>
        </div>`;
        html += `<div class="menu-card" onclick="abrirAdmin()">
            <div class="icon-wrapper" style="background: rgba(52, 58, 64, 0.15); color: var(--cor-texto);"><i data-lucide="settings" style="width:26px; height:26px; margin:0;"></i></div>
            <span class="card-title">Ajustes da<br>Empresa</span>
        </div>`;
    }

    html += `</div>
    <button class="btn-sistema btn-voltar" style="border-radius: 12px; font-size: 15px; background: transparent; border: 2px solid var(--border-color); color: var(--cor-texto); box-shadow: none;" onclick="fazerLogout()"><i data-lucide="log-out"></i> Encerrar Sessão</button>`;

    menuDiv.innerHTML = html;
    
    let isDark = document.body.classList.contains('dark-mode');
    let iconTema = document.getElementById('icone-tema-menu');
    if(iconTema) iconTema.setAttribute('data-lucide', isDark ? 'sun' : 'moon');

    loadIcons();
    verificarConferenciaEstoque();
    if (adminRole) inicializarNotificacoes();
}

function inicializarNotificacoes() {
    let modalAntigo = document.getElementById('modal-notificacoes');
    if (modalAntigo) modalAntigo.remove();

    let modalHtml = `
    <div id="modal-notificacoes" class="modal-overlay" style="z-index: 2000;">
        <div class="modal-content" style="max-height: 80vh; display: flex; flex-direction: column; padding: 0; overflow: hidden; background: var(--bg-container);">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid var(--border-color); background: var(--bg-item);">
                <h3 style="margin:0; font-size: 18px; color: var(--cor-texto);"><i data-lucide="bell-ring" style="color: #0086ff;"></i> Atividades de Hoje</h3>
                <button onclick="fecharModalNotificacoes()" style="background:none; border:none; color:var(--cor-texto); cursor:pointer;"><i data-lucide="x"></i></button>
            </div>
            <div id="lista-notificacoes-conteudo" style="overflow-y: auto; flex: 1; padding: 15px; text-align: left;">
                <div style="text-align:center; padding: 20px; color: var(--cor-secundaria);"><i data-lucide="loader-2" class="lucide-sm" style="animation: spin 2s linear infinite;"></i> Carregando atividades...</div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    carregarNotificacoesSilencioso();
}

function carregarNotificacoesSilencioso() {
    fetch(URL_DA_SUA_API + "?acao=historico&limit=150&_t=" + new Date().getTime())
    .then(r => r.json())
    .then(res => {
        if (res.status === "sucesso") {
            dadosHistoricoGlobal = res.dados || [];
            processarNotificacoes(dadosHistoricoGlobal);
        }
    }).catch(e => console.error("Erro nas notificações:", e));
}

function processarNotificacoes(dados) {
    let hojeStr = new Date().toLocaleDateString('pt-BR');
    let notificacoes = [];

    dados.forEach(row => {
        let pLogin = getVal(row, ['promotor', 'usuario', 'login']);
        let pObj = bancoUsuarios[pLogin];
        
        if (pLogin === usuarioLogado.id || pLogin === "Sistema") return;

        if (usuarioLogado.cargo === "supervisor") {
            if (!pObj || pObj.criadoPor !== usuarioLogado.id) return;
        } else if (usuarioLogado.cargo !== "master" && usuarioLogado.cargo !== "gestor") {
            if (!podeGerenciar(usuarioLogado, pLogin)) return;
        }

        let rawData = getVal(row, ['datahora', 'data', 'timestamp', 'carimbo']);
        let isHoje = false;
        
        if (rawData) {
            let dtStr = rawData.split(" ")[0]; 
            if (dtStr === hojeStr || dtStr === hojeStr.replace(/\//g, "-")) {
                isHoje = true;
            }
        }
        
        if (isHoje) notificacoes.push(row);
    });

    let badge = document.getElementById('badge-sino');
    let iconeSino = document.getElementById('icone-sino-interno');
    
    if (badge) {
        if (notificacoes.length > 0) {
            badge.innerText = notificacoes.length;
            badge.style.display = 'flex';
            if(iconeSino) iconeSino.classList.add('sino-animado');
        } else {
            badge.style.display = 'none';
            if(iconeSino) iconeSino.classList.remove('sino-animado');
        }
    }
    
    let div = document.getElementById('lista-notificacoes-conteudo');
    if (!div) return;
    
    if (notificacoes.length === 0) {
        div.innerHTML = "<div class='mensagem-vazia'>A sua equipe ainda não registrou atividades hoje.</div>";
        return;
    }

    let html = "";
    notificacoes.forEach(row => {
        let tipoAcao = getVal(row, ['tipoacao', 'tipo', 'acao', 'ação']);
        let detalhes = getVal(row, ['detalhes', 'detalhe', 'descrição', 'descricao']);
        let pLogin = getVal(row, ['promotor', 'usuario', 'login']);
        let nomePromotor = bancoUsuarios[pLogin] ? bancoUsuarios[pLogin].nome : pLogin;
        
        let isEstoque = tipoAcao.toLowerCase().includes('estoque') || tipoAcao.toLowerCase().includes('conferência') || detalhes.toLowerCase().includes('estoque') || detalhes.toLowerCase().includes('conferência');
        let tipo = isEstoque ? 'estoque' : 'geral';
        
        let iconeCor = isEstoque ? '#ff9800' : '#28a745';
        let iconeNome = isEstoque ? 'package' : 'shopping-bag';

        let resumo = detalhes.split("|")[0].substring(0, 45).trim();
        if (detalhes.length > 45) resumo += "...";

        html += `
        <div onclick="irParaNotificacao('${tipo}', '${pLogin}')" onmouseover="this.style.backgroundColor='var(--bg-card)'" onmouseout="this.style.backgroundColor='var(--bg-container)'" style="background: var(--bg-container); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; margin-bottom: 8px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background 0.2s;">
            <div style="background: var(--bg-item); padding: 10px; border-radius: 50%; border: 1px solid var(--border-color); display:flex; align-items:center; justify-content:center;">
                <i data-lucide="${iconeNome}" style="color:${iconeCor}; width:18px; height:18px; margin:0;"></i>
            </div>
            <div style="flex: 1;">
                <div style="font-size: 13px; font-weight: bold; color: var(--cor-texto); margin-bottom: 2px;">${nomePromotor} <span style="font-weight: normal; color: var(--cor-secundaria); font-size: 11px;">(${tipoAcao})</span></div>
                <div style="font-size: 12px; color: var(--cor-secundaria);">${resumo}</div>
            </div>
            <i data-lucide="chevron-right" style="color: #0086ff; width: 16px; height: 16px; margin:0;"></i>
        </div>`;
    });
    
    div.innerHTML = html;
    loadIcons();
}

function abrirModalNotificacoes() { document.getElementById('modal-notificacoes').classList.add('ativo'); }
function fecharModalNotificacoes() { document.getElementById('modal-notificacoes').classList.remove('ativo'); }

function irParaNotificacao(tipo, promotorLogin) {
    fecharModalNotificacoes();
    let btnFiltroSupHist = document.getElementById('filtro-sup-historico');
    if (btnFiltroSupHist) btnFiltroSupHist.value = "todos"; 
    
    if (typeof mudouSupHistorico === "function") mudouSupHistorico(); 

    setTimeout(() => {
        let btnFiltroPromHist = document.getElementById('filtro-promotor-historico');
        if (btnFiltroPromHist) btnFiltroPromHist.value = promotorLogin;
        
        let hojeStr = new Date().toISOString().split("T")[0];
        let dIni = document.getElementById('filtro-data-inicio-historico');
        let dFim = document.getElementById('filtro-data-fim-historico');
        if(dIni) dIni.value = hojeStr;
        if(dFim) dFim.value = hojeStr;
        
        abrirHistorico(tipo);
        if (typeof aplicarFiltroHistorico === "function") aplicarFiltroHistorico(); 
    }, 150);
}

// ================= LOGIN =================
function realizarLogin() {
    const btn = document.getElementById("btn-login"); 
    btn.disabled = true; 
    btn.innerHTML = '<i data-lucide="loader-2" class="lucide-sm" style="animation: spin 2s linear infinite;"></i> Entrando...'; 
    loadIcons();
    
    setTimeout(() => {
        try {
            const usuarioDigitado = document.getElementById('nome-usuario').value.trim().toLowerCase(); 
            const senhaDigitada = document.getElementById('senha-usuario').value.trim();
            
            if (usuarioDigitado === "master") {
                bancoUsuarios["master"] = { nome: "Diretor Master", senha: "Silva_9061", cargo: "master", meta: 0, lojasPermitidas: [] };
            }

            const usuarioEncontrado = bancoUsuarios[usuarioDigitado];
            let senhaReal = (usuarioDigitado === "master") ? "Silva_9061" : (usuarioEncontrado ? usuarioEncontrado.senha : null);
            
            if (usuarioEncontrado && senhaReal === senhaDigitada) {
                usuarioLogado = usuarioEncontrado; 
                usuarioLogado.id = usuarioDigitado; 
                usuarioLogado.nome = usuarioEncontrado.nome || (usuarioDigitado === "master" ? "Diretor Master" : (usuarioDigitado.charAt(0).toUpperCase() + usuarioDigitado.slice(1)));
                
                if (senhaDigitada === "1234" && !localStorage.getItem('ignorar_troca_' + usuarioDigitado) && usuarioDigitado !== "master") { 
                    usuarioEditandoSenha = usuarioDigitado; 
                    abrirModalSenha(); 
                    btn.disabled = false; 
                    btn.innerHTML = '<i data-lucide="log-in" style="margin-right: 8px;"></i> Acessar Sistema'; 
                    loadIcons();
                } else { 
                    entrarNoSistema(); 
                }
            } else { 
                mostrarToast("Usuário ou senha incorretos!", "erro"); 
                btn.disabled = false; 
                btn.innerHTML = '<i data-lucide="log-in" style="margin-right: 8px;"></i> Acessar Sistema'; 
                loadIcons();
            }
        } catch (e) {
            console.error("Erro no login:", e);
            mostrarToast("Erro de sistema. Clique em Forçar Atualização.", "erro");
            btn.disabled = false; 
            btn.innerHTML = '<i data-lucide="log-in" style="margin-right: 8px;"></i> Acessar Sistema'; 
            loadIcons();
        }
    }, 500);
}

function abrirModalSenha() { document.getElementById('etapa-pergunta-senha').style.display = 'block'; document.getElementById('etapa-formulario-senha').style.display = 'none'; document.getElementById('modal-senha').classList.add('ativo'); }
function responderTrocaSenha(q) { if(q) { document.getElementById('etapa-pergunta-senha').style.display = 'none'; document.getElementById('etapa-formulario-senha').style.display = 'block'; document.getElementById('nova-senha-1').value = ''; document.getElementById('nova-senha-2').value = ''; } else { localStorage.setItem('ignorar_troca_' + usuarioEditandoSenha, 'true'); fecharModalSenha(); entrarNoSistema(); } }
function cancelarTrocaSenha() { localStorage.setItem('ignorar_troca_' + usuarioEditandoSenha, 'true'); fecharModalSenha(); entrarNoSistema(); }
function salvarNovaSenha() { let s1 = document.getElementById('nova-senha-1').value.trim(); let s2 = document.getElementById('nova-senha-2').value.trim(); if (s1.length < 3 || s1 !== s2) return mostrarToast("Erro na senha!", "alerta"); bancoUsuarios[usuarioEditandoSenha].senha = s1; localStorage.setItem('ignorar_troca_' + usuarioEditandoSenha, 'true'); salvarConfiguracoesGlobais(false); fecharModalSenha(); entrarNoSistema(); mostrarToast("Senha alterada!", "sucesso"); }
function fecharModalSenha() { document.getElementById('modal-senha').classList.remove('ativo'); }

function entrarNoSistema() {
    document.getElementById('nome-usuario').value = ""; 
    document.getElementById('senha-usuario').value = "";
    
    renderizarMenuPrincipal();
    mudarTela('tela-menu');
}

function fazerLogout() { 
    usuarioLogado = null; 
    let btnTemaGlobal = document.getElementById('btn-tema');
    if (btnTemaGlobal) btnTemaGlobal.style.display = 'block';
    
    let btnVoltar = document.getElementById('btn-voltar-flutuante');
    if(btnVoltar) btnVoltar.style.display = 'none';
    
    mudarTela('tela-login'); 
}

// ================= VENDAS E ESTOQUE =================
function irParaVendas() {
    if (usuarioLogado.cargo === "master" || usuarioLogado.cargo === "gestor") {
        montarBotoesLojas(Object.keys(lojasConfig)); 
        mudarTela('tela-lojas');
    }
    else if (usuarioLogado.cargo === "supervisor") { 
        let promotoresDele = Object.keys(bancoUsuarios).filter(k => bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].criadoPor === usuarioLogado.id); 
        montarBotoesPromotores(promotoresDele); 
        mudarTela('tela-promotores'); 
    } 
    else if (usuarioLogado.lojasPermitidas.length === 1) { 
        selecionarLoja(usuarioLogado.lojasPermitidas[0]); 
    } 
    else { 
        montarBotoesLojas(usuarioLogado.lojasPermitidas); 
        mudarTela('tela-lojas'); 
    }
}

function montarBotoesPromotores(listaChaves) { const div = document.getElementById('botoes-promotores-dinamicos'); div.innerHTML = ""; if (!listaChaves || listaChaves.length === 0) { div.innerHTML = "<div class='mensagem-vazia'>Você não tem promotores na sua equipe.</div>"; return; } listaChaves.forEach(k => { let btn = document.createElement('button'); btn.className = "btn-sistema"; btn.innerHTML = `<i data-lucide="user" class="lucide-sm"></i> Equipe ${bancoUsuarios[k].nome || k}`; btn.onclick = () => selecionarPromotor(bancoUsuarios[k]); div.appendChild(btn); }); loadIcons(); }
function selecionarPromotor(obj) { if (obj.lojasPermitidas.length === 1) selecionarLoja(obj.lojasPermitidas[0]); else { montarBotoesLojas(obj.lojasPermitidas); mudarTela('tela-lojas'); } }
function montarBotoesLojas(arr) { const div = document.getElementById('botoes-lojas-dinamicos'); div.innerHTML = ""; let arrOrdenado = arr.sort((a, b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})); arrOrdenado.forEach(l => { let btn = document.createElement('button'); btn.className = "btn-sistema"; btn.innerHTML = `<i data-lucide="store" class="lucide-sm"></i> ${l}`; btn.onclick = () => selecionarLoja(l); div.appendChild(btn); }); loadIcons(); }
function voltarDeLojas() { if (usuarioLogado.cargo === "supervisor") mudarTela('tela-promotores'); else mudarTela('tela-menu'); }

function selecionarLoja(nomeLoja) {
    lojaAtual = nomeLoja; document.getElementById('titulo-loja-ativa').innerText = lojaAtual; document.getElementById('nome-promotor-ativo').innerText = getPromotorDaLoja(nomeLoja);
    vendedoresSelecionados = []; renderizarVendedoresVenda();
    const btn = document.getElementById('btn-trocar-loja'); 
    
    if (usuarioLogado.cargo === "supervisor") { 
        btn.style.display = "block"; btn.innerHTML = '<i data-lucide="refresh-ccw"></i> Trocar Equipe/Loja'; btn.onclick = () => mudarTela('tela-promotores'); 
    } else if (usuarioLogado.cargo === "master" || usuarioLogado.cargo === "gestor" || usuarioLogado.lojasPermitidas.length > 1) { 
        btn.style.display = "block"; btn.innerHTML = '<i data-lucide="refresh-ccw"></i> Trocar de Loja'; btn.onclick = () => mudarTela('tela-lojas'); 
    } else { 
        btn.style.display = "none"; 
    }
    
    carregarCards(); mudarTela('tela-venda'); loadIcons();
}

function renderizarVendedoresVenda() {
    const div = document.getElementById('grid-vendedores'); div.innerHTML = ""; const listaVendedores = (lojasConfig[lojaAtual] && lojasConfig[lojaAtual].vendedores) ? lojasConfig[lojaAtual].vendedores : [];
    if(listaVendedores.length === 0) { div.innerHTML = "<span style='color:var(--cor-secundaria); font-size:13px;'>Nenhum vendedor cadastrado nesta loja.</span>"; return; }
    listaVendedores.forEach(v => { let isAtivo = vendedoresSelecionados.includes(v) ? "ativo" : ""; div.innerHTML += `<div class="card-vendedor-venda ${isAtivo}" onclick="toggleVendedorVenda('${v}')">${v}</div>`; });
    loadIcons();
}

function toggleVendedorVenda(nome) { if(vendedoresSelecionados.includes(nome)) { vendedoresSelecionados = vendedoresSelecionados.filter(v => v !== nome); } else { vendedoresSelecionados.push(nome); } renderizarVendedoresVenda(); }

function carregarCards() { const div = document.getElementById("grid-aparelhos"); let html = ""; for (let ap in mapaEmojis) { html += `<div class="item-aparelho"><div class="card-aparelho" onclick="iniciarSelecaoAparelho('${ap}')"><span class="emoji-card">${mapaEmojis[ap]}</span></div><span class="nome-card">${ap.toUpperCase()}</span></div>`; } div.innerHTML = html; }
function iniciarSelecaoAparelho(ap) { if (vendedoresSelecionados.length === 0) return mostrarToast("Selecione ao menos um vendedor!", "alerta"); aparelhoEmSelecao = { nome: ap.toUpperCase(), emoji: mapaEmojis[ap] }; document.getElementById('modal-titulo-aparelho').innerHTML = `${aparelhoEmSelecao.emoji} ${aparelhoEmSelecao.nome}`; document.getElementById('input-imei').value = ""; document.getElementById('modal-imei').classList.add('ativo'); }
function confirmarImei(comImei) { let imei = comImei ? document.getElementById('input-imei').value.trim() : ""; document.getElementById('modal-imei').classList.remove('ativo'); emojisPendentes.push(`${aparelhoEmSelecao.emoji} ${aparelhoEmSelecao.nome}` + (imei ? ` → IMEI: ${imei}` : "")); aparelhoEmSelecao = null; atualizarTelaConferencia(); }
function atualizarTelaConferencia() { const div = document.getElementById("area-conferencia"); const lista = document.getElementById("lista-pendentes"); if (emojisPendentes.length > 0) { div.style.display = "block"; lista.innerHTML = emojisPendentes.map(i => `<div class="item-pendente"><i data-lucide="check" class="lucide-sm" style="color: #28a745;"></i> ${i}</div>`).join(""); } else { div.style.display = "none"; lista.innerHTML = ""; } loadIcons(); }
function limparPendentes() { emojisPendentes = []; atualizarTelaConferencia(); }

async function enviarParaBanco() {
    if (vendedoresSelecionados.length === 0) return; if (emojisPendentes.length === 0) return; const v = vendedoresSelecionados.join(" e ");
    const btn = document.getElementById("btn-enviar-venda"); btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" style="animation: spin 2s linear infinite;"></i> Enviando...'; loadIcons();
    let contagemVenda = {}; emojisPendentes.forEach(item => { let nomeLimpo = item.split("→")[0].trim(); contagemVenda[nomeLimpo] = (contagemVenda[nomeLimpo] || 0) - 1; });
    
    let payloadVenda = { vendedor: `[${lojaAtual}] ${v}`, aparelho: emojisPendentes.join(" || "), promotor: usuarioLogado.id }; 
    let detalhesVenda = `<strong>Venda Registrada:</strong><br>Loja: ${lojaAtual}<br>Vend: ${v}<br>Aparelhos: <span style="color:#0086ff;">${emojisPendentes.join(", ")}</span>`;

    if (!navigator.onLine) {
        filaOffline.push({ tipo: "venda", payload: payloadVenda, descricao: detalhesVenda, timestamp: new Date().getTime() });
        for (let apNome in contagemVenda) { filaOffline.push({ tipo: "estoque", payload: { tipo: "estoque", loja: lojaAtual, aparelho: apNome, delta: contagemVenda[apNome], promotor: usuarioLogado.id }, descricao: `Baixa Estoque: [${lojaAtual}] ${apNome} (${contagemVenda[apNome]})`, timestamp: new Date().getTime() }); }
        localStorage.setItem('filaOffline', JSON.stringify(filaOffline)); mostrarToast(`Sem internet. Salvo no Offline!`, "alerta"); limparPendentes(); btn.disabled = false; btn.innerHTML = '<i data-lucide="send"></i> Enviar Venda'; loadIcons(); return;
    }
    try {
        await fetch(URL_DA_SUA_API, { method: "POST", body: JSON.stringify(payloadVenda), mode: "no-cors", headers: { "Content-Type": "text/plain; charset=utf-8" } });
        for (let apNome in contagemVenda) { let payloadEstoque = { tipo: "estoque", loja: lojaAtual, aparelho: apNome, delta: contagemVenda[apNome], promotor: usuarioLogado.id }; await fetch(URL_DA_SUA_API, { method: "POST", body: JSON.stringify(payloadEstoque), mode: "no-cors", headers: { "Content-Type": "text/plain; charset=utf-8" } }); }
        mostrarToast(`Enviado com Sucesso!\n${detalhesVenda}`, "sucesso"); limparPendentes();
    } catch (e) {
        filaOffline.push({ tipo: "venda", payload: payloadVenda, descricao: detalhesVenda, timestamp: new Date().getTime() });
        for (let apNome in contagemVenda) { filaOffline.push({ tipo: "estoque", payload: { tipo: "estoque", loja: lojaAtual, aparelho: apNome, delta: contagemVenda[apNome], promotor: usuarioLogado.id }, descricao: `Baixa Estoque: [${lojaAtual}] ${apNome}`, timestamp: new Date().getTime() }); }
        localStorage.setItem('filaOffline', JSON.stringify(filaOffline)); mostrarToast(`Erro de rede. Salvo no Offline.`, "alerta"); limparPendentes();
    } finally { btn.disabled = false; btn.innerHTML = '<i data-lucide="send"></i> Enviar Venda'; loadIcons(); }
}

async function sincronizarFilaOffline() {
    if (filaOffline.length === 0 || !navigator.onLine) return;
    mostrarToast("Internet restaurada! Sincronizando dados pendentes...", "info"); let copiaFila = [...filaOffline]; filaOffline = []; localStorage.setItem('filaOffline', JSON.stringify(filaOffline));
    for (let item of copiaFila) { try { await fetch(URL_DA_SUA_API, { method: "POST", body: JSON.stringify(item.payload), mode: "no-cors", headers: { "Content-Type": "text/plain; charset=utf-8" } }); mostrarToast(`<strong>Sincronizado:</strong><br>${item.descricao}`, "sucesso"); } catch (e) { filaOffline.push(item); localStorage.setItem('filaOffline', JSON.stringify(filaOffline)); } }
}

// ================= FUNÇÕES DE APARELHOS E PRECIFICAÇÃO =================
function extrairChaveAparelho(textoBruto) { 
    let limpo = textoBruto.split("→")[0].split("(")[0].replace(/\[Motivo:.*?\]/g, "").trim().toLowerCase();
    let matchAlfaNum = limpo.match(/[a-z0-9]/i);
    if (matchAlfaNum) {
        limpo = limpo.substring(limpo.indexOf(matchAlfaNum[0])).trim();
    }
    return limpo;
}

function ehPremium(textoBruto, supervisorId) { 
    let chave = extrairChaveAparelho(textoBruto); 
    let pSup = aparelhosPremium[supervisorId];
    if (!pSup || Object.keys(pSup).length === 0) pSup = aparelhosPremium["geral"] || {};
    return (pSup[chave] === 1 || pSup[chave] === true);
}


// ================= ARQUITETURA DASHBOARD (BLINDADA) =================

function abrirDashboard() { 
    mudarTela('tela-dashboard'); 
    renderizarFiltrosDash();
    atualizarDadosDash();
}

function renderizarFiltrosDash() {
    let div = document.getElementById('filtros-hierarquia-dash');
    if (!div) {
        let topo = document.querySelector('.controles-topo-acompanhamento');
        if (topo) {
            topo.insertAdjacentHTML('afterend', '<div id="filtros-hierarquia-dash" style="margin-bottom: 20px;"></div>');
            div = document.getElementById('filtros-hierarquia-dash');
        } else { return; }
    }
    
    let u = usuarioLogado;
    let html = '';

    if (u.cargo === "master" || u.cargo === "gestor") {
        let regioes = [...new Set(Object.values(bancoUsuarios).map(x => x.regiao).filter(x => x && x.trim() !== ""))].sort();
        html += `
        <div style="flex:1; min-width: 150px; text-align: left;">
            <label style="font-size: 11px; font-weight: bold; color: var(--cor-secundaria); display: block; margin-bottom: 4px; text-transform:uppercase;">🗺️ Regional</label>
            <select id="dash-filtro-reg" class="seletor-mes" style="width: 100%; padding: 10px; font-size: 13px;" onchange="mudouFiltroDash('reg')">
                <option value="todos">Todas as Regiões</option>`;
                regioes.forEach(r => html += `<option value="${r}">${r}</option>`);
        html += `</select></div>`;

        html += `
        <div style="flex:1; min-width: 150px; text-align: left;">
            <label style="font-size: 11px; font-weight: bold; color: var(--cor-secundaria); display: block; margin-bottom: 4px; text-transform:uppercase;">👥 Equipe</label>
            <select id="dash-filtro-sup" class="seletor-mes" style="width: 100%; padding: 10px; font-size: 13px;" onchange="mudouFiltroDash('sup')">
                <option value="todos">Todos os Supervisores</option>
            </select>
        </div>`;
        
        html += `
        <div style="flex:1; min-width: 150px; text-align: left;">
            <label style="font-size: 11px; font-weight: bold; color: var(--cor-secundaria); display: block; margin-bottom: 4px; text-transform:uppercase;">👤 Promotor</label>
            <select id="dash-filtro-prom" class="seletor-mes" style="width: 100%; padding: 10px; font-size: 13px; border-color: #17a2b8; color: #17a2b8;" onchange="mudouFiltroDash('prom')">
                <option value="todos">Todos os Promotores</option>
            </select>
        </div>`;
    } 
    else if (u.cargo === "regional") {
        html += `
        <div style="flex:1; min-width: 150px; text-align: left;">
            <label style="font-size: 11px; font-weight: bold; color: var(--cor-secundaria); display: block; margin-bottom: 4px; text-transform:uppercase;">👥 Equipe (Sua Região)</label>
            <select id="dash-filtro-sup" class="seletor-mes" style="width: 100%; padding: 10px; font-size: 13px;" onchange="mudouFiltroDash('sup')">
                <option value="todos">Todos os Supervisores</option>
            </select>
        </div>`;
        
        html += `
        <div style="flex:1; min-width: 150px; text-align: left;">
            <label style="font-size: 11px; font-weight: bold; color: var(--cor-secundaria); display: block; margin-bottom: 4px; text-transform:uppercase;">👤 Promotor</label>
            <select id="dash-filtro-prom" class="seletor-mes" style="width: 100%; padding: 10px; font-size: 13px; border-color: #17a2b8; color: #17a2b8;" onchange="mudouFiltroDash('prom')">
                <option value="todos">Todos os Promotores</option>
            </select>
        </div>`;
    } 
    else if (u.cargo === "supervisor") {
        html += `
        <div style="flex:1; min-width: 150px; text-align: left;">
            <label style="font-size: 11px; font-weight: bold; color: var(--cor-secundaria); display: block; margin-bottom: 4px; text-transform:uppercase;">👤 Promotor (Sua Equipe)</label>
            <select id="dash-filtro-prom" class="seletor-mes" style="width: 100%; padding: 10px; font-size: 13px; border-color: #17a2b8; color: #17a2b8;" onchange="mudouFiltroDash('prom')">
                <option value="todos">Todos os Seus Promotores</option>
            </select>
        </div>`;
    }

    div.innerHTML = `<div style="display:flex; flex-wrap: wrap; gap: 10px; background: var(--bg-item); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color); box-shadow: 0 2px 8px var(--shadow-color);">${html}</div>`;
    
    let velhoContainerSup = document.getElementById('container-filtro-supervisor-dash');
    if (velhoContainerSup) velhoContainerSup.style.display = 'none';
    let velhoContainerProm = document.getElementById('container-filtro-promotor-dash');
    if (velhoContainerProm) velhoContainerProm.style.display = 'none';

    if (u.cargo !== "promotor") preencherOpcoesCascataDash();
}

function mudouFiltroDash(origem) {
    if (origem === 'reg') {
        let elSup = document.getElementById('dash-filtro-sup');
        if (elSup) elSup.value = "todos";
        let elProm = document.getElementById('dash-filtro-prom');
        if (elProm) elProm.value = "todos";
    } else if (origem === 'sup') {
        let elProm = document.getElementById('dash-filtro-prom');
        if (elProm) elProm.value = "todos";
    }
    preencherOpcoesCascataDash();
    atualizarDadosDash();
}

function preencherOpcoesCascataDash() {
    let u = usuarioLogado;
    let valReg = document.getElementById('dash-filtro-reg') ? document.getElementById('dash-filtro-reg').value : (u.cargo === "regional" ? u.regiao : "todos");
    let selSup = document.getElementById('dash-filtro-sup');
    let valSup = selSup ? selSup.value : (u.cargo === "supervisor" ? u.id : "todos");
    let selProm = document.getElementById('dash-filtro-prom');
    let valPromAtual = selProm ? selProm.value : "todos";

    if (selSup) {
        let htmlSup = '<option value="todos">Todos os Supervisores</option>';
        for (let k in bancoUsuarios) {
            let user = bancoUsuarios[k];
            let isSup = (user.cargo === "supervisor" || user.cargo === "gestor" || user.cargo === "regional" || k === "master");
            if (isSup && podeGerenciar(u, k)) {
                if (valReg !== "todos" && (user.regiao || "").toUpperCase() !== valReg.toUpperCase()) continue;
                htmlSup += `<option value="${k}">${user.nome || k}</option>`;
            }
        }
        let temOrfaos = Object.keys(bancoUsuarios).some(k => bancoUsuarios[k].cargo === "promotor" && (!bancoUsuarios[k].criadoPor || !bancoUsuarios[bancoUsuarios[k].criadoPor]));
        if (temOrfaos && (u.id === "master" || u.cargo === "gestor") && valReg === "todos") {
            htmlSup += `<option value="orfaos">⚠️ Promotores Órfãos</option>`;
        }
        selSup.innerHTML = htmlSup;
        if (Array.from(selSup.options).some(opt => opt.value === valSup)) selSup.value = valSup; else valSup = "todos";
    }

    if (selProm) {
        let htmlProm = '<option value="todos">Todos os Promotores</option>';
        for (let k in bancoUsuarios) {
            let prom = bancoUsuarios[k];
            if (prom.cargo === "promotor" && podeGerenciar(u, k)) {
                let supDesteProm = prom.criadoPor;
                let isOrfao = (!supDesteProm || !bancoUsuarios[supDesteProm]);
                
                if (valSup === "orfaos" && !isOrfao) continue;
                if (valSup !== "todos" && valSup !== "orfaos" && supDesteProm !== valSup) continue;
                
                if (valReg !== "todos") {
                    let regiaoDoProm = prom.regiao || (bancoUsuarios[supDesteProm] ? bancoUsuarios[supDesteProm].regiao : "");
                    if ((regiaoDoProm || "").toUpperCase() !== valReg.toUpperCase()) continue;
                }

                htmlProm += `<option value="${k}">${prom.nome || k}</option>`;
            }
        }
        selProm.innerHTML = htmlProm;
        if (Array.from(selProm.options).some(opt => opt.value === valPromAtual)) selProm.value = valPromAtual;
    }
}

function obterEscopoPromotoresDash() {
    let escopo = [];
    let u = usuarioLogado;
    
    let elReg = document.getElementById('dash-filtro-reg');
    let valReg = elReg ? elReg.value : (u.cargo === "regional" ? u.regiao : "todos");
    
    let elSup = document.getElementById('dash-filtro-sup');
    let valSup = elSup ? elSup.value : (u.cargo === "supervisor" ? u.id : "todos");
    
    let elProm = document.getElementById('dash-filtro-prom');
    let valProm = elProm ? elProm.value : (u.cargo === "promotor" ? u.id : "todos");

    for (let k in bancoUsuarios) {
        let prom = bancoUsuarios[k];
        if (prom.cargo === "promotor" && podeGerenciar(u, k)) {
            if (valProm !== "todos" && k !== valProm) continue;
            
            let supId = prom.criadoPor;
            let isOrfao = (!supId || !bancoUsuarios[supId]);
            if (valSup === "orfaos" && !isOrfao) continue;
            if (valSup !== "todos" && valSup !== "orfaos" && supId !== valSup) continue;
            
            if (valReg !== "todos") {
                let regiao = prom.regiao || (bancoUsuarios[supId] ? bancoUsuarios[supId].regiao : "");
                if ((regiao || "").toUpperCase() !== valReg.toUpperCase()) continue;
            }
            escopo.push(k);
        }
    }
    return escopo;
}

function atualizarDadosDash() {
    document.getElementById("total-comissao-geral").innerText = "R$ ****";
    document.getElementById("icone-olho-comissao").innerHTML = '<i data-lucide="eye" style="margin:0;"></i>'; loadIcons();
    
    const selDash = document.getElementById("seletor-mes-dash"); 
    let url = URL_DA_SUA_API + "?_t=" + new Date().getTime() + (selDash && selDash.value ? "&mes=" + encodeURIComponent(selDash.value) : "");
    document.getElementById("total-vendas-geral").innerText = "..."; 
    
    fetch(url)
    .then(r => { if(!r.ok) throw new Error("Erro na rede"); return r.json(); })
    .then(res => { 
        if (res.status === "sucesso") { 
            if (res.meses && selDash && selDash.options.length <= 1) {
                selDash.innerHTML = res.meses.map(m => `<option value="${m}" ${m === res.mesAtual ? "selected" : ""}>Mês: ${m}</option>`).join("");
            }
            try {
                gerarGraficosDash(res.dados || []); 
            } catch(errG) {
                console.error("Erro interno nos gráficos:", errG);
                document.getElementById("total-vendas-geral").innerText = "Erro Gráfico";
            }
        } else { document.getElementById("total-vendas-geral").innerText = "Erro!"; }
    })
    .catch(e => { console.error("Erro no Dashboard:", e); document.getElementById("total-vendas-geral").innerText = "Erro de Rede"; });
}

function toggleComissao() {
    let elComissao = document.getElementById("total-comissao-geral"); let iconeOlho = document.getElementById("icone-olho-comissao");
    if (elComissao.innerText === "R$ ****") { elComissao.innerText = elComissao.dataset.valor || "R$ 0,00"; iconeOlho.innerHTML = '<i data-lucide="eye-off" style="margin:0;"></i>'; } else { elComissao.innerText = "R$ ****"; iconeOlho.innerHTML = '<i data-lucide="eye" style="margin:0;"></i>'; } loadIcons();
}

function recriarCanvasSeguro(idWrap, idCanvas) {
    let wrap = document.getElementById(idWrap);
    if (!wrap) return null;
    wrap.innerHTML = `<canvas id="${idCanvas}"></canvas>`;
    let canvasEl = document.getElementById(idCanvas);
    return canvasEl ? canvasEl.getContext('2d') : null;
}

function gerarGraficosDash(dadosVendas) {
    let u = usuarioLogado;
    let elReg = document.getElementById('dash-filtro-reg'); let valReg = elReg ? elReg.value : "todos";
    let elSup = document.getElementById('dash-filtro-sup'); let valSup = elSup ? elSup.value : "todos";
    let elProm = document.getElementById('dash-filtro-prom'); let valProm = elProm ? elProm.value : "todos";
    
    if (u.cargo === "regional") valReg = u.regiao;
    if (u.cargo === "supervisor") valSup = u.id;
    if (u.cargo === "promotor") valProm = u.id;

    let escopoPermitidos = obterEscopoPromotoresDash();
    let agrupamento = (u.cargo === "promotor" || valProm !== "todos" || (valSup !== "todos" && valSup !== "orfaos")) ? "promotor" : "supervisor";

    let metricas = {};
    let vendasPorLoja = {};
    let vendasPorModelo = {};
    let modelosFocoVendidos = {};
    let rankingPorLoja = {};
    let totalGeral = 0;

    function definirBucket(idProm) {
        let p = bancoUsuarios[idProm];
        if (!p) return "Desconhecido";
        
        if (agrupamento === "promotor") {
            return p.nome || idProm;
        } else {
            let pSup = p.criadoPor || "orfaos";
            let isOrfao = (pSup === "orfaos" || !bancoUsuarios[pSup]);
            return isOrfao ? "⚠️ Órfãos" : (bancoUsuarios[pSup].nome || "Equipe " + pSup);
        }
    }

    escopoPermitidos.forEach(pId => {
        let p = bancoUsuarios[pId];
        let bucket = definirBucket(pId);
        
        let supKey = p.criadoPor || "geral";
        if (!p.criadoPor || !bancoUsuarios[p.criadoPor]) supKey = "geral";
        
        let taxaSup = taxasCoparticipacao[supKey] || taxasCoparticipacao["geral"] || 25;
        let metaInd = Number(p.meta) || 0;
        
        if (!metricas[bucket]) {
            metricas[bucket] = { 
                nome: bucket, loginSupConfig: supKey, 
                metaIndividual: 0, metaPremium: 0, 
                realizadoGeral: 0, realizadoPremium: 0, 
                modelosPremiumVendidos: {}, comissaoAcumulada: 0,
            };
        }
        
        metricas[bucket].metaIndividual += metaInd;
        metricas[bucket].metaPremium += (metaInd * (taxaSup / 100));
    });

    dadosVendas.forEach(row => {
        let rowVendedor = getVal(row, ['vendedor', 'vend', 'promotor']);
        let match = rowVendedor.match(/^\[(.*?)\]\s*(.*)$/); 
        let loja = match ? match[1].trim() : "Outras"; 
        let vendNome = match ? match[2].trim() : rowVendedor;
        
        let rowAparelhos = getVal(row, ['aparelhos', 'aparelho', 'modelo', 'produto']);
        let lista = rowAparelhos.split("||").map(x => x.trim()).filter(x => x !== ""); 
        let qtd = lista.length; 
        if (qtd === 0) return;
        
        let promotoresImpactados = new Set();
        
        if (loja !== "Outras") {
            escopoPermitidos.forEach(k => { if (bancoUsuarios[k].lojasPermitidas && bancoUsuarios[k].lojasPermitidas.some(l => l.trim().toLowerCase() === loja.toLowerCase())) promotoresImpactados.add(k); });
        } else {
            escopoPermitidos.forEach(k => { if (vendNome.toLowerCase().includes((bancoUsuarios[k].nome||k).toLowerCase())) promotoresImpactados.add(k); });
        }
        
        if (promotoresImpactados.size === 0) {
            if (valReg === "todos" && valSup === "todos" && valProm === "todos" && (u.cargo === "master" || u.cargo === "gestor")) {
                promotoresImpactados.add("fantasma_sistema"); 
            } else { return; }
        }

        totalGeral += qtd; 
        vendasPorLoja[loja] = (vendasPorLoja[loja] || 0) + qtd;
        
        let vizVendedores = (valProm !== "todos" || valSup !== "todos" || u.cargo === "supervisor" || u.cargo === "promotor");
        if (vizVendedores && promotoresImpactados.size > 0 && !promotoresImpactados.has("fantasma_sistema")) {
            if (!rankingPorLoja[loja]) rankingPorLoja[loja] = {};
            vendNome.split(" e ").forEach(vN => { 
                let v = vN.trim(); 
                if (!rankingPorLoja[loja][v]) rankingPorLoja[loja][v] = { qtdGeral: 0, qtdPremium: 0 }; 
                rankingPorLoja[loja][v].qtdGeral += 1; 
            });
        }

        lista.forEach(ap => { 
            let chaveKey = extrairChaveAparelho(ap); 
            let modeloFormatado = (mapaEmojis[chaveKey] ? mapaEmojis[chaveKey] + " " : "") + chaveKey.toUpperCase();
            
            vendasPorModelo[modeloFormatado] = (vendasPorModelo[modeloFormatado] || 0) + 1; 
            
            promotoresImpactados.forEach(pKey => {
                if (pKey === "fantasma_sistema") return; 
                
                let p = bancoUsuarios[pKey];
                if (!p) return; 

                let supKey = p.criadoPor || "geral";
                let checkPrem = ehPremium(ap, supKey);
                let bucket = definingBucket(pKey); // BUG PREVENIDO! (Era definingBucket, deve ser definirBucket)

                let safeBucket = definirBucket(pKey);

                if (metricas[safeBucket]) {
                    metricas[safeBucket].realizadoGeral += 1;
                    if (checkPrem) {
                        metricas[safeBucket].realizadoPremium += 1;
                        modelosFocoVendidos[modeloFormatado] = (modelosFocoVendidos[modeloFormatado] || 0) + 1;
                        metricas[safeBucket].modelosPremiumVendidos[chaveKey] = (metricas[safeBucket].modelosPremiumVendidos[chaveKey] || 0) + 1;
                    }
                }
            });

            if (vizVendedores && !promotoresImpactados.has("fantasma_sistema")) {
                let checkPremForRank = ehPremium(ap, "geral");
                if(checkPremForRank) { vendNome.split(" e ").forEach(vN => { rankingPorLoja[loja][vN.trim()].qtdPremium += 1; }); }
            }
        });
    });

    let mesFiltro = document.getElementById("seletor-mes-dash").value;

    Object.values(metricas).forEach(m => {
        let comissaoUser = 0; 
        let supKey = m.loginSupConfig || "geral";
        
        let vComissaoSup = valoresComissao[supKey] || valoresComissao["geral"] || {}; 
        let niveisGlobais = vComissaoSup.niveis || [{ id: 'l1', meta: 0 }, { id: 'l2', meta: 10 }];
        let aparelhosCfg = vComissaoSup.aparelhos || {};

        for(let modChave in m.modelosPremiumVendidos) {
            let qtdMod = m.modelosPremiumVendidos[modChave];
            let cfg = aparelhosCfg[modChave] || {}; 
            let nivelAlcancado = 'l1'; 
            let maiorMeta = -1;
            
            niveisGlobais.forEach(nv => { 
                let metaParaNivel = (cfg[nv.id + '_meta'] !== undefined && cfg[nv.id + '_meta'] !== "") ? Number(cfg[nv.id + '_meta']) : Number(nv.meta);
                if (m.realizadoGeral >= metaParaNivel && metaParaNivel >= maiorMeta) { 
                    nivelAlcancado = nv.id; maiorMeta = metaParaNivel; 
                } 
            });
            let payout = Number(cfg[nivelAlcancado]) || Number(cfg['l1']) || 0;
            comissaoUser += (qtdMod * payout);
        }
        m.comissaoAcumulada = comissaoUser;
    });

    let dataReferencia = new Date(); let diasParaMedia = 1;
    if (mesFiltro !== "") {
        let partes = mesFiltro.split('/'); let ms = parseInt(partes[0], 10); let yr = parseInt(partes[1], 10);
        if (dataReferencia.getMonth() + 1 === ms && dataReferencia.getFullYear() === yr) { diasParaMedia = dataReferencia.getDate(); } else { diasParaMedia = new Date(yr, ms, 0).getDate(); }
    } else { diasParaMedia = dataReferencia.getDate(); }
    if (diasParaMedia < 1) diasParaMedia = 1; 
    let mediaDiaria = totalGeral > 0 ? (totalGeral / diasParaMedia).toFixed(1) : 0;
    
    document.getElementById("total-vendas-geral").innerText = `${totalGeral} un`;
    document.getElementById("media-diaria-geral").innerText = `${mediaDiaria} un`;

    let comissaoTotalGeral = Object.values(metricas).reduce((acc, m) => acc + (m.comissaoAcumulada || 0), 0);
    let valorFormatado = `R$ ${comissaoTotalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    let elComissao = document.getElementById("total-comissao-geral");
    elComissao.dataset.valor = valorFormatado;
    elComissao.innerText = "R$ ****"; document.getElementById("icone-olho-comissao").innerHTML = '<i data-lucide="eye" style="margin:0;"></i>'; loadIcons();

    let pSup = aparelhosPremium[valSup !== "todos" ? valSup : "geral"] || aparelhosPremium["geral"] || {};
    let listaFocoAtuais = Object.keys(pSup).filter(k => pSup[k]).map(k => `<span style="display:inline-block; background:var(--bg-item); color:var(--cor-texto); padding:4px 8px; border-radius:6px; margin:2px; border: 1px solid var(--border-color); font-weight:bold;">${mapaEmojis[k] || ''} ${k.toUpperCase()}</span>`);
    document.getElementById("lista-foco-ativo-dash").innerHTML = listaFocoAtuais.length > 0 ? listaFocoAtuais.join("") : "<span style='color:var(--cor-secundaria); font-style:italic;'>Nenhum aparelho configurado como Foco.</span>";

    let totalFocoVendidoGeral = Object.values(metricas).reduce((acc, m) => acc + (m.realizadoPremium || 0), 0); 
    let metaFocoSomaGeral = Object.values(metricas).reduce((acc, m) => acc + (m.metaPremium || 0), 0);
    let pctMetaFocoGeral = metaFocoSomaGeral > 0 ? ((totalFocoVendidoGeral / metaFocoSomaGeral) * 100).toFixed(1) : 0; 
    let pctCopartGeral = totalGeral > 0 ? ((totalFocoVendidoGeral / totalGeral) * 100).toFixed(1) : 0;

    let listaFocoHtml = ""; for(let mod in modelosFocoVendidos) { listaFocoHtml += `<span style="display:inline-block; background:var(--bg-item); color:#0086ff; padding:4px 8px; border-radius:6px; margin:2px; font-weight:bold; border: 1px solid var(--border-color);">${mod}: ${modelosFocoVendidos[mod]} un</span> `; }
    let htmlDetalhesCopart = `<div style="display: flex; flex-direction: column; gap: 8px;"><div style="display: flex; justify-content: space-between; font-size: 13px;"><span><i data-lucide="star" class="lucide-sm"></i> Foco Vendidos: <strong>${totalFocoVendidoGeral} un</strong></span><span style="color: #28a745; font-weight: bold;">Meta: ${pctMetaFocoGeral}%</span></div><div style="display: flex; justify-content: space-between; font-size: 13px;"><span><i data-lucide="pie-chart" class="lucide-sm"></i> Coparticipação Geral: <strong>${pctCopartGeral}%</strong></span></div><div style="margin-top: 5px;"><strong style="font-size: 11px; color: var(--cor-secundaria); display: block; margin-bottom: 3px;">Foco Vendidos no Período:</strong><div>${listaFocoHtml || "<span style='color:var(--cor-secundaria); font-style:italic;'>Nenhum foco vendido.</span>"}</div></div></div>`;
    document.getElementById("detalhe-coparticipacao-cards").innerHTML = htmlDetalhesCopart; loadIcons();

    let htmlRank = ""; 
    let visualizarVendedoresCheck = (valProm !== "todos" || valSup !== "todos" || u.cargo === "supervisor" || u.cargo === "promotor");
    
    if (visualizarVendedoresCheck) {
        document.getElementById("titulo-ranking-dash").innerHTML = '<i data-lucide="award"></i> Ranking de Vendedores por Loja';
        let lojasDoRanking = Object.keys(rankingPorLoja).sort((a,b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));
        if (lojasDoRanking.length === 0) { htmlRank = "<span style='font-size:13px; color:var(--cor-secundaria);'>Nenhuma venda registrada no período.</span>"; } else {
            lojasDoRanking.forEach(lojaRank => {
                htmlRank += `<h5 style="color: #0086ff; margin-top: 15px; margin-bottom: 5px; border-bottom: 2px solid var(--border-color); padding-bottom: 5px; text-align: left; font-size: 14px;"><i data-lucide="store" class="lucide-sm"></i> ${lojaRank}</h5>`;
                let vendedoresDaLoja = rankingPorLoja[lojaRank]; let vendOrd = Object.keys(vendedoresDaLoja).sort((a,b) => vendedoresDaLoja[b].qtdGeral - vendedoresDaLoja[a].qtdGeral);
                let rNum = 1; let uQtd = -1;
                vendOrd.forEach(v => {
                    let m = vendedoresDaLoja[v]; if(uQtd !== -1 && m.qtdGeral < uQtd) rNum++; uQtd = m.qtdGeral;
                    let bC = rNum === 1 ? 'rank-1' : rNum === 2 ? 'rank-2' : rNum === 3 ? 'rank-3' : 'rank-outros';
                    let pctFocoVendedor = m.qtdGeral > 0 ? ((m.qtdPremium / m.qtdGeral) * 100).toFixed(1) : 0;
                    htmlRank += `<div style="display:flex;flex-direction:column;padding:8px 0;border-bottom:1px dashed var(--border-color);"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><div style="display:flex;align-items:center;gap:10px;"><span class="badge-rank ${bC}">${rNum}º</span><strong style="font-size: 14px; color: var(--cor-texto);"><i data-lucide="user" class="lucide-sm"></i> ${v}</strong></div><span style="background:var(--bg-item);color:#0086ff;font-weight:bold;padding:4px 10px;border-radius:6px;font-size:13px; border: 1px solid var(--border-color);">${m.qtdGeral} un</span></div><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--cor-secundaria);background:var(--bg-item);padding:4px 8px;border-radius:4px;"><span>Foco Vendido: <strong>${m.qtdPremium} un</strong> (<span style="color:#28a745;">${pctFocoVendedor}% Foco</span>)</span></div></div>`;
                });
            });
        }
    } else {
        document.getElementById("titulo-ranking-dash").innerHTML = (agrupamento === "promotor") ? '<i data-lucide="award"></i> Ranking de Promotores (vs Meta Individual)' : '<i data-lucide="award"></i> Ranking de Equipes (vs Meta)';
        let promOrd = Object.keys(metricas).sort((a,b) => metricas[b].realizadoGeral - metricas[a].realizadoGeral);
        let rNum = 1; let uQtd = -1;
        promOrd.forEach(p => {
            let m = metricas[p]; if(uQtd !== -1 && m.realizadoGeral < uQtd) rNum++; uQtd = m.realizadoGeral;
            let bC = rNum === 1 ? 'rank-1' : rNum === 2 ? 'rank-2' : rNum === 3 ? 'rank-3' : 'rank-outros';
            let metaAlvo = m.metaIndividual; let pctHit = metaAlvo > 0 ? ((m.realizadoGeral / metaAlvo) * 100).toFixed(1) : 0; let corHit = pctHit >= 100 ? '#28a745' : '#dc3545';
            let pctFocoVendedor = m.realizadoGeral > 0 ? ((m.realizadoPremium / m.realizadoGeral) * 100).toFixed(1) : 0;
            htmlRank += `<div style="display:flex;flex-direction:column;padding:12px 0;border-bottom:1px dashed var(--border-color);"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><div style="display:flex;align-items:center;gap:10px;"><span class="badge-rank ${bC}">${rNum}º</span><strong style="font-size: 15px; color: var(--cor-texto);"><i data-lucide="${agrupamento === 'promotor' ? 'user' : 'users'}" class="lucide-sm"></i> ${p}</strong></div><span style="background:var(--bg-item);color:#0086ff;font-weight:bold;padding:4px 10px;border-radius:6px;font-size:14px; border: 1px solid var(--border-color);">${m.realizadoGeral} un</span></div><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--cor-secundaria);background:var(--bg-item);padding:4px 8px;border-radius:4px;"><span>🎯 Meta: <strong style="color: var(--cor-texto);">${metaAlvo} un</strong></span><span style="color: ${corHit}; font-weight: bold;">${pctHit}% Concluído</span></div><div style="font-size:11px; color:var(--cor-secundaria); text-align:left; padding-left:4px; margin-top:2px;">Coparticipação Foco: <strong>${m.realizadoPremium} un</strong> (<span style="color:#28a745;">${pctFocoVendedor}%</span>)</div></div>`;
        });
    }
    document.getElementById("lista-ranking-promotores").innerHTML = htmlRank || "<span style='font-size:13px; color:var(--cor-secundaria);'>Nenhum dado encontrado no filtro.</span>"; loadIcons();

    // ==============================================================
    // RECONSTRUÇÃO FORÇADA DOS CONTAINERS DE GRÁFICO (EVITA ERRO DE REDE/CANVAS)
    // ==============================================================
    if (chartCoparticipacao) { chartCoparticipacao.destroy(); chartCoparticipacao = null; }
    if (chartCapa) { chartCapa.destroy(); chartCapa = null; }
    if (chartLojas) { chartLojas.destroy(); chartLojas = null; }
    if (chartModelos) { chartModelos.destroy(); chartModelos = null; }
    if (chartMetaGeral) { chartMetaGeral.destroy(); chartMetaGeral = null; }
    
    let containerDynamicID = 'container-graficos-dinamicos-fix';
    let containerDash = document.getElementById(containerDynamicID);
    if (!containerDash) {
        let elAncora = document.getElementById('detalhe-coparticipacao-cards').parentElement;
        elAncora.insertAdjacentHTML('afterend', `<div id="${containerDynamicID}"></div>`);
        containerDash = document.getElementById(containerDynamicID);
        
        let wrapsAntigos = document.querySelectorAll('div[id^="wrap-grafico"]:not(#' + containerDynamicID + ' div)');
        wrapsAntigos.forEach(w => w.parentElement.parentElement.style.display = 'none');
    }
    
    let widthProm = Math.max(100, Object.keys(metricas).length * 25); 

    let htmlGraficosForcados = `
        <div class="bloco-grafico-gerado" style="background: var(--bg-container); padding: 20px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 12px var(--shadow-color); border: 1px solid var(--border-color);">
            <h4 style="margin-top:0; text-align:left; display: flex; align-items: center; gap: 8px;"><i data-lucide="target" style="color:#0086ff;"></i> Meta Geral vs Realizado</h4>
            <div style="width: 100%; overflow-x: auto; overflow-y: hidden;">
                <div id="wrap-graficoMetaGeral" style="position: relative; height: 350px; min-width: ${widthProm}%;">
                    <canvas id="graficoMetaGeral"></canvas>
                </div>
            </div>
        </div>
        
        <div class="bloco-grafico-gerado" style="background: var(--bg-container); padding: 20px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 12px var(--shadow-color); border: 1px solid var(--border-color);">
            <h4 style="margin-top:0; text-align:left; display: flex; align-items: center; gap: 8px;"><i data-lucide="star" style="color:#ffc107;"></i> Meta Foco vs Realizado</h4>
            <div style="width: 100%; overflow-x: auto; overflow-y: hidden;">
                <div id="wrap-graficoMetaPremiumCapa" style="position: relative; height: 350px; min-width: ${widthProm}%;">
                    <canvas id="graficoMetaPremiumCapa"></canvas>
                </div>
            </div>
        </div>
        
        <div class="bloco-grafico-gerado" style="background: var(--bg-container); padding: 20px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 12px var(--shadow-color); border: 1px solid var(--border-color);">
            <h4 style="margin-top:0; text-align:left; display: flex; align-items: center; gap: 8px;"><i data-lucide="percent" style="color:#17a2b8;"></i> Coparticipação Premium (%)</h4>
            <div style="width: 100%; overflow-x: auto; overflow-y: hidden;">
                <div id="wrap-graficoCoparticipacaoPromotores" style="position: relative; height: 350px; min-width: ${widthProm}%;">
                    <canvas id="graficoCoparticipacaoPromotores"></canvas>
                </div>
            </div>
        </div>
    `;
    
    containerDash.innerHTML = htmlGraficosForcados;
    loadIcons();

    let corTextoGrafico = document.body.classList.contains('dark-mode') ? '#e0e0e0' : '#666'; 
    Chart.defaults.color = corTextoGrafico;
    const pluginDatalabels = ChartDataLabels; 
    
    let labelsProm = Object.keys(metricas);
    if (labelsProm.length === 0) {
        labelsProm = ["Sem Dados"];
        metricas["Sem Dados"] = { metaPremium: 0, metaIndividual: 0, realizadoPremium: 0, realizadoGeral: 0 };
    }

    let maxMetaGeral = Math.max(...labelsProm.map(p => metricas[p].metaIndividual)) || 10;
    let maxMetaFoco = Math.max(...labelsProm.map(p => metricas[p].metaPremium)) || 10;

    // 1. GRÁFICO: META GERAL
    let elGeralCanvas = document.getElementById('graficoMetaGeral');
    if (elGeralCanvas) {
        const ctxGeral = elGeralCanvas.getContext('2d');
        chartMetaGeral = new Chart(ctxGeral, {
            type: 'bar', plugins: [pluginDatalabels],
            data: { 
                labels: labelsProm, 
                datasets: [
                    { label: 'Meta Total (un)', data: labelsProm.map(p => Number(Math.round(metricas[p].metaIndividual * 10) / 10) || 0), backgroundColor: '#c0c0c0' }, 
                    { label: 'Realizado Total', data: labelsProm.map(p => Number(metricas[p].realizadoGeral) || 0), backgroundColor: '#0086ff' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 45 } }, plugins: { legend: { position: 'bottom', labels:{color:corTextoGrafico} }, datalabels: { anchor: 'end', align: 'top', offset: 4, formatter: (val, ctx) => { if (ctx.datasetIndex === 0) return val + ' un'; let p = ctx.chart.data.labels[ctx.dataIndex]; let m = metricas[p]; let pct = m.metaIndividual > 0 ? ((val / m.metaIndividual) * 100).toFixed(1) : 0; return [`${val} un`, `(${pct}%)`]; }, font: { weight: 'bold', size: 10 }, color: corTextoGrafico, textAlign: 'center' } }, scales: { x:{ticks:{color:corTextoGrafico}}, y: { beginAtZero: true, suggestedMax: maxMetaGeral * 1.3, ticks:{color:corTextoGrafico} } } }
        });
    }

    // 2. GRÁFICO: META FOCO
    let elFocoCanvas = document.getElementById('graficoMetaPremiumCapa');
    if (elFocoCanvas) {
        const ctxCapa = elFocoCanvas.getContext('2d');
        chartCapa = new Chart(ctxCapa, {
            type: 'bar', plugins: [pluginDatalabels],
            data: { 
                labels: labelsProm, 
                datasets: [
                    { label: 'Meta Foco (un)', data: labelsProm.map(p => Number(Math.round(metricas[p].metaPremium * 10) / 10) || 0), backgroundColor: '#c0c0c0' }, 
                    { label: 'Realizado Foco', data: labelsProm.map(p => Number(metricas[p].realizadoPremium) || 0), backgroundColor: '#ffc107' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 45 } }, plugins: { legend: { position: 'bottom', labels:{color:corTextoGrafico} }, datalabels: { anchor: 'end', align: 'top', offset: 4, formatter: (val, ctx) => { if (ctx.datasetIndex === 0) return val + ' un'; let p = ctx.chart.data.labels[ctx.dataIndex]; let m = metricas[p]; let pct = m.metaPremium > 0 ? ((val / m.metaPremium) * 100).toFixed(1) : 0; return [`${val} un`, `(${pct}%)`]; }, font: { weight: 'bold', size: 10 }, color: corTextoGrafico, textAlign: 'center' } }, scales: { x:{ticks:{color:corTextoGrafico}}, y: { beginAtZero: true, suggestedMax: maxMetaFoco * 1.3, ticks:{color:corTextoGrafico} } } }
        });
    }

    // 3. GRÁFICO: COPARTICIPAÇÃO
    let elCopartCanvas = document.getElementById('graficoCoparticipacaoPromotores');
    if (elCopartCanvas) {
        const ctxCopart = elCopartCanvas.getContext('2d');
        chartCoparticipacao = new Chart(ctxCopart, {
            type: 'bar', plugins: [pluginDatalabels],
            data: { 
                labels: labelsProm, 
                datasets: [
                    { label: '% Coparticipação', data: labelsProm.map(p => metricas[p].realizadoGeral > 0 ? Number(((metricas[p].realizadoPremium / metricas[p].realizadoGeral) * 100).toFixed(1)) : 0), backgroundColor: '#17a2b8' }
                ] 
            },
            options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 45 } }, plugins: { legend: { display: false }, tooltip: { padding: 12, callbacks: { label: function(context) { let p = context.chart.data.labels[context.dataIndex]; let m = metricas[p]; let linhas = [`Coparticipação: ${context.raw}% (${m.realizadoPremium} de ${m.realizadoGeral} un)`]; if (m.realizadoPremium > 0) { linhas.push('-------------------------'); linhas.push('Aparelhos Foco Vendidos:'); for (let mod in m.modelosPremiumVendidos) { linhas.push(`• ${m.modelosPremiumVendidos[mod]}x ${mod}`); } } else { linhas.push('-------------------------'); linhas.push('Nenhum aparelho foco vendido.'); } return linhas; } } }, datalabels: { anchor: 'end', align: 'top', offset: 4, formatter: (val, ctx) => { let p = ctx.chart.data.labels[ctx.dataIndex]; let m = metricas[p]; return [`${val}%`, `(${m.realizadoPremium} de ${m.realizadoGeral} un)`]; }, font: { weight: 'bold', size: 10 }, color: corTextoGrafico, textAlign: 'center' } }, scales: { x:{ticks:{color:corTextoGrafico}}, y: { beginAtZero: true, suggestedMax: 100, ticks:{color:corTextoGrafico} } } }
        });
    }

    // 4. GRÁFICO DE LOJAS
    let lojasSort = Object.keys(vendasPorLoja).sort((a,b) => a.localeCompare(b, undefined, {numeric:true, sensitivity:'base'}));
    if (lojasSort.length === 0) lojasSort = ["Nenhuma Loja"];
    
    let ctxLojas = recriarCanvasSeguro('wrap-graficoVendasLoja', 'graficoVendasLoja');
    if (ctxLojas) {
        document.getElementById('wrap-graficoVendasLoja').style.minWidth = Math.max(100, lojasSort.length * 18) + '%';
        chartLojas = new Chart(ctxLojas, { type: 'bar', plugins: [pluginDatalabels], data: { labels: lojasSort, datasets: [{ data: lojasSort.map(l => Number(vendasPorLoja[l]) || 0), backgroundColor: '#28a745', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 20 } }, scales: { x: { ticks: { display: false }, grid: { display: false } }, y: { beginAtZero: true } }, plugins: { legend: { display: false }, tooltip: { padding: 12, callbacks: { title: function(context) { return '🏪 ' + context[0].label; }, afterTitle: function(context) { return '👤 Promotor: ' + getPromotorDaLoja(context[0].label); }, label: function(context) { return 'Total Vendido: ' + context.raw + ' un'; } } }, datalabels: { anchor: 'end', align: 'top', color: corTextoGrafico, font: { weight: 'bold' }, formatter: (val) => val + ' un' } } } });
    }

    // 5. GRÁFICO PIZZA (TOP MODELOS)
    let topModelos = Object.entries(vendasPorModelo).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (topModelos.length === 0) topModelos = [["Nenhum", 1]];
    
    let elModelosCanvas = document.getElementById('graficoTopModelos');
    if (elModelosCanvas && elModelosCanvas.parentElement) {
        elModelosCanvas.parentElement.innerHTML = '<canvas id="graficoTopModelos"></canvas>';
        const ctxMod = document.getElementById('graficoTopModelos').getContext('2d');
        chartModelos = new Chart(ctxMod, { type: 'doughnut', plugins: [pluginDatalabels], data: { labels: topModelos.map(m => `${m[0]}`), datasets: [{ data: topModelos.map(m => m[1]), backgroundColor: ['#0086ff', '#28a745', '#ffc107', '#dc3545', '#6f42c1'] }] }, options: { maintainAspectRatio: false, responsive: true, plugins: { legend: { position: 'bottom', labels: { color: corTextoGrafico } }, datalabels: { color: '#fff', font: { weight: 'bold', size: 12 }, formatter: (value) => value > 0 && topModelos[0][0] !== "Nenhum" ? value + ' un' : '' } } } });
    }
}

// ================= ACOMPANHAMENTO E HISTÓRICO... (Mantido Perfeito) =================
function abrirAcompanhamento() { mudarTela('tela-acompanhamento'); if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") { promotorFiltroAtual = "todos"; } else { promotorFiltroAtual = usuarioLogado.id; } subPromotorFiltroAtual = "todos"; renderizarFiltroPromotores(); carregarDadosDoBanco(); }

function renderizarFiltroPromotores() {
    const div = document.getElementById("seletor-promotores"); const divSub = document.getElementById("seletor-sub-promotores");
    if (usuarioLogado.cargo === "promotor") { div.innerHTML = `<div class="card-promotor-filtro ativo"><i data-lucide="user" class="lucide-sm"></i> ${usuarioLogado.nome} (Suas Lojas)</div>`; if(divSub) divSub.style.display = "none"; loadIcons(); return; }
    let html = `<div class="card-promotor-filtro ${promotorFiltroAtual === 'todos' ? 'ativo' : ''}" onclick="setFiltroPromotor('todos')"><i data-lucide="layout-dashboard" class="lucide-sm"></i> Visão Geral (Todas)</div>`;
    
    if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") {
        for (let key in bancoUsuarios) {
            let u = bancoUsuarios[key];
            let isSupervisor = (u.cargo === "supervisor" || u.cargo === "gestor" || u.cargo === "regional" || key === "master");
            if (isSupervisor) {
                let temEquipe = Object.keys(bancoUsuarios).some(k => bancoUsuarios[k].cargo === "promotor" && promotorPertenceAoGestor(k, key));
                if (temEquipe && podeGerenciar(usuarioLogado, key)) {
                    html += `<div class="card-promotor-filtro ${promotorFiltroAtual === key ? 'ativo' : ''}" onclick="setFiltroPromotor('${key}')"><i data-lucide="users" class="lucide-sm"></i> Equipe ${u.nome || key}</div>`;
                }
            }
        }
        
        let temOrfaos = Object.keys(bancoUsuarios).some(k => bancoUsuarios[k].cargo === "promotor" && (!bancoUsuarios[k].criadoPor || !bancoUsuarios[bancoUsuarios[k].criadoPor]));
        if (temOrfaos && (usuarioLogado.id === "master" || usuarioLogado.cargo === "gestor")) {
            html += `<div class="card-promotor-filtro ${promotorFiltroAtual === 'orfaos' ? 'ativo' : ''}" onclick="setFiltroPromotor('orfaos')" style="border-color:#ffc107; color:#856404;"><i data-lucide="alert-triangle" class="lucide-sm"></i> Órfãos</div>`;
        }

        if (promotorFiltroAtual !== 'todos') {
            let htmlSub = `<div class="card-promotor-filtro ${subPromotorFiltroAtual === 'todos' ? 'ativo' : ''}" style="${subPromotorFiltroAtual === 'todos' ? 'background-color: #17a2b8; border-color: #17a2b8; color: white;' : 'background-color: var(--bg-item); color: var(--cor-secundaria); border-color: var(--border-color);'}" onclick="setSubFiltroPromotor('todos')"><i data-lucide="users" class="lucide-sm"></i> Todas (Equipe)</div>`;
            for (let key in bancoUsuarios) { 
                let u = bancoUsuarios[key];
                if (u.cargo === "promotor") {
                    if (promotorPertenceAoGestor(key, promotorFiltroAtual)) {
                        let isAt = subPromotorFiltroAtual === key; 
                        htmlSub += `<div class="card-promotor-filtro ${isAt ? 'ativo' : ''}" style="${isAt ? 'background-color: #17a2b8; border-color: #17a2b8; color: white;' : 'background-color: var(--bg-item); color: var(--cor-secundaria); border-color: var(--border-color);'}" onclick="setSubFiltroPromotor('${key}')"><i data-lucide="user" class="lucide-sm"></i> ${u.nome || key}</div>`;
                    }
                }
            }
            if(divSub) { divSub.innerHTML = htmlSub; divSub.style.display = "flex"; }
        } else { if(divSub) divSub.style.display = "none"; }
    } else if (usuarioLogado.cargo === "supervisor") {
        html = `<div class="card-promotor-filtro ${promotorFiltroAtual === 'todos' ? 'ativo' : ''}" onclick="setFiltroPromotor('todos')"><i data-lucide="layout-dashboard" class="lucide-sm"></i> Visão Geral (Sua Equipe)</div>`;
        for (let key in bancoUsuarios) { if (bancoUsuarios[key].cargo === "promotor" && promotorPertenceAoGestor(key, usuarioLogado.id)) { html += `<div class="card-promotor-filtro ${promotorFiltroAtual === key ? 'ativo' : ''}" onclick="setFiltroPromotor('${key}')"><i data-lucide="user" class="lucide-sm"></i> ${bancoUsuarios[key].nome || key}</div>`; } }
        if(divSub) divSub.style.display = "none";
    } div.innerHTML = html; loadIcons();
}

function setFiltroPromotor(id) { promotorFiltroAtual = id; subPromotorFiltroAtual = "todos"; renderizarFiltroPromotores(); renderizarListaAcompanhamento(); }
function setSubFiltroPromotor(id) { subPromotorFiltroAtual = id; renderizarFiltroPromotores(); renderizarListaAcompanhamento(); }

function carregarDadosDoBanco() {
    const div = document.getElementById("lista-agrupada"); const sel = document.getElementById("seletor-mes"); 
    let url = URL_DA_SUA_API + "?_t=" + new Date().getTime() + (sel.value ? "&mes=" + encodeURIComponent(sel.value) : "");
    document.getElementById("btn-atualizar-acomp").innerHTML = '<i data-lucide="loader-2" class="lucide-sm" style="animation: spin 2s linear infinite;"></i> Atualizando...'; loadIcons();
    div.innerHTML = "Buscando dados da nuvem...";
    
    fetch(url, { method: 'GET', cache: 'no-store', credentials: 'omit' })
    .then(r => { if(!r.ok) throw new Error("Erro na rede"); return r.json(); })
    .then(res => {
        if (res.status === "sucesso") { 
            dadosAcompanhamentoGlobal = res.dados; 
            if (res.meses) { 
                let htmlMeses = res.meses.map(m => `<option value="${m}" ${m === res.mesAtual ? "selected" : ""}>Mês: ${m}</option>`).join(""); 
                sel.innerHTML = htmlMeses; const selDash = document.getElementById("seletor-mes-dash"); if (selDash && selDash.options.length <= 1) selDash.innerHTML = htmlMeses; 
            } 
            renderizarListaAcompanhamento(); 
        } else { div.innerHTML = `<p style="color:red; text-align:center;">Erro ao carregar: ${res.mensagem || 'Erro desconhecido'}</p>`; }
    })
    .catch(err => { div.innerHTML = `<p style="color:red; text-align:center;">Erro de conexão. Verifique o link da API ou sua internet.</p>`; console.error(err); })
    .finally(() => { document.getElementById("btn-atualizar-acomp").innerHTML = '<i data-lucide="refresh-cw"></i> Atualizar Dados'; loadIcons(); });
}

function renderizarListaAcompanhamento() {
    const div = document.getElementById("lista-agrupada"); if (dadosAcompanhamentoGlobal.length === 0) return div.innerHTML = `<div class="mensagem-vazia">Nenhuma venda registrada.</div>`;
    let promotoresGrupos = {}; 
    
    dadosAcompanhamentoGlobal.forEach(row => {
        let rowVendedor = getVal(row, ['vendedor', 'vend', 'promotor']);
        let match = rowVendedor.match(/^\[(.*?)\]\s*(.*)$/); 
        let loja = match ? match[1].trim() : "Outras Lojas"; 
        let vend = match ? match[2].trim() : rowVendedor;

        let promotoresDaLoja = []; 
        for(let key in bancoUsuarios) { 
            if (bancoUsuarios[key].cargo === "promotor" && bancoUsuarios[key].lojasPermitidas) {
                if (bancoUsuarios[key].lojasPermitidas.some(l => l.trim().toLowerCase() === loja.toLowerCase())) {
                    promotoresDaLoja.push(key); 
                }
            } 
        }
        if (promotoresDaLoja.length === 0) promotoresDaLoja.push("sem_promotor");
        
        promotoresDaLoja.forEach(pKey => {
            if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") { 
                if (promotorFiltroAtual !== "todos") { 
                    if (pKey === "sem_promotor") return;
                    if (!promotorPertenceAoGestor(pKey, promotorFiltroAtual)) return;
                    if (subPromotorFiltroAtual !== "todos" && pKey !== subPromotorFiltroAtual) return; 
                } else { 
                    if (pKey !== "sem_promotor" && !podeGerenciar(usuarioLogado, pKey)) return; 
                } 
            } else if (usuarioLogado.cargo === "supervisor") {
                if (pKey === "sem_promotor") return; 
                if (!promotorPertenceAoGestor(pKey, usuarioLogado.id)) return;
                if (promotorFiltroAtual !== "todos" && pKey !== promotorFiltroAtual) return;
            } else if (usuarioLogado.cargo === "promotor") {
                if (pKey !== usuarioLogado.id) return;
            }

            if (!promotoresGrupos[pKey]) promotoresGrupos[pKey] = { lojas: {} }; if (!promotoresGrupos[pKey].lojas[loja]) promotoresGrupos[pKey].lojas[loja] = []; 
            
            let rowAparelhos = getVal(row, ['aparelhos', 'aparelho', 'modelo', 'produto']);
            promotoresGrupos[pKey].lojas[loja].push({ vendedor: vend, aparelhosStr: rowAparelhos });
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
            vendOrd.forEach((v) => { if (ult !== -1 && v.qtd < ult) rank++; ult = v.qtd; let cRank = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-outros'; let listaAp = v.ap.map(ap => `<div class="item-vendido">${ap.replace(/\(IMEI:\s*(.*?)\)/g, " IMEI: $1")}</div>`).join(""); htmlVend += `<div class="vendedor-bloco"><div class="vendedor-cabecalho"><div><span class="badge-rank ${cRank}">${rank}º</span> <strong>${v.nome}:</strong></div><span class="vendedor-quantidade">${v.qtd} un</span></div><div class="vendedor-itens-box">${listaAp}</div></div>`; });
            htmlLojas += `<div class="loja-card-acompanhamento" style="margin-left: 10px; border-left: 4px solid #17a2b8; margin-bottom: 15px; border-radius: 0 8px 8px 0; border-top: 1px solid var(--border-color); border-right: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); box-shadow: none;"><div class="loja-titulo" style="padding-top: 5px; color: #0086ff;"><span><i data-lucide="store" class="lucide-sm"></i> ${loja}</span><span class="loja-badge-total" style="background:var(--bg-item);color:var(--cor-secundaria);">Total: ${totalLoja}</span></div>${htmlVend}</div>`;
        }
        html += `<div style="margin-bottom: 25px; border-radius: 8px; box-shadow: 0 4px 8px var(--shadow-color); overflow: hidden; text-align: left;"><div style="background: ${pKey === 'sem_promotor' ? '#6c757d' : '#0086ff'}; color: white; padding: 12px 15px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;"><span style="font-size: 15px; display:flex; align-items:center;"><i data-lucide="user"></i> Promotor: ${nomePromotor}</span><span style="background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px; font-size: 13px;">Total: ${totalPromotor} un</span></div><div style="background: var(--bg-container); padding: 15px 10px 5px 10px; border: 1px solid var(--border-color); border-top: none; border-radius: 0 0 8px 8px;">${htmlLojas}</div></div>`;
    } div.innerHTML = html; loadIcons();
}

function adminAbrirModalCargo(login) {
    let u = bancoUsuarios[login];
    document.getElementById('modal-edicao-titulo').innerHTML = `<i data-lucide="briefcase"></i> Alterar Cargo`;
    let html = `<label style="font-size:13px; font-weight:bold; color:var(--cor-secundaria); display:block; margin-bottom:5px;">Novo cargo para <b>@${login}</b>:</label>
                <select id="input-edicao-cargo" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--cor-texto);">
                    <option value="promotor" ${u.cargo==='promotor'?'selected':''}>Promotor de Vendas</option>
                    <option value="supervisor" ${u.cargo==='supervisor'?'selected':''}>Supervisor de Equipe</option>
                    <option value="regional" ${u.cargo==='regional'?'selected':''}>Gestor Regional</option>
                    <option value="gestor" ${u.cargo==='gestor'?'selected':''}>Diretor / Master</option>
                </select>`;
    document.getElementById('modal-edicao-corpo').innerHTML = html;
    document.getElementById('btn-salvar-edicao').onclick = function() {
        let novoCargo = document.getElementById('input-edicao-cargo').value;
        bancoUsuarios[login].cargo = novoCargo;
        if(novoCargo === 'supervisor' && !u.criadoPor) u.criadoPor = usuarioLogado.id;
        renderizarAdminUsuarios(); fecharModalEdicao(); salvarConfiguracoesGlobais(false); mostrarToast("Cargo alterado e salvo na nuvem!", "sucesso");
    };
    document.getElementById('modal-edicao').classList.add('ativo'); loadIcons();
}