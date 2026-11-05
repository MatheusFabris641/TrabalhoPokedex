// =========================
// CONFIGURAÇÕES
// =========================
const API = "https://pokeapi.co/api/v2";
const MAX_RESULTADOS = 12;
const MAX_TIME = 6;
const IMG_PADRAO = "https://placehold.co/160x160";

// =========================
// ELEMENTOS DA PÁGINA
// =========================
const inputBusca = document.getElementById("busca");
const btnPesquisar = document.getElementById("btn-pesquisar");
const btnFiltro = document.getElementById("btn-filtro");
const painelFiltro = document.getElementById("painel-filtro");
const selectTipo = document.getElementById("filtro-tipo");
const divResultados = document.getElementById("resultados");
const divTime = document.getElementById("time");
const spanContador = document.getElementById("contador");

// =========================
// ESTADO
// =========================
let todosNomes = [];   // todos os nomes da API
const cache = {};      // id -> dados do pokémon já baixado
let buscaAtual = 0;    // evita que uma busca antiga sobrescreva uma nova
let time = JSON.parse(localStorage.getItem("time")) || [];

// =========================
// UTILITÁRIOS
// =========================
function capitalizar(nome) {
  return nome
    .split("-")
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function escapar(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// =========================
// API
// =========================
async function carregarNomes() {
  const res = await fetch(`${API}/pokemon?limit=2000`);
  const data = await res.json();
  todosNomes = data.results.map(p => p.name);
}

async function nomesPorTipo(tipo) {
  const res = await fetch(`${API}/type/${tipo}`);
  const data = await res.json();
  return data.pokemon.map(p => p.pokemon.name);
}

async function buscarPokemon(nome) {
  const res = await fetch(`${API}/pokemon/${nome}`);
  if (!res.ok) return null;
  const d = await res.json();

  const poke = {
    id: d.id,
    nome: d.name,
    imagem:
      d.sprites.other?.["official-artwork"]?.front_default ||
      d.sprites.front_default ||
      IMG_PADRAO,
    tipos: d.types.map(t => t.type.name),
  };
  cache[poke.id] = poke;
  return poke;
}

// =========================
// PESQUISA + FILTRO
// =========================
async function pesquisar() {
  const minhaBusca = ++buscaAtual;
  const texto = inputBusca.value.trim().toLowerCase().replace(/\s+/g, "-");
  const tipo = selectTipo.value;

  divResultados.innerHTML = '<p class="mensagem">Carregando...</p>';

  try {
    let lista = tipo ? await nomesPorTipo(tipo) : todosNomes;
    if (texto) lista = lista.filter(nome => nome.includes(texto));
    lista = lista.slice(0, MAX_RESULTADOS);

    if (lista.length === 0) {
      if (minhaBusca !== buscaAtual) return;
      divResultados.innerHTML = '<p class="mensagem">Nenhum Pokémon encontrado.</p>';
      return;
    }

    const pokemons = (await Promise.all(lista.map(buscarPokemon))).filter(Boolean);
    if (minhaBusca !== buscaAtual) return;
    renderResultados(pokemons);
  } catch (erro) {
    console.error(erro);
    divResultados.innerHTML = '<p class="mensagem">Erro ao buscar. Tente novamente.</p>';
  }
}

function renderResultados(pokemons) {
  divResultados.innerHTML = pokemons.map(p => `
    <div class="quadrado">
      <p class="nome">${escapar(capitalizar(p.nome))}</p>
      <img class="foto" src="${p.imagem}" alt="${escapar(p.nome)}">
      <span class="tipos">${escapar(p.tipos.join(" / "))}</span>
      <button class="botao botao-add" data-id="${p.id}">Adicionar ao time</button>
    </div>
  `).join("");
}

// =========================
// TIME
// =========================
function salvarTime() {
  localStorage.setItem("time", JSON.stringify(time));
}

function renderTime() {
  let html = "";

  for (let i = 0; i < MAX_TIME; i++) {
    const p = time[i];

    if (p) {
      html += `
        <div class="quadrado">
          <p class="nome">${escapar(capitalizar(p.nome))}</p>
          <img class="foto" src="${p.imagem}" alt="${escapar(p.nome)}">
          <input type="text" class="caixa-texto" placeholder="Escreva aqui..."
                 value="${escapar(p.nota || "")}">
          <div class="botoes">
            <button class="botao botao-add" data-acao="salvar-nota" data-id="${p.id}">Adicionar</button>
            <button class="botao botao-remover" data-acao="limpar-nota" data-id="${p.id}">Remover</button>
          </div>
          <button class="botao botao-remover" data-acao="remover-time" data-id="${p.id}">Remover do Time</button>
        </div>`;
    } else {
      html += `
        <div class="quadrado vazio">
          <p class="nome">Vazio</p>
          <img class="foto" src="${IMG_PADRAO}" alt="Espaço vazio">
        </div>`;
    }
  }

  divTime.innerHTML = html;
  spanContador.textContent = time.length;
  salvarTime();
}

function adicionarAoTime(id) {
  if (time.length >= MAX_TIME) return alert("Seu time já tem 6 Pokémons!");
  if (time.some(p => p.id === id)) return alert("Esse Pokémon já está no time.");

  const poke = cache[id];
  if (!poke) return;

  time.push({ ...poke });
  renderTime();
}

function removerDoTime(id) {
  time = time.filter(p => p.id !== id);
  renderTime();
}

// =========================
// EVENTOS
// =========================
btnPesquisar.addEventListener("click", pesquisar);

inputBusca.addEventListener("keydown", e => {
  if (e.key === "Enter") pesquisar();
});

btnFiltro.addEventListener("click", () => {
  painelFiltro.classList.toggle("oculto");
});

selectTipo.addEventListener("change", pesquisar);

// Botão "Adicionar ao time" (lista de resultados)
divResultados.addEventListener("click", e => {
  const btn = e.target.closest(".botao-add");
  if (!btn) return;
  adicionarAoTime(Number(btn.dataset.id));
});

// Botões dentro dos cards do time
divTime.addEventListener("click", e => {
  const btn = e.target.closest("button[data-acao]");
  if (!btn) return;

  const id = Number(btn.dataset.id);
  const poke = time.find(p => p.id === id);
  if (!poke) return;

  switch (btn.dataset.acao) {
    case "salvar-nota": {
      const campo = btn.closest(".quadrado").querySelector(".caixa-texto");
      poke.nota = campo.value.trim();
      salvarTime();
      btn.textContent = "Salvo!";
      setTimeout(() => { btn.textContent = "Adicionar"; }, 1000);
      break;
    }
    case "limpar-nota":
      delete poke.nota;
      renderTime();
      break;
    case "remover-time":
      removerDoTime(id);
      break;
  }
});

// =========================
// INÍCIO
// =========================
(async function iniciar() {
  renderTime();
  try {
    await carregarNomes();
  } catch (erro) {
    console.error(erro);
    divResultados.innerHTML = '<p class="mensagem">Não foi possível carregar a PokéAPI.</p>';
    return;
  }
  pesquisar();
})();