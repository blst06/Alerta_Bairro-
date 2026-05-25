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
// 2. VARIÁVEIS GERAIS E CONFIGURAÇÃO DO MAPA
// ===================================================
let alertas = [];
let marcadores = [];
let radarAtivo = false;
let idRastreio = null;

let marcadorUsuario = null; 
let circuloRadar = null;   
let ultimaLatUsuario = null; 
let ultimaLngUsuario = null; 

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
// 4. SISTEMA DE CONTAS
// ===================================================
function mostrarOcultarSenhaLogin() {
  const campoSenha = document.getElementById('senha');
  campoSenha.type = (campoSenha.type === 'password') ? 'text' : 'password';
}

function criarConta() {
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;
  if (!email || !senha) { alert('Preencha e-mail e senha!'); return; }
  auth.createUserWithEmailAndPassword(email, senha)
    .then(() => { alert('Conta criada!'); document.getElementById('loginPage').style.display = 'none'; document.getElementById('sistema').style.display = 'block'; })
    .catch((erro) => { alert('Erro ao criar conta.'); });
}

function login() {
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;
  if (!email || !senha) { alert('Preencha e-mail e senha!'); return; }
  auth.signInWithEmailAndPassword(email, senha)
    .then(() => { document.getElementById('loginPage').style.display = 'none'; document.getElementById('sistema').style.display = 'block'; })
    .catch((erro) => { alert('E-mail ou senha inválidos.'); });
}

function recuperarSenha() {
  const email = document.getElementById('email').value;
  if (!email) { alert('Digite o e-mail na caixa de login.'); return; }
  auth.sendPasswordResetEmail(email).then(() => alert('E-mail enviado!')).catch(() => alert('Erro no e-mail.'));
}

function loginComGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(() => { document.getElementById('loginPage').style.display = 'none'; document.getElementById('sistema').style.display = 'block'; })
    .catch((erro) => { alert('Erro: ' + erro.message); });
}

function sair() {
  auth.signOut().then(() => {
    document.getElementById('loginPage').style.display = 'block';
    document.getElementById('sistema').style.display = 'none';
    if (radarAtivo) navigator.geolocation.clearWatch(idRastreio);
  });
}

// ===================================================
// 5. RADAR E GEOLOCALIZAÇÃO
// ===================================================
function iniciarRadar() {
  if (!radarAtivo) {
    if (navigator.geolocation) {
      idRastreio = navigator.geolocation.watchPosition(atualizarLocalizacaoERadar, erroLocalizacao, { enableHighAccuracy: true });
      radarAtivo = true;
      document.getElementById('btnRadar').innerText = "Desligar Sonar";
    }
  } else {
    navigator.geolocation.clearWatch(idRastreio);
    radarAtivo = false;
    document.getElementById('btnRadar').innerText = "Ligar Sonar";
  }
}

function atualizarLocalizacaoERadar(posicao) {
  ultimaLatUsuario = posicao.coords.latitude;
  ultimaLngUsuario = posicao.coords.longitude;
  const pontoUsuario = L.latLng(ultimaLatUsuario, ultimaLngUsuario);
  
  if (!marcadorUsuario) {
    marcadorUsuario = L.circleMarker([ultimaLatUsuario, ultimaLngUsuario], { radius: 8, fillColor: '#4285F4', color: '#FFFFFF', weight: 3, opacity: 1, fillOpacity: 1 }).addTo(mapa);
    circuloRadar = L.circle([ultimaLatUsuario, ultimaLngUsuario], { color: '#4285F4', fillColor: '#4285F4', fillOpacity: 0.12, radius: 500 }).addTo(mapa);
    mapa.flyTo([ultimaLatUsuario, ultimaLngUsuario], 15);
  } else {
    marcadorUsuario.setLatLng([ultimaLatUsuario, ultimaLngUsuario]);
    circuloRadar.setLatLng([ultimaLatUsuario, ultimaLngUsuario]);
  }
  
  let perigoProximo = null;
  alertas.forEach(alerta => {
    if (alerta.lat && alerta.lng) {
      if (pontoUsuario.distanceTo(L.latLng(alerta.lat, alerta.lng)) < 500) perigoProximo = alerta;
    }
  });

  const divStatus = document.getElementById('statusRadar');
  const txtRadar = document.getElementById('textoRadar');
  
  if (perigoProximo) {
    divStatus.style.background = "#ffcdd2"; 
    txtRadar.innerText = "🚨 PERIGO NA ZONA 🚨";
  } else {
    divStatus.style.background = "#c8e6c9"; 
    txtRadar.innerText = "✅ Área Segura";
  }
}

function erroLocalizacao() { alert("Erro de GPS."); }

function centrarEmMim() {
  if (ultimaLatUsuario) mapa.flyTo([ultimaLatUsuario, ultimaLngUsuario], 15);
}

// ===================================================
// 6. FUNÇÕES GERAIS E FOTOS (BASE64)
// ===================================================
function mostrarPagina(id){
  document.querySelectorAll('.pagina').forEach(p => p.classList.remove('ativa'));
  document.getElementById(id).classList.add('ativa');
  if(id === 'mapaPagina') setTimeout(() => mapa.invalidateSize(), 200);
}

function renderizarAlertas(){
  const lista = document.getElementById('listaAlertas');
  lista.innerHTML = alertas.length === 0 ? '<p>Nenhum alerta.</p>' : '';
  alertas.forEach(alerta => {
    const tagFoto = alerta.fotoBase64 ? `<img src="${alerta.fotoBase64}" style="max-width: 100%; border-radius: 8px; margin-top: 12px;">` : '';
    lista.innerHTML += `
    <div class="alerta">
      <div class="tipo">🚨 ${alerta.tipo}</div>
      <div>${alerta.descricao}</div>
      <div>📍 ${alerta.bairro}</div>
      ${tagFoto}
    </div>`;
  });
}

function criarAlerta(){
  const tipo = document.getElementById('tipo').value;
  const bairro = document.getElementById('bairro').value;
  const descricao = document.getElementById('descricao').value;
  const arquivo = document.getElementById('fotoAlerta').files[0];

  if(!tipo || !bairro || !descricao) { alert('Preencha os campos!'); return; }

  if (arquivo) {
    const reader = new FileReader();
    reader.onload = (e) => salvarNoFirestore(tipo, bairro, descricao, e.target.result);
    reader.readAsDataURL(arquivo);
  } else {
    salvarNoFirestore(tipo, bairro, descricao, null);
  }
}

function salvarNoFirestore(tipo, bairro, descricao, fotoBase64) {
  db.collection("alertas").add({
    tipo, bairro, descricao, fotoBase64,
    data: firebase.firestore.FieldValue.serverTimestamp() 
  }).then(() => {
    alert('Alerta publicado!');
    mostrarPagina('alertas');
  });
}

function carregarMarcadores(){
  marcadores.forEach(m => mapa.removeLayer(m));
  marcadores = [];
  alertas.forEach(alerta => {
    if(alerta.lat && alerta.lng){
      const marcador = L.marker([alerta.lat, alerta.lng]).addTo(mapa);
      marcador.bindPopup(`<strong>${alerta.tipo}</strong>`);
      marcadores.push(marcador);
    }
  });
}

mapa.on('click', function(e){
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;
  const popup = L.popup().setLatLng(e.latlng).setContent(`
    <div>
      <h3>Novo Alerta</h3>
      <select id="popupTipo"><option>Roubo</option><option>Alagamento</option></select>
      <input type="text" id="popupBairro" readonly>
      <textarea id="popupDescricao" placeholder="Descrição"></textarea>
      <button onclick="salvarAlertaMapa(${lat}, ${lng})">Salvar</button>
    </div>`).openOn(mapa);
  detectarBairro(lat, lng);
});

function salvarAlertaMapa(lat, lng){
  db.collection("alertas").add({
    tipo: document.getElementById('popupTipo').value,
    bairro: document.getElementById('popupBairro').value,
    descricao: document.getElementById('popupDescricao').value,
    lat, lng,
    data: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => { mapa.closePopup(); alert('Salvo!'); });
}

async function detectarBairro(lat, lng){
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    document.getElementById('popupBairro').value = data.address.suburb || "Manaus";
  } catch { document.getElementById('popupBairro').value = "Manaus"; }
}