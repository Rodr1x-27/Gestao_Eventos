import { auth, db } from "./firebase_connection.js";

const listaEl = document.getElementById("lista-favoritos");
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

function favoritoDocId(uid, eventoId) {
  return `${uid}_${eventoId}`;
}

function cardEvento(e) {
  const dataTxt = e.data_string || "Data a definir";
  const horaTxt = e.hora_string ? ` · ${e.hora_string}` : "";
  const normal = e?.precos?.normal ?? null;
  const vip = e?.precos?.vip ?? null;

  return `
    <div class="widget widget-favorito">
      <div class="topo">
        <h3 style="margin:0 0 8px 0;">${e.nome || "Evento"}</h3>
        <button class="btn-remover-fav" data-remover="${e.id}" title="Remover dos favoritos">★</button>
      </div>

      <p class="widget-detalhe"><i class="fas fa-calendar-alt"></i> ${dataTxt}${horaTxt}</p>
      <p class="widget-detalhe"><i class="fas fa-map-marker-alt"></i> ${e.local || "Local a definir"}</p>
      <p class="widget-detalhe"><i class="fas fa-tag"></i> Tipo: ${e.tipo || "academico"}</p>
      <p class="widget-detalhe"><i class="fas fa-euro-sign"></i>
        Normal: ${normal == null ? "—" : euro(normal)} | VIP: ${vip == null ? "—" : euro(vip)}
      </p>

      <div style="margin-top:12px;">
        <a class="btn-logout" href="explorar_eventos.html"><i class="fas fa-search"></i> <span>Voltar a Explorar</span></a>
      </div>
    </div>
  `;
}

async function carregarFavoritos(uid) {
  listaEl.innerHTML = `<p class="widget-detalhe">A carregar favoritos...</p>`;

  const favSnap = await db.collection("favoritos").where("uid", "==", uid).get();
  const favIds = favSnap.docs.map(d => d.data().eventoId);

  if (!favIds.length) {
    listaEl.innerHTML = `<p class="widget-detalhe">Ainda não tens favoritos. Vai a "Explorar Eventos" e marca ★.</p>`;
    return;
  }

  const eventos = [];
  for (const eventoId of favIds) {
    const evDoc = await db.collection("eventos").doc(eventoId).get();
    if (evDoc.exists) eventos.push({ id: evDoc.id, ...evDoc.data() });
  }

  listaEl.innerHTML = eventos.map(cardEvento).join("");

  document.querySelectorAll("[data-remover]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const eventoId = btn.getAttribute("data-remover");
      await db.collection("favoritos").doc(favoritoDocId(uid, eventoId)).delete();
      await carregarFavoritos(uid);
    });
  });
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
  await carregarFavoritos(user.uid);
});
