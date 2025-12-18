import { db, auth, firebase } from "./firebase_connection.js";

const listaEl = document.getElementById("lista-eventos");
const pesquisaEl = document.getElementById("pesquisa");
const tipoEl = document.getElementById("tipo");
const nomeEl = document.getElementById("display-nome-utilizador");
const btnLogout = document.getElementById("btn-logout");
const debugErro = document.getElementById("debug-erro");

// sidebar toggle (igual ao resto)
const toggleBtn = document.getElementById("toggle-sidebar");
const container = document.getElementById("dashboard-container");

function showErro(msg) {
  console.error(msg);
  if (debugErro) {
    debugErro.style.display = "block";
    debugErro.textContent = msg;
  }
}

function euro(n) {
  const v = Number(n ?? 0);
  return v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function aplicarSidebarToggle() {
  if (!toggleBtn || !container) return;
  const isRecolhida = localStorage.getItem("sidebarRecolhida") === "true";
  if (isRecolhida) {
    container.classList.add("sidebar-recolhida");
    toggleBtn.textContent = "→";
  } else toggleBtn.textContent = "←";

  toggleBtn.addEventListener("click", () => {
    container.classList.toggle("sidebar-recolhida");
    const novoEstado = container.classList.contains("sidebar-recolhida");
    localStorage.setItem("sidebarRecolhida", novoEstado);
    toggleBtn.textContent = novoEstado ? "→" : "←";
  });
}

let eventos = [];

function cardEvento(e) {
  const normal = e?.precos?.normal;
  const vip = e?.precos?.vip;

  const inscritos = e.inscritos_atuais ?? 0;
  const max = e.max_participantes ?? "—";

  return `
    <div class="widget widget-evento">
      <h3 style="margin:0 0 8px 0;">${e.nome || "Evento"}</h3>

      <p class="widget-detalhe"><i class="fas fa-calendar-alt"></i>
        ${e.data_string || "—"}${e.hora_string ? " · " + e.hora_string : ""}
      </p>

      <p class="widget-detalhe"><i class="fas fa-map-marker-alt"></i> ${e.local || "—"}</p>

      <p class="widget-detalhe"><i class="fas fa-users"></i> ${inscritos} / ${max}</p>

      <p class="widget-detalhe"><i class="fas fa-euro-sign"></i>
        Normal: ${normal == null ? "—" : euro(normal)} | VIP: ${vip == null ? "—" : euro(vip)}
      </p>
    </div>
  `;
}

function render() {
  const termo = (pesquisaEl.value || "").toLowerCase().trim();
  const tipo = tipoEl.value || "todos";

  const filtrados = eventos.filter((e) => {
    const texto = `${e.nome || ""} ${e.local || ""}`.toLowerCase();
    const matchPesquisa = !termo || texto.includes(termo);

    // tipo pode não existir nos docs antigos
    const t = (e.tipo || "academico").toLowerCase();
    const matchTipo = (tipo === "todos") || (t === tipo);

    return matchPesquisa && matchTipo;
  });

  if (!filtrados.length) {
    listaEl.innerHTML = `<p class="widget-detalhe">Nenhum evento encontrado.</p>`;
    return;
  }

  listaEl.innerHTML = filtrados.map(cardEvento).join("");
}

async function carregarEventos() {
  try {
    listaEl.innerHTML = `<p class="widget-detalhe">A carregar eventos...</p>`;

    console.log("A ler Firestore: eventos where estado == ativo");

    const snap = await db.collection("eventos").where("estado", "==", "ativo").get();

    console.log("Docs encontrados:", snap.size);

    eventos = [];
    snap.forEach((doc) => {
      eventos.push({ id: doc.id, ...doc.data() });
    });

    render();
  } catch (err) {
    showErro("ERRO a carregar eventos: " + (err?.message || String(err)));
    listaEl.innerHTML = `<p class="widget-detalhe">Erro ao carregar eventos.</p>`;
  }
}

// Logout
btnLogout.addEventListener("click", async (e) => {
  e.preventDefault();
  await auth.signOut();
  window.location.href = "./login.html";
});

aplicarSidebarToggle();
pesquisaEl.addEventListener("input", render);
tipoEl.addEventListener("change", render);

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "./login.html";
    return;
  }

  nomeEl.textContent = (user.email || "Utilizador").split("@")[0];

  // ✅ chama o carregamento
  await carregarEventos();
});
