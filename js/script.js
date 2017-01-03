"use strict";

var gamebar = document.querySelector("#gamebar"),
    content = document.querySelector("#content"),
    canvas = content.firstChild,
    ctx = canvas.getContext("2d");

var screen = gameSize();
var dist;

var img = new Image();
img.onload = function () {
    setup(screen.x, screen.y);
};
img.src = "assets/sheet.png";

// sprite coordinates
const faces = {
    box: [0, 0],
    press: [16, 0],
    flag: [32, 0],
    mine: [48, 0],
    wrong: [64, 0],
    loss: [80, 0],
    question: [96, 0],
    questionPressed: [112, 0],
    1: [0, 16],
    2: [16, 16],
    3: [32, 16],
    4: [48, 16],
    5: [64, 16],
    6: [80, 16],
    7: [96, 16],
    8: [112, 16]
};

const [B_WIDTH, B_HEIGHT] = [16, 16];

var boxes = [];
var mineChance = 1 / 5;
var gameEnd = false;

// game timer
var timer = {
    time: 0,
    start() {
        this.running = true;
        this.interval = setInterval(() => this.time++, 1000);
    },
    stop() {
        this.running = false;
        clearInterval(this.interval);
    },
    clear() { this.time = 0; },
    format() {
        return Math.floor(this.time / 60) + "m " + this.time % 60 + "s";
    },
    running: false
};

function gameSize(x = window.innerWidth,
                  y = window.innerHeight - gamebar.clientHeight) {

    x -= x % 16;
    y -= y % 16;

    return {x, y};
}

function Box() {
    var xpos, ypos;
    var isMine, flagged, clicked, exposed = false;

    this.state = faces.box;
}

(function () {
    var logo = new Image();
    logo.setAttribute("id", "logo");
    logo.onload = function () {
        gamebar.appendChild(logo);

        gamebar.appendChild(function () {
            var face = document.createElement("div");
            face.setAttribute("class", "face");
            face.setAttribute("id", "normal");

            face.addEventListener("mousedown", function () {
                face.id = "pressed";
            }, false);

            face.addEventListener("mouseleave", function () {
                if (face.id == "pressed") {
                    face.id = "normal";
                }
            }, false);

            face.addEventListener("click", function () {
                face.id = "normal";
                var clear = function () {
                    gameEnd = false;
                    boxes = [];
                    timer.clear();

                    ctx.clearRect(0, 0, screen.x, screen.y);

                    dist = null;
                    content.style.marginTop = "0px";

                    var fit = gameSize();
                    var resizeX = fit.x < screen.x ? fit.x : screen.x;
                    var resizeY = fit.y < screen.y ? fit.y : screen.y;

                    setup(resizeX, resizeY);
                }();
            }, false);

            return face;
        }());

        var display = function (input) {
            var disp = document.querySelector("#display");
            if (!disp) {
                disp = document.createElement("div");
                disp.setAttribute("id", "display");
                disp.style.display = "block";
                disp.addEventListener("click", function (e) {
                    e.stopPropagation();
                }, false);
                document.body.appendChild(disp);
            }

            var old = disp.firstChild ? disp.firstChild.innerHTML : null;

            while (disp.hasChildNodes()) disp.removeChild(disp.lastChild);

            var text = document.createElement("p");
            text.innerHTML = input.heading;

            disp.appendChild(text);
            disp.appendChild(input.body);

            if (old && input.heading === old || disp.style.display == "none") {
                let vis = disp.style.display;
                vis = vis == "none" ? "block" : "none";
                disp.style.display = vis;
            }
        };

        gamebar.appendChild(function () {
            var info = document.createElement("div");
            info.setAttribute("id", "info");

            info.addEventListener("click", function (e) {
                e.stopPropagation();
                display(gameInfo());
            }, false);

            return info;
        }());

        gamebar.appendChild(function () {
            var settings = document.createElement("div");
            settings.setAttribute("id", "settings");

            settings.addEventListener("click", function (e) {
                e.stopPropagation();
                display(gameSettings());
            }, false);

            return settings;
        }());

        document.addEventListener("click", function () {
            var disp = document.querySelector("#display");
            if (disp && disp.style.display != "none") {
                disp.style.display = "none";
                while (disp.hasChildNodes()) disp.removeChild(disp.lastChild);
            }
        }, false);
    };
    logo.src = "assets/logo.png";
})();

var fieldPos;
canvas.addEventListener("mousemove", function (evt) {
    var mousePos = function (evt) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }(evt);

    fieldPos = {
        x: Math.floor(mousePos.x / 16) * 16,
        y: Math.floor(mousePos.y / 16) * 16
    };
}, false);

canvas.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    if (gameEnd) return;

    var b = getBox(fieldPos.x, fieldPos.y);
    if (b.exposed || b.clicked) return;

    // flag swapping
    b.flagged = b.flagged ? false : true;
    b.state = b.flagged ? faces.flag : faces.box;

    redrawBox(b);
    victory();
}, false);

canvas.addEventListener("click", function () {
    if (gameEnd) return;

    if (!timer.running) timer.start();

    var b = getBox(fieldPos.x, fieldPos.y);
    if (b.exposed || b.flagged) return;
    b.clicked = true;

    if (b.isMine) {
        b.state = faces.loss;
    }

    if (b.state == faces.box) {
        b.state = faces.press;
    }

    determineState(b);
    victory();
}, false);

// prepares for new game with set constraints
function setup(width, height) {
    canvas.width = width;
    canvas.height = height;
    boxes = [];

    if (!dist) {
        content.style.marginTop = function () {
            dist = window.innerHeight - document.body.clientHeight;
            return dist / 2 + "px";
        }();
    }

    drawGrid();
}

// populates canvas with boxes
function drawGrid() {
    for (let i = 0; i < canvas.width; i += B_WIDTH) {
        for (let j = 0; j < canvas.height; j += B_HEIGHT) {
            drawBox(i, j);
        }
    }
}

// draws box and determines if mine or not
function drawBox(x, y) {
    var b = new Box();
    [b.xpos, b.ypos] = [x, y];

    if (Math.random() < mineChance) b.isMine = true;

    ctx.drawImage(img, b.state[0], b.state[1], B_WIDTH, B_HEIGHT, x, y, B_WIDTH, B_HEIGHT);

    boxes.push(b);
}

// get box at position
function getBox(x, y) {
    for (let i = 0; i < boxes.length; i++) {
        if (boxes[i].xpos == x && boxes[i].ypos == y) return boxes[i];
    }
    return null;
}

// all neighbors of box
function getNeighbors(box) {
    var [x, y] = [box.xpos, box.ypos];
    var nearby = [];

    for (let i = -1; i < 2; i++) {
        for (let j = -1; j < 2; j++) {
            nearby.push([x + i * 16, y + j * 16]);
        }
    }
    nearby.splice(4, 1); // remove coordinates that contain this box

    var nearBounds = nearby.map(function (b) {
        return getBox(b[0], b[1]);
    }).filter(function (b) {
        return b;
    });

    return nearBounds;
}

// determine if game lost or to spread
function determineState(box) {
    if (box.clicked && box.isMine) {
        gameEnd = true;

        timer.stop();

        box.state = faces.loss;
        document.querySelector(".face").id = "dead";

        exposeField();
    } else {
        gridSpread(box);
    }
}

// grid clearing
function gridSpread(box) {
    var neighbors = getNeighbors(box).filter(function (b) {
        return !b.exposed;
    });

    var nearbyMines = 0;
    for (let i = 0; i < neighbors.length; i++) {
        if (neighbors[i].isMine) nearbyMines++;
    }

    if (nearbyMines > 0) {
        box.state = faces[nearbyMines];
    } else {
        box.state = faces.press;

        for (let i = 0; i < neighbors.length; i++) {
            neighbors[i].exposed = true;
            gridSpread(neighbors[i]);
        }
    }

    if (!box.flagged) {
        redrawBox(box);
    } else {
        box.exposed = false;
        box.clicked = false;
    }
}

function redrawBox(box) {
    ctx.clearRect(box.xpos, box.ypos, B_WIDTH, B_HEIGHT);
    ctx.drawImage(img, box.state[0], box.state[1], B_WIDTH, B_HEIGHT, box.xpos, box.ypos, B_WIDTH, B_HEIGHT);
}

function exposeField() {
    for (let i = 0; i < boxes.length; i++) {
        if (boxes[i].isMine && !boxes[i].flagged) {
            boxes[i].state = boxes[i].clicked ? faces.loss : faces.mine;
        } else if (boxes[i].flagged && !boxes[i].isMine) {
            boxes[i].state = faces.wrong;
        }
        redrawBox(boxes[i]);
    }
}

function victory() {
    for (let i = 0; i < boxes.length; i++) {
        if (!boxes[i].flagged && boxes[i].isMine) return;
        if (!boxes[i].isMine && !(boxes[i].exposed || boxes[i].clicked)) return;
    }

    document.querySelector(".face").id = "shades";

    timer.stop();
    gameEnd = true;
}

function gameInfo() {
    var [totalMines, totalClicks, flagged] = [0, 0, 0];
    for (let i = 0; i < boxes.length; i++) {
        if (boxes[i].isMine) totalMines++;
        if (boxes[i].clicked) totalClicks++;
        if (boxes[i].flagged) flagged++;
    }

    var info = {
        "Total Mines": totalMines,
        "Total Clicks": totalClicks,
        "Time Played": timer.format(),
        "Clicks per Second": function () {
            var cps = timer.time != 0 ? totalClicks / timer.time : 0
            return cps.toFixed(2);
        }(),
        "Progress" : function () {
            var percentage = flagged / totalMines;
            percentage *= 100;
            return percentage.toFixed(2) + "%";
        }()
    };

    var table = document.createElement("table");
    for (let prop in info) {
        var row = document.createElement("tr");
        var desc = document.createElement("td");
        var val = document.createElement("td");
        desc.innerHTML = prop;
        val.innerHTML = info[prop];
        row.appendChild(desc);
        row.appendChild(val);
        table.appendChild(row);
    }

    return {
        heading: "Game Information",
        body: table
    };
}

function gameSettings() {
    var form = document.createElement("form");
    form.action = "javascript:void(0);";
    form.method = "get";

    var input = function (type, name, value, max, label) {
        var lab = document.createElement("label");
        lab.innerHTML = label;

        var i = document.createElement("input");
        i.type = type;
        i.name = name;
        i.value = value;

        i.oninput = function () {
            i.value = i.value.replace(/-/g, "");
            if (i.value == "0") {
                i.value = 1;
            }
            if (i.value > max) {
                i.value = max;
            }
        };

        return {
            header: lab,
            input: i
        };
    };

    var fit = gameSize();

    var fields = {
        width: input("number", "width", 10, fit.x / 16, "Width"),
        height: input("number", "height", 10, fit.y / 16, "Height"),
        mines: input("number", "mines", 5, 25, "Chance for mines (1/n)"),
    };

    var button = document.createElement("input");
    button.type = "submit";
    button.value = "Generate";

    for (let field in fields) {
        form.appendChild(fields[field].header);
        form.appendChild(fields[field].input);
    }
    form.appendChild(button);

    form.addEventListener("submit", function () {
        var gameWidth = fields.width.input.value * 16;
        var gameHeight = fields.height.input.value * 16;
        mineChance = 1 / fields.mines.input.value;

        gameEnd = false;
        document.querySelector(".face").id = "normal";

        dist = null;
        content.style.marginTop = "0px";

        screen = gameSize(gameWidth, gameHeight);
        setup(screen.x, screen.y);

        document.querySelector("#display").style.display = "none";
    }, false);

    return {
        heading: "Settings",
        body: form
    };
}
