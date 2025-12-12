const categories = [
    {
        name: "Head Boy",
        candidates: ["Ahmed", "Bilal", "Hassan"]
    },
    {
        name: "Head Girl",
        candidates: ["Ayesha", "Minaal", "Sara"]
    }
];

const categoriesDiv = document.getElementById("categories");

function loadCategories() {
    categories.forEach(category => {
        const div = document.createElement("div");
        div.className = "category";

        let html = `<h3>${category.name}</h3>`;

        category.candidates.forEach(c => {
            html += `
                <label>
                    <input type="radio" name="${category.name}" value="${c}">
                    ${c}
                </label><br>
            `;
        });

        div.innerHTML = html;
        categoriesDiv.appendChild(div);
    });
}

loadCategories();

document.getElementById("submitVote").addEventListener("click", () => {
    alert("Vote submitted!");
});
