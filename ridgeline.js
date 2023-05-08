import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

import { data } from "./dataProcessing.js";

const parentDiv = d3.select("#top").node();
const parentWidth = parentDiv.clientWidth;
const parentHeight = parentDiv.clientHeight;

let dataForRidgeLine = []

export function updateDataForRidgeLine(number) {
    dataForRidgeLine = data.map(
        d => ({
            Ag: Math.floor((d.PAGE1 - 3) / 5) * 5 + 3,
            Fr: d[number] 
        })
    ).filter(d => d.Ag != 98 && d.Ag != 88 && d.Ag != 83)
    updateRidgeLinePlot(dataForRidgeLine);
};

// console.log(dataForRidgeLine)

const margin = { top: 75, right: 35, bottom: 50, left: 75 },
    width = parentWidth - margin.left - margin.right,
    height = parentHeight - margin.top - margin.bottom;

const svg = d3.select("#top")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);


export function updateRidgeLinePlot(dataForRidgeLine) {

    // svg.selectAll("*").remove(); rewrite this function with a delay

    svg.selectAll("*").remove();

    svg.attr("opacity", 0);
    svg.transition()
        .duration(500)
        .attr("opacity", 1);

    const Ages = Array.from(new Set(dataForRidgeLine.map(d => d.Ag)));
    const n = Ages.length;

    // console.log(Ages);

    const tickLabels = {
        18: "18 - 22",
        23: "23 - 27",
        28: "28 - 32",
        33: "33 - 37",
        38: "38 - 42",
        43: "43 - 47",
        48: "48 - 52",
        53: "53 - 57",
        58: "58 - 62",
        63: "63 - 67",
        68: "68 - 72",
        73: "73 - 77",
        78: "78 - 82",
    };

    const x = d3.scaleLinear()
        .domain([-0.5, 5.5])
        .range([width, 0])

    let axisB = d3.axisBottom(x)
        .ticks(5)
        .tickFormat(function (d) {
            if (d === 0) {
                return "Very Afraid";
            } else if (d === 1) {
                return "";
            } else if (d === 2) {
                return "";
            } else if (d === 3) {
                return "";
            } else if (d === 4) {
                return "";
            } else if (d === 5) {
                return "Not Afraid";
            }
        })
        .tickSize(0)
        .tickPadding(10);

    const y = d3.scaleLinear()
        .domain([0, 2])
        .range([height, 250]);

    const yName = d3.scaleBand()
        .domain(Ages)
        .range([0, height])
        .paddingInner(1);

    let axisL = d3.axisLeft(yName)
        .tickSize(0)
        .tickPadding(10)
        .tickFormat(function (d) {
            return tickLabels[d] || "";
        });

    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .call(axisB)
        .call(g => g.select(".domain").remove())
        .selectAll("text")
        .attr("transform", "translate(-10,10)")
    // .style("text-anchor", "end")

    svg.append("g")
        .call(axisL)
        .call(g => g.select(".domain").remove());

    // svg.append("text")
    //     .attr("x", 0)
    //     .attr("y", height + margin.top)
    //     .style("font-size", "12px")
    //     .attr("transform", "translate(-20,-20)")
    //     .attr("text-align", "center")
    //     .text("Response to fear");

    svg.append("text")
        // .attr("text-anchor", "end")
        // .attr("transform", "rotate(-90)")
        .style("text-anchor", "end")
        .style("font-size", "12px")
        .attr("transform", "translate(-10,-20)")
        .text("Age")

    const kde = kernelDensityEstimator(kernelEpanechnikov(1), x.ticks(10));
    const allDensity = [];
    const groupedData = d3.group(dataForRidgeLine, d => d.Ag);

    // for (const key of Ages) {
    //     const density = kde(groupedData.get(key).map(d => +d.Fr));
    //     allDensity.push({ key: key, density: density, maxDensity: d3.max(density, d => d[1]) });
    // }

    for (const key of Ages) {
        const density = kde(groupedData.get(key).map(d => +d.Fr));
        const maxPoint = d3.max(density, d => d[1]);
        const maxX = density.find(point => point[1] === maxPoint)[0];
        allDensity.push({ key: key, density: density, maxX: maxX });
    }

    // console.log(allDensity);

    // const color = d3.scaleSequential()
    //     .domain([0, d3.max(allDensity, d => d.maxDensity)])
    //     .interpolator(d3.interpolateInferno);

    const colorScale = d3.scaleSequential()
        .interpolator(d3.interpolateViridis)
        .domain([-0.5, 5]);

    // console.log(colorScale(allDensity[0].maxX));

    svg.selectAll("areas")
        .data(allDensity)
        .join("path")
        .attr("transform", function (d) { return (`translate(0, ${(yName(d.key) - height)})`); })
        .datum(function (d) { return (d.density); })
        .attr("fill", "none")
        // .attr("stroke", function (d) { return (colorScale((d, d => d[0]))); })
        .attr("stroke", "white")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .curve(d3.curveBasis)
            .x(function (d) { return x(d[0]); })
            .y(function (d) { return y(d[1]); })
        )

    // svg.selectAll("areas")
    //     .data(allDensity)
    //     .join("path")
    //     .attr("transform", function (d) { return (`translate(0, ${(yName(d.key) - height)})`); })
    //     .datum(function (d) { return (d.density); })
    //     .attr("fill", "none")
    //     // .attr("stroke", "white")
    //     .attr("stroke", function (d) { return (color(d3.max(d, d => d[1]))); })
    //     .attr("stroke-width", 2)
    //     .attr("d", d3.line()
    //         .curve(d3.curveBasis)
    //         .x(function (d) { return x(d[0]); })
    //         .y(function (d) { return y(d[1]); })
    //     )

    function kernelDensityEstimator(kernel, X) {
        return function (V) {
            return X.map(function (x) {
                return [x, d3.mean(V, function (v) { return kernel(x - v); })];
            });
        };
    }

    function kernelEpanechnikov(k) {
        return function (v) {
            return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
        };
    }
}