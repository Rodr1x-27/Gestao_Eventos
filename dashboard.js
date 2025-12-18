import { auth, db } from './firebase_connection.js';

// ESTA FUNÇÃO PERMANECE INALTERADA (APENAS SIMULAÇÃO DE DADOS ESTÁTICOS)
function obterDadosDoUtilizador(perfil, email) {
    if (perfil === 'organizador') {
        return {
            totalArrecadado: 14720.50,
            inscricoesTotais: 412,
            eventosAtivos: 7,
            notificacoes: 2
        };
    }

    else if (perfil === 'participante') {
        return {
            proximoEvento: {
                nome: "Workshop de Design Thinking",
                data: "10/12/2025",
                local: "Sala B1.04",
                orador: "Prof. Maria Sousa"
            },
            bilhetes: {
                total: 3,
                vip: 1,
                normal: 2,
                gastoTotal: 85.55
            },
            notificacoes: 5
        };
    }
    return {};
}


// NOVO: Função para encapsular toda a lógica de renderização original
function carregarConteudoDashboard(perfil, emailCompleto) {

    const nomeBase = emailCompleto.split('@')[0];

    // Pontos de injeção do javascript para o HTML com base no id
    const menuContainer = document.getElementById('menu-principal-dinamico');
    const conteudoContainer = document.getElementById('conteudo-principal-dinamico');
    const nomeUtilizadorEl = document.getElementById('display-nome-utilizador');
    const perfilUtilizadorEl = document.getElementById('display-perfil-utilizador');
    const tituloHeaderEl = document.getElementById('display-header-titulo');
    const subtituloHeaderEl = document.getElementById('display-header-subtitulo');
    const logoLink = document.getElementById('logo-link');

    // VERIFICAÇÃO CRÍTICA: Se o perfil for inválido, paramos.
    if (!perfil || (perfil !== 'organizador' && perfil !== 'participante')) {
        if (tituloHeaderEl) tituloHeaderEl.textContent = 'ERRO DE PERFIL';
        if (subtituloHeaderEl) subtituloHeaderEl.textContent = 'O tipo de perfil é inválido. Verifique o login.';
        console.error('ERRO CRÍTICO: Perfil do Utilizador não é "organizador" nem "participante".');
        return;
    }

    // Definir o link do logo
    if (logoLink) logoLink.href = 'dashboard.html';

    // Obter dados simulados
    const dados = obterDadosDoUtilizador(perfil, emailCompleto);

    let menuHTML = '';
    let conteudoHTML = '';

    if (perfil === 'organizador') {

        if (tituloHeaderEl) tituloHeaderEl.textContent = `Bem-vindo ${nomeBase}!`;
        if (subtituloHeaderEl) subtituloHeaderEl.textContent = 'Crie os melhores eventos, workshops e conferências do IPCA!';

        menuHTML = `
            <a href="dashboard.html" class="menu-item active"><i class="fas fa-home"></i><span>Menu Inicial</span></a>
            <a href="criar_evento.html" class="menu-item"><i class="fas fa-plus-circle"></i><span>Criar Evento</span></a>
            <a href="editar_eventos.html" class="menu-item"><i class="fas fa-edit"></i><span>Editar Evento</span></a>
            <a href="relatorios.html" class="menu-item"><i class="fas fa-chart-line"></i><span>Relatórios & Vendas</span></a>
            <a href="dados_pessoais.html" class="menu-item"><i class="fas fa-user-cog"></i><span>Gestão de Perfil</span></a>
        `;

        conteudoHTML = `
            <div class="widget">
                <h3>Total Arrecadado (€)</h3>
                <p class="widget-numero widget-dinheiro">${dados.totalArrecadado.toLocaleString('pt-PT', {
                    style: 'currency',
                    currency: 'EUR'
                })}</p>
                <p class="widget-detalhe">Receita bruta total (Bilhetes Normal e VIP).</p>
            </div>
            <div class="widget">
                <h3>Inscrições Totais</h3>
                <p class="widget-numero">${dados.inscricoesTotais}</p>
                <p class="widget-detalhe">Total de participantes em todos os eventos.</p>
            </div>
            <div class="widget">
                <h3>Inscritos (Eventos Ativos)</h3>
                <p class="widget-numero">${dados.eventosAtivos}</p>
                <p class="widget-detalhe">Inscritos em eventos no período de vendas.</p>
            </div>
            <div class="widget">
                <h3>Notificações</h3>
                <p class="widget-numero">${dados.notificacoes}</p>
                <p class="widget-detalhe">Alertas e pendências não lidas.</p>
            </div>
            <div class="widget widget-cta">
                <h3>Pronto para o próximo evento?</h3>
                <p class="widget-detalhe">Comece a configurar a sua próxima conferência ou workshop.</p>
                <a href="criar_evento.html" class="btn btn-primario"><i class="fas fa-plus-circle"></i> Criar Novo Evento</a>
            </div>
        `;

    } else if (perfil === 'participante') {

        if (tituloHeaderEl) tituloHeaderEl.textContent = `Bem-vindo ${nomeBase}!`;
        if (subtituloHeaderEl) subtituloHeaderEl.textContent = 'Participe nos melhores eventos, workshops e conferências do IPCA!';

        menuHTML = `
            <a href="dashboard.html" class="menu-item active"><i class="fas fa-home"></i><span>Menu Inicial</span></a>

            <!-- CORRETO: página da APP -->
            <a href="explorar_eventos.html" class="menu-item"><i class="fas fa-search"></i><span>Explorar Eventos</span></a>

            <a href="minhas_inscricoes.html" class="menu-item"><i class="fas fa-ticket-alt"></i><span>As Minhas Inscrições</span></a>
            <a href="eventos_favoritos.html" class="menu-item"><i class="fas fa-star"></i><span>Eventos Favoritos</span></a>
            <a href="dados_pessoais.html" class="menu-item"><i class="fas fa-user-cog"></i><span>Gestão de Perfil</span></a>
        `;

        conteudoHTML = `
            <div class="widget">
                <h3>Próximo Evento</h3>
                <p class="widget-titulo-destaque">${dados.proximoEvento.nome}</p>
                <p class="widget-detalhe"><i class="fas fa-calendar-alt"></i> Data: ${dados.proximoEvento.data}</p>
                <p class="widget-detalhe"><i class="fas fa-map-marker-alt"></i> Local: ${dados.proximoEvento.local}</p>
                <p class="widget-detalhe"><i class="fas fa-microphone"></i> Orador: ${dados.proximoEvento.orador}</p>
            </div>
            <div class="widget">
                <h3>Os Meus Bilhetes</h3>
                <p class="widget-numero">${dados.bilhetes.total}</p>
                <p class="widget-detalhe">Total (VIP: ${dados.bilhetes.vip} | Normal: ${dados.bilhetes.normal})</p>
                <p class="widget-numero widget-dinheiro">${dados.bilhetes.gastoTotal.toLocaleString('pt-PT', {
                    style: 'currency',
                    currency: 'EUR'
                })}</p>
                <p class="widget-detalhe">Gasto total</p>
            </div>
            <div class="widget">
                <h3>Notificações</h3>
                <p class="widget-numero">${dados.notificacoes}</p>
                <p class="widget-detalhe">Alertas e lembretes não lidos.</p>
            </div>
            <div class="widget widget-cta">
                <h3>Descubra a sua próxima experiência</h3>
                <p class="widget-detalhe">Encontre conferências, workshops e seminários na sua área.</p>

                <!-- CORRETO: página da APP -->
                <a href="explorar_eventos.html" class="btn btn-primario"><i class="fas fa-search"></i> Explorar Eventos</a>
            </div>
        `;
    }

    // Injetar HTML
    if (menuContainer) menuContainer.innerHTML = menuHTML;
    if (conteudoContainer) conteudoContainer.innerHTML = conteudoHTML;

    // Info do utilizador no rodapé da sidebar
    if (nomeUtilizadorEl) nomeUtilizadorEl.textContent = nomeBase;
    if (perfilUtilizadorEl) perfilUtilizadorEl.textContent = perfil.charAt(0).toUpperCase() + perfil.slice(1);

    // Toggle sidebar (mantém localStorage)
    const toggleBtn = document.getElementById('toggle-sidebar');
    const container = document.getElementById('dashboard-container');

    if (toggleBtn && container) {
        const isRecolhida = localStorage.getItem('sidebarRecolhida') === 'true';
        if (isRecolhida) {
            container.classList.add('sidebar-recolhida');
            toggleBtn.textContent = '→';
        } else {
            toggleBtn.textContent = '←';
        }

        toggleBtn.addEventListener('click', () => {
            container.classList.toggle('sidebar-recolhida');
            const novoEstado = container.classList.contains('sidebar-recolhida');
            localStorage.setItem('sidebarRecolhida', novoEstado);
            toggleBtn.textContent = novoEstado ? '→' : '←';
        });
    }
}


// =========================================================
// SCRIPT PRINCIPAL DO DASHBOARD (FIREBASE)
// =========================================================
document.addEventListener('DOMContentLoaded', () => {

    const btnLogout = document.getElementById('btn-logout');

    auth.onAuthStateChanged(async (user) => {
        try {
            if (!user) {
                window.location.href = "./login.html";
                return;
            }

            const uid = user.uid;
            const doc = await db.collection("utilizadores").doc(uid).get();

            if (!doc.exists) {
                console.error("Perfil não encontrado no Firestore.");
                await auth.signOut();
                window.location.href = "./login.html";
                return;
            }

            const perfil = doc.data().perfil;
            const emailCompleto = user.email;

            carregarConteudoDashboard(perfil, emailCompleto);

        } catch (error) {
            console.error("Erro ao buscar perfil:", error);
        }
    });

    if (btnLogout) {
        btnLogout.addEventListener('click', async (e) => {
            e.preventDefault();

            try {
                await auth.signOut();
                localStorage.removeItem('sidebarRecolhida');
                window.location.href = './login.html';
            } catch (error) {
                console.error("Erro ao fazer logout Firebase:", error);
            }
        });
    }
});
