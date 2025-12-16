// ================= MAPA =================
const map = L.map("contenedor-mapa").setView([42.4984, -0.9084], 9);

// ================= MAPAS BASE =================
const baseMaps = {
    "OSM Standard": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:'&copy; OpenStreetMap contributors',
        maxZoom:19
    }).addTo(map),
    "OSM Topographic": L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution:'Map data &copy; OpenStreetMap contributors',
        maxZoom:17
    }),
    "OSM Satelital": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution:'Tiles &copy; Esri',
        maxZoom:19
    })
};

// ================= LÍMITES ADMINISTRATIVOS =================
fetch('data/limites_administrativos.geojson')
  .then(r => r.json())
  .then(data => {
    L.geoJSON(data, {
      style: { color:"#4f4f4fff", weight:4, opacity:1 },
      interactive: false
    }).addTo(map);
  });

// ================= CONTROL DE CAPAS =================
const groupedOverlays = {
    "Hidrografía / Hydrogéographie": {},
    "Sensores / Capteurs": {},
    "Infraestructura / Infrastructure": {},
    "Exposición / Exposition": {}
};

const controlCapas = L.control.groupedLayers(baseMaps, groupedOverlays, { collapsed:true }).addTo(map);

// ================= FUNCIONES =================
function highlightFeature(e){
    const layer = e.target;
    if(layer.feature.geometry.type.includes("Line")){
        layer.setStyle({ weight:4, color:"#000", opacity:1 });
    } else {
        layer.setStyle({ weight:2, color:"#000", fillOpacity:0.8 });
    }
}

function bindPopupFeature(layer, nombreCapa, campos={}, titulo=null){
    if(!layer.feature.properties) return;
    let html = "<table class='popup-table'>";
    html += titulo 
        ? `<tr><th colspan="2">${layer.feature.properties[titulo]||titulo}</th></tr>` 
        : `<tr><th colspan="2">${nombreCapa}</th></tr>`;
    for(let prop in campos){
        if(layer.feature.properties[prop] !== undefined){
            const info = campos[prop];
            const valor = layer.feature.properties[prop];
            if(info.tipo === "link"){
                if(valor){ // Si hay enlace
                    const textoLink = info.alias || valor;
                    html += `<tr><td><b>${info.nombre}</b></td><td><a href="${valor}" target="_blank">${textoLink}</a></td></tr>`;
                } else { // Si es null o vacío
                    html += `<tr><td><b>${info.nombre}</b></td><td>Sin enlace / Sans lien</td></tr>`;
                }
            } else {
                html += `<tr><td><b>${info.nombre}</b></td><td>${valor}</td></tr>`;
            }
        }
    }
    html += "</table>";
    layer.on('click', () => layer.bindPopup(html).openPopup());
}


// ================= CARGAR CAPA GEOJSON =================
function cargarCapaGeoJSON(url, nombreCapa, grupo, camposPopup={}, tituloPopup=null, estilo={}, tipo="polygon", rutaSVG=null){
    return fetch(url).then(r => r.json()).then(data => {
        let capa;

        if(tipo === "marker"){
            const cluster = L.markerClusterGroup({ showCoverageOnHover:false, maxClusterRadius:50, disableClusteringAtZoom:16 });
            capa = L.geoJSON(data, {
                pointToLayer: (feature, latlng) => rutaSVG 
                    ? L.marker(latlng, { icon:L.icon({ iconUrl:rutaSVG, iconSize:[25,25], iconAnchor:[12,12], popupAnchor:[0,-12] }) })
                    : L.marker(latlng),
                onEachFeature: (feature, layer) => bindPopupFeature(layer, nombreCapa, camposPopup, tituloPopup)
            });
            cluster.addLayer(capa);
            controlCapas.addOverlay(cluster, nombreCapa, grupo);
            return cluster;

        } else {
            const styleFunc = (typeof estilo === "function") ? estilo : () => estilo;

            capa = L.geoJSON(data, {
                renderer: L.canvas({ padding:0.5 }),
                style: styleFunc,
                onEachFeature: (feature, layer) => {
                    layer._defaultStyle = styleFunc(feature);
                    bindPopupFeature(layer, nombreCapa, camposPopup, tituloPopup);
                    layer.on({
                        mouseover: highlightFeature,
                        mouseout: () => layer.setStyle(layer._defaultStyle)
                    });
                }
            });
            controlCapas.addOverlay(capa, nombreCapa, grupo);
            return capa;
        }
    });
}

// ================= CAPAS =================

// ================= CAPAS =================

// Campos específicos para cuencas hidrográficas
const camposCuencas = {
    "CORRIENTE": { nombre: "CORRIENTE / COURANT" },
    "DESDE": { nombre: "DESDE / DEPUIS" },
    "HASTA": { nombre: "HASTA / JUSQU'À" }
};

// Campos específicos para red fluvial
const capasAntiguas = [
    { 
        url:'data/cuencas_hidrograficas.geojson', 
        nombre:"Cuencas Hidrográficas", 
        grupo:"Hidrografía", 
        campos: camposCuencas,
        estilo: feature => ({ color:"#1f78b4", weight:2, opacity:0.8, fillColor:"#1f78b4", fillOpacity:0.3 }), 
        tipo:"polygon" 
    },
];

const capasClusterData = [
    { 
        url:"data/estaciones_aforo_procesado.geojson", 
        nombre:"Estaciones de Aforo / Stations de Mesure", 
        grupo:"Sensores", 
        campos:{ 
            "propiedad":{nombre:"Propiedad"}, 
            "URLDATOS":{nombre:"Enlace Datos", tipo:"link", alias:"Ver datos"} 
        }, 
        titulo:"nombre", 
        icon:"icons/aforo.svg" 
    },
    { 
        url:"data/centrales_hidroelectricas_che.geojson", 
        nombre:"Centrales Hidroeléctricas / Centrales Hydroélectriques", 
        grupo:"Infraestructura", 
        campos:{ 
            "LRS_NOMBRE":{nombre:"Nombre"}, 
            "URLSIT":{nombre:"Enlace Sitio", tipo:"link", alias:"Ver sitio"} 
        }, 
        titulo:"Central Hidroeléctrica", 
        icon:"icons/central_hidorelectrica.svg" 
    },
    { 
        url:"data/estaciones_pluviometricas.geojson", 
        nombre:"Estaciones Meteorológicas / Stations Météorologiques", 
        grupo:"Sensores", 
        campos:{ 
            "nombre":{nombre:"Nombre"}, 
            "url_estacion":{nombre:"Enlace Estación", tipo:"link", alias:"Ver estación"} 
        }, 
        titulo:"Estación meteorológica", 
        icon:"icons/lluvia.svg" 
    },
    { 
        url:"data/embalses.geojson", 
        nombre:"Embalses / Réservoirs", 
        grupo:"Infraestructura", 
        campos:{ 
            "LRS_NOMBRE":{nombre:"Nombre"}, 
            "URLSIT":{nombre:"Enlace", tipo:"link"} 
        }, 
        titulo:"Embalse", 
        icon:"icons/embalse.svg" 
    }
];

// ================= CAPAS DE EXPOSICIÓN =================
let exposicionActiva = [1,2,3,4];
const capasExposicion = [];
const basePath = "data/zonas_inundables/";

const archivosExposicionInfo = [
  { nombreArchivo: "wgs_carreteras_expuestas", nombreCapa: "Carreteras Expuestas / Routes Exposées" },
  { nombreArchivo: "wgs_car_urbana_expuesta", nombreCapa: "Carreteras Urbanas Expuestas / Routes Urbaines Exposées" },
  { nombreArchivo: "wgs_edificaciones_generales_expuestas", nombreCapa: "Edificaciones Generales / Bâtiments Généraux" },
  { nombreArchivo: "wgs_ferrocarril_alt_vel_expeusto", nombreCapa: "Ferrocarril Alta Velocidad / Chemin de Fer à Grande Vitesse" },
  { nombreArchivo: "wgs_infraestructura_transporte_expuesta", nombreCapa: "Infraestructura Transporte / Infrastructure de Transport" },
  { nombreArchivo: "wgs_instalaciones_deportivas_expuestas", nombreCapa: "Instalaciones Deportivas / Installations Sportives" },
  { nombreArchivo: "wgs_instalaciones_industriales", nombreCapa: "Instalaciones Industriales / Installations Industrielles" },
  { nombreArchivo: "wgs_instalaciones_recurrentes", nombreCapa: "Instalaciones Recurrentes / Installations Récurrentes" },
  { nombreArchivo: "wgs_periodos_retorno", nombreCapa: "Periodos de Retorno / Périodes de Retour" }
];

function getColorExposicion(codigo){ 
    return ({1:"#d73027",2:"#fc8d59",3:"#fee08b",4:"#91cf60"}[codigo] || "#cccccc"); 
}

function estiloExposicion(feature){
    return feature.geometry.type.includes("Line") 
        ? { color:getColorExposicion(feature.properties.codigo_exposicion), weight:2, opacity:1 } 
        : { color:"#444", weight:1, fillColor:getColorExposicion(feature.properties.codigo_exposicion), fillOpacity:0.6 };
}

function filtrarCapasExposicion(){ 
    capasExposicion.forEach(capa => capa.eachLayer(layer => {
        const codigo = Number(layer.feature.properties.codigo_exposicion);
        const esPoligono = layer.feature.geometry.type.includes("Polygon");
        if(exposicionActiva.includes(codigo)){
            layer.setStyle({ opacity:1, fillOpacity: esPoligono?0.6:1 });
        } else {
            layer.setStyle({ opacity:0, fillOpacity:0 });
        }
    }));
}

function cargarCapaExposicion(nombreArchivo, nombreCapa){
    return fetch(`${basePath}${nombreArchivo}.geojson`)
        .then(r=>r.json())
        .then(data=>{
            const capa = L.geoJSON(data,{
                renderer:L.canvas({ padding:0.5 }),
                style: estiloExposicion,
                onEachFeature: (feature, layer)=>{
                    layer._defaultStyle = estiloExposicion(feature);
                    layer.on({
                        mouseover: highlightFeature,
                        mouseout: ()=>layer.setStyle(layer._defaultStyle),
                        click: ()=>{
                            let html = `<table class='popup-table'><tr><th colspan="2">${nombreCapa}</th></tr>`;
                            html += `<tr><td><b>Código exposición</b></td><td>${feature.properties.codigo_exposicion}</td></tr></table>`;
                            layer.bindPopup(html).openPopup();
                        }
                    });
                }
            });
            capasExposicion.push(capa);
            filtrarCapasExposicion();
            controlCapas.addOverlay(capa, nombreCapa, "Exposición");
            return capa;
        });
}

// ================= CARGAR TODAS LAS CAPAS =================
capasAntiguas.forEach(c => cargarCapaGeoJSON(c.url, c.nombre, c.grupo, c.campos || {}, null, c.estilo, c.tipo));
capasClusterData.forEach(c => cargarCapaGeoJSON(c.url, c.nombre, c.grupo, c.campos, c.titulo, {}, "marker", c.icon));
archivosExposicionInfo.forEach(info => cargarCapaExposicion(info.nombreArchivo, info.nombreCapa));

// ================= LEYENDA =================
document.querySelectorAll("#leyenda-exposicion .item").forEach(item=>{
    item.addEventListener("click", ()=>{
        const codigo = Number(item.dataset.codigo);
        if(exposicionActiva.includes(codigo)){
            exposicionActiva = exposicionActiva.filter(c => c!==codigo);
            item.classList.add("inactive");
        } else {
            exposicionActiva.push(codigo);
            item.classList.remove("inactive");
        }
        filtrarCapasExposicion();
    });
});
