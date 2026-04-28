import * as d3 from "d3";

export default class BFFs {
    constructor(config, data) {
        this.config = {
            parentElement: config.parentElement,
            characterMap: config.characterMap,
        }
        this.data = data;

        this.initVis();
    }

    initVis() {
        this.width = this.config.parentElement.getBoundingClientRect().width;
        this.height = 500;

        this.svg = d3.select(this.config.parentElement)
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("viewBox", `0 0 ${this.width} ${this.height}`);

        this.chart = this.svg.append("g");

        this.root = d3.hierarchy(this.data);
        console.log(this.root);
        this.tree = d3.tree().nodeSize([300, 80]);
        this.tree(this.root);

        this.renderVis();
    }

    renderVis() {
        this.chart.selectAll("image")
            .data(this.root.descendants())
            .join("image")
            .attr("x", (d) => {
                return d.x;
            })
            .attr("y", (d) => d.y)
            .attr("href", (d) => {
                if (d.parent !== null) {
                    const data = this.config.characterMap[d.data.target];
                    if (data) {
                        return data.image;
                    }
                }
                console.log(d.data);
                // TODO: What's wrong here, why is one of the children "falling through"?
                const data = (d.data.name) ? this.config.characterMap[d.data.name] : this.config.characterMap[d.data.target];
                return data.image;
            })
            .attr("width", 80)
            .attr("height", 80)
            .attr("preserveAspectRatio", "xMidYMid slice");
    }
}