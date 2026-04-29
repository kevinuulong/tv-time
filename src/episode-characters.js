// Data
import * as d3 from "d3";
import "@fontsource/marcellus"; // Loads the Marcellus font
let characterdata;
fetch('/data/script_data.json')
    .then(response => response.json())
    .then(data => {
        //console.log(data);
        characterdata = data;
    })
    .catch(error => {
        console.error('Error:', error);
    });

let imageData;
d3.csv("data/characters.csv", d3.autoType).then(data => {
    console.log(data); 
    imageData = data;
});


// Seasons
const seasonList = document.getElementById('season-list');
const seasons = document.getElementById('seasons');
        seasonList.getElementsByClassName('anchor')[0].onclick = function (evt) {
            if (seasons.classList.contains('visible')){
                seasons.classList.remove('visible');
                seasons.style.display = "none";
            }
            
            else{
                seasons.classList.add('visible');
                seasons.style.display = "block";
            }
            
            
        }

        seasonList.onblur = function(evt) {
            seasons.classList.remove('visible');
        }

// Episodes
const episodeList = document.getElementById('episode-list');
const episodes = document.getElementById('episodes');
        episodeList.getElementsByClassName('anchor')[0].onclick = function (evt) {
            if (episodes.classList.contains('visible')){
                episodes.classList.remove('visible');
                episodes.style.display = "none";
            }
            
            else{
                episodes.classList.add('visible');
                episodes.style.display = "block";
            }
            
            
        }

        episodeList.onblur = function(evt) {
            episodes.classList.remove('visible');
        }

function getSeasons(){
    // 1. Clear the current list so we don't get duplicates
    episodes.innerHTML = "";
    
    // 2. Select only the checkboxes that are actually checked
    const checkedBoxes = seasons.querySelectorAll('input[type="checkbox"]:checked');

    checkedBoxes.forEach(box => {
        const s = parseInt(box.value);
        // Determine episode count (S7=7, S8=6, others=10)
        const count = s === 8 ? 6 : (s === 7 ? 7 : 10);
        
        for (let e = 1; e <= count; e++) {
            // Use template literals for cleaner code
            episodes.innerHTML += `<input type="checkbox" data-season="${s}" data-episode="${e}"/> S${s} E${e} `;
        }
        episodes.innerHTML += "<br>";
    });
}
seasons.addEventListener('change', getSeasons);

class Characters{
    constructor(name, id, appearances, word_count, image_url) {
        this.name = name;
        this.id = id;
        this.appearances = appearances;
        this.word_count = word_count;
        this.image_url = image_url;
    }

    addAppearance(){
        this.appearances++;
    }

    addLines(count){
        this.word_count += count;
    }

    hasAppeared(){
        return this.appearances > 0;
    }

}
var characterHTML = document.getElementById("characters");
function getCharacters(){
    //Clear the current list so we don't get duplicates
    characterHTML.innerHTML = "";

    // Create a list to store the characters found
    const characterList = [];
    
    // Select only the checkboxes that are actually checked
    const checkedBoxes = episodes.querySelectorAll('input[type="checkbox"]:checked');

    // Go through each character and check if they are in the selected episodes
    characterdata.nodes.forEach(character => {
        var imageRow = imageData.find((row) => row.code === character.id);
        if(imageRow !== undefined){
            var currentCharacter = new Characters(imageRow["character"], character.id, 0, 0, imageRow["image"]);
            checkedBoxes.forEach(box => {
            const s = parseInt(box.dataset.season);
            const e = parseInt(box.dataset.episode);
            const seasonNo = String(s);

            const seasonData = character.seasons[seasonNo];
            if (seasonData) {
                seasonData.episodes.forEach(episode => {
                    if (episode.episode_number === e) {
                        currentCharacter.addAppearance();
                        currentCharacter.addLines(episode.word_count);
                    }
                });
            }
            });

            if (currentCharacter.hasAppeared()) {
                characterList.push(currentCharacter);
                console.log(currentCharacter.name + "is added!");
            }
        }
      
    });

    characterList.sort((a, b) => b.word_count - a.word_count);
    var totalWordCount = 0;
    characterList.forEach(character => {
        totalWordCount += character.word_count;
    });


    characterList.forEach(character => {
        // 1. Divide by a smaller number (like 2 instead of 20) so the word count makes a huge difference
        // Lowered the base width from 380 to 280 so minor characters are visibly smaller
        const width = Math.min(280 + (character.word_count / 2), 900); 
        const height = width * .65; // Aspect ratio
        const padding = Math.min(15 + (character.word_count / 100), 40);
        const fontSize = Math.min(18 + (character.word_count / 300), 28);
        
        // 2. Changed "flex: 1 1" to "flex: 0 1" to prevent the panels from artificially stretching to fill the row
        characterHTML.innerHTML += `<div class="character_panel" 
            style="flex: 0 1 ${width}px; max-width: ${width * 1.2}px; height: ${height}px; padding: 0px; font-size: ${fontSize}px; gap: 0px;">
        <img src="${character.image_url}" style="width: 45%; height: 100%; flex-shrink: 0;">
        <div style="flex-grow: 1; padding: ${padding}px; min-width: 0; overflow-wrap: break-word;">
            <h2 style="margin: 0 0 5px 0; font-size: 1.25em;">${character.name}</h2>
            <b>Episodes:</b> ${character.appearances}
            <br>
            <b>Word count:</b> ${character.word_count}
        </div>
        </div>`;
    });

    checkedBoxes.forEach(box => {
        const s = parseInt(box.dataset.season);
        const e = parseInt(box.dataset.episode);

        console.log(`Season: ${s}, Episode: ${e} is selected!`);
    });
}
document.getElementById('getCharacters').onclick = getCharacters;