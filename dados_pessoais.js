import { db, auth } from "./firebase_connection.js";
const firebase = window.firebase;

const nomeSidebarEl = document.getElementById("display-nome-utilizador");
const perfilSidebarEl = document.getElementById("display-perfil-utilizador");
const perfilPill = document.getElementById("perfil-pill");

const btnLogout = document.getElementById("btn-logout");
const debugErro = document.getElementById("debug-erro");

const emailEl = document.getElementById("email");
const nomeEl = document.getElementById("nome");
const idadeEl = document.getElementById("idade");
const telemovelEl = document.getElementById("telemovel");
const cursoEl = document.getElementById("curso");
const bioEl = document.getElementById("bio");

const form = document.getElementById("form-perfil");
const btnGuardar = document.getElementById("btn-guardar");
const statusEl = document.getElementById("status");

const infoConta = document.getElementById("info-conta");
const infoUid = document.getElementById("info-uid");
const infoCriado = document.getElementById("info-criado");

// ✅ novo: form password
const formPass = document.getElementById("form-pass");
const passAtualEl = document.getElementById("pass-atual");
const passNovaEl = document.getElementById("pass-nova");
const passConfirmarEl = document.getElementById("pass-confirmar");
const btnMudarPass = document.getElementById("btn-mudar-pass");
const statusPassEl = document.getElementById("status-pass");

// sidebar toggle
const toggleBtn = document.getElementById("toggle-sidebar");
const container = document.getElementById("dashboard-container");

function showErro(msg) {
  console.error(msg);
  if (debugErro) {
    debugErro.style.display = "block";
    debugErro.textContent = msg;
  }
}

function setStatusOk(el, msg) {
  el.className = "status ok";
  el.style.display = "block";
  el.textContent = msg;
}

function setStatusErr(el, msg) {
  el.className = "status err";
  el.style.display = "block";
  el.textContent = msg;
}

function clearStatus(el) {
  if (!el) return;
  el.style.display = "none";
  el.textContent = "";
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

async function carregarPerfil(uid, user) {
  if (debugErro) debugErro.style.display = "none";
  clearStatus(statusEl);
  clearStatus(statusPassEl);

  emailEl.value = user.email || "";

  infoConta.textContent = user.email || "—";
  infoUid.textContent = uid || "—";
  infoCriado.textContent = user.metadata?.creationTime || "—";

  const ref = db.collection("utilizadores").doc(uid);
  const doc = await ref.get();

  if (!doc.exists) {
    await ref.set({
      perfil: "participante",
      nome: "",
      idade: "",
      telemovel: "",
      curso: "",
      bio: "",
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  const doc2 = await ref.get();
  const data = doc2.data() || {};

  const perfil = data.perfil || "participante";

  // sidebar
  const nomeBase = (user.email || "Utilizador").split("@")[0];
  nomeSidebarEl.textContent = data.nome?.trim() ? data.nome : nomeBase;

  const perfilTxt = perfil.charAt(0).toUpperCase() + perfil.slice(1);
  perfilSidebarEl.textContent = perfilTxt;
  if (perfilPill) perfilPill.textContent = perfilTxt;

  // campos
  nomeEl.value = data.nome || "";
  idadeEl.value = data.idade || "";
  telemovelEl.value = data.telemovel || "";
  cursoEl.value = data.curso || "";
  bioEl.value = data.bio || "";
}

async function guardarPerfil(uid) {
  clearStatus(statusEl);

  const payload = {
    nome: nomeEl.value.trim(),
    idade: idadeEl.value ? Number(idadeEl.value) : "",
    telemovel: telemovelEl.value.trim(),
    curso: cursoEl.value.trim(),
    bio: bioEl.value.trim(),
    atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
  };

  btnGuardar.disabled = true;
  btnGuardar.innerHTML = `<i class="fas fa-spinner fa-spin"></i> A guardar...`;

  try {
    await db.collection("utilizadores").doc(uid).set(payload, { merge: true });
    // atualiza também nome na sidebar
    const user = auth.currentUser;
    const nomeBase = (user?.email || "Utilizador").split("@")[0];
    nomeSidebarEl.textContent = payload.nome || nomeBase;

    setStatusOk(statusEl, "Alterações guardadas com sucesso ✅");
  } catch (err) {
    setStatusErr(statusEl, "Erro ao guardar: " + (err?.message || String(err)));
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.innerHTML = `<i class="fas fa-save"></i> Guardar alterações`;
  }
}

/* ============================
   ✅ PASSWORD REAL (Firebase Auth)
   - Reautentica com password atual
   - updatePassword(nova)
============================ */
async function mudarPasswordReal() {
  clearStatus(statusPassEl);

  const user = auth.currentUser;
  if (!user || !user.email) {
    setStatusErr(statusPassEl, "Sessão inválida. Faz login novamente.");
    return;
  }

  const atual = passAtualEl.value;
  const nova = passNovaEl.value;
  const conf = passConfirmarEl.value;

  if (!atual || !nova || !conf) {
    setStatusErr(statusPassEl, "Preenche todos os campos.");
    return;
  }
  if (nova.length < 6) {
    setStatusErr(statusPassEl, "A nova password deve ter pelo menos 6 caracteres.");
    return;
  }
  if (nova !== conf) {
    setStatusErr(statusPassEl, "A confirmação não coincide com a nova password.");
    return;
  }
  if (nova === atual) {
    setStatusErr(statusPassEl, "A nova password tem de ser diferente da atual.");
    return;
  }

  btnMudarPass.disabled = true;
  btnMudarPass.innerHTML = `<i class="fas fa-spinner fa-spin"></i> A atualizar...`;

  try {
    // ✅ reautenticação
    const cred = firebase.auth.EmailAuthProvider.credential(user.email, atual);
    await user.reauthenticateWithCredential(cred);

    // ✅ update real
    await user.updatePassword(nova);

    setStatusOk(statusPassEl, "Password alterada com sucesso ✅");
    formPass.reset();
  } catch (err) {
    const code = err?.code || "";
    if (code.includes("auth/wrong-password")) {
      setStatusErr(statusPassEl, "Password atual incorreta.");
    } else if (code.includes("auth/too-many-requests")) {
      setStatusErr(statusPassEl, "Muitas tentativas. Tenta novamente mais tarde.");
    } else if (code.includes("auth/requires-recent-login")) {
      setStatusErr(statusPassEl, "Sessão antiga. Faz logout e login novamente e tenta outra vez.");
    } else {
      setStatusErr(statusPassEl, "Erro: " + (err?.message || String(err)));
    }
  } finally {
    btnMudarPass.disabled = false;
    btnMudarPass.innerHTML = `<i class="fas fa-key"></i> Guardar password`;
  }
}

// Logout
btnLogout.addEventListener("click", async (e) => {
  e.preventDefault();
  await auth.signOut();
  window.location.href = "./login.html";
});

aplicarSidebarToggle();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;
  await guardarPerfil(user.uid);
});

if (formPass) {
  formPass.addEventListener("submit", async (e) => {
    e.preventDefault();
    await mudarPasswordReal();
  });
}

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "./login.html";
    return;
  }
  try {
    await carregarPerfil(user.uid, user);
  } catch (err) {
    showErro("Erro ao carregar perfil: " + (err?.message || String(err)));
  }
});
