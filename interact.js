document.addEventListener("DOMContentLoaded", () => {
    const topDiv = document.getElementById("top");
    const bottomDiv = document.getElementById("bottom");
    let clickedOutside = true;

    topDiv.addEventListener("click", () => {
        clickedOutside = false;
        topDiv.style.height = "80%";
        bottomDiv.style.height = "20%";
    });

    bottomDiv.addEventListener("click", () => {
        clickedOutside = false;
        topDiv.style.height = "20%";
        bottomDiv.style.height = "80%";
    });

    document.body.addEventListener("click", (event) => {
        if (clickedOutside) {
            topDiv.style.height = "60%";
            bottomDiv.style.height = "40%";
        } else {
            clickedOutside = true;
        }
    });
});
