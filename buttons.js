import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { calculatePercentage, calculateAllPercentage } from "./dataProcessing.js";
import { updateDataForRidgeLine } from "./ridgeline.js";
import { updateDataForRadar } from "./relation.js";
import { initClusters, updateClusters } from "./main.js";

export { currentQuestionPercentage, currentQuestionNumber, currentQuestionAllPercentage }

const fearSelectDiv = document.querySelector(".fear-select");
let activeButton = null;

const questions = await d3.json("dataQuestions.json")

let currentQuestionPercentage = 1;
let currentQuestionNumber = "";
let currentQuestionAllPercentage = {};
let currentCriteria = "";

let promptDeleted = false;
let clustersInitialized = false;

function updateVisibility(elementId, isVisible) {
    document.getElementById(elementId).style.display = isVisible ? "block" : "none";
}

function selection(number) {
    currentQuestionNumber = number;
    currentQuestionPercentage = calculatePercentage(number) / 100;
    currentQuestionAllPercentage = calculateAllPercentage(number);
    // console.log(currentQuestionNumber, currentQuestionPercentage, currentQuestionAllPercentage);
};

function handleClick(button, question) {
    if (activeButton) {
        activeButton.classList.remove("active");
        activeButton.textContent = activeButton.textContent.substring(2);
    }
    button.classList.add("active");
    button.textContent = ">> " + button.textContent;
    activeButton = button;

    

    updateVisibility("intro-prompt", false);

    selection(question.number);

    updateDataForRidgeLine(question.number);
    updateDataForRadar(question.number);

    if (!clustersInitialized) {
        initClusters(question.criteria);
        clustersInitialized = true;
    }
    updateClusters(question.criteria);

    if (promptDeleted) {
        deletePrompt();
    }
}

function deletePrompt() {
    setTimeout(() => {
        const introPrompt = document.getElementById("intro-prompt");
        introPrompt.parentNode.removeChild(introPrompt);
        promptDeleted = true;
    }, 1000);
}

questions.forEach((question) => {
    // if (currentCriteria !== question.criteria) {
    //     const criteriaTitle = document.createElement("p");
    //     criteriaTitle.classList.add("criteria-title");
    //     // criteriaTitle.textContent = "> " + question.criteria;
    //     criteriaTitle.textContent = question.criteria;
    //     criteriaTitle.style.textTransform = "uppercase";
    //     fearSelectDiv.appendChild(criteriaTitle);
    //     currentCriteria = question.criteria;
    // }
   
    const button = document.createElement("button");
    button.classList.add("text-only-button");
    button.textContent = question.question;
    button.addEventListener("click", () => handleClick(button, question));
    fearSelectDiv.appendChild(button);
});
