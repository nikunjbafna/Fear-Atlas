import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let data = await d3.json("data.json")

const questions = await d3.json("dataQuestions.json")
const fearKeys = questions.map(item => item.number);
const numberToQuestion = {};

questions.forEach(item => {
    numberToQuestion[item.number] = item.question;
});

export function updateDataForRadar(number) {

    let baseFear = number;
    let mostSimilarFears = find_most_similar_fears(baseFear).slice(0, 10); // Take top 5 most similar fears
    // console.log(mostSimilarFears);
    function find_most_similar_fears(baseFear) {
        let similarities = [];
        fearKeys.forEach((fear) => {
            if (fear === baseFear) {
                return; // Skip the iteration when the fear is the same as baseFear
            }
            let similarity = 0;
            for (let i = 1; i <= 4; i++) {
                let baseFearCount = data.filter(d => d[baseFear] == i).length;
                let currentFearCount = data.filter(d => d[fear] == i).length;

                similarity += Math.min(baseFearCount, currentFearCount);
            }
            similarities.push({ fear: fear, similarity: similarity });
        });
        similarities.sort((a, b) => b.similarity - a.similarity);
        return similarities;
    }
    updateRadarPlot(mostSimilarFears);
}

const parentDiv = d3.select("#bottom").node();
const parentWidth = parentDiv.clientWidth;
const parentHeight = parentDiv.clientHeight;

// console.log(parentWidth, parentHeight);

const margin = { top: 75, right: 150, bottom: 75, left: 0 },
    width = parentWidth - margin.left - margin.right,
    height = parentHeight - margin.top - margin.bottom,
    innerRadius = 10,
    outerRadius = Math.min(width, height) / 2;

const svg = d3.select("#bottom")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left + width / 2}, ${margin.top + height / 2})`);

function updateRadarPlot(mostSimilarFears) {

    svg.selectAll("*").remove();

    svg.attr("opacity", 0);
    svg.transition()
        .duration(500)
        .attr("opacity", 1);

    const angleScale = d3.scaleLinear()
        .domain([0, mostSimilarFears.length])
        .range([0, 2 * Math.PI]);

    const radiusScale = d3.scaleLinear()
        .domain([mostSimilarFears[mostSimilarFears.length - 1].similarity - 10, d3.max(mostSimilarFears, d => d.similarity)])
        .range([innerRadius, outerRadius]);

    const line = d3.lineRadial()
        .angle((_, i) => angleScale(i))
        .radius(d => radiusScale(d.similarity))
        .curve(d3.curveLinearClosed)

    // Angular Axis (X Axis)
    const angularAxis = svg.selectAll(".x-axis")
        .data(mostSimilarFears)
        .join("g")
        .attr("class", "x-axis");

    const squareSize = 8;

    angularAxis.append("rect")
        .attr("width", squareSize)
        .attr("height", squareSize)
        .attr("fill", "grey")
        // .attr("x", (_, i) => d3.pointRadial(angleScale(i), outerRadius + squareSize / 2)[0])
        // .attr("y", (_, i) => d3.pointRadial(angleScale(i), outerRadius + squareSize / 2)[1])
        .attr("transform", (_, i) => {
            const [x, y] = d3.pointRadial(angleScale(i), outerRadius);
            const angle = (angleScale(i) * 180 / Math.PI) - 45;
            return `translate(${x - squareSize / 2}, ${y - squareSize / 2}) rotate(${angle}, ${squareSize / 2}, ${squareSize / 2})`;
        });

    angularAxis.append("line")
        .attr("x1", (_, i) => d3.pointRadial(angleScale(i), innerRadius)[0])
        .attr("y1", (_, i) => d3.pointRadial(angleScale(i), innerRadius)[1])
        .attr("x2", (_, i) => d3.pointRadial(angleScale(i), outerRadius)[0])
        .attr("y2", (_, i) => d3.pointRadial(angleScale(i), outerRadius)[1])
        .attr("stroke", "grey")
        .attr("stroke-width", 1);

    // Draw the radial area chart
    svg.append("path")
        .datum(mostSimilarFears)
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .attr("d", line);

    // // Draw a polygon connecting the endpoints of the angular axis
    // svg.append("path")
    //     .datum(mostSimilarFears)
    //     .attr("fill", "none")
    //     .attr("stroke", "grey")
    //     .attr("stroke-width", 1)
    //     .attr("d", d3.lineRadial()
    //         .angle((_, i) => angleScale(i))
    //         .radius(outerRadius)
    //         .curve(d3.curveLinearClosed)
    //     );

    function wrap(text, width) {
        text.each(function () {
            let text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.1, // ems
                x = text.attr("x"),
                y = text.attr("y"),
                dy = parseFloat(text.attr("dy") || 0),
                tspan = text.text(null)
                    .append("tspan")
                    .attr("x", x)
                    .attr("y", y)
                    .attr("dy", dy + "em");

            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan")
                        .attr("x", x)
                        .attr("y", y)
                        .attr("dy", ++lineNumber * lineHeight + dy + "em")
                        .text(word);
                }
            }
        });
    }

    angularAxis.append("text")
        .attr("x", (_, i) => d3.pointRadial(angleScale(i), outerRadius + 20)[0])
        .attr("y", (_, i) => d3.pointRadial(angleScale(i), outerRadius + 20)[1])
        .attr("dy", (_, i) => {
            if (i === 0) {
                return "-1.5em"; // Vertically align bottom
            } else if (i === 5) {
                return "-0.3em"; // Vertically align top
            } else {
                return "0.3em"; // Vertically align middle
            }
        })
        .attr("text-anchor", (_, i) => {
            if (i === 0 || i === 5) {
                return "middle";
            } else if (i < 5) {
                return "start";
            } else {
                return "end";
            }
        })
        .attr("font-size", 10)
        .text(d => numberToQuestion[d.fear])
        .call(wrap, 100);


}