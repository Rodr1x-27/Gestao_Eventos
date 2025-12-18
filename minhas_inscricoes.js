import { auth, db } from "./firebase_connection.js";

const listaEl = document.getElementById("lista-inscricoes");
const nomeEl = document.getElementById("display-nome-utilizador");
const btnLogout = document.getElementById("btn-logout");

// Sidebar toggle
const toggleBtn = document.getElementById("toggle-sidebar");
const container = document.getElementById("dashboard-container");

function aplicarSidebarToggle() {
  if (!toggleBtn || !container) return;

  const isRecolhida = localStorage.getItem("sidebarRecolhida") === "true";
  if (isRecolhida) {
    container.classList.add("sidebar-recolhida");
    toggleBtn.textContent = "→";
  } else {
    toggleBtn.textContent = "←";
  }

  toggleBtn.addEventListener("click", () => {
    container.classList.toggle("sidebar-recolhida");
    const novoEstado = container.classList.contains("sidebar-recolhida");
    localStorage.setItem("sidebarRecolhida", novoEstado);
    toggleBtn.textContent = novoEstado ? "→" : "←";
  });
}

function euro(n) {
  const v = Number(n ?? 0);
  return v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function fmtData(d) {
  try {
    if (d && typeof d.toDate === "function") {
      return d.toDate().toLocaleString("pt-PT");
    }
  } catch {}
  return "—";
}

function badge(status) {
  const s = (status || "pendente").toLowerCase();
  const cls = s === "pago" ? "badge-status pago" : "badge-status pendente";
  return `<span class="${cls}">${(status || "pendente").toUpperCase()}</span>`;
}

function cardInscricao(item) {
  const e = item.evento || {};
  const tipoBilhete = (item.tipoBilhete || "—").toUpperCase();
  const qtd = item.quantidade ?? "—";
  const total = item.total != null ? euro(item.total) : "—";

  return `
    <div class="widget widget-inscricao">
      <h3 style="margin:0 0 8px 0;">${e.nome || "Evento"}</h3>

      <p class="widget-detalhe"><i class="fas fa-calendar-alt"></i> ${e.data_string || "Data a definir"} ${e.hora_string ? " · " + e.hora_string : ""}</p>
      <p class="widget-detalhe"><i class="fas fa-map-marker-alt"></i> ${e.local || "Local a definir"}</p>

      <hr style="margin:12px 0;">

      <p class="widget-detalhe"><i class="fas fa-ticket-alt"></i> Bilhete: <strong>${tipoBilhete}</strong></p>
      <p class="widget-detalhe"><i class="fas fa-sort-numeric-up"></i> Quantidade: <strong>${qtd}</strong></p>
      <p class="widget-detalhe"><i class="fas fa-euro-sign"></i> Total: <strong>${total}</strong></p>

      <div class="linha">
        <div>${badge(item.status)}</div>
        <div class="compra-em">Comprado em: ${fmtData(item.createdAt)}</div>
      </div>

      <div style="margin-top:12px;">
        <a class="btn-logout" href="explorar_eventos.html"><i class="fas fa-search"></i> <span>Comprar mais</span></a>
      </div>
    </div>
  `;
}

async function carregarInscricoes(uid) {
  listaEl.innerHTML = `<p class="widget-detalhe">A carregar as tuas inscrições...</p>`;

  const snap = await db.collection("inscricoes").where("uid", "==", uid).get();
  if (snap.empty) {
    listaEl.innerHTML = `<p class="widget-detalhe">Ainda não compraste bilhetes. Vai a "Explorar Eventos".</p>`;
    return;
  }

  const inscricoes = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const resultado = [];
  for (const ins of inscricoes) {
    const evDoc = await db.collection("eventos").doc(ins.eventoId).get();
    const evento = evDoc.exists ? { id: evDoc.id, ...evDoc.data() } : null;
    resultado.push({ ...ins, evento });
  }

  resultado.sort((a, b) => {
    const da = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
    const dbb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
    return dbb - da;
  });

  listaEl.innerHTML = resultado.map(cardInscricao).join("");
}

// Logout
btnLogout.addEventListener("click", async (e) => {
  e.preventDefault();
  await auth.signOut();
  window.location.href = "./login.html";
});

aplicarSidebarToggle();

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "./login.html";
    return;
  }

  const doc = await db.collection("utilizadores").doc(user.uid).get();
  const perfil = doc.exists ? doc.data().perfil : null;
  if (perfil !== "participante") {
    window.location.href = "./dashboard.html";
    return;
  }

  nomeEl.textContent = user.email.split("@")[0];
  await carregarInscricoes(user.uid);
});
