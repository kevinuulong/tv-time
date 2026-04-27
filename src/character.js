import * as d3 from "d3";
import "./styles/colors.css";
import "./styles/character.css";

const params = new URLSearchParams(window.location.search);
const character = params.get("id");

if (character) {
    console.log(character);
    await d3.csv("data/characters.csv")
        .then((data) => {
            console.log(data);
        })
} else {
    console.error("Unknown character");
}