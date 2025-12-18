import { db, auth, firebase } from './firebase_connection.js';

document.addEventListener('DOMContentLoaded', () => {

  const form = document.getElementById('form-criar-evento');

  // Verificar se o utilizador está autenticado
  auth.onAuthStateChanged((user) => {
    if (!user) {
      alert("Precisa de estar logado para criar eventos.");
      window.location.href = "login.html";
    }
  });

  function showMsg(msg, tipo = "error") {
    // se existir showNotification no teu projeto, usa
    if (typeof window.showNotification === "function") {
      window.showNotification(msg, tipo);
    } else {
      alert(msg);
    }
  }

  function setValidacaoNumero(input, min, msg) {
    input.addEventListener('input', () => {
      const valor = input.value.trim();

      input.setCustomValidity("");

      if (valor === "") {
        if (input.hasAttribute('required')) {
          input.setCustomValidity("Por favor, preencha este campo.");
        }
      } else if (!isNaN(parseFloat(valor)) && parseFloat(valor) < min) {
        input.setCustomValidity(msg);
      } else {
        input.setCustomValidity("");
      }

      input.reportValidity();
    });
  }

  // Captura os inputs (para validação)
  const maxParticipantesInput = document.getElementById('maxParticipantes');
  const numOradoresInput = document.getElementById('numOradores');
  const precoNormalInput = document.getElementById('precoNormal');
  const precoVipInput = document.getElementById('precoVip');

  setValidacaoNumero(maxParticipantesInput, 1, "O máximo de participantes deve ser pelo menos 1.");
  setValidacaoNumero(numOradoresInput, 0, "O número de oradores não pode ser negativo.");
  setValidacaoNumero(precoNormalInput, 0, "O preço normal não pode ser negativo.");
  setValidacaoNumero(precoVipInput, 0, "O preço VIP não pode ser negativo.");

  // Submeter o Formulário
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return;

    const btn = document.querySelector('.btn-submeter');
    const textoOriginal = btn ? btn.textContent : "";
    if (btn) {
      btn.textContent = "A publicar...";
      btn.disabled = true;
    }

    try {
      // 1) Capturar valores
      const nome = document.getElementById('nomeEvento').value.trim();
      const local = document.getElementById('localEvento').value.trim();

      const maxParticipantes = parseInt(document.getElementById('maxParticipantes').value, 10);

      const dataStr = document.getElementById('dataEvento').value; // ideal: input type="date" => YYYY-MM-DD
      const horaStr = document.getElementById('horaEvento').value; // ideal: input type="time" => HH:MM

      // (Recomendado) Tipo do evento (se tiveres um select com id="tipoEvento")
      // Se não tiveres no HTML, isto fica automaticamente "academico"
      const tipoEl = document.getElementById('tipoEvento');
      const tipo = tipoEl ? (tipoEl.value || "academico") : "academico";

      // Oradores
      const numOradores = parseInt(document.getElementById('numOradores').value, 10) || 0;
      const nomesOradoresTexto = document.getElementById('nomesOradores').value || "";
      const listaOradores = nomesOradoresTexto
        .split(',')
        .map(n => n.trim())
        .filter(n => n !== "");

      // Preços
      const precoNormal = parseFloat(document.getElementById('precoNormal').value);
      const precoVipRaw = document.getElementById('precoVip').value;
      const precoVip = precoVipRaw !== "" ? parseFloat(precoVipRaw) : null;

      // 2) Validações
      let mensagemErro = null;

      if (!nome) mensagemErro = "O Nome do Evento é obrigatório.";
      else if (!local) mensagemErro = "A Localização / Morada é obrigatória.";
      else if (isNaN(maxParticipantes) || maxParticipantes <= 0) mensagemErro = "O Máximo de Participantes deve ser um número válido e positivo.";
      else if (!dataStr) mensagemErro = "A Data do Evento é obrigatória.";
      else if (!horaStr) mensagemErro = "A Hora do Evento é obrigatória.";
      else if (numOradores < 0) mensagemErro = "O número de oradores não pode ser negativo.";
      else if (isNaN(precoNormal) || precoNormal <= 0) mensagemErro = "O Preço Bilhete Normal deve ser um valor válido e positivo.";

      if (mensagemErro) {
        showMsg(`🛑 Erro de Validação: ${mensagemErro}`, 'error');

        // 🔥 IMPORTANTE: reativar botão ao sair por erro
        if (btn) {
          btn.textContent = textoOriginal;
          btn.disabled = false;
        }
        return;
      }

      // 3) Criar data com segurança
      // Se dataStr for YYYY-MM-DD, isto funciona bem.
      // Se por algum motivo vier num formato estranho, ainda assim evitamos datas malucas.
      let dataHoraCombinada;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr) && /^\d{2}:\d{2}/.test(horaStr)) {
        dataHoraCombinada = new Date(`${dataStr}T${horaStr}:00`);
      } else {
        // fallback (menos ideal)
        dataHoraCombinada = new Date(`${dataStr} ${horaStr}`);
      }

      // 4) Objeto do Evento (compatível com tudo)
      const novoEvento = {
        nome,
        local,
        tipo, // ✅ agora dá para filtrar no explorar
        max_participantes: maxParticipantes,

        num_oradores: numOradores,
        oradores: listaOradores,

        data_inicio: firebase.firestore.Timestamp.fromDate(dataHoraCombinada),
        data_string: dataStr,
        hora_string: horaStr,

        precos: {
          normal: precoNormal,
          vip: precoVip
        },

        // ✅ mantemos o teu campo (para não partir nada)
        responsavel_uid: user.uid,

        // ✅ ADICIONAMOS o campo “padrão” (para correlação universal)
        organizadorUid: user.uid,

        estado: "ativo",
        inscritos_atuais: 0,

        // ✅ timestamps (mantemos o teu + adicionamos o padrão)
        criado_em: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      // 5) Guardar no Firestore
      await db.collection("eventos").add(novoEvento);

      // redirecionar
      window.location.href = "dashboard.html";

    } catch (error) {
      console.error("Erro ao criar evento:", error);
      alert("Erro ao criar o evento: " + error.message);

      if (btn) {
        btn.textContent = textoOriginal;
        btn.disabled = false;
      }
    }
  });

});
