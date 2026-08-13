// ==========================================
// api.js - Conexão com Supabase e Migração
// ==========================================

const SUPABASE_URL = 'https://odyshuvljwuqerzstqgn.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_vTlWZH_r_oCMgcFiPtD5EQ_GFS_w6e2';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const URL_GOOGLE = "https://script.google.com/macros/s/AKfycbzg7zvtitqzNtB7ghbZ-zg0-W3fTrkAswlORizvAfyPETdbHivMRqvJyrfTEZ36WuXGPQ/exec";

let bancoUsuarios = {}; 
let lojasConfig = {}; 
let mapaEmojis = {};
let aparelhosPremium = { "geral": {} }; 
let taxasCoparticipacao = { "geral": 25 }; 
let valoresComissao = { "geral": {} };
let dadosEstoqueGlobal = [];
let dadosHistoricoGlobal = []; 
let dadosAcompanhamentoGlobal = []; 
let mostruariosGlobais = {}; 

async function inicializarAPI() {
    try {
        console.log("Conectando ao Supabase e baixando dados...");

        const { data: dbUsuarios, error: errUsu } = await supabaseClient.from('usuarios').select('*');
        if (errUsu) throw errUsu;

        const { data: dbLojas, error: errLoj } = await supabaseClient.from('lojas_config').select('*');
        if (errLoj) throw errLoj;

        const { data: dbConfig } = await supabaseClient.from('configuracoes_globais').select('*').eq('id', 'padrao').single();

        bancoUsuarios = {};
        if (dbUsuarios) {
            dbUsuarios.forEach(u => {
                let arrayLojasLimpo = [];
                if (Array.isArray(u.lojas_permitidas)) {
                    if (u.lojas_permitidas.length === 1 && typeof u.lojas_permitidas[0] === 'string' && u.lojas_permitidas[0].includes('[')) {
                        try { arrayLojasLimpo = JSON.parse(u.lojas_permitidas[0]); } catch(e) { arrayLojasLimpo = u.lojas_permitidas; }
                    } else { arrayLojasLimpo = u.lojas_permitidas; }
                } else if (typeof u.lojas_permitidas === 'string') {
                    try { arrayLojasLimpo = JSON.parse(u.lojas_permitidas); } catch(e) { arrayLojasLimpo = [u.lojas_permitidas]; }
                }

                let metasLojaObj = {};
                if (u.metas_por_loja) {
                    if (typeof u.metas_por_loja === 'string') {
                        try { metasLojaObj = JSON.parse(u.metas_por_loja); } catch(e) {}
                    } else { metasLojaObj = u.metas_por_loja; }
                }

                bancoUsuarios[u.login] = {
                    nome: u.nome, senha: u.senha, cargo: u.cargo, regiao: u.regiao, 
                    meta: u.meta, criadoPor: u.criado_por, 
                    lojasPermitidas: arrayLojasLimpo,
                    metasPorLoja: metasLojaObj,
                    permissoes: { vendas: true, acomp: true, estoque_ver: true, estoque_editar: true } 
                };
            });
        }

        lojasConfig = {};
        if (dbLojas) {
            dbLojas.forEach(l => {
                let arrayVendsLimpo = [];
                if (Array.isArray(l.vendedores)) {
                    if (l.vendedores.length === 1 && typeof l.vendedores[0] === 'string' && l.vendedores[0].includes('[')) {
                        try { arrayVendsLimpo = JSON.parse(l.vendedores[0]); } catch(e) { arrayVendsLimpo = l.vendedores; }
                    } else { arrayVendsLimpo = l.vendedores; }
                } else if (typeof l.vendedores === 'string') {
                    try { arrayVendsLimpo = JSON.parse(l.vendedores); } catch(e) { arrayVendsLimpo = [l.vendedores]; }
                }

                lojasConfig[l.nome_loja] = { supervisor: l.supervisor_login, capa: l.capa, vendedores: arrayVendsLimpo };
            });
        }

        if (dbConfig) {
            mapaEmojis = dbConfig.mapa_emojis || {};
            aparelhosPremium = dbConfig.aparelhos_premium || {};
            taxasCoparticipacao = dbConfig.taxas_coparticipacao || {};
            valoresComissao = dbConfig.valores_comissao || {};
            mostruariosGlobais = dbConfig.mostruarios || {}; 
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