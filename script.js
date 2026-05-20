// ===================================================
// 1. CONFIGURAÇÃO E CONEXÃO COM O SERVIDOR (FIREBASE)
// ===================================================
const firebaseConfig = {
  apiKey: "AIzaSyBe7jdY2y04Uw1DuQ9T6f5NXJOqPzRPPZo",
  authDomain: "alerta-bairro-8adce.firebaseapp.com",
  projectId: "alerta-bairro-8adce",
  storageBucket: "alerta-bairro-8adce.firebasestorage.app",
  messagingSenderId: "726524118429",
  appId: "1:726524118429:web:35f9dc6935efb157321b74"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth(); 

// ===================================================
// 2. VARIÁVEIS GERAIS E CONFIGURAÇÃO DO MAPA (LEAFLET)
// ===================================================
let alertas = [];
let marcadores = [];
let radarAtivo = false;
let idRastreio = null;

// Novas variáveis cruciais para você aparecer no mapa
let marcadorUsuario = null; // O pino azul que é você
let circuloRadar = null;   // O círculo azul de 500m ao seu redor
let ultimaLatUsuario = null; // Guarda a última lat conhecida para centralizar
let ultimaLngUsuario = null; // Guarda a última lng conhecida

// Centraliza inicialmente em Manaus como backup
const mapa = L.map('mapa').setView([-3.1190, -60.0217], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(mapa);


// ===================================================
// 3. OUVINDO O BANCO DE DADOS EM TEMPO REAL
// ===================================================
db.collection("alertas").orderBy("data", "desc").onSnapshot((querySnapshot) => {
  alertas = []; 
  querySnapshot.forEach((doc) => {
    alertas.push(doc.data());
  });
  renderizarAlertas(); 
  carregarMarcadores(); 
});


// ===================================================
// 4. SISTEMA DE CONTAS (LOGIN, CADASTRO, MOSTRAR SENHA)
// ===================================================
function mostrarOcultarSenhaLogin() {
  const campoSenha = document.getElementById('senha');
  if (campoSenha.type === 'password') {
    campoSenha.type = 'text';
  } else {
    campoSenha.type = 'password';
  }
}

function criarConta() {
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;
  if (!email || !senha) {
    alert('Por favor, preencha o e-mail e a senha para criar a conta!');
    return;
  }
  auth.createUserWithEmailAndPassword(email, senha)
    .then(() => {
      alert('Conta criada com sucesso! Bem-vindo(a) ao Alerta Bairro.');
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('sistema').style.display = 'block';
    })
    .catch((erro) => {
      alert('Erro ao criar conta. A senha deve ter no mínimo 6 caracteres ou o e-mail já está em uso.');
    });
}

function login() {
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;
  if (!email || !senha) {
    alert('Por favor, preencha o e-mail e a senha!');
    return;
  }
  auth.signInWithEmailAndPassword(email, senha)
    .then(() => {
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('sistema').style.display = 'block';
    })
    .catch((erro) => {
      alert('E-mail ou senha inválidos. Tente novamente.');
    });
}

function recuperarSenha() {
  const email = document.getElementById('email').value;
  if (!email) {
    alert('Por favor, digite o seu e-mail na caixa acima e clique em "Esqueceu a senha?" novamente.');
    return;
  }
  auth.sendPasswordResetEmail(email)
    .then(() => {
      alert('E-mail de recuperação enviado! Verifique a sua caixa de entrada.');
    })
    .catch((erro) => {
      alert('Erro ao enviar e-mail. Verifique se o e-mail está correto.');
    });
}

function loginComGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then((resultado) => {
      const nomeUsuario = resultado.user.displayName;
      alert('Bem-vindo(a), ' + nomeUsuario + '!');
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('sistema').style.display = 'block';
    })
    .catch((erro) => {
      alert('Erro do Google/Firebase: ' + erro.message);
    });
}

function sair() {
  auth.signOut().then(() => {
    document.getElementById('email').value = '';
    document.getElementById('senha').value = '';
    document.getElementById('mostrar').checked = false;
    document.getElementById('senha').type = 'password';
    document.getElementById('loginPage').style.display = 'block';
    document.getElementById('sistema').style.display = 'none';
    
    // Desliga o rastreio de localização ao sair, por privacidade
    if (radarAtivo) {
        navigator.geolocation.clearWatch(idRastreio);
    }
  });
}


// ===================================================
// 5. RADAR DE SEGURANÇA E GEOLOCALIZAÇÃO INTEGRADAS NOVO!
// ===================================================

function iniciarRadar() {
  if (!radarAtivo) {
    if (navigator.geolocation) {
      document.getElementById('textoRadar').innerText = "Buscando satélite...";
      document.getElementById('detalheRadar').innerText = "A aguardar a sua localização exata...";
      document.getElementById('statusRadar').style.background = "#fff9c4"; 
      document.getElementById('btnRadar').innerText = "Desligar Sonar";
      document.getElementById('btnRadar').style.background = "#c62828"; 
      
      // watchPosition é o "padrão ouro", ele rastreia você enquanto você anda.
      idRastreio = navigator.geolocation.watchPosition(atualizarLocalizacaoERadar, erroLocalizacao, {
        enableHighAccuracy: true, // Força o uso do GPS do celular, não só internet
        timeout: 10000,
        maximumAge: 0
      });
      radarAtivo = true;
    } else {
      alert("O seu navegador não suporta geolocalização.");
    }
  } else {
    // Desligar o Radar
    navigator.geolocation.clearWatch(idRastreio);
    document.getElementById('textoRadar').innerText = "Radar Desligado";
    document.getElementById('detalheRadar').innerText = "Clique no botão abaixo para ativar.";
    document.getElementById('statusRadar').style.background = "#e0e0e0"; 
    document.getElementById('textoRadar').style.color = "#333";
    document.getElementById('btnRadar').innerText = "Ligar Sonar";
    document.getElementById('btnRadar').style.background = "#2E7D32"; 
    radarAtivo = false;
  }
}

// Essa função faz o trabalho duplo: atualiza o Sonar (tela vermelha) E desenha você no mapa.
function atualizarLocalizacaoERadar(posicao) {
  ultimaLatUsuario = posicao.coords.latitude;
  ultimaLngUsuario = posicao.coords.longitude;
  const precisao = posicao.coords.accuracy; // Precisão do GPS em metros
  const pontoUsuario = L.latLng(ultimaLatUsuario, ultimaLngUsuario);
  
  // --- PARTE 1: DESENHAR VOCÊ E O SONAR NO MAPA ---
  
  // Se for a primeira vez que acha o GPS, cria os objetos
  if (!marcadorUsuario) {
    marcadorUsuario = L.marker([ultimaLatUsuario, ultimaLngUsuario]).addTo(mapa)
      .bindPopup("📍 <b>Você está aqui!</b>").openPopup();
    
    // Desenha o círculo do sonar com 500m de raio
    circuloRadar = L.circle([ultimaLatUsuario, ultimaLngUsuario], {
      color: '#4285F4', // Azul do Google
      fillColor: '#4285F4',
      fillOpacity: 0.15, // Transparência do círculo
      radius: 500 // O raio do sonar!
    }).addTo(mapa);
    
    // Ativa o botão de centralizar
    document.getElementById('btnCentralizar').disabled = false;
    
    // Voo suave para centralizar na pessoa na primeira vez
    mapa.flyTo([ultimaLatUsuario, ultimaLngUsuario], 15);
  } else {
    // Se a pessoa andou e o GPS atualizou, nós só movemos os objetos existentes
    marcadorUsuario.setLatLng([ultimaLatUsuario, ultimaLngUsuario]);
    circuloRadar.setLatLng([ultimaLatUsuario, ultimaLngUsuario]);
    // circuloRadar.setRadius(500); // Se quiser que o raio mude com a precisão do GPS
  }
  
  // --- PARTE 2: LÓGICA DO SONAR (TELA VERMELHA) ---
  
  let perigoProximo = null;
  let menorDistancia = 500; // Raio de perigo: 500 metros

  // Calcula a distância entre você e cada alerta do Firebase
  alertas.forEach(alerta => {
    if (alerta.lat && alerta.lng) {
      const pontoAlerta = L.latLng(alerta.lat, alerta.lng);
      const distancia = pontoUsuario.distanceTo(pontoAlerta); // Ferramenta secreta do Mapa! Distância em metros.

      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        perigoProximo = alerta;
      }
    }
  });

  const divStatus = document.getElementById('statusRadar');
  const txtRadar = document.getElementById('textoRadar');
  const txtDetalhe = document.getElementById('detalheRadar');

  if (perigoProximo) {
    // ESTÁ EM PERIGO!
    divStatus.style.background = "#ffcdd2"; 
    txtRadar.style.color = "#c62828";
    txtRadar.innerText = "🚨 PERIGO NA ZONA 🚨";
    txtDetalhe.innerText = `Atenção! Um alerta de "${perigoProximo.tipo}" está a apenas ${Math.round(menorDistancia)} metros de si!`;
    
    // Faz o telemóvel vibrar (funciona apenas em dispositivos móveis compatíveis)
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500]); 
    }
  } else {
    // ESTÁ SEGURO!
    divStatus.style.background = "#c8e6c9"; 
    txtRadar.style.color = "#2e7d32";
    txtRadar.innerText = "✅ Área Segura";
    txtDetalhe.innerText = "Nenhum alerta registado num raio de 500 metros da sua posição.";
  }
}

function erroLocalizacao(erro) {
  // Se o usuário negar a permissão, nós avisamos.
  alert("Erro ao procurar localização. Verifique se o seu GPS está ligado e se deu permissão ao site para ver o seu local na barra de endereços.");
  document.getElementById('textoRadar').innerText = "GPS Desativado";
  document.getElementById('detalheRadar').innerText = "Localização não disponível.";
}


// ===================================================
// 6. FUNÇÃO CENTRALIZAR NO MAPA NOVO!
// ===================================================
function centrarEmMim() {
  if (ultimaLatUsuario && ultimaLngUsuario) {
    // Mapa voa suavemente para você
    mapa.flyTo([ultimaLatUsuario, ultimaLngUsuario], 15);
    marcadorUsuario.openPopup();
  } else {
    alert("Aguardando localização do GPS... Ligue o sonar na tela inicial primeiro.");
  }
}


// ===================================================
// 7. FUNÇÕES GERAIS (NAVEGAÇÃO E ALERTAS)
// ===================================================
function mostrarPagina(id){
  const paginas = document.querySelectorAll('.pagina');
  paginas.forEach(pagina => { pagina.classList.remove('ativa'); });
  document.getElementById(id).classList.add('ativa');
  
  // Bug fix do Leaflet: re-desenha o mapa quando a aba muda
  if(id === 'mapaPagina'){
    setTimeout(() => { mapa.invalidateSize(); }, 200);
  }
}

function renderizarAlertas(){
  const lista = document.getElementById('listaAlertas');
  if(alertas.length === 0){
    lista.innerHTML = '<p>Nenhum alerta publicado.</p>';
    return;
  }
  lista.innerHTML = '';
  alertas.forEach(alerta => {
    lista.innerHTML += `
    <div class="alerta">
      <div class="tipo">🚨 ${alerta.tipo}</div>
      <div>${alerta.descricao}</div>
      <div>📍 ${alerta.bairro}</div>
      <div class="status">Aguardando validação</div>
    </div>`;
  });
}

function criarAlerta(){
  const tipo = document.getElementById('tipo').value;
  const bairro = document.getElementById('bairro').value;
  const descricao = document.getElementById('descricao').value;

  if(!tipo || !bairro || !descricao){
    alert('Preencha todos os campos!');
    return;
  }

  const novoAlerta = {
    tipo: tipo,
    bairro: bairro,
    descricao: descricao,
    data: firebase.firestore.FieldValue.serverTimestamp() 
  };

  db.collection("alertas").add(novoAlerta).then(() => {
    mostrarPagina('alertas');
    document.getElementById('tipo').value = '';
    document.getElementById('bairro').value = '';
    document.getElementById('descricao').value = '';
    alert('Alerta gravado com sucesso no banco de dados!');
  });
}

function carregarMarcadores(){
  // Limpa marcadores antigos para não duplicar
  marcadores.forEach(m => mapa.removeLayer(m));
  marcadores = [];

  // Desenha os alertas do banco no mapa
  alertas.forEach(alerta => {
    if(alerta.lat && alerta.lng){
      const marcador = L.marker([alerta.lat, alerta.lng]).addTo(mapa);
      marcador.bindPopup(`<strong>🚨 ${alerta.tipo}</strong><br>${alerta.descricao}<br>📍 ${alerta.bairro}`);
      marcadores.push(marcador);
    }
  });
}

// Cria alerta ao clicar no mapa
mapa.on('click', function(e){
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;

  const popupContent = `
    <div>
      <h3>Novo Alerta</h3>
      <select id="popupTipo"><option>Roubo</option><option>Falta de Luz</option><option>Alagamento</option></select>
      <input type="text" id="popupBairro" placeholder="Bairro automático" readonly>
      <textarea id="popupDescricao" rows="3" placeholder="Descreva o problema"></textarea>
      <button onclick="salvarAlertaMapa(${lat}, ${lng})" style="margin-top:10px; padding:8px; width:100%; background:#c62828; color:white; border:none; border-radius:5px; cursor:pointer;">Salvar Alerta</button>
    </div>`;

  L.popup().setLatLng(e.latlng).setContent(popupContent).openOn(mapa);
  setTimeout(() => { detectarBairro(lat, lng); }, 200);
});

function salvarAlertaMapa(lat, lng){
  const tipo = document.getElementById('popupTipo').value;
  const bairro = document.getElementById('popupBairro').value;
  const descricao = document.getElementById('popupDescricao').value;

  if(!bairro || !descricao){
    alert('Preencha todos os campos!');
    return;
  }

  const novoAlerta = {
    tipo: tipo,
    bairro: bairro,
    descricao: descricao,
    lat: lat,
    lng: lng,
    data: firebase.firestore.FieldValue.serverTimestamp()
  };

  db.collection("alertas").add(novoAlerta).then(() => {
    mapa.closePopup();
    alert('Alerta gravado no mapa e salvo no banco de dados!');
  });
}

// Descobre o bairro automático pelo OpenStreetMap
async function detectarBairro(lat, lng){
  try{
    const resposta = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const dados = await resposta.json();
    const bairro = dados.address.suburb || dados.address.neighbourhood || dados.address.city_district || "Manaus";
    document.getElementById('popupBairro').value = bairro;
  }catch{
    document.getElementById('popupBairro').value = "Manaus";
  }
}