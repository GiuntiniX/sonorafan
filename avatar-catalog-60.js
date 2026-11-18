'use strict';
/** Local and original illustrated avatar catalog (8 legacy + 32 new). */
const AVATAR_CATALOG=Object.freeze([
  {
    "id": "indie",
    "label": "Indie",
    "category": "music",
    "description": "Visual indie original"
  },
  {
    "id": "pop",
    "label": "Pop",
    "category": "music",
    "description": "Personagem pop original"
  },
  {
    "id": "eletronico",
    "label": "Eletrônico",
    "category": "music",
    "description": "Personagem eletrônico original"
  },
  {
    "id": "rock",
    "label": "Rock",
    "category": "music",
    "description": "Personagem rock original"
  },
  {
    "id": "festival",
    "label": "Festival",
    "category": "music",
    "description": "Personagem festival original"
  },
  {
    "id": "rapper",
    "label": "Rap",
    "category": "music",
    "description": "Personagem rap original"
  },
  {
    "id": "jazz",
    "label": "Jazz",
    "category": "music",
    "description": "Personagem jazz original"
  },
  {
    "id": "mpb",
    "label": "MPB",
    "category": "music",
    "description": "Personagem MPB original"
  },
  {
    "id": "rockeiro",
    "label": "Rockeiro Urbano",
    "category": "music",
    "description": "Jaqueta de couro, cabelo volumoso e headphones"
  },
  {
    "id": "indie-diva",
    "label": "Rainha Indie",
    "category": "identity",
    "description": "Cabelo colorido, óculos estilosos e roupa vintage"
  },
  {
    "id": "trans-futurista",
    "label": "Artista Trans Futurista",
    "category": "identity",
    "description": "Artista de expressão livre com cabelo degradê e roupa luminosa"
  },
  {
    "id": "nao-binario",
    "label": "Ícone Não Binário",
    "category": "identity",
    "description": "Moda andrógina de tons vibrantes e acessórios modernos"
  },
  {
    "id": "queer-dj",
    "label": "DJ Queer",
    "category": "identity",
    "description": "Visual clubber com delineado e fones neon"
  },
  {
    "id": "agenero",
    "label": "Visual Agênero",
    "category": "identity",
    "description": "Estética minimalista sem marcação de gênero"
  },
  {
    "id": "pop-glam",
    "label": "Pop Star Glam",
    "category": "identity",
    "description": "Make artística e casaco brilhante"
  },
  {
    "id": "fluido",
    "label": "Estilo Fluido",
    "category": "identity",
    "description": "Mistura criativa de roupas e acessórios"
  },
  {
    "id": "funkeiro",
    "label": "MC do Baile",
    "category": "brazil",
    "description": "Boné, óculos e look urbano de baile"
  },
  {
    "id": "funkeira",
    "label": "Funkeira Fashion",
    "category": "brazil",
    "description": "Cabelo marcante e acessórios de festa"
  },
  {
    "id": "mc-batalha",
    "label": "MC de Batalha",
    "category": "brazil",
    "description": "Microfone, jaqueta e expressão confiante"
  },
  {
    "id": "dj-favela",
    "label": "DJ de Favela",
    "category": "brazil",
    "description": "Headphones, camiseta gráfica e boné"
  },
  {
    "id": "bboy",
    "label": "B-Boy Street",
    "category": "brazil",
    "description": "Moletom, boné e visual de dança urbana"
  },
  {
    "id": "bgirl",
    "label": "B-Girl Grafite",
    "category": "brazil",
    "description": "Cabelo afro e streetwear colorido"
  },
  {
    "id": "pagodeiro",
    "label": "Pagodeiro Retrô",
    "category": "brazil",
    "description": "Camisa estampada e óculos arredondados"
  },
  {
    "id": "sambista",
    "label": "Sambista Moderno",
    "category": "brazil",
    "description": "Chapéu, camisa vibrante e sorriso"
  },
  {
    "id": "sertanejo",
    "label": "Estrela Sertaneja",
    "category": "brazil",
    "description": "Chapéu e jaqueta musical"
  },
  {
    "id": "forro",
    "label": "Artista de Forró",
    "category": "brazil",
    "description": "Chapéu de palha e lenço"
  },
  {
    "id": "robo-dj",
    "label": "Robô DJ",
    "category": "future",
    "description": "Robô musical com olhos digitais e antenas"
  },
  {
    "id": "androide",
    "label": "Androide Cyberpunk",
    "category": "future",
    "description": "Rosto robótico com LEDs magenta e azul"
  },
  {
    "id": "ciborgue",
    "label": "Ciborgue Neon",
    "category": "future",
    "description": "Personagem de circuitos e cabelos futuristas"
  },
  {
    "id": "hacker",
    "label": "Hacker de Festival",
    "category": "future",
    "description": "Capuz, visor neon e roupas técnicas"
  },
  {
    "id": "alien",
    "label": "Alien Psicodélico",
    "category": "future",
    "description": "Criatura cósmica alegre com olhos brilhantes"
  },
  {
    "id": "astronauta",
    "label": "Astronauta Musical",
    "category": "future",
    "description": "Capacete espacial com fones retrofuturistas"
  },
  {
    "id": "gato-robo",
    "label": "Gato Robótico",
    "category": "future",
    "description": "Gato mecânico simpático e fones de ouvido"
  },
  {
    "id": "holograma",
    "label": "Personagem Holográfico",
    "category": "future",
    "description": "Figura digital translúcida e brilho azul"
  },
  {
    "id": "vampiro",
    "label": "Vampiro Gótico",
    "category": "fantasy",
    "description": "Visual gótico, capa e cabelo geométrico"
  },
  {
    "id": "samurai",
    "label": "Samurai Eletrônico",
    "category": "fantasy",
    "description": "Futurismo japonês e capacete musical"
  },
  {
    "id": "havaiano",
    "label": "Surfista Havaiano",
    "category": "creative",
    "description": "Camisa floral e prancha colorida"
  },
  {
    "id": "tropical",
    "label": "Surfista Tropical",
    "category": "creative",
    "description": "Óculos, flores e tons praianos"
  },
  {
    "id": "reggae",
    "label": "Reggae Roots",
    "category": "creative",
    "description": "Dreads e roupa verde e dourada"
  },
  {
    "id": "punk",
    "label": "Punk Rebelde",
    "category": "creative",
    "description": "Moicano e roupas tachadas"
  }
].map(p=>Object.freeze(p)));
module.exports={AVATAR_CATALOG,AVATAR_IDS:Object.freeze(AVATAR_CATALOG.map(p=>p.id))};
