const CSV_FILE = "./players.csv";


// =========================================================
// SQUAD RULES
// =========================================================

const MAX_BUDGET = 100;

const MIN_SQUAD_SIZE = 16;

const MAX_SQUAD_SIZE = 20;

const MAX_PLAYERS_PER_COUNTRY = 3;


// =========================================================
// GLOBAL DATA
// =========================================================

let players = [];

let shortlist = JSON.parse(
    localStorage.getItem("cricket26_shortlist") || "[]"
);

let showShortlistOnly = false;


// =========================================================
// CSV PARSER
// =========================================================

function parseCSV(text) {

    const rows = [];

    let row = [];

    let value = "";

    let insideQuotes = false;


    for (let i = 0; i < text.length; i++) {

        const char = text[i];

        const next = text[i + 1];


        // Escaped quote
        if (
            char === '"' &&
            insideQuotes &&
            next === '"'
        ) {

            value += '"';

            i++;

        }

        // Start / end quote
        else if (char === '"') {

            insideQuotes = !insideQuotes;

        }

        // Column separator
        else if (
            char === "," &&
            !insideQuotes
        ) {

            row.push(value.trim());

            value = "";

        }

        // New line
        else if (
            (char === "\n" || char === "\r") &&
            !insideQuotes
        ) {

            if (
                char === "\r" &&
                next === "\n"
            ) {

                i++;
            }


            row.push(value.trim());

            value = "";


            if (
                row.some(
                    cell => cell !== ""
                )
            ) {

                rows.push(row);
            }


            row = [];

        }

        else {

            value += char;
        }
    }


    // Last row
    if (
        value !== "" ||
        row.length > 0
    ) {

        row.push(value.trim());

        if (
            row.some(
                cell => cell !== ""
            )
        ) {

            rows.push(row);
        }
    }


    return rows;
}


// =========================================================
// LOAD CSV
// =========================================================

async function loadPlayers() {

    try {

        const response = await fetch(
            CSV_FILE
        );


        if (!response.ok) {

            throw new Error(
                "Could not load players.csv"
            );
        }


        const text =
            await response.text();


        const rows =
            parseCSV(text);


        /*
            Your CSV structure is:

            Row 1:
            Player,,,,,,,,Diggsy,...

            Row 2:
            Budget,,,,,,,,100,...

            Row 3:
            Player Name,Bat Hand,...

            Row 4+:
            Actual players
        */


        if (rows.length < 4) {

            throw new Error(
                "players.csv does not contain enough rows."
            );
        }


        // Row 3 = player headers
        const headerRow = rows[2];


        console.log(
            "CSV headers:",
            headerRow
        );


        // Rows 4+ = players
        players = rows
            .slice(3)
            .map((row, index) => {

                return {

                    id: index,

                    playername:
                        row[0] || "",

                    bathand:
                        row[1] || "",

                    bowlstyle:
                        row[2] || "",

                    role:
                        row[3] || "",

                    country:
                        row[4] || "",

                    ovr:
                        Number(row[5]) || 0,

                    price:
                        Number(row[6]) || 0,

                    status:
                        row[7] || ""

                };
            });


        console.log(
            `Loaded ${players.length} players`
        );


        populateFilters();

        cleanOldShortlist();

        render();


    } catch (error) {

        console.error(
            "CSV loading error:",
            error
        );


        const tableBody =
            document.querySelector(
                "#playerTableBody"
            );


        if (tableBody) {

            tableBody.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        class="error"
                    >
                        Failed to load players.csv
                        <br>
                        <small>
                            ${escapeHTML(error.message)}
                        </small>
                    </td>
                </tr>
            `;
        }
    }
}


// =========================================================
// REMOVE INVALID OLD SHORTLIST ENTRIES
// =========================================================

function cleanOldShortlist() {

    const validIds =
        new Set(
            players.map(
                player => player.id
            )
        );


    shortlist =
        shortlist.filter(
            id => validIds.has(id)
        );


    saveShortlist();
}


// =========================================================
// SHORTLIST
// =========================================================

function getShortlistedPlayers() {

    return players.filter(
        player =>
            shortlist.includes(
                player.id
            )
    );
}


function getTotalPrice() {

    return getShortlistedPlayers()
        .reduce(
            (total, player) =>
                total + player.price,
            0
        );
}


function getCountryCount(country) {

    return getShortlistedPlayers()
        .filter(
            player =>
                player.country === country
        )
        .length;
}


function saveShortlist() {

    localStorage.setItem(
        "cricket26_shortlist",
        JSON.stringify(shortlist)
    );
}


// =========================================================
// ADD / REMOVE PLAYER
// =========================================================

function toggleShortlist(playerId) {

    const alreadySelected =
        shortlist.includes(
            playerId
        );


    // -----------------------------------------------------
    // REMOVE
    // -----------------------------------------------------

    if (alreadySelected) {

        shortlist =
            shortlist.filter(
                id => id !== playerId
            );


        saveShortlist();

        render();

        return;
    }


    // -----------------------------------------------------
    // FIND PLAYER
    // -----------------------------------------------------

    const player =
        players.find(
            p => p.id === playerId
        );


    if (!player) {

        return;
    }


    // -----------------------------------------------------
    // MAX 20 PLAYERS
    // -----------------------------------------------------

    if (
        shortlist.length >=
        MAX_SQUAD_SIZE
    ) {

        alert(
            `Your squad can have a maximum of ${MAX_SQUAD_SIZE} players.`
        );

        return;
    }


    // -----------------------------------------------------
    // MAX 100 CR
    // -----------------------------------------------------

    const currentBudget =
        getTotalPrice();


    const newBudget =
        currentBudget +
        player.price;


    if (
        newBudget >
        MAX_BUDGET
    ) {

        alert(
            `Cannot add ${player.playername}.\n\n` +

            `Budget limit: ${MAX_BUDGET} Cr\n` +

            `Current spending: ${currentBudget} Cr\n` +

            `Player price: ${player.price} Cr\n` +

            `You only have ${MAX_BUDGET - currentBudget} Cr remaining.`
        );

        return;
    }


    // -----------------------------------------------------
    // MAX 3 FROM COUNTRY
    // -----------------------------------------------------

    const countryCount =
        getCountryCount(
            player.country
        );


    if (
        countryCount >=
        MAX_PLAYERS_PER_COUNTRY
    ) {

        alert(
            `Cannot add ${player.playername}.\n\n` +

            `You already have ${MAX_PLAYERS_PER_COUNTRY} players from ${player.country}.\n\n` +

            `Maximum allowed from one country is ${MAX_PLAYERS_PER_COUNTRY}.`
        );

        return;
    }


    // -----------------------------------------------------
    // ADD PLAYER
    // -----------------------------------------------------

    shortlist.push(
        playerId
    );


    saveShortlist();

    render();
}


// =========================================================
// FILTER PLAYERS
// =========================================================

function getFilteredPlayers() {

    const search =
        document
            .querySelector(
                "#searchInput"
            )
            ?.value
            .toLowerCase()
            .trim() || "";


    const role =
        document
            .querySelector(
                "#roleFilter"
            )
            ?.value || "";


    const country =
        document
            .querySelector(
                "#countryFilter"
            )
            ?.value || "";


    const bat =
        document
            .querySelector(
                "#batFilter"
            )
            ?.value || "";


    const bowl =
        document
            .querySelector(
                "#bowlFilter"
            )
            ?.value || "";


    const sort =
        document
            .querySelector(
                "#sortSelect"
            )
            ?.value || "name";


    let result =
        players.filter(
            player => {

                const matchesSearch =
                    !search ||
                    player.playername
                        .toLowerCase()
                        .includes(search);


                const matchesRole =
                    !role ||
                    player.role === role;


                const matchesCountry =
                    !country ||
                    player.country === country;


                const matchesBat =
                    !bat ||
                    player.bathand === bat;


                const matchesBowl =
                    !bowl ||
                    player.bowlstyle === bowl;


                const matchesShortlist =
                    !showShortlistOnly ||
                    shortlist.includes(
                        player.id
                    );


                return (
                    matchesSearch &&
                    matchesRole &&
                    matchesCountry &&
                    matchesBat &&
                    matchesBowl &&
                    matchesShortlist
                );
            }
        );


    // =====================================================
    // SORT
    // =====================================================

    result.sort(
        (a, b) => {

            switch (sort) {

                case "ovr-desc":

                    return b.ovr - a.ovr;


                case "ovr-asc":

                    return a.ovr - b.ovr;


                case "price-desc":

                    return b.price - a.price;


                case "price-asc":

                    return a.price - b.price;


                case "name":

                default:

                    return a.playername
                        .localeCompare(
                            b.playername
                        );
            }
        }
    );


    return result;
}


// =========================================================
// FILTER OPTIONS
// =========================================================

function populateFilters() {

    const roles =
        [
            ...new Set(
                players.map(
                    p => p.role
                )
            )
        ]
            .filter(Boolean)
            .sort();


    const countries =
        [
            ...new Set(
                players.map(
                    p => p.country
                )
            )
        ]
            .filter(Boolean)
            .sort();


    const bats =
        [
            ...new Set(
                players.map(
                    p => p.bathand
                )
            )
        ]
            .filter(Boolean)
            .sort();


    const bowls =
        [
            ...new Set(
                players.map(
                    p => p.bowlstyle
                )
            )
        ]
            .filter(Boolean)
            .sort();


    fillSelect(
        "roleFilter",
        roles
    );


    fillSelect(
        "countryFilter",
        countries
    );


    fillSelect(
        "batFilter",
        bats
    );


    fillSelect(
        "bowlFilter",
        bowls
    );
}


function fillSelect(
    id,
    values
) {

    const select =
        document.querySelector(
            `#${id}`
        );


    if (!select) {

        return;
    }


    const firstOption =
        select.options[0];


    select.innerHTML = "";


    if (firstOption) {

        select.appendChild(
            firstOption
        );
    }


    values.forEach(
        value => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                value;


            option.textContent =
                value;


            select.appendChild(
                option
            );
        }
    );
}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHTML(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );
}


// =========================================================
// SQUAD STATUS
// =========================================================

function getSquadStatus() {

    const count =
        shortlist.length;


    // Less than 16
    if (
        count <
        MIN_SQUAD_SIZE
    ) {

        const remaining =
            MIN_SQUAD_SIZE -
            count;


        return {

            text:
                `${remaining} more player${remaining === 1 ? "" : "s"} needed`,

            className:
                "warning"
        };
    }


    // 16-20
    if (
        count >= MIN_SQUAD_SIZE &&
        count <= MAX_SQUAD_SIZE
    ) {

        return {

            text:
                "Squad requirement met",

            className:
                "success"
        };
    }


    return {

        text:
            "Squad size invalid",

        className:
            "danger"
    };
}


// =========================================================
// RENDER TABLE
// =========================================================

function render() {

    const tableBody =
        document.querySelector(
            "#playerTableBody"
        );


    if (!tableBody) {

        return;
    }


    const filteredPlayers =
        getFilteredPlayers();


    tableBody.innerHTML = "";


    if (
        filteredPlayers.length === 0
    ) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="loading"
                >
                    No players found.
                </td>
            </tr>
        `;

        updateStats();

        return;
    }


    filteredPlayers.forEach(
        player => {

            const selected =
                shortlist.includes(
                    player.id
                );


            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    <button
                        class="star-button ${selected ? "selected" : ""}"
                        data-player-id="${player.id}"
                        title="${
                            selected
                                ? "Remove from shortlist"
                                : "Add to shortlist"
                        }"
                    >
                        ${selected ? "★" : "☆"}
                    </button>
                </td>


                <td>
                    <strong>
                        ${escapeHTML(
                            player.playername
                        )}
                    </strong>
                </td>


                <td>
                    ${escapeHTML(
                        player.bathand
                    )}
                </td>


                <td>
                    ${escapeHTML(
                        player.bowlstyle
                    )}
                </td>


                <td>
                    ${escapeHTML(
                        player.role
                    )}
                </td>


                <td>
                    ${escapeHTML(
                        player.country
                    )}
                </td>


                <td>
                    <strong>
                        ${player.ovr}
                    </strong>
                </td>


                <td>
                    ${player.price} Cr
                </td>


                <td>
                    ${escapeHTML(
                        player.status
                    )}
                </td>

            `;


            tableBody.appendChild(
                row
            );
        }
    );


    // =====================================================
    // STAR BUTTON EVENTS
    // =====================================================

    document
        .querySelectorAll(
            ".star-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const playerId =
                            Number(
                                button.dataset.playerId
                            );


                        toggleShortlist(
                            playerId
                        );
                    }
                );
            }
        );


    updateStats();
}


// =========================================================
// UPDATE STATS
// =========================================================

function updateStats() {

    const totalPlayers =
        document.querySelector(
            "#totalPlayers"
        );


    const shortlisted =
        document.querySelector(
            "#shortlistedPlayers"
        );


    const showing =
        document.querySelector(
            "#showingPlayers"
        );


    const budgetUsed =
        document.querySelector(
            "#budgetUsed"
        );


    const budgetRemaining =
        document.querySelector(
            "#budgetRemaining"
        );


    const squadSize =
        document.querySelector(
            "#squadSize"
        );


    const squadStatus =
        document.querySelector(
            "#squadStatus"
        );


    const currentBudget =
        getTotalPrice();


    const remainingBudget =
        MAX_BUDGET -
        currentBudget;


    const status =
        getSquadStatus();


    if (totalPlayers) {

        totalPlayers.textContent =
            players.length;
    }


    if (shortlisted) {

        shortlisted.textContent =
            shortlist.length;
    }


    if (showing) {

        showing.textContent =
            getFilteredPlayers().length;
    }


    if (budgetUsed) {

        budgetUsed.textContent =
            `${currentBudget} Cr`;
    }


    if (budgetRemaining) {

        budgetRemaining.textContent =
            `${remainingBudget} Cr`;
    }


    if (squadSize) {

        squadSize.textContent =
            `${shortlist.length} / ${MAX_SQUAD_SIZE}`;
    }


    if (squadStatus) {

        squadStatus.textContent =
            status.text;


        squadStatus.className =
            `squad-status ${status.className}`;
    }


    updateCountrySummary();
}


// =========================================================
// COUNTRY SUMMARY
// =========================================================

function updateCountrySummary() {

    const container =
        document.querySelector(
            "#countrySummary"
        );


    if (!container) {

        return;
    }


    const selected =
        getShortlistedPlayers();


    // Nothing selected
    if (
        selected.length === 0
    ) {

        container.innerHTML = `
            <span class="country-empty">
                No players selected
            </span>
        `;

        return;
    }


    const counts = {};


    selected.forEach(
        player => {

            counts[player.country] =
                (counts[player.country] || 0) +
                1;
        }
    );


    container.innerHTML = "";


    Object.entries(counts)

        .sort(
            ([a], [b]) =>
                a.localeCompare(b)
        )

        .forEach(
            ([country, count]) => {

                const item =
                    document.createElement(
                        "span"
                    );


                item.className =
                    `country-count ${
                        count >=
                        MAX_PLAYERS_PER_COUNTRY
                            ? "full"
                            : ""
                    }`;


                item.textContent =
                    `${country}: ${count}/${MAX_PLAYERS_PER_COUNTRY}`;


                container.appendChild(
                    item
                );
            }
        );
}


// =========================================================
// CLEAR FILTERS
// =========================================================

function clearFilters() {

    const ids = [

        "searchInput",

        "roleFilter",

        "countryFilter",

        "batFilter",

        "bowlFilter"

    ];


    ids.forEach(
        id => {

            const element =
                document.querySelector(
                    `#${id}`
                );


            if (element) {

                element.value = "";
            }
        }
    );


    const sort =
        document.querySelector(
            "#sortSelect"
        );


    if (sort) {

        sort.value =
            "name";
    }


    render();
}


// =========================================================
// BUTTON EVENTS
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {


        // Search
        document
            .querySelector(
                "#searchInput"
            )
            ?.addEventListener(
                "input",
                render
            );


        // Filters
        document
            .querySelector(
                "#roleFilter"
            )
            ?.addEventListener(
                "change",
                render
            );


        document
            .querySelector(
                "#countryFilter"
            )
            ?.addEventListener(
                "change",
                render
            );


        document
            .querySelector(
                "#batFilter"
            )
            ?.addEventListener(
                "change",
                render
            );


        document
            .querySelector(
                "#bowlFilter"
            )
            ?.addEventListener(
                "change",
                render
            );


        // Sort
        document
            .querySelector(
                "#sortSelect"
            )
            ?.addEventListener(
                "change",
                render
            );


        // Clear filters
        document
            .querySelector(
                "#clearFilters"
            )
            ?.addEventListener(
                "click",
                clearFilters
            );


        // All players
        document
            .querySelector(
                "#showAll"
            )
            ?.addEventListener(
                "click",
                () => {

                    showShortlistOnly =
                        false;


                    document
                        .querySelector(
                            "#showAll"
                        )
                        ?.classList
                        .add("active");


                    document
                        .querySelector(
                            "#showShortlist"
                        )
                        ?.classList
                        .remove("active");


                    render();
                }
            );


        // Shortlist
        document
            .querySelector(
                "#showShortlist"
            )
            ?.addEventListener(
                "click",
                () => {

                    showShortlistOnly =
                        true;


                    document
                        .querySelector(
                            "#showShortlist"
                        )
                        ?.classList
                        .add("active");


                    document
                        .querySelector(
                            "#showAll"
                        )
                        ?.classList
                        .remove("active");


                    render();
                }
            );


        // Load CSV
        loadPlayers();

    }
);
