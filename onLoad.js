function updateVisibility(elementId, visible) {
    const element = document.getElementById(elementId);
    if (visible) {
        element.classList.add("visible");
    } else {
        element.classList.remove("visible");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const introMain = document.getElementById("intro-main");
    const understoodBtn = document.getElementById("title-button");

    understoodBtn.addEventListener("click", () => {
        introMain.style.opacity = 0;
        setTimeout(() => {
            introMain.style.display = "none";
        }, 500);
        setTimeout(() => {
            updateVisibility("intro-prompt", true);
        }, 1500);
        setTimeout(() => {
            updateVisibility("left-sidebar", true);
        }, 1000);
    });
});