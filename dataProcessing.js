import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import tinycolor from "https://esm.sh/tinycolor2";

export { data, avgFear, listOfAvgOfFears, frequency, normalizedScore3D, healthLevel, conspiracyLevel, fearIntensityScale, fearColorScale, colorOffset, colorComplement, gaussianRandom, clamp, randomSign, roundToTwo }
export { calculatePercentage, calculateAllPercentage }

import { currentQuestionNumber, currentQuestionPercentage } from "./buttons.js";

const data = await d3.json("data.json")

data.sort(
    (a, b) => d3.ascending(a.PAGE1, b.PAGE1)
).filter(
    d => d.PAGE1 != 99 && d.Q16L != -1
)

function calculatePercentage(question) {
    const filteredData = data.filter(d => d[question] == 1 || d[question] == 2); // 1 being very afraid and 2 being afraid
    return ((filteredData.length / data.length) * 100);
    // console.log((filteredData.length / data.length) * 100);
}

function calculateAllPercentage(number) {
    const percentages = {};
    for (let i = 1; i <= 4; i++) {
        const filteredData = data.filter(d => d[number] == i);
        percentages[i] = (filteredData.length / data.length);
    }
    return percentages;
}



/////////////////////////////
// extra utility functions //
/////////////////////////////

function gaussianRandom(mean = 0, stdDev = 1) {
    let u = 1 - Math.random()
    let v = Math.random()
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)

    return z * stdDev + mean
}

function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value))
}

function randomSign() {
    return Math.random() > 0.5 ? 1 : -1;
}

function roundToTwo(num) {
    return + (Math.round(num + "e+2") + "e-2");
} //https://stackoverflow.com/questions/11832914/how-to-round-to-at-most-2-decimal-places-if-necessary



//////////////////////
// garbage attempts //
//////////////////////

const avgFear = [
    d3.mean(data, d => d.Q16L), //fear of economic collapse
]

// console.log(avgFear)

const ageGroup = data.map(
    d => [(Math.floor((d.PAGE1 - 3) / 5) * 5 + 3), d.Q16L
    ]
) //grouping the ages into 5 year groups for finding frequency of each response for each age group

const frequency = d3.rollup(
    ageGroup,
    v => v.length,
    d => d[0],
    d => d[1]
)

//this calculates how 'conspiracy-driven' a person is based on their answers to the questions
const conspiracyLevel = data.map(
    d => [
        d.PAGE1,
        d3.sum([
            d.Q20A, d.Q20B, d.Q20C, d.Q20D, d.Q20E, d.Q20F, d.Q20G, d.Q20H, d.Q20I, d.Q21A, d.Q21B, d.Q21C, d.Q21D, d.Q34A, d.Q34B, d.Q34C, d.Q34D, d.Q34E, d.Q34F, d.Q34G,
        ],), //sum of all questions about the person's belief in conspiracy theories
        d.Q17I
    ]
)

//this calculates the health status (both physical and mental) of the person based on their answers to the questions
const healthLevel = data.map(
    d => [
        d.PAGE1,
        roundToTwo(d3.mean([
            d.Q10A, d.Q10B, d.Q10C, d.Q10D])), //average of all questions about the person's fears about health
        roundToTwo(d3.mean([
            d.Q11B, d.Q11D, d.Q11F, d.Q11G])) //average of all questions about the amount of time the person spends worrying
    ]
)

const yCore = 200
const zCore = 200
const xCore = 200

//normalizing the data so that it can be plotted on the 3D graph
const normalizedScore3D = conspiracyLevel.map(
    d => [
        d3.scaleLinear()
            .domain([d3.min(conspiracyLevel, d => d[0]), d3.max(conspiracyLevel, d => d[0])])
            .range([-zCore, zCore])
            (d[0]), //age
        roundToTwo(
            d3.scaleLinear()
                .domain([d3.min(conspiracyLevel, d => d[1]), d3.max(conspiracyLevel, d => d[1])])
                .range([-xCore, xCore])
                (d[1])
        ), //normalized conspiracy score
        roundToTwo(
            d3.scaleLinear()
                .domain([d3.min(conspiracyLevel, d => d[2]), d3.max(conspiracyLevel, d => d[2])])
                .range([-yCore, yCore])
                (d[2])
        ), //normalized fear
    ]
)

const listOfAvgOfFears = avgFear.map(
    d => roundToTwo(d3.scaleLinear()
        .domain([0, 5])
        .range([0, 10])
        ((d))
    )
) //this is to scale the average fear from 0-5 to 0-10 and round it for the 3D visual

//fearIntensityScale and fearColorScale are used to show scale of the fear

const fearIntensityScale = d3.scaleLinear()
    .domain([d3.min(listOfAvgOfFears), d3.max(listOfAvgOfFears)])
    .range([1, 200]);

const fearColorScale = d3.scaleLinear()
    .domain([d3.min(listOfAvgOfFears), d3.max(listOfAvgOfFears)])
    .range(["#0A2F51", "#FF0000"]);

//using tinyColor to generate analogous variations and complementary colors 

function colorOffset(color) {
    let colors = tinycolor(color).analogous();
    colors = colors.map(function (t) { return t.toHexString(); });
    return colors[Math.floor(Math.random() * colors.length)];
}

function colorComplement(color) {
    let colors = tinycolor(color).complement().toHexString();
    // colors = colors.map(function (t) { return t.toHexString(); });
    return colors;
}