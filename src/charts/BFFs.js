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
            .attr("height", this.height);

        this.defs = this.svg.append("defs")
            .append("clipPath")
            .attr("id", "character-clip")
            .append("rect")
            .attr("width", 80)
            .attr("height", 80)
            .attr("x", -40)
            .attr("y", -40)
            .attr("rx", 16);

        this.chart = this.svg.append("g")
            .attr("transform", `translate(${80}, ${this.height / 2})`)


        this.updateVis();
    }

    updateVis() {
        this.root = d3.hierarchy(this.data);
        this.tree = d3.tree().nodeSize([90, this.width / 2]);
        this.tree(this.root);

        this.renderVis();
    }

    renderVis() {
        this.ribbonGenerator = d3.area()
            .x((d) => d.x)
            .y0((d) => d.y0)
            .y1((d) => d.y1)
            .curve(d3.curveBumpX);

        this.ribbons = this.chart.selectAll("path.ribbon")
            .data(this.root.links())
            .join("path")
            .attr("class", "ribbon")
            .attr("d", (d) => {
                const points = [
                    { x: d.source.y, y0: d.source.x, y1: d.source.x },
                    { x: d.target.y - 40, y0: d.target.x - 40, y1: d.target.x + 40 },
                    { x: d.target.y - 40 + 16, y0: d.target.x - 40, y1: d.target.x + 40 },
                ]
                return this.ribbonGenerator(points);
            })
            .attr("fill", "var(--bg-dark)")
            .attr("fill-opacity", 0.5)
            .attr("stroke", "var(--bg-dark)")
            .attr("stroke-width", 1)

            .on("mouseover", function (e, d) {
                d3.select(this)
                    .attr("fill-opacity", 0.8)
                    .attr("stroke-width", 2)
            })

            .on("mousemove", (e, d) => {
                if (d.target.depth > 0) {
                    d3.select("#tooltip")
                        .style("display", "flex")
                        .style("left", `${e.pageX + 8}px`)
                        .style("top", `${e.pageY + 8}px`)
                        .html(`${d.target.data.weight} line${(d.target.data.weight > 1) ? "s" : ""}`)
                }
            })

            .on("mouseleave", function (e, d) {
                d3.select(this)
                    .attr("fill-opacity", 0.5)
                    .attr("stroke-width", 1)

                d3.select("#tooltip")
                    .style("display", "none")
            })


        this.nodes = this.chart.selectAll(".node")
            .data(this.root.descendants())
            .join("g")
            .attr("class", "node")
            .attr("cursor", (d) => (d.depth > 0 && d.data.target in this.config.characterMap) ? "pointer" : null)
            .attr("transform", (d) => `translate(${d.y}, ${d.x})`)

            .on("mouseover", (e, d) => {
                this.chart.selectAll("path.ribbon")
                    .filter((link) => link.target === d)
                    .attr("fill-opacity", 0.8)
                    .attr("stroke-width", 2)
            })

            .on("mousemove", (e, d) => {
                if (d.depth > 0) {
                    d3.select("#tooltip")
                        .style("display", "flex")
                        .style("left", `${e.pageX + 8}px`)
                        .style("top", `${e.pageY + 8}px`)
                        .html(`${d.data.weight} line${(d.data.weight > 1) ? "s" : ""}`)
                }
            })

            .on("mouseleave", (e, d) => {
                this.chart.selectAll("path.ribbon")
                    .filter((link) => link.target === d)
                    .attr("fill-opacity", 0.5)
                    .attr("stroke-width", 1)

                d3.select("#tooltip")
                    .style("display", "none")
            })

            .on("click", (e, d) => {
                if (d.depth > 0 && d.data.target in this.config.characterMap) {
                    window.location = `./character?id=${d.data.target}`;
                }
            })

        this.nodes.selectAll("rect.bounds")
            .data((d) => (d.depth > 0) ? [d] : [])
            .join("rect")
            .attr("class", "bounds")
            .attr("x", -80)
            .attr("y", -40)
            .attr("width", this.width / 2)
            .attr("height", 80)
            .attr("fill", "transparent")

        this.nodes.selectAll("image")
            .data((d) => [d])
            .join("image")
            .attr("href", (d) => {
                if (d.parent !== null) {
                    const data = this.config.characterMap[d.data.target];
                    if (data) {
                        return data.image;
                    }
                }
                const data = this.config.characterMap[d.data.name];
                if (!data) return "/unknown.svg";
                return data.image;
            })
            .attr("width", 80)
            .attr("height", 80)
            .attr("x", -40)
            .attr("y", -40)
            .attr("clip-path", "url(#character-clip)")
            .attr("preserveAspectRatio", "xMidYMid slice")

        this.nodes.selectAll("text.name")
            .data((d) => [d])
            .join("text")
            .attr("class", "name")
            .attr("dx", (d) => (d.depth > 0) ? 60 : 0)
            .attr("dy", (d) => (d.depth > 0) ? 10 : 60)
            .attr("fill", "var(--text-light)")
            .attr("text-anchor", (d) => (d.depth > 0) ? "start" : "middle")
            .text((d) => this.config.characterMap[d.data.name]?.character || this.config.characterMap[d.data.target]?.character || d.data.target);

        this.nodes.selectAll("text.rank")
            .data((d) => (d.depth > 0) ? [d] : [])
            .join("text")
            .attr("class", "rank")
            .attr("x", -60)
            .attr("y", 10)
            .attr("fill", "var(--text-light)")
            .attr("text-anchor", "end")
            .text((d) => `#${d.parent.children.indexOf(d) + 1}`);
    }
}