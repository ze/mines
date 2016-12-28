"use strict";

var gamebar = document.querySelector("#gamebar"),
    content = document.querySelector("#content"),
    canvas = content.firstChild,
    ctx = canvas.getContext("2d");

var screen = screenSize();
var dist;

var img = new Image();
img.onload = function () {
    setup(screen.sizeX, screen.sizeY);
};
img.src = "assets/sheet.png";

// sprite coordinates
var faces = {
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
    start: function () {
        this.running = true;
        this.interval = setInterval(() => this.time++, 1000);
    },
    end: function () {
        this.running = false;
        clearInterval(this.interval);
    },
    clear: function () {
        this.time = 0;
    },
    format: function () {
        return Math.floor(this.time / 60) + "m " + this.time % 60 + "s";
    },
    running: false
};

function screenSize() {
    var x = window.innerWidth,
        y = window.innerHeight - gamebar.clientHeight;

    x -= x % 16;
    y -= y % 16;

    return {
        sizeX: x,
        sizeY: y
    };
}

function Box() {
    var xpos, ypos;
    var isMine, flagged, clicked, exposed = false;

    this.state = faces.box;
}

// gamebar features
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
                    ctx.clearRect(0, 0, screen.sizeX, screen.sizeY);
                    screen = screenSize();
                    dist = null;
                    content.style.marginTop = "0px";
                    setup(screen.sizeX, screen.sizeY);
                }();
            }, false);

            return face;
        }());

        var display = function (input) {
            var disp = document.querySelector("#display");
            if (!disp) {
                var disp = document.createElement("div");
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
                var vis = disp.style.display;
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

    if(!dist) {
        content.style.marginTop = function () {
            dist = window.innerHeight - document.body.clientHeight;
            return dist / 2 + "px";
        }();
    }

    drawGrid();
}

// populates canvas with boxes
function drawGrid() {
    for (var i = 0; i < canvas.width; i += B_WIDTH) {
        for (var j = 0; j < canvas.height; j += B_HEIGHT) {
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
    for (var i = 0; i < boxes.length; i++) {
        if (boxes[i].xpos == x && boxes[i].ypos == y) return boxes[i];
    }
    return null;
}

// all neighbors of box
function getNeighbors(box) {
    var [x, y] = [box.xpos, box.ypos];
    var nearby = [];

    for (var i = -1; i < 2; i++) {
        for (var j = -1; j < 2; j++) {
            nearby.push([x + i * 16, y + j * 16]);
        }
    }
    nearby.splice(4, 1); // remove coordinates that contain self

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

        timer.end();

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
    for (var i = 0; i < neighbors.length; i++) {
        if (neighbors[i].isMine) nearbyMines++;
    }

    if (nearbyMines > 0) {
        box.state = faces[nearbyMines];
    } else {
        box.state = faces.press;

        for (var i = 0; i < neighbors.length; i++) {
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
    for (var i = 0; i < boxes.length; i++) {
        if (boxes[i].isMine && !boxes[i].flagged) {
            boxes[i].state = boxes[i].clicked ? faces.loss : faces.mine;
        } else if (boxes[i].flagged && !boxes[i].isMine) {
            boxes[i].state = faces.wrong;
        }
        redrawBox(boxes[i]);
    }
}

function victory() {
    for (var i = 0; i < boxes.length; i++) {
        if (!boxes[i].flagged && boxes[i].isMine) return;
        if (!boxes[i].isMine && !(boxes[i].exposed || boxes[i].clicked)) return;
    }

    document.querySelector(".face").id = "shades";

    timer.end();
    gameEnd = true;
}

function gameInfo() {
    var [totalMines, totalClicks, flagged] = [0, 0, 0];
    for (var i = 0; i < boxes.length; i++) {
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
    for (var prop in info) {
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
        id: "infopanel",
        heading: "Game Information",
        body: table
    };
}

function gameSettings() {
    var form = document.createElement("form");
    form.action = "javascript:void(0);";
    form.method = "get";

    var input = function (type, name, value, label) {
        var lab = document.createElement("label");
        lab.innerHTML = label;

        var i = document.createElement("input");
        i.type = type;
        i.name = name;
        i.value = value;
        i.min = 0;
        i.max = 100;

        i.oninput = function () {
            i.value = i.value.replace(/-/g, "");
            if (i.value > 100) {
                i.value = 100;
            }
        };

        return {
            header: lab,
            input: i
        };
    };

    var fields = {
        width: input("number", "width", "10", "Width"),
        height: input("number", "height", "10", "Height"),
        mines: input("number", "mines", "5", "Chance for mines (1/n)"),
    };

    var button = document.createElement("input");
    button.type = "submit";
    button.value = "Generate";

    for (var field in fields) {
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
        setup(gameWidth,gameHeight);
        document.querySelector("#display").style.display = "none";
    }, false);
    return {
        id: "settingspanel",
        heading: "Settings",
        body: form
    };
}
