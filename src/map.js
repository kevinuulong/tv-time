const bounds = L.latLngBounds(
    [-45, -20],
    [50, 100]
);

const map = L.map('map', {
    crs: L.CRS.Simple,
    maxZoom: 8,
    minZoom: 3,
    maxBounds: bounds,
    maxBoundsViscosity: 1.0,
}).setView([0, 0], 2);

const styles = {
    got_continents: { color: '#8B7355', weight: 2, fillColor: '#C2A97A', fillOpacity: 1 },
    got_islands: { color: '#8B7355', weight: 1, fillColor: '#C2A97A', fillOpacity: 1 },
    got_lakes: { color: '#4A90D9', weight: 0, fillColor: '#4A90D9', fillOpacity: 1 },
    got_rivers: { color: '#4A90D9', weight: .5 },
    got_landscape: { color: '#5A7A3A', weight: 0, fillColor: '#52a04a', fillOpacity: 0 },
    got_politcal: { color: '#8B2020', weight: 0, fillColor: '#C25A5A', fillOpacity: 0 },
    got_regions: { color: '#666', weight: 0, fillColor: '#aaa', fillOpacity: 0 },
    got_roads: { color: '#8B6914', weight: 2, dashArray: '4 4' },
    got_wall: { color: '#ccc', weight: 5 },
};

const geojsonFiles = [
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

const ALIAS_COORDS = {
    'Away from the Twins': [13.2986, 14.4726],
    'Castle Stokeworth': [19.5922, 5.0720],
    'Eastwatch': [20.7182, 34.7923],
    'Near Nightfort': [18.1671, 34.9511],
    'North of the Wall': [17.3476, 35.1604],
    'Top of the Wall': [17.3476, 35.1604],
    'The Iron Islands': [6.5632, 12.6138],
    'The Kingsroad': [14.9214, 17.1668],
    'The Kingswood': [19.8675, 2.0966],
    'The Summer Sea': [20.1948, -23.4813],
    'The Vale': [22.2791, 13.5148],
    'The Water Gardens': [24.7223, -8.7205],
    'The Wolfswood': [15.0883, 29.5136],
};

let locationsLayer = null;
let highlightLayer = null;
let aliasLayer = null;
let pathLayer = null;
let endpointLayer = null;
let episodesData = null;
let locationsGeoJSON = null;
let knownLocationNames = new Set();
let geoCoords = {};

const ZOOM_THRESHOLD = 5;
const scaledLayers = {};

const scaledWeights = {
    got_rivers: { base: .5, scale: .5 },
    got_wall: { base: 2, scale: 1 },
};

function getWeight(name, zoom) {
    const { base, scale } = scaledWeights[name];
    return base + (zoom * scale);
}

async function loadLayers() {
    for (const name of geojsonFiles) {
        const r = await fetch(`/map/${name}.geojson`);
        const data = await r.json();

        if (name === 'got_locations') {
            locationsGeoJSON = data;
            data.features.forEach(f => {
                const n = f.properties?.name;
                if (n) {
                    knownLocationNames.add(n);
                    geoCoords[n] = f.geometry.coordinates;
                }
            });
        }

        const layer = L.geoJSON(data, {
            style: scaledWeights[name]
                ? { ...styles[name], weight: getWeight(name, map.getZoom()) }
                : styles[name] || {},
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

        if (name === 'got_locations') {
            locationsLayer = layer;
            if (map.getZoom() < ZOOM_THRESHOLD) locationsLayer.remove();
        }
        if (scaledWeights[name]) scaledLayers[name] = layer;
    }
}

map.on('zoomend', () => {
    const zoom = map.getZoom();
    Object.entries(scaledLayers).forEach(([name, layer]) => {
        layer.setStyle({ weight: getWeight(name, zoom) });
    });
    if (!locationsLayer) return;
    if (zoom < ZOOM_THRESHOLD) {
        locationsLayer.remove();
    } else {
        locationsLayer.addTo(map);
    }
});

function resolveCoords(location, subLocation) {
    for (const name of [subLocation, location]) {
        if (!name) continue;
        if (geoCoords[name]) return geoCoords[name];
        if (ALIAS_COORDS[name]) return ALIAS_COORDS[name];
    }
    return null;
}

function buildOrderedPath(scenes) {
    const path = [];
    scenes.forEach(scene => {
        const coords = resolveCoords(scene.location, scene.subLocation);
        if (!coords) return;
        const label = scene.subLocation || scene.location;
        path.push({ label, coords });
    });

    const deduped = [];
    path.forEach(entry => {
        const prev = deduped[deduped.length - 1];
        if (!prev || prev.coords[0] !== entry.coords[0] || prev.coords[1] !== entry.coords[1]) {
            deduped.push(entry);
        }
    });

    return deduped;
}

function buildCharacterPath(characters) {
    const allScenes = [];
    episodesData.episodes.forEach(ep => {
        ep.scenes.forEach(scene => {
            const inScene = Array.isArray(characters)
                ? scene.characters.some(c => characters.includes(c.name))
                : scene.characters.some(c => c.name === characters);
            if (inScene) allScenes.push(scene);
        });
    });
    return buildOrderedPath(allScenes);
}

function buildEpisodePath(seasonNum, episodeNum) {
    const allScenes = [];
    episodesData.episodes.forEach(ep => {
        if (ep.seasonNum === seasonNum && ep.episodeNum === episodeNum) {
            ep.scenes.forEach(scene => allScenes.push(scene));
        }
    });
    return buildOrderedPath(allScenes);
}

const HIGHLIGHT_STYLE = {
    radius: 7,
    color: '#fff',
    fillColor: '#E5BB67',
    fillOpacity: 1,
    weight: 2,
};

const START_STYLE = {
    radius: 9,
    color: '#fff',
    fillColor: '#4CAF50',
    fillOpacity: 1,
    weight: 2,
};

const END_STYLE = {
    radius: 9,
    color: '#fff',
    fillColor: '#E53935',
    fillOpacity: 1,
    weight: 2,
};

function clearHighlights() {
    if (highlightLayer) { highlightLayer.remove(); highlightLayer = null; }
    if (aliasLayer) { aliasLayer.remove(); aliasLayer = null; }
    if (pathLayer) { pathLayer.remove(); pathLayer = null; }
    if (endpointLayer) { endpointLayer.remove(); endpointLayer = null; }
}

function drawPath(pathPoints) {
    if (pathPoints.length < 2) return;

    const latlngs = pathPoints.map(p => L.latLng(p.coords[1], p.coords[0]));

    pathLayer = L.polyline(latlngs, {
        color: '#920000',
        weight: 2,
        opacity: 0.8,
        dashArray: '6 4',
    }).addTo(map);

    const first = pathPoints[0];
    const last = pathPoints[pathPoints.length - 1];

    const startMarker = L.circleMarker(L.latLng(first.coords[1], first.coords[0]), START_STYLE);
    startMarker.bindPopup(`<strong>Start: ${first.label}</strong>`);

    const endMarker = L.circleMarker(L.latLng(last.coords[1], last.coords[0]), END_STYLE);
    endMarker.bindPopup(`<strong>End: ${last.label}</strong>`);

    endpointLayer = L.layerGroup([startMarker, endMarker]).addTo(map);
}

function showHighlights(locationNames, characterOrGroup, episodePath) {
    clearHighlights();

    if (!locationsGeoJSON || locationNames.size === 0) return;

    const matchedFeatures = locationsGeoJSON.features.filter(f =>
        locationNames.has(f.properties?.name)
    );

    if (matchedFeatures.length > 0) {
        highlightLayer = L.geoJSON(
            { type: 'FeatureCollection', features: matchedFeatures },
            {
                pointToLayer: (feature, latlng) => L.circleMarker(latlng, HIGHLIGHT_STYLE),
                onEachFeature: (feature, layer) => {
                    const name = feature.properties?.name;
                    if (name) layer.bindPopup(`<strong>${name}</strong>`);
                }
            }
        ).addTo(map);
    }

    const aliasMarkers = [];
    locationNames.forEach(epName => {
        if (knownLocationNames.has(epName)) return;
        const coords = ALIAS_COORDS[epName];
        if (!coords) return;
        aliasMarkers.push({ name: epName, coords });
    });

    if (aliasMarkers.length > 0) {
        aliasLayer = L.layerGroup(
            aliasMarkers.map(({ name, coords }) => {
                const marker = L.circleMarker(L.latLng(coords[1], coords[0]), HIGHLIGHT_STYLE);
                marker.bindPopup(`<strong>${name}</strong>`);
                return marker;
            })
        ).addTo(map);
    }

    if (episodePath) {
        drawPath(episodePath);
    } else if (characterOrGroup) {
        drawPath(buildCharacterPath(characterOrGroup));
    }
}

function getLocationsForCharacter(characterName) {
    const names = new Set();
    episodesData.episodes.forEach(ep => {
        ep.scenes.forEach(scene => {
            if (scene.characters.some(c => c.name === characterName)) {
                names.add(scene.location);
                if (scene.subLocation) names.add(scene.subLocation);
            }
        });
    });
    return names;
}

function getLocationsForGroup(characters) {
    const names = new Set();
    characters.forEach(char => getLocationsForCharacter(char).forEach(n => names.add(n)));
    return names;
}

function getLocationsForEpisode(seasonNum, episodeNum) {
    const names = new Set();
    episodesData.episodes.forEach(ep => {
        if (ep.seasonNum === seasonNum && ep.episodeNum === episodeNum) {
            ep.scenes.forEach(scene => {
                names.add(scene.location);
                if (scene.subLocation) names.add(scene.subLocation);
            });
        }
    });
    return names;
}

const filterIds = ['filter-episode', 'filter-character', 'filter-group'];

function resetOthers(changedId) {
    filterIds.forEach(id => {
        if (id !== changedId) document.getElementById(id).value = '';
    });
}

function charSpan(name) {
    return `<span class="log-char">${name}</span>`;
}

function weaponSpan(name) {
    return `<span class="log-weapon-name">${name}</span>`;
}

function weaponIcon(action) {
    const icons = {
        receives: '⚔',
        gives: '⚔',
        takes: '⚔',
        loses: '⚔',
        destroys: '💥',
        drops: '⚔',
        'picks up': '⚔',
        'gives up': '⚔',
        returns: '⚔',
        hides: '⚔',
        shows: '⚔',
        finds: '⚔',
        retrieves: '⚔',
    };
    return icons[action] || '⚔';
}

function extractEventsFromChar(char, seenDeaths, seenSex, seenMarry, seenWeapon) {
    const entries = [];
    const name = char.name;

    if (char.alive === false && !seenDeaths.has(name)) {
        seenDeaths.add(name);
        const manner = char.mannerOfDeath || 'unknown means';
        const killers = char.killedBy && char.killedBy.length ? char.killedBy : null;
        if (killers) {
            const killerHtml = killers.map(k => charSpan(k)).join(', ');
            entries.push(`<span class="log-action log-death">☠ ${charSpan(name)} was killed by ${killerHtml} — ${manner}.</span>`);
        } else {
            entries.push(`<span class="log-action log-death">☠ ${charSpan(name)} died — ${manner}.</span>`);
        }
    }

    if (char.sex && char.sex.when !== 'past') {
        const partners = char.sex.with || [];
        const sexKey = [name, ...partners].sort().join('|');
        if (!seenSex.has(sexKey)) {
            seenSex.add(sexKey);
            const partnerHtml = partners.length ? partners.map(p => charSpan(p)).join(' and ') : 'someone';
            const when = char.sex.when === 'future' ? ' (implied)' : '';
            entries.push(`<span class="log-action log-sex">♥ ${charSpan(name)} did the funny with ${partnerHtml}${when}.</span>`);
        }
    }

    if (char.married && char.married.when !== 'past') {
        const marriageKey = [name, char.married.to].sort().join('|');
        if (!seenMarry.has(marriageKey)) {
            seenMarry.add(marriageKey);
            const consummated = char.married.consummated ? ', consummated' : '';
            entries.push(`<span class="log-action log-marry">💍 ${charSpan(name)} married ${charSpan(char.married.to)}${consummated}.</span>`);
        }
    }

    if (char.weapon) {
        char.weapon.forEach(w => {
            if (w.action === 'has' || w.action === 'inspects') return;
            const weaponKey = `${name}|${w.action}|${w.name}`;
            if (!seenWeapon.has(weaponKey)) {
                seenWeapon.add(weaponKey);
                entries.push(`<span class="log-action log-weapon">${weaponIcon(w.action)} ${charSpan(name)} ${w.action} ${weaponSpan(w.name)}.</span>`);
            }
        });
    }

    return entries;
}

function buildEpisodeLog(seasonNum, episodeNum) {
    const locationBlocks = [];
    const locationIndex = {};

    episodesData.episodes.forEach(ep => {
        if (ep.seasonNum !== seasonNum || ep.episodeNum !== episodeNum) return;

        ep.scenes.forEach(scene => {
            const locLabel = scene.subLocation
                ? `${scene.location} — ${scene.subLocation}`
                : scene.location;

            if (!(locLabel in locationIndex)) {
                locationIndex[locLabel] = locationBlocks.length;
                locationBlocks.push({ label: locLabel, entries: [] });
            }
            const block = locationBlocks[locationIndex[locLabel]];

            const seenDeaths = new Set();
            const seenSex = new Set();
            const seenMarry = new Set();
            const seenWeapon = new Set();

            scene.characters.forEach(char => {
                extractEventsFromChar(char, seenDeaths, seenSex, seenMarry, seenWeapon)
                    .forEach(e => block.entries.push(e));
            });
        });
    });

    return locationBlocks.filter(b => b.entries.length > 0);
}

function buildCharacterLog(characterNames) {
    const nameSet = new Set(Array.isArray(characterNames) ? characterNames : [characterNames]);

    const episodeBlocks = [];

    const seenDeaths = new Set();
    const seenSex = new Set();
    const seenMarry = new Set();
    const seenWeapon = new Set();

    episodesData.episodes.forEach(ep => {
        const locIndex = {};
        const locBlocks = [];

        ep.scenes.forEach(scene => {
            const locLabel = scene.subLocation
                ? `${scene.location} — ${scene.subLocation}`
                : scene.location;

            scene.characters.forEach(char => {
                if (!nameSet.has(char.name)) return;

                const entries = extractEventsFromChar(char, seenDeaths, seenSex, seenMarry, seenWeapon);
                if (entries.length === 0) return;

                if (!(locLabel in locIndex)) {
                    locIndex[locLabel] = locBlocks.length;
                    locBlocks.push({ label: locLabel, entries: [] });
                }
                entries.forEach(e => locBlocks[locIndex[locLabel]].entries.push(e));
            });
        });

        if (locBlocks.length === 0) return;

        episodeBlocks.push({
            label: `S${ep.seasonNum}E${ep.episodeNum} — ${ep.episodeTitle}`,
            locations: locBlocks,
        });
    });

    return episodeBlocks;
}

function renderSidebarLog(blocks) {
    const top = document.getElementById('sidebar-top');
    top.innerHTML = '';

    if (!blocks || blocks.length === 0) {
        top.innerHTML = '<p class="log-empty">No notable events this episode.</p>';
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'log-wrapper';

    blocks.forEach(block => {
        const section = document.createElement('div');
        section.className = 'log-section';

        const heading = document.createElement('div');
        heading.className = 'log-location';
        heading.textContent = block.label;
        section.appendChild(heading);

        block.entries.forEach(html => {
            const p = document.createElement('p');
            p.className = 'log-entry';
            p.innerHTML = html;
            section.appendChild(p);
        });

        wrapper.appendChild(section);
    });

    top.appendChild(wrapper);
}

function renderCharacterLog(episodeBlocks, label) {
    const top = document.getElementById('sidebar-top');
    top.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'log-wrapper';

    const heading = document.createElement('div');
    heading.className = 'log-character-heading';
    heading.textContent = label;
    wrapper.appendChild(heading);

    if (episodeBlocks.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'log-empty';
        empty.textContent = 'No notable events found.';
        wrapper.appendChild(empty);
        top.appendChild(wrapper);
        return;
    }

    episodeBlocks.forEach(epBlock => {
        const epSection = document.createElement('div');
        epSection.className = 'log-section';

        const epHeading = document.createElement('div');
        epHeading.className = 'log-episode-heading';
        epHeading.textContent = epBlock.label;
        epSection.appendChild(epHeading);

        epBlock.locations.forEach(locBlock => {
            const locHeading = document.createElement('div');
            locHeading.className = 'log-location';
            locHeading.textContent = locBlock.label;
            epSection.appendChild(locHeading);

            locBlock.entries.forEach(html => {
                const p = document.createElement('p');
                p.className = 'log-entry';
                p.innerHTML = html;
                epSection.appendChild(p);
            });
        });

        wrapper.appendChild(epSection);
    });

    top.appendChild(wrapper);
}

function clearSidebarLog() {
    const top = document.getElementById('sidebar-top');
    top.innerHTML = '<p class="log-empty">Select a filter to explore the map.</p>';
}

async function loadFilters() {
    const [episodesRes, groupsRes] = await Promise.all([
        fetch('/data/episodes.json'),
        fetch('/data/characters-groups.json'),
    ]);
    episodesData = await episodesRes.json();
    const groupsData = await groupsRes.json();

    const episodes = episodesData.episodes;
    const characterSet = new Set();

    const episodeSelect = document.getElementById('filter-episode');
    const characterSelect = document.getElementById('filter-character');
    const groupSelect = document.getElementById('filter-group');

    episodes.forEach(ep => {
        const opt = document.createElement('option');
        opt.value = `${ep.seasonNum},${ep.episodeNum}`;
        opt.textContent = `S${ep.seasonNum}E${ep.episodeNum} — ${ep.episodeTitle}`;
        episodeSelect.appendChild(opt);
        ep.scenes.forEach(scene => {
            scene.characters.forEach(c => characterSet.add(c.name));
        });
    });

    [...characterSet].sort().forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        characterSelect.appendChild(opt);
    });

    groupsData.groups.forEach(group => {
        const opt = document.createElement('option');
        opt.value = group.name;
        opt.textContent = group.name;
        groupSelect.appendChild(opt);
    });

    episodeSelect.addEventListener('change', e => {
        resetOthers('filter-episode');
        const val = e.target.value;
        if (!val) { clearHighlights(); clearSidebarLog(); return; }
        const [s, ep] = val.split(',').map(Number);
        showHighlights(getLocationsForEpisode(s, ep), null, buildEpisodePath(s, ep));
        renderSidebarLog(buildEpisodeLog(s, ep));
    });

    characterSelect.addEventListener('change', e => {
        resetOthers('filter-character');
        const val = e.target.value;
        if (!val) { clearHighlights(); clearSidebarLog(); return; }
        showHighlights(getLocationsForCharacter(val), val, null);
        renderCharacterLog(buildCharacterLog(val), val);
    });

    groupSelect.addEventListener('change', e => {
        resetOthers('filter-group');
        const val = e.target.value;
        if (!val) { clearHighlights(); clearSidebarLog(); return; }
        const group = groupsData.groups.find(g => g.name === val);
        if (group) {
            showHighlights(getLocationsForGroup(group.characters), group.characters, null);
            renderCharacterLog(buildCharacterLog(group.characters), `Group: ${val}`);
        }
    });

    clearSidebarLog();
}

loadLayers();
loadFilters();