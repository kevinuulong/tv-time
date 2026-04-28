export default class TopWords {
    constructor(el, data) {
        this.el = el;
        this.data = data;

        this.initVis();
    }

    initVis() {
        const ol = document.createElement("ol");
        ol.className = this.el.className;
        ol.id = this.el.id;

        console.log(this.data);
        this.data.forEach(item => {
            const li = document.createElement("li");
            const { term, sample, count } = item;
            const escaped = RegExp.escape(term);
            const pattern = new RegExp(`(${escaped})`, "gi");
            const parts = sample.split(pattern);

            parts.forEach((part) => {
                if (part.toLowerCase() === term.toLowerCase()) {
                    const highlight = document.createElement("span");
                    highlight.className = "highlight";

                    const counter = document.createElement("span");
                    counter.className = "count";
                    counter.textContent = `${count}x`;

                    const phrase = document.createTextNode(part);

                    highlight.append(counter, phrase);
                    li.append(highlight);
                } else {
                    li.append(document.createTextNode(part));
                }
            });
            ol.append(li);
        });

        this.el.replaceWith(ol);
    }
};