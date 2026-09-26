let players = [];
let shortlist = new Set();

let showingShortlistOnly = false;


// ==========================================
// LOAD CSV
// ==========================================

async function loadPlayers() {
    try {
        const response = await fetch("./players.csv");

        if (!response.ok) {
            throw new Error("Could not load players.csv");
        }

        const csvText = await response.text();

        players = parsePlayerCSV(csvText);

        loadSavedShortlist();

        populateFilters();
        renderPlayers();

        document.getElementById("loading").classList.add("hidden");

    } catch (error) {
        console.error(error);

        document.getElementById("loading").classList.add("hidden");
        document.getElementById("error").classList.remove("hidden");
    }
}


// ==========================================
// PARSE YOUR CSV
//
// Your CSV has:
// Row 1 = Player + team/owner names
// Row 2 = Budget
// Row 3 = actual player headers
// Row 4+ = player data
// ==========================================

function parsePlayerCSV(text) {

    const rows = parseCSVRows(text);

    if (rows.length < 4) {
        return [];
    }

    // Your actual player header is row 3
    const headers = rows[2].map(header =>
        header.trim()
    );

    const playerRows = rows.slice(3);

    return playerRows
        .filter(row => row.length > 0 && row[0])
        .map(row => {

            const player = {};

            // We only need the first 8 player columns
            player.playername = row[0] || "";
            player.bathand = row[1] || "";
            player.bowlstyle = row[2] || "";
            player.role = row[3] || "";
            player.country = row[4] || "";
            player.ovr = row[5] || "";
            player.price = row[6] || "";
            player.status = row[7] || "";

            return player;
        });
}


// ==========================================
// CSV PARSER
// Handles commas inside quotes
// ==========================================

function parseCSVRows(text) {

    const rows = [];
    let row = [];
    let value = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {

        const char = text[i];
        const next = text[i + 1];

        if (char === '"' && insideQuotes && next === '"') {

            value += '"';
            i++;

        } else if (char === '"') {

            insideQuotes = !insideQuotes;

        } else if (char === "," && !insideQuotes) {

            row.push(value.trim());
            value = "";

        } else if (
            (char === "\n" || char === "\r") &&
            !insideQuotes
        ) {

            if (char === "\r" && next === "\n") {
                i++;
            }

            row.push(value.trim());

            if (row.some(value => value !== "")) {
                rows.push(row);
            }

            row = [];
            value = "";

        } else {

            value += char;
        }
    }

    if (value !== "" || row.length > 0) {

        row.push(value.trim());

        if (row.some(value => value !== "")) {
            rows.push(row);
        }
    }

    return rows;
}


// ==========================================
// PLAYER VALUES
// ==========================================

function getPlayerName(player) {
    return player.playername;
}

function getBatHand(player) {
    return player.bathand;
}

function getBowlStyle(player) {
    return player.bowlstyle;
}

function getRole(player) {
    return player.role;
}

function getCountry(player) {
    return player.country;
}

function getOVR(player) {
    return player.ovr;
}

function getPrice(player) {
    return player.price;
}

function getStatus(player) {
    return player.status;
}


// ==========================================
// FILTERS
// ==========================================

function populateFilters() {

    populateSelect(
        "roleFilter",
        players.map(getRole)
    );

    populateSelect(
        "countryFilter",
        players.map(getCountry)
    );

    populateSelect(
        "batFilter",
        players.map(getBatHand)
    );

    populateSelect(
        "bowlFilter",
        players.map(getBowlStyle)
    );
}


function populateSelect(id, values) {

    const select = document.getElementById(id);

    const uniqueValues = [
        ...new Set(
            values
                .filter(value => value)
                .sort()
        )
    ];

    uniqueValues.forEach(value => {

        const option = document.createElement("option");

        option.value = value;
        option.textContent = value;

        select.appendChild(option);
    });
}


// ==========================================
// RENDER PLAYERS
// ==========================================

function renderPlayers() {

    const search =
        document
            .getElementById("searchInput")
            .value
            .toLowerCase()
            .trim();

    const role =
        document.getElementById("roleFilter").value;

    const country =
        document.getElementById("countryFilter").value;

    const bat =
        document.getElementById("batFilter").value;

    const bowl =
        document.getElementById("bowlFilter").value;

    const sort =
        document.getElementById("sortSelect").value;


    let filtered = players.filter(player => {

        const name =
            getPlayerName(player)
                .toLowerCase();

        if (
            search &&
            !name.includes(search)
        ) {
            return false;
        }

        if (
            role &&
            getRole(player) !== role
        ) {
            return false;
        }

        if (
            country &&
            getCountry(player) !== country
        ) {
            return false;
        }

        if (
            bat &&
            getBatHand(player) !== bat
        ) {
            return false;
        }

        if (
            bowl &&
            getBowlStyle(player) !== bowl
        ) {
            return false;
        }

        if (
            showingShortlistOnly &&
            !shortlist.has(getPlayerName(player))
        ) {
            return false;
        }

        return true;
    });


    // ======================================
    // SORT
    // ======================================

    filtered.sort((a, b) => {

        if (sort === "name") {
            return getPlayerName(a)
                .localeCompare(getPlayerName(b));
        }

        if (sort === "ovrHigh") {
            return Number(getOVR(b))
                - Number(getOVR(a));
        }

        if (sort === "ovrLow") {
            return Number(getOVR(a))
                - Number(getOVR(b));
        }

        if (sort === "priceHigh") {
            return Number(getPrice(b))
                - Number(getPrice(a));
        }

        if (sort === "priceLow") {
            return Number(getPrice(a))
                - Number(getPrice(b));
        }

        return 0;
    });


    const table =
        document.getElementById("playerTable");

    table.innerHTML = "";


    document
        .getElementById("noResults")
        .classList.toggle(
            "hidden",
            filtered.length !== 0
        );


    // ======================================
    // CREATE ROWS
    // ======================================

    filtered.forEach(player => {

        const name = getPlayerName(player);

        const isShortlisted =
            shortlist.has(name);

        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                <span
                    class="star ${
                        isShortlisted
                            ? "shortlisted"
                            : ""
                    }"
                    onclick="toggleShortlist(
                        '${escapeForHTML(name)}'
                    )"
                >
                    ${
                        isShortlisted
                            ? "★"
                            : "☆"
                    }
                </span>
            </td>

            <td>
                <span class="player-name">
                    ${escapeForHTML(name)}
                </span>
            </td>

            <td>
                ${escapeForHTML(
                    getBatHand(player)
                )}
            </td>

            <td>
                ${escapeForHTML(
                    getBowlStyle(player)
                )}
            </td>

            <td>
                ${escapeForHTML(
                    getRole(player)
                )}
            </td>

            <td>
                ${escapeForHTML(
                    getCountry(player)
                )}
            </td>

            <td>
                <span class="ovr">
                    ${escapeForHTML(
                        getOVR(player)
                    )}
                </span>
            </td>

            <td>
                <span class="price">
                    ${escapeForHTML(
                        getPrice(player)
                    )} Cr
                </span>
            </td>

            <td>
                <span class="status ${
                    getStatus(player)
                        .toLowerCase()
                        === "available"
                        ? "available"
                        : "unavailable"
                }">
                    ${escapeForHTML(
                        getStatus(player)
                    )}
                </span>
            </td>
        `;

        table.appendChild(row);
    });


    updateStats(filtered.length);
}


// ==========================================
// SHORTLIST
// ==========================================

function toggleShortlist(name) {

    if (shortlist.has(name)) {
        shortlist.delete(name);
    } else {
        shortlist.add(name);
    }

    saveShortlist();

    renderPlayers();
}


function saveShortlist() {

    localStorage.setItem(
        "cricket26_shortlist",
        JSON.stringify(
            [...shortlist]
        )
    );
}


function loadSavedShortlist() {

    const saved =
        localStorage.getItem(
            "cricket26_shortlist"
        );

    if (!saved) {
        return;
    }

    try {

        shortlist =
            new Set(
                JSON.parse(saved)
            );

    } catch {

        shortlist = new Set();
    }
}


// ==========================================
// STATS
// ==========================================

function updateStats(showing) {

    document.getElementById("totalPlayers")
        .textContent = players.length;

    document.getElementById("shortlistCount")
        .textContent = shortlist.size;

    document.getElementById("showingCount")
        .textContent = showing;
}


// ==========================================
// CLEAR FILTERS
// ==========================================

function clearFilters() {

    document.getElementById("searchInput")
        .value = "";

    document.getElementById("roleFilter")
        .value = "";

    document.getElementById("countryFilter")
        .value = "";

    document.getElementById("batFilter")
        .value = "";

    document.getElementById("bowlFilter")
        .value = "";

    document.getElementById("sortSelect")
        .value = "name";

    renderPlayers();
}


// ==========================================
// ALL / SHORTLIST
// ==========================================

function showAll() {

    showingShortlistOnly = false;

    document
        .getElementById("showAllBtn")
        .classList.add("active");

    document
        .getElementById("showShortlistBtn")
        .classList.remove("active");

    renderPlayers();
}


function showShortlist() {

    showingShortlistOnly = true;

    document
        .getElementById("showShortlistBtn")
        .classList.add("active");

    document
        .getElementById("showAllBtn")
        .classList.remove("active");

    renderPlayers();
}


// ==========================================
// HTML ESCAPE
// ==========================================

function escapeForHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ==========================================
// EVENTS
// ==========================================

document
    .getElementById("searchInput")
    .addEventListener(
        "input",
        renderPlayers
    );

document
    .getElementById("roleFilter")
    .addEventListener(
        "change",
        renderPlayers
    );

document
    .getElementById("countryFilter")
    .addEventListener(
        "change",
        renderPlayers
    );

document
    .getElementById("batFilter")
    .addEventListener(
        "change",
        renderPlayers
    );

document
    .getElementById("bowlFilter")
    .addEventListener(
        "change",
        renderPlayers
    );

document
    .getElementById("sortSelect")
    .addEventListener(
        "change",
        renderPlayers
    );

document
    .getElementById("clearFiltersBtn")
    .addEventListener(
        "click",
        clearFilters
    );

document
    .getElementById("showAllBtn")
    .addEventListener(
        "click",
        showAll
    );

document
    .getElementById("showShortlistBtn")
    .addEventListener(
        "click",
        showShortlist
    );


// ==========================================
// START
// ==========================================

loadPlayers();
