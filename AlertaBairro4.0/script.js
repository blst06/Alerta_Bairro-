let alertas =
JSON.parse(localStorage.getItem('alertas')) || [];

function login(){

const usuario =
document.getElementById('usuario').value;

const senha =
document.getElementById('senha').value;

if(usuario === 'admin' && senha === '123'){

document.getElementById('loginPage')
.style.display = 'none';

document.getElementById('sistema')
.style.display = 'block';

}else{

alert('Usuário ou senha inválidos');

}

}

function mostrarPagina(id){

const paginas =
document.querySelectorAll('.pagina');

paginas.forEach(pagina => {
pagina.classList.remove('ativa');
});

document.getElementById(id)
.classList.add('ativa');

if(id === 'mapaPagina'){

setTimeout(() => {
mapa.invalidateSize();
}, 200);

}

}

function renderizarAlertas(){

const lista =
document.getElementById('listaAlertas');

if(alertas.length === 0){

lista.innerHTML =
'<p>Nenhum alerta publicado.</p>';

return;

}

lista.innerHTML = '';

alertas.forEach(alerta => {

lista.innerHTML += `

<div class="alerta">

<div class="tipo">
🚨 ${alerta.tipo}
</div>

<div>
${alerta.descricao}
</div>

<div>
📍 ${alerta.bairro}
</div>

<div class="status">
Aguardando validação
</div>

</div>

`;

});

}

function criarAlerta(){

const tipo =
document.getElementById('tipo').value;

const bairro =
document.getElementById('bairro').value;

const descricao =
document.getElementById('descricao').value;

if(!tipo || !bairro || !descricao){

alert('Preencha todos os campos!');

return;

}

const novoAlerta = {
tipo,
bairro,
descricao
};

alertas.unshift(novoAlerta);

localStorage.setItem(
'alertas',
JSON.stringify(alertas)
);

renderizarAlertas();

mostrarPagina('alertas');

document.getElementById('tipo').value = '';
document.getElementById('bairro').value = '';
document.getElementById('descricao').value = '';

alert('Alerta publicado com sucesso!');

}

renderizarAlertas();

const mapa = L.map('mapa')
.setView([-3.1190, -60.0217], 12);

L.tileLayer(
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
{
attribution: '© OpenStreetMap'
}
).addTo(mapa);

let marcadores = [];

function carregarMarcadores(){

marcadores.forEach(m => mapa.removeLayer(m));

marcadores = [];

alertas.forEach(alerta => {

if(alerta.lat && alerta.lng){

const marcador =
L.marker([alerta.lat, alerta.lng])
.addTo(mapa);

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

<input type="text"
id="popupBairro"
placeholder="Bairro automático"
readonly>

<textarea id="popupDescricao"
rows="3"
placeholder="Descreva o problema">
</textarea>

<button
onclick="salvarAlertaMapa(${lat}, ${lng})"
style="
margin-top:10px;
padding:8px;
width:100%;
background:#c62828;
color:white;
border:none;
border-radius:5px;
cursor:pointer;
">

Salvar Alerta

</button>

</div>

`;

L.popup()
.setLatLng(e.latlng)
.setContent(popupContent)
.openOn(mapa);
setTimeout(() => {
detectarBairro(lat, lng);
}, 200);

});

function salvarAlertaMapa(lat, lng){

const tipo =
document.getElementById('popupTipo').value;

const bairro =
document.getElementById('popupBairro').value;

const descricao =
document.getElementById('popupDescricao').value;

if(!bairro || !descricao){

alert('Preencha todos os campos!');

return;

}

const novoAlerta = {
tipo,
bairro,
descricao,
lat,
lng
};

alertas.unshift(novoAlerta);

localStorage.setItem(
'alertas',
JSON.stringify(alertas)
);

renderizarAlertas();

carregarMarcadores();

mapa.closePopup();

alert('Alerta criado no mapa!');

}

carregarMarcadores();

async function detectarBairro(lat, lng){

try{

const resposta = await fetch(
`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
);

const dados = await resposta.json();

const bairro =
dados.address.suburb ||
dados.address.neighbourhood ||
dados.address.city_district ||
"Manaus";

document.getElementById('popupBairro').value = bairro;

}catch{

document.getElementById('popupBairro').value = "Manaus";

}

}