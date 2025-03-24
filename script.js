
let map = L.map('map').setView([41.6, 14.6], 9);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Definizione delle fasi e microfasi per taglia
const faseConfig = {
  XXL: {
    fasi: [
      'Mobilità sostenibile',
      'Area Playground',
      'Dog Park',
      'Fitness Outdoor',
      'Open Library',
      'Servizi igienici',
      'Arredo urbano',
      'Raccolta acque'
    ]
  },
  XL: {
    fasi: [
      'Mobilità sostenibile',
      'Area Playground',
      'Dog Park',
      'Fitness Outdoor',
      'Open Library',
      'Servizi igienici',
      'Arredo urbano'
    ]
  },
  L: {
    fasi: [
      'Mobilità sostenibile',
      'Area Playground',
      'Fitness Outdoor',
      'Open Library',
      'Servizi igienici',
      'Arredo urbano'
    ]
  },
  M: {
    fasi: [
      'Mobilità sostenibile',
      'Area Playground',
      'Fitness Outdoor',
      'Open Library',
      'Arredo urbano'
    ]
  },
  S: {
    fasi: [
      'Mobilità sostenibile',
      'Area Playground',
      'Fitness Outdoor',
      'Open Library',
      'Arredo urbano'
    ]
  }
};

const fasiTecniche = [
  'Mobilità sostenibile',
  'Area Playground',
  'Dog Park',
  'Fitness Outdoor',
  'Open Library',
  'Servizi igienici'
];

const microfasiTecniche = ['Scavo', 'Getto', 'Montaggio', 'Rifiniture'];
const statiSemplici = ['Da iniziare', 'In corso', 'Completato'];

// Stato memorizzato per ogni comune
let stato = JSON.parse(localStorage.getItem('statoLavori')) || {};

function salvaStato() {
  localStorage.setItem('statoLavori', JSON.stringify(stato));
}

function getTaglia(nome) {
  const taglie = {
    XXL: ['Campobasso'],
    XL: ['Bojano', 'Riccia', 'Trivento'],
    L: ['Cercemaggiore','Vinchiaturo','Ferrazzano','Ripalimosani','Baranello','Campodipietra','Mirabello Sannitico'],
    M: ['Sepino','Jelsi','Sant'Elia a Pianisi','Oratino','Gambatesa','Toro','Pietracatella','Fossalto','Spinete','Busso','Petrella Tifernina','Matrice','Montagano','San Giuliano del Sannio'],
    S: ['Castropignano','Tufara','San Massimo','Campolieto','Gildone','Colle d'Anchise','Guardiaregia','Torella del Sannio','Limosano','Salcito','Lucito','Cercepiccola','Campochiaro','Morrone del Sannio','Macchia Valfortore','San Giovanni in Galdo','Castellino del Biferno','Casalciprano','Monacilioni','Ripabottoni','San Polo Matese','Civitacampomarano','Duronia','Sant'Angelo Limosano','Castelbottaccio','Pietracupa','San Biase','Molise']
  };
  for (let taglia in taglie) {
    if (taglie[taglia].includes(nome)) return taglia;
  }
  return 'S';
}

function creaTabella(comune, taglia) {
  const contenitore = document.getElementById("comuni-info");
  const titolo = document.createElement("h3");
  titolo.textContent = comune + " (" + taglia + ")";
  contenitore.appendChild(titolo);

  const fasi = faseConfig[taglia].fasi;
  if (!stato[comune]) stato[comune] = {};

  fasi.forEach(fase => {
    if (!stato[comune][fase]) {
      stato[comune][fase] = {
        stato: 0,
        gps: null
      };
    }

    const div = document.createElement("div");
    const nome = document.createElement("strong");
    nome.textContent = fase + ": ";
    div.appendChild(nome);

    const totaleStep = fasiTecniche.includes(fase) ? microfasiTecniche.length : statiSemplici.length;
    const step = stato[comune][fase].stato;

    const bottone = document.createElement("button");
    bottone.textContent = fasiTecniche.includes(fase) ? microfasiTecniche[step] : statiSemplici[step];
    bottone.onclick = async () => {
      let nuovoStep = (step + 1) % totaleStep;
      stato[comune][fase].stato = nuovoStep;

      // Salvataggio posizione GPS
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          stato[comune][fase].gps = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
          };
          salvaStato();
        });
      } else {
        salvaStato();
      }

      aggiornaMappa();
    };
    div.appendChild(bottone);
    contenitore.appendChild(div);
  });
}

function exportCSV() {
  let csv = "Comune,Taglia,Fase,Stato,Latitudine,Longitudine\n";
  for (let comune in stato) {
    const taglia = getTaglia(comune);
    const fasi = faseConfig[taglia].fasi;
    fasi.forEach(fase => {
      const info = stato[comune][fase];
      const step = info.stato;
      const statoTesto = fasiTecniche.includes(fase) ? microfasiTecniche[step] : statiSemplici[step];
      const lat = info.gps?.lat || "";
      const lon = info.gps?.lon || "";
      csv += `${comune},${taglia},"${fase}",${statoTesto},${lat},${lon}\n`;
    });
  }

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "situazione_comuni.csv";
  a.click();
}

function aggiornaMappa() {
  document.getElementById("comuni-info").innerHTML = "";
  geojsonLayer && map.removeLayer(geojsonLayer);
  geojsonLayer = L.geoJSON(geojsonData, {
    style: feature => {
      const nome = feature.properties.name;
      const taglia = getTaglia(nome);
      const fasi = faseConfig[taglia].fasi;
      const totaleStep = fasi.reduce((sum, f) => sum + (fasiTecniche.includes(f) ? 4 : 3), 0);
      const completati = fasi.reduce((sum, f) => {
        const s = stato[nome]?.[f]?.stato || 0;
        return sum + s;
      }, 0);
      const percentuale = Math.round((completati / totaleStep) * 100);
      const colore = percentuale === 100 ? 'green' : percentuale > 0 ? 'orange' : 'red';
      return { color: 'black', fillColor: colore, fillOpacity: 0.6, weight: 1 };
    },
    onEachFeature: (feature, layer) => {
      const nome = feature.properties.name;
      const taglia = getTaglia(nome);
      layer.bindPopup(nome);
      layer.on('click', () => {
        document.getElementById("comuni-info").innerHTML = "";
        creaTabella(nome, taglia);
      });
    }
  }).addTo(map);
}

let geojsonLayer;
let geojsonData;

fetch("comuni_molise.geojson")
  .then(res => res.json())
  .then(data => {
    geojsonData = data;
    aggiornaMappa();
  });
