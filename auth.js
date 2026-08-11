// ==========================================
// auth.js - Autenticação Real com Supabase e Permissões
// ==========================================

let usuarioLogado = null; 
let usuarioEditandoSenha = null;

async function realizarLogin() {
    const btn = document.getElementById("btn-login"); 
    btn.disabled = true; 
    btn.innerHTML = '<i data-lucide="loader-2" class="lucide-sm" style="animation: spin 2s linear infinite;"></i> Entrando...'; 
    loadIcons();
    if(typeof ocultarBotaoReconexao === "function") ocultarBotaoReconexao(); 
    
    try {
        const usuarioDigitado = document.getElementById('nome-usuario').value.trim().toLowerCase(); 
        const senhaDigitada = document.getElementById('senha-usuario').value.trim(); 

        const { data, error } = await supabaseClient.from('usuarios').select('*').eq('login', usuarioDigitado).single();

        if (error || !data) {
            mostrarToast("Usuário não encontrado!", "erro");
            return;
        }

        if (data.senha === senhaDigitada) {
            usuarioLogado = data; 
            usuarioLogado.id = data.login; 
            usuarioLogado.lojasPermitidas = data.lojas_permitidas || [];
            usuarioLogado.criadoPor = data.criado_por;
            
            if (senhaDigitada === "1234" && !localStorage.getItem('ignorar_troca_' + usuarioLogado.id) && usuarioLogado.id !== "master") { 
                usuarioEditandoSenha = usuarioLogado.id; 
                abrirModalSenha(); 
            } else { 
                entrarNoSistema(); 
            }
        } else { 
            mostrarToast("Senha incorreta!", "erro"); 
        }
    } catch (erro) { 
        console.error("Erro no login:", erro); 
        mostrarToast("Erro ao conectar no banco.", "erro"); 
    } finally { 
        if (btn) {
            btn.disabled = false; 
            btn.innerHTML = '<i data-lucide="log-in" style="margin-right: 8px;"></i> Acessar Sistema'; 
            loadIcons(); 
        }
    }
}

function abrirModalSenha() { 
    document.getElementById('etapa-pergunta-senha').style.display = 'block'; 
    document.getElementById('etapa-formulario-senha').style.display = 'none'; 
    document.getElementById('modal-senha').classList.add('ativo'); 
}

function responderTrocaSenha(q) { 
    if(q) { 
        document.getElementById('etapa-pergunta-senha').style.display = 'none'; 
        document.getElementById('etapa-formulario-senha').style.display = 'block'; 
        document.getElementById('nova-senha-1').value = ''; 
        document.getElementById('nova-senha-2').value = ''; 
    } else { 
        localStorage.setItem('ignorar_troca_' + usuarioEditandoSenha, 'true'); 
        fecharModalSenha(); 
        entrarNoSistema(); 
    } 
}

function cancelarTrocaSenha() { 
    localStorage.setItem('ignorar_troca_' + usuarioEditandoSenha, 'true'); 
    fecharModalSenha(); 
    entrarNoSistema(); 
}

async function salvarNovaSenha() { 
    let s1 = document.getElementById('nova-senha-1').value.trim(); 
    let s2 = document.getElementById('nova-senha-2').value.trim(); 
    if (s1.length < 3 || s1 !== s2) return mostrarToast("Erro na senha!", "alerta"); 
    
    const btn = document.getElementById("btn-salvar-senha");
    btn.innerHTML = 'Salvando...';

    const { error } = await supabaseClient.from('usuarios').update({ senha: s1 }).eq('login', usuarioEditandoSenha);

    if (error) {
        mostrarToast("Erro ao salvar senha.", "erro");
        btn.innerHTML = 'Salvar Nova Senha';
        return;
    }

    usuarioLogado.senha = s1; 
    localStorage.setItem('ignorar_troca_' + usuarioEditandoSenha, 'true'); 
    fecharModalSenha(); 
    entrarNoSistema(); 
    mostrarToast("Senha alterada com sucesso!", "sucesso"); 
}

function fecharModalSenha() { document.getElementById('modal-senha').classList.remove('ativo'); }

function entrarNoSistema() {
    try {
        let nomeSeguro = usuarioLogado.nome || usuarioLogado.id || "Usuário";
        let elNome = document.getElementById('nome-usuario'); if(elNome) elNome.value = ""; 
        let elSenha = document.getElementById('senha-usuario'); if(elSenha) elSenha.value = "";
        
        let perm = { vendas: true, acomp: true, estoque_ver: true, estoque_editar: true };
        if (usuarioLogado.permissoes) perm = usuarioLogado.permissoes; 
        
        let adminRole = (usuarioLogado.cargo === "gestor" || usuarioLogado.cargo === "regional" || usuarioLogado.id === "master" || usuarioLogado.cargo === "supervisor");
        
        let hGlobal = document.getElementById('header-global'); if(hGlobal) hGlobal.style.display = 'flex'; 
        let hNome = document.getElementById('header-nome'); if(hNome) hNome.innerText = nomeSeguro; 
        let hAvatar = document.getElementById('header-avatar'); if(hAvatar) hAvatar.innerText = String(nomeSeguro).charAt(0).toUpperCase();
        
        let btnDash = document.getElementById('btn-dashboard'); if(btnDash) btnDash.style.display = "flex"; 
        let btnHist = document.getElementById('btn-menu-historico'); if(btnHist) btnHist.style.display = adminRole ? "flex" : "none"; 
        let btnAud = document.getElementById('btn-menu-auditoria'); if(btnAud) btnAud.style.display = adminRole ? "flex" : "none"; 
        let btnVenda = document.getElementById('btn-menu-venda'); if(btnVenda) btnVenda.style.display = (adminRole && usuarioLogado.cargo !== "supervisor" && !perm.vendas) ? "none" : "flex";
        
        let bNav = document.getElementById('bottom-nav-bar'); if(bNav) bNav.classList.add('ativa'); 
        let navVenda = document.getElementById('nav-venda'); if(navVenda) navVenda.style.display = (adminRole && usuarioLogado.cargo !== "supervisor" && !perm.vendas) ? "none" : (perm.vendas ? "flex" : "none"); 
        let navAcomp = document.getElementById('nav-acomp'); if(navAcomp) navAcomp.style.display = (adminRole || perm.acomp) ? "flex" : "none"; 
        let navEst = document.getElementById('nav-estoque'); if(navEst) navEst.style.display = (adminRole || perm.estoque_ver) ? "flex" : "none"; 
        let navAdmin = document.getElementById('nav-admin'); if(navAdmin) navAdmin.style.display = adminRole ? "flex" : "none";
        
        let navHome = document.getElementById('nav-home'); 
        if (navHome) { navTo('tela-menu', navHome); } else { mudarTela('tela-menu'); }
    } catch (err) { 
        console.error("Erro no entrarNoSistema:", err); 
        mudarTela('tela-menu'); 
    }
}

function fazerLogout() { 
    usuarioLogado = null; 
    document.getElementById('bottom-nav-bar').classList.remove('ativa'); 
    document.getElementById('header-global').style.display = 'none'; 
    
    let elNome = document.getElementById('nome-usuario'); if(elNome) elNome.value = ""; 
    let elSenha = document.getElementById('senha-usuario'); if(elSenha) elSenha.value = "";
    
    const btnLogin = document.getElementById("btn-login");
    if(btnLogin) { btnLogin.disabled = false; btnLogin.innerHTML = '<i data-lucide="log-in" style="margin-right: 8px;"></i> Acessar Sistema'; }
    
    if(typeof ocultarBotaoReconexao === "function") ocultarBotaoReconexao(); 
    mudarTela('tela-login'); 
    loadIcons();
}

// ESTA É A FUNÇÃO QUE HAVIA SIDO APAGADA E TRAVAVA TUDO:
function podeGerenciar(logado, alvoId) {
    if (!logado) return false; 
    if (logado.id === alvoId) return true; 
    if (logado.id === "master" || logado.cargo === "master") return true;
    if (logado.cargo === "gestor") return true; 
    
    let alvo = bancoUsuarios[alvoId]; 
    if(!alvo) return false;
    
    if (logado.cargo === "regional") return alvo.regiao === logado.regiao || alvo.criadoPor === logado.id;
    if (logado.cargo === "supervisor") return alvo.criadoPor === logado.id; 
    return false;
}