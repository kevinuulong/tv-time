const map = L.map('map', { crs: L.CRS.Simple }).setView([0, 0], 2);

// Layer styles
const styles = {
    got_continents: { color: '#8B7355', weight: 2, fillColor: '#C2A97A', fillOpacity: 1 }, // da mapo
    got_islands: { color: '#8B7355', weight: 1, fillColor: '#C2A97A', fillOpacity: 1 },

    got_lakes: { color: '#4A90D9', weight: 0, fillColor: '#4A90D9', fillOpacity: 1 },
    got_rivers: { color: '#4A90D9', weight: 2 },

    got_landscape: { color: '#5A7A3A', weight: 0, fillColor: '#52a04a', fillOpacity: 0 }, // INVIS! - forest type sh
    // got_officialMapAreas: { color: '#999', weight: 0, fillColor: '#ddd', fillOpacity: 0 }, // INVIS!
    got_politcal: { color: '#8B2020', weight: 0, fillColor: '#C25A5A', fillOpacity: 0 }, // TEMP INVIS! - regions o da realm!
    got_regions: { color: '#666', weight: 0, fillColor: '#aaa', fillOpacity: 0 }, // INVIS!
    got_roads: { color: '#8B6914', weight: 2, dashArray: '4 4' },
    got_wall: { color: '#ccc', weight: 5 },
};

const geojsonFiles = [
    //'got_officialMapAreas',
    'got_continents',
    'got_landscape',
    'got_politcal',
    'got_regions',
    'got_islands',
    'got_lakes',
    'got_rivers',
    'got_roads',
    'got_wall',
    'got_locations',
];

let locationsLayer = null;
const ZOOM_THRESHOLD = 5;

async function loadLayers() {
    for (const name of geojsonFiles) {
        const r = await fetch(`/map/${name}.geojson`);
        const data = await r.json();
        const layer = L.geoJSON(data, {
            style: styles[name] || {},
            pointToLayer: (feature, latlng) => {
                return L.circleMarker(latlng, {
                    radius: 4,
                    color: '#5c0a0a',
                    fillColor: '#cfa900',
                    fillOpacity: 1,
                    weight: 1
                });
            },
            onEachFeature: (feature, layer) => {
                const p = feature.properties;
                const label = p?.name || p?.Name || p?.NAME;
                if (label) layer.bindPopup(label);
            }
        }).addTo(map);

        if (name === 'got_locations') locationsLayer = layer;
    }
}

map.on('zoomend', () => {
    if (!locationsLayer) return;
    if (map.getZoom() < ZOOM_THRESHOLD) {
        locationsLayer.remove();
    } else {
        locationsLayer.addTo(map);
    }
});

loadLayers();