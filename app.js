// URL DA SUA API DO GOOGLE APPS SCRIPT
const URL_DA_SUA_API = "https://script.google.com/macros/s/AKfycbzg7zvtitqzNtB7ghbZ-zg0-W3fTrkAswlORizvAfyPETdbHivMRqvJyrfTEZ36WuXGPQ/exec";

// HELPER GLOBAL - Blinda o sistema contra erros de nome de colunas do Google Sheets
const getVal = (obj, possiveisNomes) => {
    if (!obj) return "";
    let chave = Object.keys(obj).find(k => possiveisNomes.includes(k.toLowerCase().trim()));
    return chave ? String(obj[chave]).trim() : "";
};

// GERADOR DE FURA-CACHE - Garante que o navegador sempre baixe os dados novos
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

// ================= MELHORIAS DE UX (FECHAR MODAL E CACHE) =================
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

// NOVA FUNÇÃO: Limpa o Cache e força a atualização do sistema
function limparCacheERecarregar() {
    let btn = document.getElementById('btn-limpar-cache');
    if(btn) btn.innerHTML = '<i data-lucide="loader-2" class="lucide-sm" style="animation: spin 2s linear infinite;"></i> Atualizando...';
    loadIcons();
    
    // Varre e destroi todos os caches salvos no celular/navegador
    localStorage.clear();
    sessionStorage.clear();
    mostrarToast("Memória limpa! Reiniciando sistema...", "info");
    
    setTimeout(() => {
        // Redireciona pulando o cache
        window.location.href = window.location.pathname + "?v=" + new Date().getTime();
    }, 1200);
}

function loadIcons() { if(typeof lucide !== 'undefined') { lucide.createIcons(); } }

function toggleTema() {
    document.body.classList.toggle('dark-mode');
    let isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('temaEscuro', isDark ? 'sim' : 'nao');
    document.getElementById('btn-tema').innerHTML = isDark ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
    
    let iconTemaMenu = document.getElementById('icone-tema-menu');
    if(iconTemaMenu) { iconTemaMenu.setAttribute('data-lucide', isDark ? 'sun' : 'moon'); }
    
    loadIcons();
    if (document.getElementById('tela-dashboard').classList.contains('ativa')) abrirDashboard();
}

function mudarTela(idTela) { 
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa')); 
    document.getElementById(idTela).classList.add('ativa'); 
    
    let btnTemaGlobal = document.getElementById('btn-tema');
    if (btnTemaGlobal) btnTemaGlobal.style.display = (idTela === 'tela-menu') ? 'none' : 'block';

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

window.onload = function() {
    loadIcons();
    
    // INJETA O BOTÃO DE LIMPAR CACHE NA TELA DE LOGIN AUTOMATICAMENTE
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
        clearTimeout(tempoEsgotado); console.error("Erro no onload:", err);
        bancoUsuarios["master"] = { nome: "Diretor Master", senha: "Silva_9061", cargo: "master", meta: 0, lojasPermitidas: [] };
        document.getElementById('tela-loading').style.display = 'none'; mudarTela('tela-login');
        mostrarToast("Erro ao conectar na nuvem. Usando modo offline.", "erro");
    });
};

function podeGerenciar(logado, alvoId) {
    if (!logado || !alvoId) return false;
    if (logado.id === "master" || logado.cargo === "master" || logado.cargo === "gestor") return true;
    
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

// ================= MODAIS ADMIN E CADASTROS =================

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

// ================= MENU NOVO E NOTIFICAÇÕES (SINO) =================

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
    
    document.getElementById('filtro-sup-historico').value = "todos"; 
    mudouSupHistorico(); 

    setTimeout(() => {
        document.getElementById('filtro-promotor-historico').value = promotorLogin;
        
        let hojeStr = new Date().toISOString().split("T")[0];
        document.getElementById('filtro-data-inicio-historico').value = hojeStr;
        document.getElementById('filtro-data-fim-historico').value = hojeStr;
        
        abrirHistorico(tipo);
        aplicarFiltroHistorico(); 
    }, 150);
}

// ================= LOGIN E ACESSO BLINDADO =================
function realizarLogin() {
    const btn = document.getElementById("btn-login"); 
    btn.disabled = true; 
    btn.innerHTML = '<i data-lucide="loader-2" class="lucide-sm" style="animation: spin 2s linear infinite;"></i> Entrando...'; 
    loadIcons();
    
    setTimeout(() => {
        try {
            const usuarioDigitado = document.getElementById('nome-usuario').value.trim().toLowerCase(); 
            const senhaDigitada = document.getElementById('senha-usuario').value.trim();
            
            // Força a criação do Master na memória caso a rede tenha falhado
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
    mudarTela('tela-login'); 
}

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
                let temEquipe = Object.keys(bancoUsuarios).some(k => bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].criadoPor === key);
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
                    let pertence = (promotorFiltroAtual === 'orfaos') ? (!u.criadoPor || !bancoUsuarios[u.criadoPor]) : (u.criadoPor === promotorFiltroAtual);
                    if (pertence) {
                        let isAt = subPromotorFiltroAtual === key; 
                        htmlSub += `<div class="card-promotor-filtro ${isAt ? 'ativo' : ''}" style="${isAt ? 'background-color: #17a2b8; border-color: #17a2b8; color: white;' : 'background-color: var(--bg-item); color: var(--cor-secundaria); border-color: var(--border-color);'}" onclick="setSubFiltroPromotor('${key}')"><i data-lucide="user" class="lucide-sm"></i> ${u.nome || key}</div>`;
                    }
                }
            }
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

function carregarDadosDoBanco() {
    const div = document.getElementById("lista-agrupada"); const sel = document.getElementById("seletor-mes"); 
    let url = URL_DA_SUA_API + "?_t=" + new Date().getTime() + (sel.value ? "&mes=" + encodeURIComponent(sel.value) : "");
    document.getElementById("btn-atualizar-acomp").innerHTML = '<i data-lucide="loader-2" class="lucide-sm" style="animation: spin 2s linear infinite;"></i> Atualizando...'; loadIcons();
    div.innerHTML = "Buscando dados da nuvem...";
    
    fetch(url)
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
                    if (promotorFiltroAtual === "orfaos") {
                        if (bancoUsuarios[pKey].criadoPor && bancoUsuarios[bancoUsuarios[pKey].criadoPor]) return;
                    } else {
                        if (bancoUsuarios[pKey].criadoPor !== promotorFiltroAtual) return; 
                    }
                    if (subPromotorFiltroAtual !== "todos" && pKey !== subPromotorFiltroAtual) return; 
                } else { 
                    if (pKey !== "sem_promotor" && !podeGerenciar(usuarioLogado, bancoUsuarios[pKey]?.criadoPor)) return; 
                } 
            } else if (usuarioLogado.cargo === "supervisor") {
                if (pKey === "sem_promotor") return; 
                if (bancoUsuarios[pKey].criadoPor !== usuarioLogado.id) return; 
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

// ================= ESTOQUE E MOSTRUÁRIO ================= //

function fecharModalConfirmMostruario() { document.getElementById('modal-confirm-mostruario').classList.remove('ativo'); mostruarioEmEdicao = null; }
function fecharModalPromptMostruario() { document.getElementById('modal-prompt-mostruario').classList.remove('ativo'); mostruarioEmEdicao = null; }
function executarRemoverMostruario() { if (!mostruarioEmEdicao) return; delete mostruariosGlobais[mostruarioEmEdicao.key]; localStorage.setItem('mostruariosGlobais', JSON.stringify(mostruariosGlobais)); renderizarListaEstoque(); mostrarToast("Status de mostruário removido.", "info"); fecharModalConfirmMostruario(); }
function executarAddMostruario() { if (!mostruarioEmEdicao) return; let obs = document.getElementById('input-obs-mostruario').value; mostruariosGlobais[mostruarioEmEdicao.key] = obs.trim() !== "" ? obs.trim() : true; localStorage.setItem('mostruariosGlobais', JSON.stringify(mostruariosGlobais)); renderizarListaEstoque(); mostrarToast("Marcado como mostruário com sucesso!", "sucesso"); fecharModalPromptMostruario(); }

function toggleMostruario(loja, ap) {
    let k = `${loja}_${ap}`; mostruarioEmEdicao = { loja: loja, ap: ap, key: k };
    if (mostruariosGlobais[k]) {
        document.getElementById('texto-confirm-mostruario').innerHTML = `Tem certeza que deseja DESMARCAR o <b>${ap}</b> como mostruário na loja <b>${loja}</b>?`;
        document.getElementById('modal-confirm-mostruario').classList.add('ativo');
    } else {
        document.getElementById('texto-prompt-mostruario').innerHTML = `Marcando <b>${ap}</b> como MOSTRUÁRIO na loja <b>${loja}</b>.<br><br>Se desejar, digite o IMEI ou observação abaixo:`;
        document.getElementById('input-obs-mostruario').value = ""; document.getElementById('modal-prompt-mostruario').classList.add('ativo');
    }
}

function abrirEstoque() { mudarTela('tela-estoque'); promotorEstoqueFiltroAtual = (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") ? "todos" : usuarioLogado.id; renderizarFiltroPromotoresEstoque(); carregarEstoqueDoBanco(); }

function renderizarFiltroPromotoresEstoque() {
    const div = document.getElementById("seletor-promotores-estoque");
    if (usuarioLogado.cargo === "promotor") { div.innerHTML = `<div class="card-promotor-filtro ativo"><i data-lucide="user" class="lucide-sm"></i> ${usuarioLogado.nome}</div>`; loadIcons(); return; }
    let html = `<div class="card-promotor-filtro ${promotorEstoqueFiltroAtual === 'todos' ? 'ativo' : ''}" onclick="setFiltroPromotorEstoque('todos')"><i data-lucide="layout-dashboard" class="lucide-sm"></i> Visão Geral (Todas)</div>`;
    
    if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") {
        for (let key in bancoUsuarios) {
            let u = bancoUsuarios[key];
            let isSupervisor = (u.cargo === "supervisor" || u.cargo === "gestor" || u.cargo === "regional" || key === "master");
            if (isSupervisor) {
                let temEquipe = Object.keys(bancoUsuarios).some(k => bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].criadoPor === key);
                if (temEquipe && podeGerenciar(usuarioLogado, key)) {
                    html += `<div class="card-promotor-filtro ${promotorEstoqueFiltroAtual === key ? 'ativo' : ''}" onclick="setFiltroPromotorEstoque('${key}')"><i data-lucide="users" class="lucide-sm"></i> Equipe ${u.nome || key}</div>`;
                }
            }
        }
        let temOrfaos = Object.keys(bancoUsuarios).some(k => bancoUsuarios[k].cargo === "promotor" && (!bancoUsuarios[k].criadoPor || !bancoUsuarios[bancoUsuarios[k].criadoPor]));
        if (temOrfaos && (usuarioLogado.id === "master" || usuarioLogado.cargo === "gestor")) {
            html += `<div class="card-promotor-filtro ${promotorEstoqueFiltroAtual === 'orfaos' ? 'ativo' : ''}" onclick="setFiltroPromotorEstoque('orfaos')" style="border-color:#ffc107; color:#856404;"><i data-lucide="alert-triangle" class="lucide-sm"></i> Órfãos</div>`;
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

function setFiltroPromotorEstoque(id) { promotorEstoqueFiltroAtual = id; renderizarFiltroPromotoresEstoque(); renderizarListaEstoque(); }

function carregarEstoqueDoBanco() { 
    document.getElementById("btn-atualizar-estoque").innerHTML = '<i data-lucide="loader-2" style="animation: spin 2s linear infinite;"></i> Atualizando...'; loadIcons();
    document.getElementById("lista-estoque-agrupada").innerHTML = "Buscando dados do estoque...";
    
    fetch(URL_DA_SUA_API + "?acao=estoque&_t=" + new Date().getTime())
    .then(r => { if(!r.ok) throw new Error("Erro na rede"); return r.json(); })
    .then(res => { 
        if (res.status === "sucesso") { dadosEstoqueGlobal = res.estoque || []; renderizarListaEstoque(); } 
        else { document.getElementById("lista-estoque-agrupada").innerHTML = `<p style="color:red; text-align:center;">Erro ao carregar: ${res.mensagem || 'Desconhecido'}</p>`; }
    }).catch(err => { document.getElementById("lista-estoque-agrupada").innerHTML = `<p style="color:red; text-align:center;">Erro de conexão. Verifique o link da API ou sua internet.</p>`; console.error(err); })
    .finally(() => { document.getElementById("btn-atualizar-estoque").innerHTML = '<i data-lucide="refresh-cw"></i> Atualizar Estoque'; loadIcons(); }); 
}

function renderizarListaEstoque() {
    pendenciasEstoque = {}; document.getElementById("area-conferencia-estoque").style.display = "none"; let lojasEstoque = {}; let lojasAtivas = [];
    let mostrarZerados = document.getElementById('check-mostrar-zerados').checked;

    if (promotorEstoqueFiltroAtual === "todos" && (usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master")) {
        lojasAtivas = Object.keys(lojasConfig);
    } else if (promotorEstoqueFiltroAtual === "orfaos") {
        for (let k in bancoUsuarios) {
            if (bancoUsuarios[k].cargo === "promotor" && (!bancoUsuarios[k].criadoPor || !bancoUsuarios[bancoUsuarios[k].criadoPor])) {
                bancoUsuarios[k].lojasPermitidas.forEach(l => { if(!lojasAtivas.includes(l)) lojasAtivas.push(l); });
            }
        }
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
    lojasAtivas.forEach(loja => { lojasEstoque[loja] = {}; for (let ap in mapaEmojis) lojasEstoque[loja][`${mapaEmojis[ap]} ${ap.toUpperCase()}`] = 0; });
    
    dadosEstoqueGlobal.forEach(row => { 
        let nomeLojaSheet = getVal(row, ['loja', 'filial']).trim().toLowerCase();
        let lojaEncontrada = Object.keys(lojasEstoque).find(l => l.trim().toLowerCase() === nomeLojaSheet);
        
        if (lojaEncontrada) {
            let chave = extrairChaveAparelho(getVal(row, ['aparelho', 'modelo', 'produto']));
            if (chave && mapaEmojis[chave]) {
                let nomeOficial = `${mapaEmojis[chave]} ${chave.toUpperCase()}`;
                if (lojasEstoque[lojaEncontrada][nomeOficial] !== undefined) {
                    lojasEstoque[lojaEncontrada][nomeOficial] += Number(getVal(row, ['quantidade', 'qtd', 'delta'])) || 0;
                }
            }
        } 
    });
    
    let html = "";
    for (let loja in lojasEstoque) {
        let totalLoja = 0; let htmlItens = "";
        for (let apNome in lojasEstoque[loja]) {
            let qtd = lojasEstoque[loja][apNome]; 
            if (qtd === 0 && !mostrarZerados) continue;
            totalLoja += qtd; let btnId = (loja + apNome).replace(/[^a-zA-Z0-9]/g, '');
            
            let kMostruario = `${loja}_${apNome}`; let isMostruario = mostruariosGlobais[kMostruario];
            if (qtd !== 1 && isMostruario) { delete mostruariosGlobais[kMostruario]; isMostruario = false; localStorage.setItem('mostruariosGlobais', JSON.stringify(mostruariosGlobais)); }

            let btnMostruarioHtml = "";
            if (qtd === 1) {
                if (isMostruario) {
                    let obsExtra = (typeof isMostruario === 'string' && isMostruario !== "true") ? ` (${isMostruario})` : "";
                    btnMostruarioHtml = `<span onclick="toggleMostruario('${loja}', '${apNome}')" style="cursor:pointer; font-size:10px; background:#dc3545; color:white; padding:3px 8px; border-radius:12px; margin-left:8px; display:inline-flex; align-items:center; gap:4px; font-weight:bold; box-shadow: 0 1px 3px rgba(0,0,0,0.2);" title="Clique para remover o mostruário">🔴 Mostruário${obsExtra}</span>`;
                } else {
                    btnMostruarioHtml = `<span onclick="toggleMostruario('${loja}', '${apNome}')" style="cursor:pointer; font-size:10px; background:var(--bg-fundo); border:1px solid var(--border-color); color:var(--cor-secundaria); padding:3px 8px; border-radius:12px; margin-left:8px; display:inline-flex; align-items:center; gap:4px;" title="Clique para adicionar mostruário">⚪ Marcar Mostruário</span>`;
                }
            }

            let htmlControles = "";
            let permEstoquePromotor = (usuarioLogado.cargo === "promotor") ? (usuarioLogado.permissoes ? usuarioLogado.permissoes.estoque_editar : true) : false;
            let adminRole = (usuarioLogado.cargo === "supervisor" || usuarioLogado.cargo === "regional" || usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master");
            
            if (permEstoquePromotor || adminRole) { 
                htmlControles = `<button class="btn-est" onclick="alterarEstoque('${loja}', '${apNome}', -1, '${btnId}')">-</button><span class="qtd-badge" id="badge-${btnId}">${qtd}</span><button class="btn-est" onclick="alterarEstoque('${loja}', '${apNome}', 1, '${btnId}')">+</button>`; 
            } else { 
                htmlControles = `<span class="qtd-badge" style="background-color: var(--bg-item); color: var(--cor-secundaria); padding: 4px 12px; font-size: 14px; border: 1px solid var(--border-color);">${qtd} un</span>`; 
            }
            
            htmlItens += `<div class="estoque-item-linha"><span>${apNome} ${btnMostruarioHtml}</span><div class="estoque-controles">${htmlControles}</div></div>`;
        }
        if(htmlItens !== "") { html += `<div class="loja-card-acompanhamento"><div class="loja-titulo"><span><i data-lucide="store" class="lucide-sm"></i> ${loja}</span><span class="loja-badge-total">Total Geral: ${totalLoja} un</span></div><div class="vendedor-itens-box">${htmlItens}</div></div>`; }
    }
    document.getElementById("lista-estoque-agrupada").innerHTML = html || `<div class="mensagem-vazia">Nenhum estoque para exibir com os filtros atuais.</div>`;
    atualizarTelaConferenciaEstoque(); loadIcons();
}

function alterarEstoque(loja, ap, delta, id) {
    let k = `${loja}|${ap}`; if (!pendenciasEstoque[k]) { let linha = dadosEstoqueGlobal.find(r => getVal(r, ['loja', 'filial']) === loja && getVal(r, ['aparelho', 'modelo']) === ap); pendenciasEstoque[k] = { loja: loja, aparelho: ap, qtdOriginal: linha ? Number(getVal(linha, ['quantidade', 'qtd', 'delta'])) : 0, novaQtd: 0, deltaTotal: 0 }; }
    let p = pendenciasEstoque[k]; p.deltaTotal += delta; p.novaQtd = p.qtdOriginal + p.deltaTotal; if (p.novaQtd < 0) { p.novaQtd = 0; p.deltaTotal = -p.qtdOriginal; }
    let badge = document.getElementById(`badge-${id}`); if(badge) { badge.innerText = p.novaQtd; badge.style.backgroundColor = p.deltaTotal !== 0 ? "#fff3cd" : "var(--bg-card)"; badge.style.color = p.deltaTotal !== 0 ? "#856404" : "#0086ff"; }
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
            html += `<div class="item-alteracao-estoque" style="background: var(--bg-container); border: 1px solid var(--border-color); padding: 10px; border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--cor-texto);"><span>📍 [${p.loja}] ${p.aparelho}</span><span>De: <strong>${p.qtdOriginal}</strong> ➔ Para: <span style="color: #0086ff; font-weight: bold;">${p.novaQtd} un</span></span></div>`; 
        } 
    }
    
    if (tem) { 
        div.style.display = "block"; lista.innerHTML = html; 
        if(btnOk) btnOk.style.display = "none";
    } else { 
        div.style.display = "none"; lista.innerHTML = ""; 
        let hoje = new Date().toLocaleDateString('pt-BR');
        let ultima = localStorage.getItem('ultimaConferencia_' + usuarioLogado.id);
        if (usuarioLogado.cargo === "promotor" && ultima !== hoje) { if(btnOk) btnOk.style.display = "block"; } else { if(btnOk) btnOk.style.display = "none"; }
    }
}

function limparConferenciaEstoque() { renderizarListaEstoque(); }

function verificarMotivoEstoque() {
    let chaves = Object.keys(pendenciasEstoque).filter(k => pendenciasEstoque[k].deltaTotal !== 0);
    if (chaves.length === 0) return;
    
    let adminRole = (usuarioLogado.cargo === "supervisor" || usuarioLogado.cargo === "regional" || usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master");
    
    if (adminRole) {
        executarEnvioEstoque("Ajuste Gerencial");
    } else {
        document.getElementById('modal-motivo-estoque').classList.add('ativo');
    }
}

async function confirmarEnvioEstoqueMotivo() {
    document.getElementById('modal-motivo-estoque').classList.remove('ativo');
    let motivoSelecionado = document.getElementById('select-motivo-estoque').value;
    executarEnvioEstoque(motivoSelecionado);
}

async function executarEnvioEstoque(motivoSelecionado) {
    const btn = document.getElementById("btn-enviar-estoque"); btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" style="animation: spin 2s linear infinite;"></i> Enviando...'; loadIcons(); 
    let chaves = Object.keys(pendenciasEstoque).filter(k => pendenciasEstoque[k].deltaTotal !== 0); 
    let qtdAlterada = chaves.length; 
    let detalhesEstoque = `<strong>Estoque Atualizado:</strong><br>${qtdAlterada} modelos sofreram alteração.<br><strong>Motivo:</strong> ${motivoSelecionado}`;
    
    if (!navigator.onLine) { 
        for (let i = 0; i < chaves.length; i++) { 
            let p = pendenciasEstoque[chaves[i]]; 
            filaOffline.push({ tipo: "estoque", payload: { tipo: "estoque", loja: p.loja, aparelho: p.aparelho, motivo: motivoSelecionado, delta: p.deltaTotal, promotor: usuarioLogado.id }, descricao: `Estoque: [${p.loja}] ${p.aparelho} (${motivoSelecionado})`, timestamp: new Date().getTime() }); 
        } 
        localStorage.setItem('filaOffline', JSON.stringify(filaOffline)); 
        localStorage.setItem('ultimaConferencia_' + usuarioLogado.id, new Date().toLocaleDateString('pt-BR'));
        verificarConferenciaEstoque();
        mostrarToast(`Sem internet. Salvo no modo Offline:\n${detalhesEstoque}`, "alerta"); limparConferenciaEstoque(); btn.disabled = false; btn.innerHTML = '<i data-lucide="upload-cloud"></i> Enviar Atualização'; loadIcons(); return; 
    }
    
    try { 
        for (let i = 0; i < chaves.length; i++) { 
            let p = pendenciasEstoque[chaves[i]]; 
            await fetch(URL_DA_SUA_API, { method: "POST", body: JSON.stringify({ tipo: "estoque", loja: p.loja, aparelho: p.aparelho, motivo: motivoSelecionado, delta: p.deltaTotal, promotor: usuarioLogado.id }), mode: "no-cors", headers: { "Content-Type": "text/plain; charset=utf-8" } }); 
        } 
        localStorage.setItem('ultimaConferencia_' + usuarioLogado.id, new Date().toLocaleDateString('pt-BR'));
        verificarConferenciaEstoque();
        mostrarToast(`Correção Enviada com Sucesso!\n${detalhesEstoque}`, "sucesso"); carregarEstoqueDoBanco(); 
    } catch (e) { 
        for (let i = 0; i < chaves.length; i++) { 
            let p = pendenciasEstoque[chaves[i]]; 
            filaOffline.push({ tipo: "estoque", payload: { tipo: "estoque", loja: p.loja, aparelho: p.aparelho, motivo: motivoSelecionado, delta: p.deltaTotal, promotor: usuarioLogado.id }, descricao: `Estoque: [${p.loja}] ${p.aparelho} (${motivoSelecionado})`, timestamp: new Date().getTime() }); 
        } 
        localStorage.setItem('filaOffline', JSON.stringify(filaOffline)); 
        localStorage.setItem('ultimaConferencia_' + usuarioLogado.id, new Date().toLocaleDateString('pt-BR'));
        verificarConferenciaEstoque();
        mostrarToast(`Erro de rede. Salvo no modo Offline:\n${detalhesEstoque}`, "alerta"); limparConferenciaEstoque(); 
    } finally { btn.disabled = false; btn.innerHTML = '<i data-lucide="upload-cloud"></i> Enviar Atualização'; loadIcons(); }
}

async function registrarConferenciaOK() {
    const btn = document.getElementById("btn-conferencia-ok");
    btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" style="animation: spin 2s linear infinite;"></i> Registrando...'; loadIcons();
    let payload = { tipo: "estoque", loja: "Geral", aparelho: "Conferência Diária [Motivo: Conferência OK - Sem Divergências]", delta: 0, promotor: usuarioLogado.id };
    
    try {
        if (navigator.onLine) { await fetch(URL_DA_SUA_API, { method: "POST", body: JSON.stringify(payload), mode: "no-cors", headers: { "Content-Type": "text/plain; charset=utf-8" } }); } 
        else { filaOffline.push({ tipo: "estoque", payload: payload, descricao: "Conferência OK", timestamp: new Date().getTime() }); localStorage.setItem('filaOffline', JSON.stringify(filaOffline)); }
        localStorage.setItem('ultimaConferencia_' + usuarioLogado.id, new Date().toLocaleDateString('pt-BR')); mostrarToast("Conferência registrada com sucesso!", "sucesso"); verificarConferenciaEstoque(); renderizarListaEstoque(); 
    } catch (e) {
        filaOffline.push({ tipo: "estoque", payload: payload, descricao: "Conferência OK", timestamp: new Date().getTime() }); localStorage.setItem('filaOffline', JSON.stringify(filaOffline)); localStorage.setItem('ultimaConferencia_' + usuarioLogado.id, new Date().toLocaleDateString('pt-BR')); mostrarToast("Salvo offline!", "alerta"); verificarConferenciaEstoque(); renderizarListaEstoque();
    } finally { btn.disabled = false; btn.innerHTML = '<i data-lucide="check-circle-2"></i> Finalizar Conferência (Sem Divergências)'; loadIcons(); }
}

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

// ================= HISTÓRICO GERAL E ESTOQUE ================= //
function abrirHistorico(tipo) {
    tipoHistoricoAtual = tipo; mudarTela('tela-historico');
    document.getElementById('titulo-tela-historico').innerHTML = tipo === 'estoque' ? '<i data-lucide="search"></i> Auditoria de Estoque' : '<i data-lucide="clock"></i> Ações da Equipe';
    
    let selSup = document.getElementById('filtro-sup-historico');
    if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") {
        document.getElementById('container-filtro-sup-historico').style.display = "block";
        let htmlOp = '<option value="todos">Todas as Regiões</option>';
        for(let k in bancoUsuarios) { if(bancoUsuarios[k].cargo === "supervisor" && podeGerenciar(usuarioLogado, k)) { htmlOp += `<option value="${k}">Equipe: ${bancoUsuarios[k].nome || k}</option>`; } }
        selSup.innerHTML = htmlOp;
    } else { document.getElementById('container-filtro-sup-historico').style.display = "none"; }
    
    mudouSupHistorico(); carregarHistoricoDoBanco();
}

function mudouSupHistorico() {
    let selSup = document.getElementById('filtro-sup-historico').value;
    let selProm = document.getElementById('filtro-promotor-historico');
    let htmlOp = '<option value="todos">Todos da Equipe</option>';
    let supAlvo = (usuarioLogado.cargo === "supervisor") ? usuarioLogado.id : selSup;
    if (supAlvo && supAlvo !== "todos") {
        for(let k in bancoUsuarios) { if(bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].criadoPor === supAlvo) { htmlOp += `<option value="${k}">${bancoUsuarios[k].nome || k}</option>`; } }
    } else if (supAlvo === "todos" && (usuarioLogado.cargo === "master" || usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional")) {
        for(let k in bancoUsuarios) { 
            if(bancoUsuarios[k].cargo === "promotor" && podeGerenciar(usuarioLogado, k)) { 
                let nomeSup = bancoUsuarios[k].criadoPor ? (bancoUsuarios[bancoUsuarios[k].criadoPor]?.nome || bancoUsuarios[k].criadoPor) : "Órfão";
                htmlOp += `<option value="${k}">[${nomeSup}] ${bancoUsuarios[k].nome || k}</option>`; 
            } 
        }
    }
    selProm.innerHTML = htmlOp;
    aplicarFiltroHistorico();
}

function aplicarFiltroHistorico() { renderizarListaHistorico(); }

function carregarHistoricoDoBanco(forcarNuvem = false) {
    const div = document.getElementById("lista-historico");
    if (!forcarNuvem && dadosHistoricoGlobal.length > 0) { renderizarListaHistorico(); return; }
    div.innerHTML = '<i data-lucide="loader-2" class="lucide-sm" style="animation: spin 2s linear infinite;"></i> Carregando dados da nuvem...'; loadIcons();
    fetch(URL_DA_SUA_API + "?acao=historico&limit=500&_t=" + new Date().getTime())
    .then(r => r.json())
    .then(res => { if(res.status === "sucesso") { dadosHistoricoGlobal = res.dados || []; renderizarListaHistorico(); } else { div.innerHTML = "Erro ao carregar histórico."; } })
    .catch(e => { div.innerHTML = "Erro de rede."; console.error(e); });
}

function renderizarListaHistorico() {
    const div = document.getElementById("lista-historico");
    let dataInicio = document.getElementById('filtro-data-inicio-historico').value;
    let dataFim = document.getElementById('filtro-data-fim-historico').value;
    let supAlvo = (usuarioLogado.cargo === "supervisor") ? usuarioLogado.id : document.getElementById('filtro-sup-historico').value;
    let promAlvo = document.getElementById('filtro-promotor-historico').value;

    let filtrados = dadosHistoricoGlobal.filter(row => {
        let tipoAcao = getVal(row, ['tipoacao', 'tipo', 'acao', 'ação']).toLowerCase();
        let detalhes = getVal(row, ['detalhes', 'detalhe', 'descrição', 'descricao']).toLowerCase();
        
        let isEstoque = tipoAcao.includes('estoque') || tipoAcao.includes('conferência') || detalhes.includes('estoque') || detalhes.includes('conferência');
        let tipoRegistro = isEstoque ? 'estoque' : 'venda';
        
        if(tipoHistoricoAtual === 'estoque' && tipoRegistro !== 'estoque') return false;
        if(tipoHistoricoAtual === 'geral' && tipoRegistro === 'estoque') return false; 
        
        let pLogin = getVal(row, ['promotor', 'usuario', 'login']);
        let pObj = bancoUsuarios[pLogin];
        
        if (usuarioLogado.cargo === "promotor") {
            if (pLogin !== usuarioLogado.id) return false;
        } else if (usuarioLogado.cargo === "supervisor") {
            if (pLogin !== usuarioLogado.id && (!pObj || pObj.criadoPor !== usuarioLogado.id)) return false;
            if (promAlvo && promAlvo !== "todos" && pLogin !== promAlvo) return false;
        } else {
            if (supAlvo && supAlvo !== "todos") {
                if (pLogin !== supAlvo && (!pObj || pObj.criadoPor !== supAlvo)) return false;
            } else if (supAlvo === "todos") {
                if (pLogin !== usuarioLogado.id && pLogin !== "Sistema" && !podeGerenciar(usuarioLogado, pLogin)) return false;
            }
            if (promAlvo && promAlvo !== "todos" && pLogin !== promAlvo) return false;
        }
        
        let rowData = getVal(row, ['datahora', 'data', 'timestamp', 'carimbo']);
        if((dataInicio || dataFim) && rowData) { 
            let dtStr = rowData;
            if(dtStr.includes("/")) { 
                let partesEspaco = dtStr.split(" ");
                let parts = partesEspaco[0].split("/"); 
                let horaStr = partesEspaco.length > 1 ? partesEspaco[1] : "00:00:00";
                if(parts.length === 3) dtStr = `${parts[2]}-${parts[1]}-${parts[0]}T${horaStr}`; 
            }
            let dt = new Date(dtStr); 
            if (!isNaN(dt.getTime())) {
                if(dataInicio && dt < new Date(dataInicio + "T00:00:00")) return false; 
                if(dataFim && dt > new Date(dataFim + "T23:59:59")) return false; 
            }
        }
        
        row._tipoConsolidado = tipoRegistro;
        return true;
    });

    if(filtrados.length === 0) { 
        div.innerHTML = `<div class='mensagem-vazia'>Nenhum registro encontrado em <b>${tipoHistoricoAtual === 'estoque' ? 'Auditoria de Estoque' : 'Ações da Equipe'}</b>.</div>`; 
        return; 
    }
    
    let html = "";
    filtrados.forEach(row => {
        let rawData = getVal(row, ['datahora', 'data', 'timestamp', 'carimbo']);
        let dataFormatada = rawData || "Sem Data";
        
        if (rawData) {
            try {
                let dtStr = rawData;
                if(dtStr.includes("/")) { 
                    let partesEspaco = dtStr.split(" ");
                    let parts = partesEspaco[0].split("/"); 
                    let horaStr = partesEspaco.length > 1 ? partesEspaco[1] : "00:00:00";
                    if(parts.length === 3) dtStr = `${parts[2]}-${parts[1]}-${parts[0]}T${horaStr}`; 
                }
                let d = new Date(dtStr);
                if (!isNaN(d.getTime())) { dataFormatada = d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}); } 
            } catch(e) {}
        }

        let pLogin = getVal(row, ['promotor', 'usuario', 'login']);
        let nomePromotor = bancoUsuarios[pLogin] ? bancoUsuarios[pLogin].nome : (pLogin || "Sistema");
        
        let tipoAcao = getVal(row, ['tipoacao', 'tipo', 'acao', 'ação']);
        let detalhes = getVal(row, ['detalhes', 'detalhe', 'descrição', 'descricao']);

        let icone = row._tipoConsolidado === 'estoque' ? '<i data-lucide="package" style="color:#ff9800;" class="lucide-sm"></i>' : '<i data-lucide="shopping-bag" style="color:#28a745;" class="lucide-sm"></i>';

        let detalheFormatado = detalhes;
        if (row._tipoConsolidado === 'estoque' && detalhes.includes("|")) {
            let partes = detalhes.split('|');
            let lojaPart = partes[0] ? partes[0].trim() : "";
            let modeloPart = partes[1] ? partes[1].trim() : "";
            let qtdPart = partes[2] ? partes[2].trim() : "";
            
            detalheFormatado = `
                <div style="font-size: 13px; color: var(--cor-texto);">
                    <strong style="color: #0086ff;">[${lojaPart.replace("Loja:", "").trim()}]</strong><br>
                    ${modeloPart.replace("Modelo:", "Aparelho:").trim()}
                </div>
                <div style="font-size: 12px; color: var(--cor-secundaria); margin-top: 4px; padding-top: 4px; border-top: 1px dashed var(--border-color);">
                    ${qtdPart.replace("Qtd:", "Movimentação:").trim()}
                </div>
            `;
        } else if (row._tipoConsolidado === 'venda' && detalhes.includes("|")) {
            let partes = detalhes.split('|');
            let vendaPart = partes[0] ? partes[0].trim() : "";
            let vendPart = partes[1] ? partes[1].trim() : "";
            
            detalheFormatado = `
                <div style="font-size: 13px; color: var(--cor-texto);">
                    ${vendaPart}
                </div>
                <div style="font-size: 12px; color: var(--cor-secundaria); margin-top: 4px;">
                    <i data-lucide="user-check" class="lucide-sm"></i> ${vendPart.replace("Vend:", "Vendedor:").trim()}
                </div>
            `;
        }

        html += `<div style="background:var(--bg-container); border:1px solid var(--border-color); padding:14px; border-radius:10px; margin-bottom:12px; display:flex; flex-direction:column; gap:10px; box-shadow: 0 2px 6px var(--shadow-color);">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px dashed var(--border-color); padding-bottom: 8px;">
                <span style="font-size:12px; font-weight:bold; color:var(--cor-secundaria);">${dataFormatada}</span>
                <span style="font-size:13px; font-weight:bold; color:#0086ff; display:flex; align-items:center; gap:4px;"><i data-lucide="user-circle" class="lucide-sm" style="margin:0;"></i> ${nomePromotor}</span>
            </div>
            <div style="display:flex; align-items:flex-start; gap:12px;">
                <div style="background: var(--bg-item); padding: 10px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-color);">${icone}</div>
                <div style="flex: 1; text-align: left;">
                    <div style="font-weight: bold; color: var(--cor-texto); margin-bottom: 4px;">${tipoAcao || (row._tipoConsolidado === 'estoque' ? 'Auditoria' : 'Venda')}</div>
                    ${detalheFormatado}
                </div>
            </div>
        </div>`;
    });
    
    div.innerHTML = html; 
    loadIcons();
}

// ================= GRÁFICOS E COMISSÕES DINÂMICAS ================= //

let chartCoparticipacao = null; let chartCapa = null; let chartLojas = null; let chartModelos = null;

function atualizarFiltroPromotorDash() {
    let selSup = document.getElementById('filtro-supervisor-dash').value; let selProm = document.getElementById('filtro-promotor-dash'); let promotorAtual = selProm.value; 
    
    let htmlOp = '<option value="todos">Todos da Equipe</option>'; 
    let supAlvo = (usuarioLogado.cargo === "supervisor") ? usuarioLogado.id : selSup;
    
    if (supAlvo && supAlvo !== "todos" && supAlvo !== "orfaos") { 
        for(let k in bancoUsuarios) { 
            if (bancoUsuarios[k].cargo === "promotor" && bancoUsuarios[k].criadoPor === supAlvo) { 
                htmlOp += `<option value="${k}">${bancoUsuarios[k].nome || k}</option>`; 
            } 
        } 
    } else if (supAlvo === "orfaos") {
        for(let k in bancoUsuarios) { 
            let isOrfao = (!bancoUsuarios[k].criadoPor || !bancoUsuarios[bancoUsuarios[k].criadoPor]);
            if (bancoUsuarios[k].cargo === "promotor" && isOrfao) { 
                htmlOp += `<option value="${k}">${bancoUsuarios[k].nome || k}</option>`; 
            } 
        }
    } else if (supAlvo === "todos") {
        for(let k in bancoUsuarios) { 
            if (bancoUsuarios[k].cargo === "promotor" && podeGerenciar(usuarioLogado, k)) { 
                let nomeSup = bancoUsuarios[k].criadoPor ? (bancoUsuarios[bancoUsuarios[k].criadoPor]?.nome || bancoUsuarios[k].criadoPor) : "Órfão";
                htmlOp += `<option value="${k}">[${nomeSup}] ${bancoUsuarios[k].nome || k}</option>`; 
            } 
        }
    }
    selProm.innerHTML = htmlOp; 
    if (Array.from(selProm.options).some(opt => opt.value === promotorAtual)) { selProm.value = promotorAtual; }
}

function mudouSupervisorDash() { atualizarFiltroPromotorDash(); abrirDashboard(); }

function abrirDashboard() { 
    mudarTela('tela-dashboard'); 
    let selSup = document.getElementById('filtro-supervisor-dash');
    
    if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") {
        document.getElementById('container-filtro-supervisor-dash').style.display = "block"; document.getElementById('container-filtro-promotor-dash').style.display = "block";
        if(selSup.options.length <= 1) { 
            let htmlOp = '<option value="todos">Todas as Regiões (Geral)</option>'; 
            for(let k in bancoUsuarios) { 
                let isSupervisor = (bancoUsuarios[k].cargo === "supervisor" || bancoUsuarios[k].cargo === "gestor" || bancoUsuarios[k].cargo === "regional" || k === "master");
                if (isSupervisor) {
                    let temEquipe = Object.keys(bancoUsuarios).some(p => bancoUsuarios[p].cargo === "promotor" && bancoUsuarios[p].criadoPor === k);
                    if(temEquipe && podeGerenciar(usuarioLogado, k)) {
                        htmlOp += `<option value="${k}">Equipe: ${bancoUsuarios[k].nome || k}</option>`; 
                    }
                } 
            } 
            let temOrfaos = Object.keys(bancoUsuarios).some(k => bancoUsuarios[k].cargo === "promotor" && (!bancoUsuarios[k].criadoPor || !bancoUsuarios[bancoUsuarios[k].criadoPor]));
            if (temOrfaos && (usuarioLogado.id === "master" || usuarioLogado.cargo === "gestor")) htmlOp += `<option value="orfaos">Promotores Órfãos</option>`;
            selSup.innerHTML = htmlOp; 
        }
    } else if (usuarioLogado.cargo === "supervisor") { document.getElementById('container-filtro-supervisor-dash').style.display = "none"; document.getElementById('container-filtro-promotor-dash').style.display = "block"; } 
    else { document.getElementById('container-filtro-supervisor-dash').style.display = "none"; document.getElementById('container-filtro-promotor-dash').style.display = "none"; }

    if (document.getElementById('filtro-promotor-dash').options.length <= 1) { atualizarFiltroPromotorDash(); }
    
    document.getElementById("total-comissao-geral").innerText = "R$ ****";
    document.getElementById("icone-olho-comissao").innerHTML = '<i data-lucide="eye" style="margin:0;"></i>'; loadIcons();
    
    const selDash = document.getElementById("seletor-mes-dash"); let url = URL_DA_SUA_API + "?_t=" + new Date().getTime() + (selDash && selDash.value ? "&mes=" + encodeURIComponent(selDash.value) : "");
    document.getElementById("total-vendas-geral").innerText = "..."; 
    
    fetch(url)
    .then(r => { if(!r.ok) throw new Error("Erro na rede"); return r.json(); })
    .then(res => { 
        if (res.status === "sucesso") { 
            if (res.meses && selDash && selDash.options.length <= 1) {
                selDash.innerHTML = res.meses.map(m => `<option value="${m}" ${m === res.mesAtual ? "selected" : ""}>Mês: ${m}</option>`).join("");
            }
            gerarGraficos(res.dados); 
        } else { document.getElementById("total-vendas-geral").innerText = "Erro!"; }
    })
    .catch(e => { console.error("Erro no Dashboard:", e); document.getElementById("total-vendas-geral").innerText = "Erro de Rede"; });
}

function toggleComissao() {
    let elComissao = document.getElementById("total-comissao-geral"); let iconeOlho = document.getElementById("icone-olho-comissao");
    if (elComissao.innerText === "R$ ****") { elComissao.innerText = elComissao.dataset.valor || "R$ 0,00"; iconeOlho.innerHTML = '<i data-lucide="eye-off" style="margin:0;"></i>'; } else { elComissao.innerText = "R$ ****"; iconeOlho.innerHTML = '<i data-lucide="eye" style="margin:0;"></i>'; } loadIcons();
}

function isCampaignActiveInMonth(startStr, endStr, mesSelecionado) {
    if (!startStr && !endStr) return true; 
    let partes = mesSelecionado.split('/'); if(partes.length < 2) return true;
    let m = parseInt(partes[0], 10); let y = parseInt(partes[1], 10);
    
    let dtStart = startStr ? new Date(startStr + "T00:00:00") : new Date(2000, 0, 1);
    let dtEnd = endStr ? new Date(endStr + "T23:59:59") : new Date(2100, 0, 1);
    let startOfMonth = new Date(y, m - 1, 1);
    let endOfMonth = new Date(y, m, 0, 23, 59, 59);
    
    return dtStart <= endOfMonth && dtEnd >= startOfMonth;
}

function gerarGraficos(dadosVendas) {
    if (!dadosVendas) dadosVendas = [];
    let totalGeral = 0; let vendasPorLoja = {}; let vendasPorModelo = {}; let metricas = {}; let modelosFocoVendidos = {};
    let rankingPorLoja = {}; 
    
    let supervisorFoco = "todos"; let promotorFoco = "todos";
    if (usuarioLogado.cargo === "promotor") { supervisorFoco = bancoUsuarios[usuarioLogado.id].criadoPor || "todos"; promotorFoco = usuarioLogado.id; } 
    else {
        if (usuarioLogado.cargo === "supervisor") supervisorFoco = usuarioLogado.id; else if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") supervisorFoco = document.getElementById('filtro-supervisor-dash').value;
        if (document.getElementById('container-filtro-promotor-dash').style.display !== "none") { promotorFoco = document.getElementById('filtro-promotor-dash').value || "todos"; }
    }

    let agrupamento = (usuarioLogado.cargo === "promotor" || promotorFoco !== "todos") ? "promotor" : "supervisor";
    let visualizarVendedores = (promotorFoco !== "todos"); 

    if (agrupamento === "supervisor") { 
        for (let k in bancoUsuarios) { 
            let isSupervisor = (bancoUsuarios[k].cargo === "supervisor" || bancoUsuarios[k].cargo === "gestor" || bancoUsuarios[k].cargo === "regional" || k === "master");
            if (isSupervisor) { 
                if(podeGerenciar(usuarioLogado, k)) { 
                    let nomeSup = bancoUsuarios[k].nome || k; 
                    metricas[nomeSup] = { login: k, nome: nomeSup, metaPremium: 0, metaIndividual: 0, realizadoPremium: 0, realizadoGeral: 0, modelosPremiumVendidos: {}, modelosVendidosGeral: {}, comissaoAcumulada: 0 }; 
                } 
            } 
        } 
        metricas["Órfãos"] = { login: "orfaos", nome: "Órfãos", metaPremium: 0, metaIndividual: 0, realizadoPremium: 0, realizadoGeral: 0, modelosPremiumVendidos: {}, modelosVendidosGeral: {}, comissaoAcumulada: 0 };
        
        for (let k in bancoUsuarios) {
            if (bancoUsuarios[k].cargo === "promotor") {
                let supDoPromotor = bancoUsuarios[k].criadoPor;
                let isOrfao = (!supDoPromotor || !bancoUsuarios[supDoPromotor]);
                
                if (supervisorFoco !== "todos") {
                    if (supervisorFoco === "orfaos" && !isOrfao) continue;
                    if (supervisorFoco !== "orfaos" && supDoPromotor !== supervisorFoco) continue;
                }
                
                let supKey = supDoPromotor || "geral";
                if (isOrfao) supKey = "orfaos";
                let nomeSup = isOrfao ? "Órfãos" : (bancoUsuarios[supKey]?.nome || supKey);
                
                let taxaSup = taxasCoparticipacao[supKey] || taxasCoparticipacao["geral"] || 25;
                let metaIndPromotor = bancoUsuarios[k].meta || 0;
                
                if(metricas[nomeSup]) { 
                    metricas[nomeSup].metaPremium += (metaIndPromotor * (taxaSup / 100)); 
                    metricas[nomeSup].metaIndividual += metaIndPromotor; 
                }
            }
        }
    } else {
        for (let k in bancoUsuarios) {
            if (bancoUsuarios[k].cargo === "promotor") {
                let supDoPromotor = bancoUsuarios[k].criadoPor;
                let isOrfao = (!supDoPromotor || !bancoUsuarios[supDoPromotor]);

                if (supervisorFoco !== "todos") {
                    if (supervisorFoco === "orfaos" && !isOrfao) continue;
                    if (supervisorFoco !== "orfaos" && supDoPromotor !== supervisorFoco) continue;
                }
                if (promotorFoco !== "todos" && k !== promotorFoco) continue;
                if (usuarioLogado.cargo !== "promotor" && !podeGerenciar(usuarioLogado, k)) continue;

                let pNome = bancoUsuarios[k].nome || k;
                let supKey = isOrfao ? "geral" : supDoPromotor;
                let taxaSup = taxasCoparticipacao[supKey] || taxasCoparticipacao["geral"] || 25;
                metricas[pNome] = { 
                    login: k, 
                    nome: pNome, 
                    metaPremium: (bancoUsuarios[k].meta || 0) * (taxaSup / 100), 
                    metaIndividual: bancoUsuarios[k].meta || 0, 
                    realizadoPremium: 0, 
                    realizadoGeral: 0, 
                    modelosPremiumVendidos: {}, 
                    modelosVendidosGeral: {}, 
                    comissaoAcumulada: 0 
                };
            }
        }
    }

    dadosVendas.forEach(row => {
        let rowVendedor = getVal(row, ['vendedor', 'vend', 'promotor']);
        let match = rowVendedor.match(/^\[(.*?)\]\s*(.*)$/); 
        let loja = match ? match[1].trim() : "Outras"; 
        let vendNome = match ? match[2].trim() : rowVendedor;
        
        let rowAparelhos = getVal(row, ['aparelhos', 'aparelho', 'modelo', 'produto']);
        let lista = rowAparelhos.split("||").map(x => x.trim()).filter(x => x !== ""); 
        let qtd = lista.length; 
        if (qtd === 0) return;
        
        let pertenceAoEscopo = false; let promotoresImpactados = new Set(); let supervisoresImpactados = new Set();

        if (loja !== "Outras") {
            for (let k in bancoUsuarios) {
                let u = bancoUsuarios[k];
                if (u.cargo === "promotor" && u.lojasPermitidas && u.lojasPermitidas.some(l => l.trim().toLowerCase() === loja.toLowerCase())) {
                    let isOrfao = (!u.criadoPor || !bancoUsuarios[u.criadoPor]);
                    let passaFiltroSup = (supervisorFoco === "todos" || (supervisorFoco === "orfaos" && isOrfao) || u.criadoPor === supervisorFoco);
                    let passaFiltroProm = (promotorFoco === "todos" || k === promotorFoco);
                    if (passaFiltroSup && passaFiltroProm && (podeGerenciar(usuarioLogado, k) || k === usuarioLogado.id)) {
                        pertenceAoEscopo = true; promotoresImpactados.add(k); if(u.criadoPor) supervisoresImpactados.add(u.criadoPor); 
                    }
                }
            }
        } else {
            for (let k in bancoUsuarios) {
                let u = bancoUsuarios[k];
                if (u.cargo === "promotor" && vendNome.toLowerCase().includes((u.nome||k).toLowerCase())) {
                    let isOrfao = (!u.criadoPor || !bancoUsuarios[u.criadoPor]);
                    let passaFiltroSup = (supervisorFoco === "todos" || (supervisorFoco === "orfaos" && isOrfao) || u.criadoPor === supervisorFoco);
                    let passaFiltroProm = (promotorFoco === "todos" || k === promotorFoco);
                    if (passaFiltroSup && passaFiltroProm && (podeGerenciar(usuarioLogado, k) || k === usuarioLogado.id)) {
                        pertenceAoEscopo = true; promotoresImpactados.add(k); if(u.criadoPor) supervisoresImpactados.add(u.criadoPor); 
                    }
                }
            }
        }
        
        if (!pertenceAoEscopo && supervisorFoco === "todos" && promotorFoco === "todos" && (usuarioLogado.cargo === "master" || usuarioLogado.cargo === "gestor")) {
            pertenceAoEscopo = true;
        }

        if (!pertenceAoEscopo) return;
        
        totalGeral += qtd; 
        if (!vendasPorLoja[loja]) vendasPorLoja[loja] = 0; 
        vendasPorLoja[loja] += qtd;
        
        if (visualizarVendedores) {
            if (!rankingPorLoja[loja]) rankingPorLoja[loja] = {};
            let multVend = vendNome.split(" e ");
            multVend.forEach(vN => { let v = vN.trim(); if (!rankingPorLoja[loja][v]) rankingPorLoja[loja][v] = { qtdGeral: 0, qtdPremium: 0 }; rankingPorLoja[loja][v].qtdGeral += 1; });
        }

        lista.forEach(ap => { 
            let chaveKey = extrairChaveAparelho(ap); 
            let modeloFormatado = (mapaEmojis[chaveKey] ? mapaEmojis[chaveKey] + " " : "") + chaveKey.toUpperCase();
            
            if (!vendasPorModelo[modeloFormatado]) vendasPorModelo[modeloFormatado] = 0; 
            vendasPorModelo[modeloFormatado] += 1; 
            
            let checkPrem = ehPremium(ap, supervisorFoco !== "todos" ? supervisorFoco : "geral");
            if (visualizarVendedores && checkPrem) { vendNome.split(" e ").forEach(vN => { rankingPorLoja[loja][vN.trim()].qtdPremium += 1; }); }

            if (agrupamento === "supervisor") {
                let treatedSupervisors = new Set();
                promotoresImpactados.forEach(pk => {
                    let u = bancoUsuarios[pk];
                    let sKey = u.criadoPor;
                    if (!sKey || !bancoUsuarios[sKey]) sKey = "orfaos";
                    treatedSupervisors.add(sKey);
                });

                treatedSupervisors.forEach(supKey => {
                    let nomeSup = (supKey === "orfaos") ? "Órfãos" : (bancoUsuarios[supKey]?.nome || supKey);
                    if (metricas[nomeSup]) {
                        metricas[nomeSup].realizadoGeral += 1; 
                        metricas[nomeSup].modelosVendidosGeral[chaveKey] = (metricas[nomeSup].modelosVendidosGeral[chaveKey] || 0) + 1;
                        if (checkPrem) { 
                            metricas[nomeSup].realizadoPremium += 1; modelosFocoVendidos[modeloFormatado] = (modelosFocoVendidos[modeloFormatado] || 0) + 1; metricas[nomeSup].modelosPremiumVendidos[chaveKey] = (metricas[nomeSup].modelosPremiumVendidos[chaveKey] || 0) + 1; 
                        } 
                    }
                });
            } else {
                promotoresImpactados.forEach(pKey => {
                    let userP = bancoUsuarios[pKey]; let pNome = userP ? (userP.nome || pKey) : pKey;
                    if (metricas[pNome]) {
                        metricas[pNome].realizadoGeral += 1;
                        metricas[pNome].modelosVendidosGeral[chaveKey] = (metricas[pNome].modelosVendidosGeral[chaveKey] || 0) + 1;
                        if (checkPrem) { 
                            metricas[pNome].realizadoPremium += 1; modelosFocoVendidos[modeloFormatado] = (modelosFocoVendidos[modeloFormatado] || 0) + 1; metricas[pNome].modelosPremiumVendidos[chaveKey] = (metricas[pNome].modelosPremiumVendidos[chaveKey] || 0) + 1; 
                        } 
                    }
                });
            }
        });
    });

    if (metricas["Órfãos"] && metricas["Órfãos"].realizadoGeral === 0 && metricas["Órfãos"].metaIndividual === 0) {
        delete metricas["Órfãos"];
    }

    let mesFiltro = document.getElementById("seletor-mes-dash").value;

    Object.values(metricas).forEach(m => {
        let comissaoUser = 0; let supKey = m.login; 
        if (m.login === "orfaos") supKey = "geral";
        else if (bancoUsuarios[m.login] && bancoUsuarios[m.login].cargo === "promotor") { supKey = bancoUsuarios[m.login].criadoPor || "geral"; }
        
        let vComissaoSup = valoresComissao[supKey] || valoresComissao["geral"] || {}; 
        let niveisGlobais = vComissaoSup.niveis || [{ id: 'l1', meta: 0 }, { id: 'l2', meta: 10 }];
        let aparelhosCfg = vComissaoSup.aparelhos || {};
        let campanhasAtivas = vComissaoSup.campanhasPersonalizadas || [];

        for(let modChave in m.modelosPremiumVendidos) {
            let qtdMod = m.modelosPremiumVendidos[modChave];
            let cfg = aparelhosCfg[modChave] || {}; 
            
            let nivelAlcancado = 'l1'; 
            let maiorMeta = -1;
            
            niveisGlobais.forEach(nv => { 
                let metaParaNivel = (cfg[nv.id + '_meta'] !== undefined && cfg[nv.id + '_meta'] !== "") ? Number(cfg[nv.id + '_meta']) : Number(nv.meta);
                if (m.realizadoGeral >= metaParaNivel && metaParaNivel >= maiorMeta) { 
                    nivelAlcancado = nv.id; 
                    maiorMeta = metaParaNivel; 
                } 
            });

            let payout = Number(cfg[nivelAlcancado]) || Number(cfg['l1']) || 0;
            comissaoUser += (qtdMod * payout);
        }

        campanhasAtivas.forEach(camp => {
            if (isCampaignActiveInMonth(camp.dataInicio, camp.dataFim, mesFiltro)) {
                if (camp.promotorAlvo && camp.promotorAlvo !== 'todos' && camp.promotorAlvo !== m.login) { return; }
                let qtdParaBater = 0;
                if (camp.aparelho === 'todos') { qtdParaBater = m.realizadoPremium; } else { qtdParaBater = m.modelosVendidosGeral[camp.aparelho] || 0; }
                if (qtdParaBater >= Number(camp.qtdMinima)) { comissaoUser += (qtdParaBater * Number(camp.bonus)); }
            }
        });

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

    let supAlvoParaFoco = (supervisorFoco !== "todos") ? supervisorFoco : "geral";
    let pSup = aparelhosPremium[supAlvoParaFoco]; if (!pSup || Object.keys(pSup).length === 0) pSup = aparelhosPremium["geral"] || {};
    let listaFocoAtuais = Object.keys(pSup).filter(k => pSup[k]).map(k => `<span style="display:inline-block; background:var(--bg-item); color:var(--cor-texto); padding:4px 8px; border-radius:6px; margin:2px; border: 1px solid var(--border-color); font-weight:bold;">${mapaEmojis[k] || ''} ${k.toUpperCase()}</span>`);
    document.getElementById("lista-foco-ativo-dash").innerHTML = listaFocoAtuais.length > 0 ? listaFocoAtuais.join("") : "<span style='color:var(--cor-secundaria); font-style:italic;'>Nenhum aparelho configurado como Foco.</span>";

    let totalFocoVendidoGeral = Object.values(modelosFocoVendidos).reduce((a, b) => a + b, 0); let metaFocoSomaGeral = Object.values(metricas).reduce((acc, m) => acc + m.metaPremium, 0);
    let pctMetaFocoGeral = metaFocoSomaGeral > 0 ? ((totalFocoVendidoGeral / metaFocoSomaGeral) * 100).toFixed(1) : 0; let pctCopartGeral = totalGeral > 0 ? ((totalFocoVendidoGeral / totalGeral) * 100).toFixed(1) : 0;

    let listaFocoHtml = ""; for(let mod in modelosFocoVendidos) { listaFocoHtml += `<span style="display:inline-block; background:var(--bg-item); color:#0086ff; padding:4px 8px; border-radius:6px; margin:2px; font-weight:bold; border: 1px solid var(--border-color);">${mod}: ${modelosFocoVendidos[mod]} un</span> `; }
    let htmlDetalhesCopart = `<div style="display: flex; flex-direction: column; gap: 8px;"><div style="display: flex; justify-content: space-between; font-size: 13px;"><span><i data-lucide="star" class="lucide-sm"></i> Foco Vendidos: <strong>${totalFocoVendidoGeral} un</strong></span><span style="color: #28a745; font-weight: bold;">Meta: ${pctMetaFocoGeral}%</span></div><div style="display: flex; justify-content: space-between; font-size: 13px;"><span><i data-lucide="pie-chart" class="lucide-sm"></i> Coparticipação Geral: <strong>${pctCopartGeral}%</strong></span></div><div style="margin-top: 5px;"><strong style="font-size: 11px; color: var(--cor-secundaria); display: block; margin-bottom: 3px;">Foco Vendidos no Período:</strong><div>${listaFocoHtml || "<span style='color:var(--cor-secundaria); font-style:italic;'>Nenhum foco vendido.</span>"}</div></div></div>`;
    document.getElementById("detalhe-coparticipacao-cards").innerHTML = htmlDetalhesCopart; loadIcons();

    let htmlRank = ""; 
    
    if (visualizarVendedores) {
        document.getElementById("titulo-ranking-dash").innerHTML = '<i data-lucide="award"></i> Ranking de Vendedores por Loja';
        let lojasDoRanking = Object.keys(rankingPorLoja).sort((a,b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));
        if (lojasDoRanking.length === 0) { htmlRank = "<span style='font-size:13px; color:var(--cor-secundaria);'>Nenhuma venda registrada para este promotor.</span>"; } else {
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
        document.getElementById("titulo-ranking-dash").innerHTML = (agrupamento === "supervisor") ? '<i data-lucide="award"></i> Ranking de Equipes (vs Meta)' : '<i data-lucide="award"></i> Ranking de Promotores (vs Meta Individual)';
        let promOrd = Object.keys(metricas).sort((a,b) => metricas[b].realizadoGeral - metricas[a].realizadoGeral);
        let rNum = 1; let uQtd = -1;
        promOrd.forEach(p => {
            let m = metricas[p]; if(uQtd !== -1 && m.realizadoGeral < uQtd) rNum++; uQtd = m.realizadoGeral;
            let bC = rNum === 1 ? 'rank-1' : rNum === 2 ? 'rank-2' : rNum === 3 ? 'rank-3' : 'rank-outros';
            let metaAlvo = m.metaIndividual; let pctHit = metaAlvo > 0 ? ((m.realizadoGeral / metaAlvo) * 100).toFixed(1) : 0; let corHit = pctHit >= 100 ? '#28a745' : '#dc3545';
            let labelMetaRanking = agrupamento === "supervisor" ? "Meta Acumulada" : "Meta Individual";
            let pctFocoVendedor = m.realizadoGeral > 0 ? ((m.realizadoPremium / m.realizadoGeral) * 100).toFixed(1) : 0;
            htmlRank += `<div style="display:flex;flex-direction:column;padding:12px 0;border-bottom:1px dashed var(--border-color);"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><div style="display:flex;align-items:center;gap:10px;"><span class="badge-rank ${bC}">${rNum}º</span><strong style="font-size: 15px; color: var(--cor-texto);"><i data-lucide="${agrupamento === 'supervisor' ? 'users' : 'user'}" class="lucide-sm"></i> ${p}</strong></div><span style="background:var(--bg-item);color:#0086ff;font-weight:bold;padding:4px 10px;border-radius:6px;font-size:14px; border: 1px solid var(--border-color);">${m.realizadoGeral} un</span></div><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--cor-secundaria);background:var(--bg-item);padding:4px 8px;border-radius:4px;"><span>🎯 ${labelMetaRanking}: <strong style="color: var(--cor-texto);">${metaAlvo} un</strong></span><span style="color: ${corHit}; font-weight: bold;">${pctHit}% Concluído</span></div><div style="font-size:11px; color:var(--cor-secundaria); text-align:left; padding-left:4px; margin-top:2px;">Coparticipação Foco: <strong>${m.realizadoPremium} un</strong> (<span style="color:#28a745;">${pctFocoVendedor}%</span>)</div></div>`;
        });
    }
    document.getElementById("lista-ranking-promotores").innerHTML = htmlRank || "<span style='font-size:13px; color:var(--cor-secundaria);'>Nenhuma venda na região selecionada.</span>"; loadIcons();

    if (chartCoparticipacao) chartCoparticipacao.destroy(); if (chartCapa) chartCapa.destroy(); if (chartLojas) chartLojas.destroy(); if (chartModelos) chartModelos.destroy();
    
    let corTextoGrafico = document.body.classList.contains('dark-mode') ? '#e0e0e0' : '#666'; Chart.defaults.color = corTextoGrafico;
    const pluginDatalabels = ChartDataLabels; let labelsProm = Object.keys(metricas);
    let maxMeta = Math.max(...labelsProm.map(p => metricas[p].metaPremium)) || 10;

    let widthProm = Math.max(100, labelsProm.length * 18); 
    document.getElementById('wrap-graficoMetaPremiumCapa').style.minWidth = widthProm + '%';
    document.getElementById('wrap-graficoCoparticipacaoPromotores').style.minWidth = widthProm + '%';

    const ctxCapa = document.getElementById('graficoMetaPremiumCapa').getContext('2d');
    chartCapa = new Chart(ctxCapa, {
        type: 'bar', plugins: [pluginDatalabels],
        data: { labels: labelsProm, datasets: [{ label: 'Meta Foco (un)', data: labelsProm.map(p => Math.round(metricas[p].metaPremium * 10) / 10), backgroundColor: '#c0c0c0' }, { label: 'Realizado Foco', data: labelsProm.map(p => metricas[p].realizadoPremium), backgroundColor: '#ffc107' }]},
        options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 45 } }, plugins: { legend: { position: 'bottom' }, datalabels: { anchor: 'end', align: 'top', offset: 4, formatter: (val, ctx) => { if (ctx.datasetIndex === 0) return val + ' un'; let p = ctx.chart.data.labels[ctx.dataIndex]; let m = metricas[p]; let pct = m.metaPremium > 0 ? ((val / m.metaPremium) * 100).toFixed(1) : 0; return [`${val} un`, `(${pct}%)`]; }, font: { weight: 'bold', size: 10 }, color: corTextoGrafico, textAlign: 'center' } }, scales: { y: { beginAtZero: true, suggestedMax: maxMeta * 1.3 } } }
    });

    const ctxCopart = document.getElementById('graficoCoparticipacaoPromotores').getContext('2d');
    chartCoparticipacao = new Chart(ctxCopart, {
        type: 'bar', plugins: [pluginDatalabels],
        data: { labels: labelsProm, datasets: [{ label: '% Coparticipação', data: labelsProm.map(p => metricas[p].realizadoGeral > 0 ? ((metricas[p].realizadoPremium / metricas[p].realizadoGeral) * 100).toFixed(1) : 0), backgroundColor: '#0086ff' }] },
        options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 45 } }, plugins: { legend: { display: false }, tooltip: { padding: 12, callbacks: { label: function(context) { let p = context.chart.data.labels[context.dataIndex]; let m = metricas[p]; let linhas = [`Coparticipação: ${context.raw}% (${m.realizadoPremium} de ${m.realizadoGeral} un)`]; if (m.realizadoPremium > 0) { linhas.push('-------------------------'); linhas.push('Aparelhos Foco Vendidos:'); for (let mod in m.modelosPremiumVendidos) { linhas.push(`• ${m.modelosPremiumVendidos[mod]}x ${mod}`); } } else { linhas.push('-------------------------'); linhas.push('Nenhum aparelho foco vendido.'); } return linhas; } } }, datalabels: { anchor: 'end', align: 'top', offset: 4, formatter: (val, ctx) => { let p = ctx.chart.data.labels[ctx.dataIndex]; let m = metricas[p]; return [`${val}%`, `(${m.realizadoPremium} de ${m.realizadoGeral} un)`]; }, font: { weight: 'bold', size: 10 }, color: corTextoGrafico, textAlign: 'center' } }, scales: { y: { beginAtZero: true, suggestedMax: 100 } } }
    });

    let lojasSort = Object.keys(vendasPorLoja).sort((a,b) => a.localeCompare(b, undefined, {numeric:true, sensitivity:'base'}));
    let widthLojas = Math.max(100, lojasSort.length * 18); document.getElementById('wrap-graficoVendasLoja').style.minWidth = widthLojas + '%';

    const ctxLojas = document.getElementById('graficoVendasLoja').getContext('2d');
    chartLojas = new Chart(ctxLojas, { type: 'bar', plugins: [pluginDatalabels], data: { labels: lojasSort, datasets: [{ data: lojasSort.map(l => vendasPorLoja[l]), backgroundColor: '#28a745', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 20 } }, scales: { x: { ticks: { display: false }, grid: { display: false } }, y: { beginAtZero: true } }, plugins: { legend: { display: false }, tooltip: { padding: 12, callbacks: { title: function(context) { return '🏪 ' + context[0].label; }, afterTitle: function(context) { return '👤 Promotor: ' + getPromotorDaLoja(context[0].label); }, label: function(context) { return 'Total Vendido: ' + context.raw + ' un'; } } }, datalabels: { anchor: 'end', align: 'top', color: corTextoGrafico, font: { weight: 'bold' }, formatter: (val) => val + ' un' } } } });

    let topModelos = Object.entries(vendasPorModelo).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const ctxModelos = document.getElementById('graficoTopModelos').getContext('2d');
    chartModelos = new Chart(ctxModelos, { type: 'doughnut', plugins: [pluginDatalabels], data: { labels: topModelos.map(m => `${m[0]}`), datasets: [{ data: topModelos.map(m => m[1]), backgroundColor: ['#0086ff', '#28a745', '#ffc107', '#dc3545', '#6f42c1'] }] }, options: { maintainAspectRatio: false, responsive: true, plugins: { legend: { position: 'bottom', labels: { color: corTextoGrafico } }, datalabels: { color: '#fff', font: { weight: 'bold', size: 12 }, formatter: (value) => value > 0 ? value + ' un' : '' } } } });
}

function abrirAdmin() { 
    mudarTela('tela-admin'); 
    if (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master") {
        if(usuarioLogado.cargo === "gestor" || usuarioLogado.id === "master") { document.getElementById('bloco-criar-gestor').style.display = "block"; } else { document.getElementById('bloco-criar-gestor').style.display = "none"; }
        document.getElementById('bloco-admin-foco').style.display = "block"; 
        let selSupFoco = document.getElementById('seletor-foco-sup'); 
        selSupFoco.innerHTML = '<option value="geral">Geral (Padrão da Empresa)</option>'; 
        for(let k in bancoUsuarios) { if (bancoUsuarios[k].cargo === "supervisor") { if(podeGerenciar(usuarioLogado, k)) { selSupFoco.innerHTML += `<option value="${k}">Equipe: ${bancoUsuarios[k].nome || k}</option>`; } } } 
    } else if (usuarioLogado.cargo === "supervisor") {
        document.getElementById('bloco-criar-gestor').style.display = "none";
        document.getElementById('bloco-admin-foco').style.display = "block"; 
        let selSupFoco = document.getElementById('seletor-foco-sup'); 
        selSupFoco.innerHTML = `<option value="${usuarioLogado.id}">Minha Equipe (${usuarioLogado.nome})</option>`; selSupFoco.value = usuarioLogado.id; 
    } else { 
        document.getElementById('bloco-admin-foco').style.display = "none"; document.getElementById('bloco-criar-gestor').style.display = "none";
    }
    
    if (usuarioLogado.cargo === "regional") { document.getElementById('container-admin-regiao').style.display = 'none'; }
    
    renderizarAdminUsuarios(); renderizarInputsFoco(); renderizarAdminAparelhos(); 
}

function obterRegioesUnicas() {
    let regioes = Object.values(bancoUsuarios).map(u => u.regiao).filter(r => r && r.trim() !== "");
    return [...new Set(regioes)].sort();
}

function renderizarAdminUsuarios() {
    const div = document.getElementById('lista-admin-supervisores'); let htmlContent = "";
    
    if (usuarioLogado.id === "master" || usuarioLogado.cargo === "gestor") {
        htmlContent += `
        <div class="linha-admin" style="flex-direction: column; align-items: stretch; padding: 12px; background: var(--bg-container); margin-bottom: 12px; box-shadow: 0 1px 3px var(--shadow-color); border: 2px solid #0086ff;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-color); padding-bottom: 8px; margin-bottom: 8px;">
                <div style="text-align: left;">
                    <strong style="font-size: 15px; color: var(--cor-texto); display: block;">Sua Equipe Direta <span style="font-size: 10px; color: var(--cor-secundaria); font-weight: normal;">(@${usuarioLogado.id})</span></strong>
                    <span style="font-size: 12px; font-weight: bold; color: #0086ff;">Promotores vinculados a você</span>
                </div>
            </div>
            <button class="btn-editar" style="background-color: #0086ff; padding: 6px 12px; border-radius: 6px; width: 100%; margin-top: 8px;" onclick="abrirPainelEquipe('${usuarioLogado.id}')"><i data-lucide="users" class="lucide-sm"></i> Gerenciar Sua Equipe</button>
        </div>`;

        let qtdOrfaos = Object.keys(bancoUsuarios).filter(k => bancoUsuarios[k].cargo === 'promotor' && (!bancoUsuarios[k].criadoPor || !bancoUsuarios[bancoUsuarios[k].criadoPor])).length;
        if (qtdOrfaos > 0) {
            htmlContent += `
            <div class="linha-admin" style="flex-direction: column; align-items: stretch; padding: 12px; background: #fff3cd; margin-bottom: 12px; box-shadow: 0 1px 3px var(--shadow-color); border: 2px solid #ffc107;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #ffeeba; padding-bottom: 8px; margin-bottom: 8px;">
                    <div style="text-align: left;">
                        <strong style="font-size: 15px; color: #856404; display: block;">⚠️ Promotores Órfãos <span style="font-size: 10px; color: #856404; font-weight: normal;">(${qtdOrfaos} encontrados)</span></strong>
                        <span style="font-size: 12px; font-weight: bold; color: #856404;">Perderam o vínculo com o supervisor</span>
                    </div>
                </div>
                <button class="btn-editar" style="background-color: #ff9800; padding: 6px 12px; border-radius: 6px; width: 100%; margin-top: 8px; border:none;" onclick="abrirPainelEquipe('orfaos')"><i data-lucide="alert-triangle" class="lucide-sm"></i> Gerenciar Órfãos</button>
            </div>`;
        }
    }

    for(let l in bancoUsuarios) { 
        let u = bancoUsuarios[l]; if (u.cargo === "promotor" || l === "master") continue; 
        if (!podeGerenciar(usuarioLogado, l) && l !== usuarioLogado.id) continue;
        
        let labelCargo = l === "master" ? "👑 Master" : (u.cargo === "gestor" ? "👔 Gestor" : (u.cargo === "regional" ? "🌎 Gestor Regional" : "📍 Supervisor"));
        let subLabel = u.regiao ? ` - Região: ${u.regiao}` : "";
        let btnGerenciar = (u.cargo === "supervisor" || u.cargo === "gestor" || u.cargo === "regional") ? `<button class="btn-editar" style="background-color: #17a2b8; padding: 6px 12px; border-radius: 6px; width: 100%; margin-top: 8px;" onclick="abrirPainelEquipe('${l}')"><i data-lucide="settings" class="lucide-sm"></i> Gerenciar Equipe e Lojas</button>` : ''; 
        
        let btnNome = `<button class="btn-editar" style="background-color: #28a745;" onclick="adminAbrirModalNome('${l}')"><i data-lucide="edit-3"></i> Nome</button>`;
        let btnCargo = (usuarioLogado.id === "master" || usuarioLogado.cargo === "gestor") ? `<button class="btn-editar" style="background-color: #0086ff;" onclick="adminAbrirModalCargo('${l}')"><i data-lucide="briefcase"></i> Cargo</button>` : "";
        let btnRegiao = (u.cargo === "supervisor" || u.cargo === "regional") ? `<button class="btn-editar" style="background-color: #6f42c1;" onclick="adminAbrirModalRegiao('${l}')"><i data-lucide="globe"></i> Região</button>` : "";
        let btnSenha = `<button class="btn-editar" style="background-color: #ffc107; color: #856404;" onclick="adminAbrirModalSenha('${l}')"><i data-lucide="key"></i> Senha</button>`; 
        let btnExcluir = (usuarioLogado.id === "master" && l !== "master") ? `<button class="btn-excluir" onclick="adminRemoverUsuario('${l}')"><i data-lucide="x"></i></button>` : ""; 
        
        htmlContent += `
        <div class="linha-admin" style="flex-direction: column; align-items: stretch; padding: 12px; background: var(--bg-container); margin-bottom: 12px; box-shadow: 0 1px 3px var(--shadow-color); border: 2px solid ${u.cargo === 'supervisor' ? '#b3d7ff' : 'var(--border-color)'};">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-color); padding-bottom: 8px; margin-bottom: 8px;">
                <div style="text-align: left;">
                    <strong style="font-size: 15px; color: var(--cor-texto); display: block;">${u.nome || l} <span style="font-size: 10px; color: var(--cor-secundaria); font-weight: normal;">(@${l})</span></strong>
                    <span style="font-size: 12px; font-weight: bold; color: ${u.cargo === 'supervisor' ? '#0086ff' : '#6c757d'};">${labelCargo}${subLabel}</span>
                </div>
                <div style="display: flex; gap: 5px; flex-wrap: wrap; justify-content: flex-end;">${btnNome} ${btnCargo} ${btnRegiao} ${btnSenha} ${btnExcluir}</div>
            </div>
            ${btnGerenciar}
        </div>`; 
    }
    div.innerHTML = htmlContent || "<p style='color:var(--cor-secundaria); font-size:13px;'>Nenhuma região/supervisor encontrado.</p>"; loadIcons();
}

function verificarAdminCargo(val) {
    let cont = document.getElementById('container-admin-regiao');
    if (usuarioLogado.cargo === "regional") { cont.style.display = 'none'; return; }
    if (val === 'regional' || val === 'supervisor') { cont.style.display = 'flex'; } else { cont.style.display = 'none'; }
}

function adminAddGestorSup() {
    let l = document.getElementById('admin-gs-login').value.trim().toLowerCase(); 
    let n = document.getElementById('admin-gs-nome').value.trim(); 
    let s = document.getElementById('admin-gs-senha').value.trim(); 
    let c = document.getElementById('admin-gs-cargo').value; 
    let r = document.getElementById('admin-gs-regiao').value.trim().toUpperCase(); 
    
    if (usuarioLogado.cargo === "regional" && c === "supervisor") { r = usuarioLogado.regiao; }
    
    if(!l || !n || !s) return mostrarToast("Preencha Login, Nome e Senha.", "alerta"); 
    if(l === "master") return mostrarToast("Não é permitido modificar o usuário Master.", "erro"); 
    if(bancoUsuarios[l]) return mostrarToast("Este login já existe.", "erro");
    
    bancoUsuarios[l] = { nome: n, senha: s, cargo: c, regiao: r, meta: 0, lojasPermitidas: [], criadoPor: usuarioLogado.id };
    document.getElementById('admin-gs-login').value = ""; document.getElementById('admin-gs-nome').value = ""; document.getElementById('admin-gs-senha').value = ""; document.getElementById('admin-gs-regiao').value = "";
    renderizarAdminUsuarios(); salvarConfiguracoesGlobais(false); mostrarToast(`Usuário ${l} criado! Salvo na nuvem.`, "sucesso");
}

function abrirPainelEquipe(login) {
    supervisorGerenciadoAtual = login;
    let nome = "";
    if (login === "orfaos") nome = "Promotores Desvinculados";
    else if (login === "master") nome = "Diretor Master";
    else nome = bancoUsuarios[login].nome || login;
    
    document.getElementById('titulo-modal-equipe').innerHTML = `<i data-lucide="users"></i> Equipe: ${nome}`;
    renderizarModalEquipe();
    document.getElementById('modal-gerenciar-equipe').classList.add('ativo'); loadIcons();
}

function fecharModalEquipe() {
    document.getElementById('modal-gerenciar-equipe').classList.remove('ativo'); supervisorGerenciadoAtual = null;
}

function renderizarModalEquipe() {
    if(!supervisorGerenciadoAtual) return;
    let divPromotores = document.getElementById('lista-modal-promotores');
    let divLojas = document.getElementById('lista-modal-lojas');
    let selLoja = document.getElementById('modal-select-loja');
    let lojasDaRegiao = getLojasDaRegiao(supervisorGerenciadoAtual);

    let htmlPromotores = "";
    for(let k in bancoUsuarios) {
        let u = bancoUsuarios[k];
        if (u.cargo === "promotor") {
            let pertenceEquipe = false;
            if (supervisorGerenciadoAtual === "orfaos") {
                pertenceEquipe = (!u.criadoPor || !bancoUsuarios[u.criadoPor]);
            } else {
                pertenceEquipe = (u.criadoPor === supervisorGerenciadoAtual);
            }

            if(pertenceEquipe) {
                htmlPromotores += `<div style="background: var(--bg-container); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; margin-bottom: 8px; text-align: left;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                        <strong style="font-size:14px; color:var(--cor-texto);"><i data-lucide="user" class="lucide-sm"></i> ${u.nome || k} (@${k})</strong>
                        <div style="display:flex; gap:5px;">
                            ${(usuarioLogado.id === "master" || usuarioLogado.cargo === "gestor") ? `<button class="btn-editar" style="background:#0086ff;" title="Transferir Equipe" onclick="adminAbrirModalTransferir('${k}')"><i data-lucide="arrow-right-left" class="lucide-sm"></i></button>` : ''}
                            <button class="btn-editar" style="background:#ffc107; color:#856404;" title="Alterar Senha" onclick="adminAbrirModalSenha('${k}')"><i data-lucide="key" class="lucide-sm"></i></button>
                            <button class="btn-editar" title="Editar Nome" onclick="adminAbrirModalNome('${k}')"><i data-lucide="edit-3" class="lucide-sm"></i></button>
                            <button class="btn-editar" style="background:#6f42c1;" title="Permissões" onclick="adminAbrirModalPermissoes('${k}')"><i data-lucide="shield" class="lucide-sm"></i></button>
                            <button class="btn-excluir" title="Excluir" onclick="adminRemoverUsuarioModalEquipe('${k}')"><i data-lucide="trash-2" class="lucide-sm"></i></button>
                        </div>
                    </div>
                    <div style="font-size:12px; color:var(--cor-secundaria); display:flex; justify-content:space-between; align-items:center;">
                        <span>Meta Padrão: <strong>${u.meta || 0}</strong> <button class="btn-editar-meta" onclick="adminAbrirModalMeta('${k}')"><i data-lucide="target" class="lucide-sm"></i></button></span>
                        <span>Lojas: <strong>${u.lojasPermitidas.length}</strong> <button class="btn-editar" onclick="adminAbrirModalLojas('${k}')"><i data-lucide="store" class="lucide-sm"></i></button></span>
                    </div>
                </div>`;
            }
        }
    }
    divPromotores.innerHTML = htmlPromotores || "<p style='font-size:13px; color:var(--cor-secundaria);'>Nenhum promotor nesta lista.</p>";

    let htmlLojas = ""; let htmlSelLoja = "";
    
    if (supervisorGerenciadoAtual !== "orfaos") {
        lojasDaRegiao.forEach(loja => {
            let objL = lojasConfig[loja] || { vendedores: [], capa: 0 };
            htmlSelLoja += `<option value="${loja}">${loja}</option>`;
            
            let vends = (objL.vendedores || []).map(v => `<div style="background:var(--bg-fundo); color:var(--cor-texto); padding:6px 10px; border-radius:8px; font-size:12px; border:1px solid var(--border-color); display:flex; align-items:center; gap:6px; font-weight: 500;">${v} <div onclick="adminRemoverVendedor('${loja}', '${v}')" style="cursor:pointer; color:#dc3545; display:flex; align-items:center; justify-content:center; padding: 2px; border-radius: 4px; transition: background 0.2s;" onmouseover="this.style.backgroundColor='#ffeeba'" onmouseout="this.style.backgroundColor='transparent'"><i data-lucide="x" class="lucide-sm" style="margin:0;"></i></div></div>`).join("");

            htmlLojas += `<div style="background: var(--bg-container); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; margin-bottom: 20px; box-shadow: 0 4px 6px var(--shadow-color);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; border-bottom: 2px solid var(--bg-item); padding-bottom: 8px;">
                    <strong style="font-size:16px; color:var(--cor-texto);"><i data-lucide="store" class="lucide-sm" style="color:#0086ff;"></i> ${loja}</strong>
                    <div style="font-size: 12px; background: var(--bg-item); padding: 4px 10px; border-radius: 12px; font-weight: bold; color: var(--cor-secundaria); border: 1px solid var(--border-color);">Capa: ${objL.capa || 0}</div>
                </div>
                
                <div style="font-size: 11px; font-weight: bold; color: var(--cor-secundaria); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Equipe de Vendas:</div>
                <div style="display:flex; flex-wrap: wrap; gap: 6px; margin-bottom: 15px;">
                    ${vends || '<span style="font-size:12px; color:var(--cor-secundaria); font-style:italic;">Sem vendedores</span>'}
                </div>

                <div style="display:flex; justify-content: flex-end; gap: 10px; border-top: 1px dashed var(--border-color); padding-top: 12px;">
                    <button class="btn-editar" style="background:#17a2b8; padding: 8px 12px; font-size:12px; border-radius: 6px;" onclick="adminAbrirModalCapa('${loja}')"><i data-lucide="layers" class="lucide-sm"></i> Capa</button>
                    <button class="btn-excluir" style="padding: 8px 12px; font-size:12px; border-radius: 6px;" onclick="adminRemoverLoja('${loja}')"><i data-lucide="trash-2" class="lucide-sm"></i> Excluir Loja</button>
                </div>
            </div>`;
        });
        divLojas.innerHTML = htmlLojas || "<p style='font-size:13px; color:var(--cor-secundaria);'>Nenhuma loja na região.</p>";
        selLoja.innerHTML = htmlSelLoja;

        let divCheckboxLojas = document.getElementById('modal-promotor-lojas');
        let htmlCheckLojas = lojasDaRegiao.map(l => `<label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" class="check-nova-loja" value="${l}"> ${l}</label>`).join("");
        divCheckboxLojas.innerHTML = htmlCheckLojas || "<i style='font-size:11px;'>Crie lojas primeiro.</i>";
    } else {
        divLojas.innerHTML = "<p style='font-size:13px; color:var(--cor-secundaria); font-style:italic;'>Para atribuir lojas a promotores órfãos, clique no botão de edição de lojas deles e escolha na lista geral.</p>";
    }
    
    loadIcons();
}

function adminRemoverUsuarioModalEquipe(login) { if(confirm("Excluir promotor?")) { delete bancoUsuarios[login]; renderizarAdminUsuarios(); renderizarModalEquipe(); salvarConfiguracoesGlobais(false); mostrarToast("Promotor excluído. Salve na nuvem.", "info"); } }
function adminRemoverLoja(loja) { if(confirm("Excluir loja?")) { delete lojasConfig[loja]; for(let k in bancoUsuarios) { if(bancoUsuarios[k].lojasPermitidas) bancoUsuarios[k].lojasPermitidas = bancoUsuarios[k].lojasPermitidas.filter(l => l !== loja); } renderizarModalEquipe(); salvarConfiguracoesGlobais(false); mostrarToast("Loja excluída. Salve na nuvem.", "info"); } }
function adminRemoverVendedor(loja, vend) { lojasConfig[loja].vendedores = lojasConfig[loja].vendedores.filter(v => v !== vend); renderizarModalEquipe(); salvarConfiguracoesGlobais(false); }

function adminAddPromotorEquipe() {
    let l = document.getElementById('modal-promotor-login').value.trim().toLowerCase();
    let n = document.getElementById('modal-promotor-nome').value.trim();
    let s = document.getElementById('modal-promotor-senha').value.trim();
    let m = parseInt(document.getElementById('modal-promotor-meta').value) || 0;
    
    if(!l || !n || !s) return mostrarToast("Preencha Login, Nome e Senha.", "alerta");
    if(bancoUsuarios[l]) return mostrarToast("Usuário já existe.", "erro");
    
    let lojasSelecionadas = Array.from(document.querySelectorAll('.check-nova-loja:checked')).map(cb => cb.value);
    
    let perm = {
        vendas: document.getElementById('perm-vendas').checked,
        acomp: document.getElementById('perm-acomp').checked,
        estoque_ver: document.getElementById('perm-est-ver').checked,
        estoque_editar: document.getElementById('perm-est-edit').checked
    };

    let supDaVez = (supervisorGerenciadoAtual === "orfaos") ? "master" : supervisorGerenciadoAtual;
    let regiaoMae = bancoUsuarios[supDaVez] ? bancoUsuarios[supDaVez].regiao : "MATRIZ";
    
    bancoUsuarios[l] = { nome: n, senha: s, cargo: "promotor", regiao: regiaoMae, meta: m, lojasPermitidas: lojasSelecionadas, criadoPor: supDaVez, permissoes: perm };
    
    document.getElementById('modal-promotor-login').value = ""; document.getElementById('modal-promotor-nome').value = ""; document.getElementById('modal-promotor-senha').value = ""; document.getElementById('modal-promotor-meta').value = "";
    renderizarModalEquipe(); salvarConfiguracoesGlobais(false); mostrarToast("Promotor criado com sucesso!", "sucesso");
}

function adminAddLojaEquipe() {
    let nome = document.getElementById('modal-loja-nome').value.trim();
    let capa = parseInt(document.getElementById('modal-loja-capa').value) || 0;
    if(!nome) return mostrarToast("Preencha o nome da loja", "alerta");
    if(lojasConfig[nome]) return mostrarToast("Loja já existe", "erro");
    
    let supDaVez = (supervisorGerenciadoAtual === "orfaos") ? "master" : supervisorGerenciadoAtual;
    lojasConfig[nome] = { supervisor: supDaVez, capa: capa, vendedores: [] };
    document.getElementById('modal-loja-nome').value = ""; document.getElementById('modal-loja-capa').value = "";
    renderizarModalEquipe(); salvarConfiguracoesGlobais(false); mostrarToast("Loja criada!", "sucesso");
}

function adminAddVendedorEquipe() {
    let loja = document.getElementById('modal-select-loja').value;
    let nomes = document.getElementById('modal-vendedor-nome').value.trim();
    if(!loja) return mostrarToast("Selecione uma loja", "alerta");
    if(!nomes) return mostrarToast("Preencha o nome do vendedor", "alerta");
    
    let supDaVez = (supervisorGerenciadoAtual === "orfaos") ? "master" : supervisorGerenciadoAtual;
    if(!lojasConfig[loja]) lojasConfig[loja] = { supervisor: supDaVez, capa: 0, vendedores: [] };
    if(!lojasConfig[loja].vendedores) lojasConfig[loja].vendedores = [];
    
    let arrayNomes = nomes.split(',').map(n => n.trim()).filter(n => n !== "");
    arrayNomes.forEach(n => { if(!lojasConfig[loja].vendedores.includes(n)) lojasConfig[loja].vendedores.push(n); });
    
    document.getElementById('modal-vendedor-nome').value = "";
    renderizarModalEquipe(); salvarConfiguracoesGlobais(false); mostrarToast("Vendedor(es) adicionado(s)!", "sucesso");
}

function adminRemoverUsuario(login) {
    if(confirm(`Tem certeza que deseja excluir o usuário ${login}?`)) {
        delete bancoUsuarios[login];
        renderizarAdminUsuarios(); salvarConfiguracoesGlobais(false); mostrarToast("Usuário excluído com sucesso!", "sucesso");
    }
}

function renderizarAdminAparelhos() {
    let div = document.getElementById('lista-admin-aparelhos'); let html = "";
    for(let ap in mapaEmojis) {
        html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid var(--border-color); font-size:14px; color:var(--cor-texto);">
            <span>${mapaEmojis[ap]} ${ap.toUpperCase()}</span>
            <button class="btn-excluir" onclick="removerAparelhoGlobal('${ap}')"><i data-lucide="trash-2" class="lucide-sm"></i> Excluir</button>
        </div>`;
    }
    div.innerHTML = html || "<p style='color:var(--cor-secundaria); font-size:13px;'>Nenhum aparelho cadastrado.</p>"; loadIcons();
}

function removerAparelhoGlobal(ap) { delete mapaEmojis[ap]; renderizarAdminAparelhos(); salvarConfiguracoesGlobais(false); mostrarToast("Aparelho removido.", "info"); }

function adminAddAparelho() {
    let n = document.getElementById('admin-aparelho-nome').value.trim().toLowerCase();
    let e = document.getElementById('admin-aparelho-emoji').value.trim();
    if(!n || !e) return mostrarToast("Preencha Nome e Emoji", "alerta");
    if(mapaEmojis[n]) return mostrarToast("Aparelho já existe", "erro");
    mapaEmojis[n] = e;
    document.getElementById('admin-aparelho-nome').value = ""; document.getElementById('admin-aparelho-emoji').value = "";
    renderizarAdminAparelhos(); salvarConfiguracoesGlobais(false); mostrarToast("Aparelho adicionado com sucesso!", "sucesso");
}

async function salvarConfiguracoesGlobais(mostrarAviso = true) {
    let btn = document.getElementById('btn-salvar-nuvem');
    if(btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" class="lucide-sm" style="animation: spin 2s linear infinite;"></i> Salvando...'; loadIcons(); }
    let payload = {
        tipo: "salvar_config",
        configuracoes: {
            bancoUsuarios: bancoUsuarios,
            lojasConfig: lojasConfig,
            mapaEmojis: mapaEmojis,
            aparelhosPremium: aparelhosPremium,
            taxasCoparticipacao: taxasCoparticipacao,
            valoresComissao: valoresComissao
        }
    };
    try {
        await fetch(URL_DA_SUA_API, { method: "POST", body: JSON.stringify(payload), mode: "no-cors", headers: { "Content-Type": "text/plain; charset=utf-8" } });
        if(mostrarAviso) mostrarToast("Configurações salvas na nuvem com sucesso!", "sucesso");
    } catch (e) {
        if(mostrarAviso) mostrarToast("Erro ao salvar configurações na nuvem.", "erro");
    } finally {
        if(btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="cloud-upload" class="lucide-lg"></i> Salvar Alterações na Nuvem'; loadIcons(); }
    }
}

function renderizarInputsFoco() {
    const container = document.getElementById('admin-foco-container');
    const selSup = document.getElementById('seletor-foco-sup');
    if (!container || !selSup) return;
    
    let supId = selSup.value;
    let premiumSup = aparelhosPremium[supId] || aparelhosPremium["geral"] || {};
    let taxaSup = taxasCoparticipacao[supId] || taxasCoparticipacao["geral"] || 25;
    
    let vComissaoSup = valoresComissao[supId] || valoresComissao["geral"] || {};
    let aparelhosCfg = vComissaoSup.aparelhos || vComissaoSup || {};
    let niveisGlobais = vComissaoSup.niveis || [{ id: 'l1', nome: 'L1', meta: 0 }, { id: 'l2', nome: 'L2', meta: 10 }];
    let campanhasAtivas = vComissaoSup.campanhasPersonalizadas || [];
    
    document.getElementById('input-taxa-copart').value = taxaSup;

    let htmlNiveis = `<div style="background: var(--bg-item); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 15px; text-align: left;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 13px; font-weight: bold; color: #6f42c1; display:flex; align-items:center;"><i data-lucide="layers" class="lucide-sm"></i> Níveis Globais de Comissão</span>
            <button class="btn-acao btn-enviar" style="padding: 6px 12px; font-size: 11px; width: auto;" onclick="adicionarNivelGlobal()"><i data-lucide="plus"></i> Novo Nível</button>
        </div>
        <p style="font-size: 11px; color: var(--cor-secundaria); margin-bottom: 10px;">Defina a <strong>Meta Padrão de Vendas Gerais</strong>. Isso servirá como base caso o aparelho não tenha uma meta específica.</p>
        <div id="container-niveis-dinamicos" style="display: flex; flex-direction: column; gap: 8px;">`;

    niveisGlobais.forEach((nv, idx) => {
        htmlNiveis += `
        <div class="linha-nivel-config" data-id="${nv.id}" style="display:flex; align-items:center; gap:10px; background:var(--bg-container); padding:8px; border-radius:6px; border: 1px solid var(--border-color);">
            <span style="font-weight:bold; font-size:12px; color:#0086ff; width: 45px;">${nv.nome}:</span>
            <span style="font-size:11px; color:var(--cor-secundaria);">Meta Geral Padrão (un):</span>
            <input type="number" class="config-nivel-meta" value="${nv.meta}" style="width:80px; margin:0; padding:6px; font-size:12px;" onchange="atualizarListaPremiumGlobal()">
            ${idx > 0 ? `<button class="btn-excluir" onclick="removerNivelGlobal('${nv.id}')" style="padding:4px 8px; margin-left:auto;"><i data-lucide="x"></i></button>` : `<span style="margin-left:auto; font-size:10px; color:#28a745;">(Fixo)</span>`}
        </div>`;
    });
    htmlNiveis += `</div></div>`;

    let htmlCampanhas = `
    <div style="background: var(--bg-item); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 15px; text-align: left;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 13px; font-weight: bold; color: #ff9800; display:flex; align-items:center;"><i data-lucide="gift" class="lucide-sm"></i> Campanhas / Aceleradores</span>
            <button class="btn-acao btn-enviar" style="background-color: #ff9800; padding: 6px 12px; font-size: 11px; width: auto;" onclick="adicionarLinhaCampanha()"><i data-lucide="plus"></i> Nova Regra</button>
        </div>
        <p style="font-size: 11px; color: var(--cor-secundaria); margin-bottom: 10px;">Bônus em R$ adicionado à comissão padrão. Direcione para toda a equipe ou para um promotor específico.</p>
        <div id="container-linhas-campanhas" style="display: flex; flex-direction: column; gap: 8px;">`;

    if (campanhasAtivas.length === 0) { htmlCampanhas += `<span style="font-size: 12px; color: var(--cor-secundaria); font-style: italic;">Nenhuma campanha ativa.</span>`; }
    campanhasAtivas.forEach((camp, index) => {
        let optionsAparelhos = `<option value="todos">Qualquer Aparelho</option>`;
        for (let ap in mapaEmojis) { let sel = camp.aparelho === ap ? "selected" : ""; optionsAparelhos += `<option value="${ap}" ${sel}>${mapaEmojis[ap]} ${ap.toUpperCase()}</option>`; }
        
        let optionsPromotores = `<option value="todos">Toda a Equipe</option>`;
        for (let pk in bancoUsuarios) {
            if (bancoUsuarios[pk].cargo === "promotor" && (supId === 'geral' || bancoUsuarios[pk].criadoPor === supId)) {
                let selP = (camp.promotorAlvo === pk) ? "selected" : "";
                optionsPromotores += `<option value="${pk}" ${selP}>👤 ${bancoUsuarios[pk].nome || pk}</option>`;
            }
        }

        htmlCampanhas += `
        <div class="linha-campanha-dinamica" style="background: var(--bg-container); padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <select class="camp-aparelho" style="margin-bottom:0; font-size:12px; padding:6px; flex:1; min-width: 120px;" onchange="atualizarListaPremiumGlobal()">${optionsAparelhos}</select>
                <select class="camp-promotor" style="margin-bottom:0; font-size:12px; padding:6px; flex:1; min-width: 120px;" onchange="atualizarListaPremiumGlobal()">${optionsPromotores}</select>
                <button class="btn-excluir" style="padding: 6px 10px;" onclick="removerLinhaCampanha(${index})"><i data-lucide="x"></i></button>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <div style="display: flex; align-items:center; gap:4px; flex:1; min-width: 90px;"><span style="font-size:10px;">Qtd Min.</span><input type="number" class="camp-qtd" value="${camp.qtdMinima || 1}" style="margin-bottom:0; font-size:12px; padding:6px;" onchange="atualizarListaPremiumGlobal()"></div>
                <div style="display: flex; align-items:center; gap:4px; flex:1; min-width: 90px;"><span style="font-size:10px;">Bônus(R$)</span><input type="number" class="camp-valor" value="${camp.bonus || 0}" style="margin-bottom:0; font-size:12px; padding:6px;" onchange="atualizarListaPremiumGlobal()"></div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
                <span style="font-size: 10px; color: var(--cor-secundaria); width: 60px;">Validade:</span>
                <input type="date" class="camp-inicio" title="Início" value="${camp.dataInicio || ''}" style="margin-bottom:0; font-size:11px; padding:4px;" onchange="atualizarListaPremiumGlobal()"> 
                <span style="font-size:10px; color:var(--cor-secundaria);">até</span> 
                <input type="date" class="camp-fim" title="Fim" value="${camp.dataFim || ''}" style="margin-bottom:0; font-size:11px; padding:4px;" onchange="atualizarListaPremiumGlobal()">
            </div>
        </div>`;
    });
    htmlCampanhas += `</div></div>`;

    let htmlAparelhos = `<div style="font-size: 13px; font-weight: bold; color: var(--cor-texto); margin: 20px 0 10px 0; text-align: left; display:flex; align-items:center;"><i data-lucide="smartphone" class="lucide-sm"></i> Valores e Metas por Aparelho:</div>
    <div style="display: flex; flex-direction: column; gap: 12px;">`;

    for (let ap in mapaEmojis) {
        let isChecked = premiumSup[ap] ? "checked" : "";
        let cfg = aparelhosCfg[ap] || {};
        
        let inputsNiveisHtml = `<div style="display:flex; gap:10px; overflow-x:auto; padding-bottom:5px;">`;
        niveisGlobais.forEach(nv => {
            let v = cfg[nv.id] !== undefined ? cfg[nv.id] : 0;
            let metaEspec = cfg[nv.id + '_meta'] !== undefined ? cfg[nv.id + '_meta'] : nv.meta;
            
            inputsNiveisHtml += `
            <div style="min-width: 100px; background: var(--bg-fundo); padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">
                <span style="font-size: 11px; font-weight: bold; color: #0086ff; display:block; margin-bottom:4px;">${nv.nome}</span>
                
                <span style="font-size: 10px; color: var(--cor-secundaria);">Comissão (R$):</span>
                <input type="number" class="input-comissao-nivel" data-ap="${ap}" data-lvl="${nv.id}" value="${v}" style="width: 100%; padding: 6px; margin: 2px 0 6px 0; background: var(--bg-input); color: var(--cor-texto); font-size: 12px; border-radius: 4px; border: 1px solid var(--border-color);" onchange="atualizarListaPremiumGlobal()">
                
                <span style="font-size: 10px; color: var(--cor-secundaria);">Meta Mínima:</span>
                <input type="number" class="input-meta-nivel" data-ap="${ap}" data-lvl="${nv.id}" value="${metaEspec}" style="width: 100%; padding: 6px; margin: 2px 0 0 0; background: var(--bg-input); color: var(--cor-texto); font-size: 12px; border-radius: 4px; border: 1px solid var(--border-color);" onchange="atualizarListaPremiumGlobal()">
            </div>`;
        });
        inputsNiveisHtml += `</div>`;

        htmlAparelhos += `
        <div style="background: var(--bg-container); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 10px;">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: bold; cursor: pointer; color: var(--cor-texto);">
                <input type="checkbox" class="check-foco-aparelho" value="${ap}" ${isChecked} onchange="atualizarListaPremiumGlobal()"> 
                ${mapaEmojis[ap]} ${ap.toUpperCase()}
            </label>
            ${inputsNiveisHtml}
        </div>`;
    }
    htmlAparelhos += '</div>';
    
    container.innerHTML = htmlNiveis + htmlCampanhas + htmlAparelhos;
    loadIcons();
}

function adicionarNivelGlobal() {
    let selSup = document.getElementById('seletor-foco-sup').value;
    if (!valoresComissao[selSup]) valoresComissao[selSup] = {};
    if (!valoresComissao[selSup].niveis) valoresComissao[selSup].niveis = [{ id: 'l1', nome: 'L1', meta: 0 }, { id: 'l2', nome: 'L2', meta: 10 }];
    
    let count = valoresComissao[selSup].niveis.length + 1;
    valoresComissao[selSup].niveis.push({ id: `l${count}`, nome: `L${count}`, meta: count * 10 });
    renderizarInputsFoco();
}

function removerNivelGlobal(idNivel) {
    if (idNivel === 'l1') return; 
    let selSup = document.getElementById('seletor-foco-sup').value;
    if (valoresComissao[selSup] && valoresComissao[selSup].niveis) {
        valoresComissao[selSup].niveis = valoresComissao[selSup].niveis.filter(n => n.id !== idNivel);
        renderizarInputsFoco(); atualizarListaPremiumGlobal();
    }
}

function adicionarLinhaCampanha() {
    let selSup = document.getElementById('seletor-foco-sup').value;
    if (!valoresComissao[selSup]) valoresComissao[selSup] = {};
    if (!valoresComissao[selSup].campanhasPersonalizadas) valoresComissao[selSup].campanhasPersonalizadas = [];
    valoresComissao[selSup].campanhasPersonalizadas.push({ aparelho: 'todos', promotorAlvo: 'todos', qtdMinima: 1, bonus: 50, dataInicio: '', dataFim: '' });
    renderizarInputsFoco();
}

function removerLinhaCampanha(index) {
    let selSup = document.getElementById('seletor-foco-sup').value;
    if (valoresComissao[selSup] && valoresComissao[selSup].campanhasPersonalizadas) {
        valoresComissao[selSup].campanhasPersonalizadas.splice(index, 1);
        renderizarInputsFoco(); atualizarListaPremiumGlobal();
    }
}

function atualizarListaPremiumGlobal() {
    const selSup = document.getElementById('seletor-foco-sup'); const inputTaxa = document.getElementById('input-taxa-copart');
    if (!selSup || !inputTaxa) return;
    
    let supId = selSup.value;
    taxasCoparticipacao[supId] = Number(inputTaxa.value) || 25;
    
    if (!valoresComissao[supId]) valoresComissao[supId] = {};
    if (!valoresComissao[supId].niveis) valoresComissao[supId].niveis = [{ id: 'l1', nome: 'L1', meta: 0 }, { id: 'l2', nome: 'L2', meta: 10 }];
    
    document.querySelectorAll('.linha-nivel-config').forEach(linha => {
        let id = linha.getAttribute('data-id');
        let nObj = valoresComissao[supId].niveis.find(x => x.id === id);
        if (nObj) { nObj.meta = Number(linha.querySelector('.config-nivel-meta').value) || 0; }
    });
    
    let premiumSup = {}; let aparelhosComissao = {};
    document.querySelectorAll('.check-foco-aparelho').forEach(cb => {
        let ap = cb.value; if (cb.checked) premiumSup[ap] = 1;
        aparelhosComissao[ap] = {};
        
        document.querySelectorAll(`.input-comissao-nivel[data-ap="${ap}"]`).forEach(inp => {
            let lvl = inp.getAttribute('data-lvl');
            aparelhosComissao[ap][lvl] = Number(inp.value) || 0;
        });
        
        document.querySelectorAll(`.input-meta-nivel[data-ap="${ap}"]`).forEach(inp => {
            let lvl = inp.getAttribute('data-lvl');
            if (inp.value !== "") {
                aparelhosComissao[ap][lvl + '_meta'] = Number(inp.value);
            }
        });
    });

    let novasCampanhas = [];
    document.querySelectorAll('.linha-campanha-dinamica').forEach(linha => {
        novasCampanhas.push({ 
            aparelho: linha.querySelector('.camp-aparelho').value, 
            promotorAlvo: linha.querySelector('.camp-promotor').value,
            qtdMinima: Number(linha.querySelector('.camp-qtd').value) || 1, 
            bonus: Number(linha.querySelector('.camp-valor').value) || 0,
            dataInicio: linha.querySelector('.camp-inicio').value,
            dataFim: linha.querySelector('.camp-fim').value
        });
    });
    
    aparelhosPremium[supId] = premiumSup;
    valoresComissao[supId].aparelhos = aparelhosComissao;
    valoresComissao[supId].campanhasPersonalizadas = novasCampanhas;
}