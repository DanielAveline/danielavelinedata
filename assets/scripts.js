document.addEventListener("DOMContentLoaded", () => {
    console.log("JavaScript Loaded Successfully");

    const links = document.querySelectorAll("nav a");

    links.forEach(link => {
        link.addEventListener("click", (event) => {
            const target = event.target.getAttribute("href");
            if (target.includes(".html")) {
                event.preventDefault();

                fetch(target)
                    .then(response => response.text())
                    .then(data => {
                        const parser = new DOMParser();
                        const newDoc = parser.parseFromString(data, "text/html");
                        const newContent = newDoc.querySelector("main").innerHTML;

                        document.querySelector("main").innerHTML = newContent;
                        window.history.pushState({}, "", target);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    })
                    .catch(error => console.error("Error loading page:", error));
            }
        });
    });
});

