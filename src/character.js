import * as d3 from "d3";
import "./styles/colors.css";
import "./styles/character.css";

import '@fontsource/marcellus-sc';
import '@fontsource/marcellus';
// Supports weights 300-700
import '@fontsource-variable/overpass-mono/wght.css';
// Supports weights 100-900
import '@fontsource-variable/overpass/wght.css';
import '@fontsource-variable/overpass/wght-italic.css';

import { hydrateIcons } from "./utils/icons";
import { resizeImage } from "./utils/image";
import TopWords from "./charts/TopWords";
import BFFs from "./charts/BFFs";

hydrateIcons();

const params = new URLSearchParams(window.location.search);
const character = params.get("id");

const seasonPicker = document.getElementById("season");
const bffElement = document.getElementById("bffs");

function findIndex(direction) {
    let nextIndex = seasonPicker.selectedIndex + direction;

    while (nextIndex >= 0 && nextIndex < seasonPicker.length) {
        if (!seasonPicker.options[nextIndex]?.disabled) return nextIndex;
        nextIndex += direction;
    }
    return undefined;
};

const next = document.getElementById("next");
const previous = document.getElementById("previous");

function updateControls() {
    previous.disabled = findIndex(-1) === undefined;
    next.disabled = findIndex(+1) === undefined;
    updateSeason();
}

next.addEventListener("click", () => {
    const index = findIndex(+1);
    if (index !== undefined) {
        seasonPicker.selectedIndex = index;
        updateControls();
    }
});

previous.addEventListener("click", () => {
    const index = findIndex(-1);
    if (index !== undefined) {
        seasonPicker.selectedIndex = index;
        updateControls();
    }
});

function filterBFFs(season, n = 5) {
    let filtered = bffData;
    if (season) {
        filtered = bffData.filter((link) => link.season === season);
    } else {
        // TODO: I'm confident there are more elegant ways to do this
        const totals = {};
        bffData.forEach((link) => {
            if (!(link.target in totals)) totals[link.target] = 0;
            totals[link.target] += link.weight;
        });
        filtered = [];
        Object.entries(totals).forEach(([target, weight]) => {
            filtered.push({
                source: character,
                target,
                season: 0,
                weight,
            });
        });
    }
    filtered.sort((a, b) => b.weight - a.weight);
    return filtered.splice(0, n);
};

function updateSeason() {
    const index = seasonPicker.selectedIndex
    const season = seasonPicker.options[index].text;
    document.querySelectorAll(".season").forEach((el) => {
        el.textContent = season;
    });

    const data = (index === 0) ? scriptData["top_content_overall"] : scriptData["seasons"][index]["top_content"];

    new TopWords(document.getElementById("top-words"), data);
    console.log({
        name: character,
        children: filterBFFs(index),
    })
    bffChart.data = {
        name: character,
        children: filterBFFs(index),
    }
    bffChart.updateVis();
}

seasonPicker.addEventListener("change", updateControls);

let characterData, scriptData, bffData, bffChart;
let characterMap;

if (character) {
    const [characters, data] = await Promise.all([
        d3.csv("data/characters.csv"),
        d3.json("data/script_data.json"),
    ]);

    characterData = characters.find((row) => row.code === character);
    scriptData = data.nodes.find((node) => node.id === character);
    bffData = data.links.filter((link) => link.source === character);

    characterMap = characters.reduce((prev, character) => {
        prev[character.code] = character;
        return prev;
    }, {});

    // Hydrate all the character-name placeholders
    document.querySelectorAll(".character-name").forEach((el) => {
        el.textContent = characterData.character;
    });

    // Hydrate the character image
    const img = document.getElementById("character-image");
    img.src = resizeImage(characterData.image);
    img.alt = characterData.character;

    document.querySelectorAll("#season > option").forEach((el) => {
        if (el.value in scriptData.seasons) el.disabled = false;
    });

    bffChart = new BFFs({
        parentElement: document.getElementById("bffs"),
        characterMap
    },
        {
            name: character,
            children: filterBFFs(seasonPicker.selectedIndex),
        }
    );

    updateControls();

} else {
    console.error("Unknown character");
}