// 1. A sua chave de configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBe7jdY2y04Uw1DuQ9T6f5NXJOqPzRPPZo",
  authDomain: "alerta-bairro-8adce.firebaseapp.com",
  projectId: "alerta-bairro-8adce",
  storageBucket: "alerta-bairro-8adce.firebasestorage.app",
  messagingSenderId: "726524118429",
  appId: "1:726524118429:web:35f9dc6935efb157321b74"
};

// 2. Iniciando a conexão com o banco de dados
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Variável para guardar a lista de alertas
let alertas = [];

// 3. Configurando o Mapa (Centralizado em Manaus)
const mapa = L.map('mapa').setView([-3.1190, -60.0217], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(mapa);
let marcadores = [];

// 4. OUVINDO O BANCO DE DADOS EM TEMPO REAL (A grande magia)
db.collection("alertas").orderBy("data", "desc").onSnapshot((querySnapshot) => {
  alertas = []; // Limpa a lista atual para não duplicar
  
  querySnapshot.forEach((doc) => {
    alertas.push(doc.data()); // Puxa os dados atualizados da nuvem
  });
  
  renderizarAlertas(); // Desenha os alertas na lista
  carregarMarcadores(); // Desenha os alertas no mapa
});

// ---------------------------------------------------
// Funções do Sistema
// ---------------------------------------------------

function login(){
  const usuario = document.getElementById('usuario').value;
  const senha = document.getElementById('senha').value;

  if(usuario === 'admin' && senha === '123'){
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('sistema').style.display = 'block';
  } else {
    alert('Usuário ou senha inválidos');
  }
}

function mostrarPagina(id){
  const paginas = document.querySelectorAll('.pagina');
  
  paginas.forEach(pagina => {
    pagina.classList.remove('ativa');
  });

  document.getElementById(id).classList.add('ativa');

  if(id === 'mapaPagina'){
    setTimeout(() => {
      mapa.invalidateSize();
    }, 200);
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
    </div>
    `;
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

  // Prepara o pacote para enviar para a nuvem
  const novoAlerta = {
    tipo: tipo,
    bairro: bairro,
    descricao: descricao,
    data: firebase.firestore.FieldValue.serverTimestamp() // Salva a hora exata do servidor
  };

  // ENVIANDO PARA O BANCO DE DADOS
  db.collection("alertas").add(novoAlerta).then(() => {
    mostrarPagina('alertas');
    document.getElementById('tipo').value = '';
    document.getElementById('bairro').value = '';
    document.getElementById('descricao').value = '';
    alert('Alerta gravado com sucesso no banco de dados!');
  });
}

function carregarMarcadores(){
  marcadores.forEach(m => mapa.removeLayer(m));
  marcadores = [];

  alertas.forEach(alerta => {
    if(alerta.lat && alerta.lng){
      const marcador = L.marker([alerta.lat, alerta.lng]).addTo(mapa);
      
      marcador.bindPopup(`
        <strong>🚨 ${alerta.tipo}</strong><br>
        ${alerta.descricao}<br>
        📍 ${alerta.bairro}
      `);
      
      marcadores.push(marcador);
    }
  });
}

mapa.on('click', function(e){
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;

  const popupContent = `
    <div>
      <h3>Novo Alerta</h3>
      <select id="popupTipo">
        <option>Roubo</option>
        <option>Falta de Luz</option>
        <option>Alagamento</option>
      </select>
      <input type="text" id="popupBairro" placeholder="Bairro automático" readonly>
      <textarea id="popupDescricao" rows="3" placeholder="Descreva o problema"></textarea>
      
      <button onclick="salvarAlertaMapa(${lat}, ${lng})" 
      style="margin-top:10px; padding:8px; width:100%; background:#c62828; color:white; border:none; border-radius:5px; cursor:pointer;">
        Salvar Alerta
      </button>
    </div>
  `;

  L.popup().setLatLng(e.latlng).setContent(popupContent).openOn(mapa);
  
  setTimeout(() => {
    detectarBairro(lat, lng);
  }, 200);
});

function salvarAlertaMapa(lat, lng){
  const tipo = document.getElementById('popupTipo').value;
  const bairro = document.getElementById('popupBairro').value;
  const descricao = document.getElementById('popupDescricao').value;

  if(!bairro || !descricao){
    alert('Preencha todos os campos!');
    return;
  }

  // Prepara o pacote com a localização do mapa
  const novoAlerta = {
    tipo: tipo,
    bairro: bairro,
    descricao: descricao,
    lat: lat,
    lng: lng,
    data: firebase.firestore.FieldValue.serverTimestamp() // Salva a hora exata
  };

  // ENVIANDO PARA O BANCO DE DADOS A PARTIR DO MAPA
  db.collection("alertas").add(novoAlerta).then(() => {
    mapa.closePopup();
    alert('Alerta gravado no mapa e salvo no banco de dados!');
  });
}

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