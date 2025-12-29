import { auth, db } from './firebase_connection.js';

/* ===============================
   HELPERS
================================ */
function euro(n) {
  const v = Number(n ?? 0);
  return v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function parseDataHora(dataStr, horaStr) {
  if (!dataStr) return null;
  const h = horaStr || "00:00";
  const d = new Date(`${dataStr}T${h}`);
  if (isNaN(d.getTime())) return null;
  return d;
}

function formatDataPT(dateStr) {
  // espera "YYYY-MM-DD"
  if (!dateStr) return "—";
  const parts = String(dateStr).split("-");
  if (parts.length !== 3) return String(dateStr);
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function capitalizar(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ===============================
   PARTICIPANTE: DADOS REAIS
   (coleção: inscricoes)
================================ */
async function obterDadosParticipante(uid) {
  const snap = await db.collection("inscricoes").where("uid_user", "==", uid).get();

  const inscricoes = [];
  snap.forEach((doc) => inscricoes.push({ id: doc.id, ...doc.data() }));

  const total = inscricoes.length;
  const vip = inscricoes.filter(i => (i.tipo_bilhete || "").toLowerCase() === "vip").length;
  const normal = inscricoes.filter(i => (i.tipo_bilhete || "").toLowerCase() !== "vip").length;

  const gastoTotal = inscricoes.reduce((acc, i) => acc + Number(i.valor_pago ?? 0), 0);

  // Próximo evento futuro: data/hora mais próxima (>= agora)
  const agora = new Date();
  const futuras = inscricoes
    .map(i => ({ ...i, __dt: parseDataHora(i.evento_data_string, i.evento_hora_string) }))
    .filter(i => i.__dt && i.__dt.getTime() >= agora.getTime())
    .sort((a, b) => a.__dt - b.__dt);

  let proximoEvento = null;

  if (futuras.length > 0) {
    const p = futuras[0];
    proximoEvento = {
      uid_evento: p.uid_evento || "",           // ✅ necessário para abrir bilhete direto
      nome: p.evento_nome || "Evento",
      data: p.evento_data_string || "",
      hora: p.evento_hora_string || "",
      local: p.evento_local || "—",
      tipo_bilhete: p.tipo_bilhete || "normal"
    };
  } else if (inscricoes.length > 0) {
    // fallback: mostra o mais “perto” (mesmo que já tenha passado) para não ficar vazio
    const ordenadas = inscricoes
      .map(i => ({ ...i, __dt: parseDataHora(i.evento_data_string, i.evento_hora_string) }))
      .filter(i => i.__dt)
      .sort((a, b) => a.__dt - b.__dt);

    if (ordenadas.length > 0) {
      const p = ordenadas[0];
      proximoEvento = {
        uid_evento: p.uid_evento || "",
        nome: p.evento_nome || "Evento",
        data: p.evento_data_string || "",
        hora: p.evento_hora_string || "",
        local: p.evento_local || "—",
        tipo_bilhete: p.tipo_bilhete || "normal"
      };
    }
  }

  return {
    proximoEvento,
    bilhetes: { total, vip, normal, gastoTotal },
    notificacoes: 5 // manténs como estático
  };
}

/* ===============================
   ORGANIZADOR (mantém simples)
================================ */
function obterDadosOrganizador() {
  return {
    totalArrecadado: 14720.50,
    inscricoesTotais: 412,
    eventosAtivos: 7,
    notificacoes: 2
  };
}

/* ===============================
   RENDER DASHBOARD
================================ */
async function carregarConteudoDashboard(perfil, emailCompleto, uid) {
  const nomeBase = (emailCompleto || "Utilizador").split("@")[0];

  const menuContainer = document.getElementById('menu-principal-dinamico');
  const conteudoContainer = document.getElementById('conteudo-principal-dinamico');
  const nomeUtilizadorEl = document.getElementById('display-nome-utilizador');
  const perfilUtilizadorEl = document.getElementById('display-perfil-utilizador');
  const tituloHeaderEl = document.getElementById('display-header-titulo');
  const subtituloHeaderEl = document.getElementById('display-header-subtitulo');
  const logoLink = document.getElementById('logo-link');

  if (!perfil || (perfil !== 'organizador' && perfil !== 'participante')) {
    if (tituloHeaderEl) tituloHeaderEl.textContent = 'ERRO DE PERFIL';
    if (subtituloHeaderEl) subtituloHeaderEl.textContent = `Perfil inválido: ${perfil}`;
    console.error('Perfil inválido:', perfil);
    return;
  }

  if (logoLink) logoLink.href = 'dashboard.html';

  let menuHTML = '';
  let conteudoHTML = '';

  /* ===============================
     ORGANIZADOR
  ================================ */
  if (perfil === 'organizador') {
    const dados = obterDadosOrganizador();

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
        <div class="widget-top">
          <h3>Total Arrecadado</h3>
          <i class="fas fa-euro-sign"></i>
        </div>
        <p class="widget-numero widget-dinheiro">${euro(dados.totalArrecadado)}</p>
        <p class="widget-detalhe">Receita bruta total (bilhetes normal e VIP).</p>
      </div>

      <div class="widget">
        <div class="widget-top">
          <h3>Inscrições Totais</h3>
          <i class="fas fa-users"></i>
        </div>
        <p class="widget-numero">${dados.inscricoesTotais}</p>
        <p class="widget-detalhe">Total de participantes em todos os eventos.</p>
      </div>

      <div class="widget">
        <div class="widget-top">
          <h3>Eventos Ativos</h3>
          <i class="fas fa-calendar-check"></i>
        </div>
        <p class="widget-numero">${dados.eventosAtivos}</p>
        <p class="widget-detalhe">Eventos com inscrições ativas.</p>
      </div>

      <div class="widget">
        <div class="widget-top">
          <h3>Notificações</h3>
          <i class="fas fa-bell"></i>
        </div>
        <p class="widget-numero">${dados.notificacoes}</p>
        <p class="widget-detalhe">Alertas e pendências não lidas.</p>
      </div>

      <div class="widget widget-cta">
        <h3>Pronto para o próximo evento?</h3>
        <p class="widget-detalhe">Comece a configurar a sua próxima conferência ou workshop.</p>
        <a href="criar_evento.html" class="btn btn-primario"><i class="fas fa-plus-circle"></i> Criar Novo Evento</a>
      </div>
    `;
  }

  /* ===============================
     PARTICIPANTE
  ================================ */
  if (perfil === 'participante') {
    if (tituloHeaderEl) tituloHeaderEl.textContent = `Bem-vindo ${nomeBase}!`;
    if (subtituloHeaderEl) subtituloHeaderEl.textContent = 'Participe nos melhores eventos, workshops e conferências do IPCA!';

    menuHTML = `
      <a href="dashboard.html" class="menu-item active"><i class="fas fa-home"></i><span>Menu Inicial</span></a>
      <a href="explorar_eventos.html" class="menu-item"><i class="fas fa-search"></i><span>Explorar Eventos</span></a>
      <a href="minhas_inscricoes.html" class="menu-item"><i class="fas fa-ticket-alt"></i><span>As Minhas Inscrições</span></a>
      <a href="eventos_favoritos.html" class="menu-item"><i class="fas fa-star"></i><span>Eventos Favoritos</span></a>
      <a href="dados_pessoais.html" class="menu-item"><i class="fas fa-user-cog"></i><span>Gestão de Perfil</span></a>
    `;

    if (conteudoContainer) {
      conteudoContainer.innerHTML = `<p class="widget-detalhe">A carregar dados do dashboard...</p>`;
    }

    const dados = await obterDadosParticipante(uid);

    const prox = dados.proximoEvento;
    const temProximo = !!prox;

    const tipoProx = (prox?.tipo_bilhete || "normal").toUpperCase();

    conteudoHTML = `
      <div class="widget">
        <div class="widget-top">
          <h3>Próximo Evento</h3>
          <i class="fas fa-calendar-alt"></i>
        </div>

        ${
          temProximo
            ? `
              <p class="widget-titulo-destaque">${prox.nome}</p>
              <p class="widget-detalhe"><i class="fas fa-calendar-alt"></i> Data: ${formatDataPT(prox.data)}${prox.hora ? ` · ${prox.hora}` : ""}</p>
              <p class="widget-detalhe"><i class="fas fa-map-marker-alt"></i> Local: ${prox.local}</p>
              <p class="widget-detalhe"><i class="fas fa-ticket-alt"></i> Bilhete: <b>${tipoProx}</b></p>

              <div class="widget-actions">
                <a href="minhas_inscricoes.html?evento=${encodeURIComponent(prox.uid_evento || "")}"
                   class="btn btn-primario">
                  <i class="fas fa-ticket-alt"></i> Abrir bilhete
                </a>
              </div>
            `
            : `
              <p class="widget-detalhe" style="margin-top:6px;">Ainda não tens inscrições.</p>
              <p class="widget-detalhe">Explora eventos e garante o teu lugar.</p>
              <div class="widget-actions">
                <a href="explorar_eventos.html" class="btn btn-primario"><i class="fas fa-search"></i> Explorar Eventos</a>
              </div>
            `
        }
      </div>

      <div class="widget">
        <div class="widget-top">
          <h3>Os Meus Bilhetes</h3>
          <i class="fas fa-ticket-alt"></i>
        </div>

        <p class="widget-numero">${dados.bilhetes.total}</p>
        <p class="widget-detalhe">VIP: <b>${dados.bilhetes.vip}</b> · Normal: <b>${dados.bilhetes.normal}</b></p>

        <div class="linha-separador"></div>

        <p class="widget-numero widget-dinheiro">${euro(dados.bilhetes.gastoTotal)}</p>
        <p class="widget-detalhe">Gasto total em bilhetes</p>

        <div class="widget-actions">
          <a href="minhas_inscricoes.html" class="btn btn-primario"><i class="fas fa-receipt"></i> Ver bilhetes</a>
        </div>
      </div>

      <div class="widget">
        <div class="widget-top">
          <h3>Notificações</h3>
          <i class="fas fa-bell"></i>
        </div>
        <p class="widget-numero">${dados.notificacoes}</p>
        <p class="widget-detalhe">Alertas e lembretes não lidos.</p>
      </div>

      <div class="widget widget-cta">
        <h3>Descubra a sua próxima experiência</h3>
        <p class="widget-detalhe">Encontre conferências, workshops e seminários na sua área.</p>
        <a href="explorar_eventos.html" class="btn btn-primario"><i class="fas fa-search"></i> Explorar Eventos</a>
      </div>
    `;
  }

  if (menuContainer) menuContainer.innerHTML = menuHTML;
  if (conteudoContainer) conteudoContainer.innerHTML = conteudoHTML;

  if (nomeUtilizadorEl) nomeUtilizadorEl.textContent = nomeBase;
  if (perfilUtilizadorEl) perfilUtilizadorEl.textContent = capitalizar(perfil);

  // Toggle sidebar (mantém comportamento)
  const tBtn = document.getElementById('toggle-sidebar');
  const cont = document.getElementById('dashboard-container');

  if (tBtn && cont) {
    const isRecolhida = localStorage.getItem('sidebarRecolhida') === 'true';
    if (isRecolhida) {
      cont.classList.add('sidebar-recolhida');
      tBtn.textContent = '→';
    } else {
      tBtn.textContent = '←';
    }

    tBtn.onclick = () => {
      cont.classList.toggle('sidebar-recolhida');
      const novoEstado = cont.classList.contains('sidebar-recolhida');
      localStorage.setItem('sidebarRecolhida', novoEstado);
      tBtn.textContent = novoEstado ? '→' : '←';
    };
  }
}

/* ===============================
   MAIN
================================ */
document.addEventListener('DOMContentLoaded', () => {
  const btnLogout = document.getElementById('btn-logout');

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    try {
      const uid = user.uid;

      const doc = await db.collection("utilizadores").doc(uid).get();
      if (!doc.exists) {
        console.error("Perfil não encontrado no Firestore.");
        await auth.signOut();
        window.location.href = "./login.html";
        return;
      }

      const perfil = doc.data().perfil;
      await carregarConteudoDashboard(perfil, user.email, uid);

    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
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
        console.error("Erro ao fazer logout:", error);
      }
    });
  }
});
