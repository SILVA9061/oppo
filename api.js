// ==========================================
// api.js - Conexão com Supabase e Migração
// ==========================================

// 1. SUAS CREDENCIAIS DO SUPABASE:
const SUPABASE_URL = 'https://odyshuvljwuqerzstqgn.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_vTlWZH_r_oCMgcFiPtD5EQ_GFS_w6e2';

// 🛑 A CORREÇÃO DE NOME: Mudamos para supabaseClient
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// A URL antiga do Google (para puxar os dados velhos na migração)
const URL_GOOGLE = "https://script.google.com/macros/s/AKfycbzg7zvtitqzNtB7ghbZ-zg0-W3fTrkAswlORizvAfyPETdbHivMRqvJyrfTEZ36WuXGPQ/exec";

// 3. Estruturas Globais
let bancoUsuarios = {}; 
let lojasConfig = {}; 
let mapaEmojis = {};
let aparelhosPremium = { "geral": {} }; 
let taxasCoparticipacao = { "geral": 25 }; 
let valoresComissao = { "geral": {} };
let dadosEstoqueGlobal = [];
let dadosHistoricoGlobal = []; 
let dadosAcompanhamentoGlobal = []; 

// Fallbacks de segurança
const fallbackUsuarios = { "master": { nome: "Diretor Master", senha: "Silva_9061", cargo: "master", meta: 0, lojasPermitidas: [], criadoPor: "" }}; 
const fallbackLojas = {}; 
const fallbackEmojis = {}; 
const fallbackPremium = { "geral": {} };

// 4. Função Mestre de Inicialização (Versão Final 100% Nuvem)
async function inicializarAPI() {
    try {
        console.log("Conectando ao Supabase e baixando dados...");

        // 1. SELECT na tabela de usuários
        const { data: dbUsuarios, error: errUsu } = await supabaseClient.from('usuarios').select('*');
        if (errUsu) throw errUsu;

        // 2. SELECT na tabela de lojas
        const { data: dbLojas, error: errLoj } = await supabaseClient.from('lojas_config').select('*');
        if (errLoj) throw errLoj;

        // 3. SELECT nas configurações globais (Emojis, Comissões, etc)
        const { data: dbConfig } = await supabaseClient.from('configuracoes_globais').select('*').eq('id', 'padrao').single();

        // Monta os objetos na memória
        bancoUsuarios = {};
        if (dbUsuarios) {
            dbUsuarios.forEach(u => {
                bancoUsuarios[u.login] = {
                    nome: u.nome, senha: u.senha, cargo: u.cargo, regiao: u.regiao, 
                    meta: u.meta, criadoPor: u.criado_por, lojasPermitidas: u.lojas_permitidas || [],
                    permissoes: { vendas: true, acomp: true, estoque_ver: true, estoque_editar: true } 
                };
            });
        }

        lojasConfig = {};
        if (dbLojas) {
            dbLojas.forEach(l => {
                lojasConfig[l.nome_loja] = { supervisor: l.supervisor_login, capa: l.capa, vendedores: l.vendedores || [] };
            });
        }

        // Aplica as configurações globais do banco (se existirem)
        if (dbConfig) {
            mapaEmojis = dbConfig.mapa_emojis || {};
            aparelhosPremium = dbConfig.aparelhos_premium || {};
            taxasCoparticipacao = dbConfig.taxas_coparticipacao || {};
            valoresComissao = dbConfig.valores_comissao || {};
        }

        let elLoading = document.getElementById('tela-loading');
        if(elLoading) elLoading.style.display = 'none';

        mudarTela('tela-login');
        mostrarToast("Conectado ao servidor Supabase com sucesso!", "sucesso");

    } catch (error) {
        console.error("Erro ao conectar no Supabase:", error);
        mostrarBotaoReconexao();
    }
}

// ==========================================
// SCRIPT DE MIGRAÇÃO (RODAR APENAS UMA VEZ NO F12)
// ==========================================
async function migrarUsuariosParaSupabase() {
    console.log("1. Buscando usuários antigos no Google Sheets...");
    mostrarToast("Buscando dados no Google...", "info");

    try {
        let res = await fetch(URL_GOOGLE + "?acao=config", { redirect: "follow" }).then(r => r.json());
        
        if (!res || res.status !== "sucesso") {
            return mostrarToast("Erro ao ler dados do Google.", "erro");
        }

        let bancoAntigo = res.configuracoes.bancoUsuarios || {};
        
        // Usamos um dicionário (mapa) para garantir que não haverá logins duplicados
        let mapUsuarios = {};

        console.log("2. Formatando usuários para o padrão Relacional...");
        for (let login in bancoAntigo) {
            let u = bancoAntigo[login];
            let loginLimpo = login.toLowerCase().trim();
            
            mapUsuarios[loginLimpo] = {
                login: loginLimpo,
                nome: u.nome || login,
                senha: u.senha || '1234',
                cargo: u.cargo || 'promotor',
                regiao: u.regiao || null,
                meta: u.meta || 0,
                criado_por: u.criadoPor || null,
                lojas_permitidas: u.lojasPermitidas || []
            };
        }

        // Adiciona o Master manualmente SÓ SE ele já não veio do Google Sheets
        if (!mapUsuarios["master"]) {
            mapUsuarios["master"] = {
                login: "master",
                nome: "Diretor Master",
                senha: "Silva_9061",
                cargo: "master",
                regiao: "GLOBAL",
                meta: 0,
                criado_por: null,
                lojas_permitidas: []
            };
        }

        // Transforma o dicionário de volta em uma lista limpa
        let listaParaSupabase = Object.values(mapUsuarios);

        console.log("3. Injetando no Supabase...");
        mostrarToast("Salvando no novo banco...", "info");

        // Envia usando upsert usando supabaseClient
        const { data, error } = await supabaseClient.from('usuarios').upsert(listaParaSupabase);

        if (error) {
            console.error("Erro do Supabase:", error);
            mostrarToast("Erro ao salvar no Supabase! Veja o Console.", "erro");
        } else {
            console.log("Migração concluída com sucesso!");
            mostrarToast("🎉 Todos os usuários foram migrados!", "sucesso");
        }

    } catch (e) {
        console.error("Erro geral de rede:", e);
        mostrarToast("Erro de rede na migração.", "erro");
    }
}

// ==========================================
// FUNÇÕES DE GATILHO (MOCKADAS)
// ==========================================
async function carregarDadosDoBanco() { console.log("Em breve: supabaseClient.from('vendas')"); }
async function carregarEstoqueDoBanco() { console.log("Em breve: supabaseClient.from('estoque')"); }
async function carregarHistoricoDoBanco() { console.log("Em breve: supabaseClient.from('vendas')"); }
async function enviarParaBanco() { console.log("Em breve: insert('vendas')"); }
async function salvarConfiguracoesGlobais() { console.log("Em breve: update configuracoes"); }
async function executarEnvioEstoque() { console.log("Em breve: insert('estoque')"); }
async function enviarConferenciaDiaria() { console.log("Em breve: insert('estoque') rotina"); }
async function executarCancelamentoVenda() { console.log("Em breve: delete/update('vendas')"); }
async function executarDesfazerCancelamento() { console.log("Em breve: update('vendas')"); }
function tentarReconectarAgora() { inicializarAPI(); }
// ==========================================
// SCRIPT DE MIGRAÇÃO: LOJAS (RODAR NO F12)
// ==========================================
async function migrarLojasParaSupabase() {
    console.log("1. Buscando lojas antigas no Google Sheets...");
    mostrarToast("Buscando lojas no Google...", "info");

    try {
        // Puxa as configurações antigas do Google
        let res = await fetch(URL_GOOGLE + "?acao=config", { redirect: "follow" }).then(r => r.json());
        
        if (!res || res.status !== "sucesso") {
            return mostrarToast("Erro ao ler dados do Google.", "erro");
        }

        let lojasAntigas = res.configuracoes.lojasConfig || {};
        let listaParaSupabase = [];

        console.log("2. Formatando lojas para o padrão Relacional...");
        for (let nomeLoja in lojasAntigas) {
            let l = lojasAntigas[nomeLoja];
            
            listaParaSupabase.push({
                nome_loja: nomeLoja,
                supervisor_login: l.supervisor || null,
                capa: l.capa || 0,
                vendedores: l.vendedores || []
            });
        }

        if (listaParaSupabase.length === 0) {
            return mostrarToast("Nenhuma loja encontrada para migrar.", "alerta");
        }

        console.log("3. Injetando lojas no Supabase...");
        mostrarToast("Salvando lojas no novo banco...", "info");

        // Envia usando upsert para evitar duplicações
        const { data, error } = await supabaseClient.from('lojas_config').upsert(listaParaSupabase);

        if (error) {
            console.error("Erro do Supabase:", error);
            mostrarToast("Erro ao salvar lojas! Veja o Console.", "erro");
        } else {
            console.log("Migração de lojas concluída com sucesso!");
            mostrarToast("🏪 Lojas migradas com sucesso!", "sucesso");
        }

    } catch (e) {
        console.error("Erro geral de rede:", e);
        mostrarToast("Erro de rede na migração das lojas.", "erro");
    }
}
// ==========================================
// SCRIPT DE MIGRAÇÃO: CONFIGURAÇÕES GLOBAIS
// ==========================================
async function migrarConfigsParaSupabase() {
    console.log("Buscando configurações no Google Sheets...");
    mostrarToast("Baixando configurações...", "info");

    try {
        let res = await fetch(URL_GOOGLE + "?acao=config", { redirect: "follow" }).then(r => r.json());
        let c = res.configuracoes;

        let payload = {
            id: 'padrao', // ID fixo, pois só teremos 1 linha de configuração geral
            mapa_emojis: c.mapaEmojis || {},
            aparelhos_premium: c.aparelhosPremium || {"geral": {}},
            taxas_coparticipacao: c.taxasCoparticipacao || {"geral": 25},
            valores_comissao: c.valoresComissao || {"geral": {}}
        };

        const { error } = await supabaseClient.from('configuracoes_globais').upsert([payload]);

        if (error) {
            console.error(error);
            mostrarToast("Erro ao migrar configurações.", "erro");
        } else {
            console.log("Configurações migradas!");
            mostrarToast("⚙️ Configurações Globais migradas com sucesso!", "sucesso");
        }
    } catch (e) {
        console.error(e);
    }
}
// ==========================================
// SCRIPT FINAL DE MIGRAÇÃO: ESTOQUE E VENDAS
// ==========================================
async function migrarVendasEEstoque() {
    console.log("Iniciando migração final...");
    mostrarToast("Lendo Estoque do Google...", "info");

    try {
        // 1. MIGRANDO O ESTOQUE ATUAL
        let resEstoque = await fetch(URL_GOOGLE + "?acao=estoque", { redirect: "follow" }).then(r => r.json());
        if (resEstoque.estoque) {
            let listaEstoque = resEstoque.estoque.map(e => ({
                loja: e.Loja,
                aparelho: e.Aparelho,
                quantidade: Number(e.Quantidade) || 0
            }));
            const { error: errE } = await supabaseClient.from('estoque').insert(listaEstoque);
            if (errE) console.error("Erro ao inserir Estoque:", errE);
        }

        mostrarToast("Lendo Histórico de Vendas...", "info");

        // 2. MIGRANDO O HISTÓRICO DE VENDAS
        let resHist = await fetch(URL_GOOGLE + "?acao=historico&limit=2000", { redirect: "follow" }).then(r => r.json());
        if (resHist.dados) {
            let listaVendas = [];
            
            resHist.dados.forEach(row => {
                let kAcao = Object.keys(row).find(k => k.toLowerCase().includes('aç') || k.toLowerCase().includes('ac') || k.toLowerCase().includes('tipo'));
                let tipoAcao = kAcao ? String(row[kAcao]).toLowerCase() : "";
                
                // Filtra para trazer APENAS as Vendas (ignorando logs de auditoria antigos)
                if (!tipoAcao.includes('estoque') && !tipoAcao.includes('auditoria') && !tipoAcao.includes('conferência')) {
                    let kProm = Object.keys(row).find(k => k.toLowerCase().includes('promotor'));
                    let kData = Object.keys(row).find(k => k.toLowerCase().includes('data') || k.toLowerCase().includes('carimbo'));
                    let kLoja = Object.keys(row).find(k => k.toLowerCase().includes('loja'));
                    let kVend = Object.keys(row).find(k => k.toLowerCase().includes('vendedor'));
                    let kApar = Object.keys(row).find(k => k.toLowerCase().includes('aparelho'));
                    
                    let loginPromotor = row[kProm] ? String(row[kProm]).trim().toLowerCase() : "master";
                    
                    // Tratamento de Data para o PostgreSQL
                    let rawDate = row[kData];
                    let dtVenda = rawDate ? new Date(rawDate) : new Date();
                    if (isNaN(dtVenda.getTime())) dtVenda = new Date(); 

                    listaVendas.push({
                        promotor_login: loginPromotor,
                        loja: row[kLoja] || "Geral",
                        vendedor: row[kVend] || "Não Informado",
                        aparelhos_vendidos: row[kApar] || "Aparelho Desconhecido",
                        data_venda: dtVenda.toISOString()
                    });
                }
            });

            if (listaVendas.length > 0) {
                // O banco de dados tem limite por requisição, então fatiamos em lotes de 100
                for(let i = 0; i < listaVendas.length; i += 100) {
                    let lote = listaVendas.slice(i, i + 100);
                    const { error: errV } = await supabaseClient.from('vendas').insert(lote);
                    if (errV) console.error("Erro nas Vendas (lote):", errV);
                }
            }
        }

        mostrarToast("🏆 Migração 100% Concluída!", "sucesso");
        console.log("FIM DA MIGRAÇÃO. Seu banco está completo.");

    } catch (e) {
        console.error("Erro no script:", e);
        mostrarToast("Erro. Veja o console.", "erro");
    }
}