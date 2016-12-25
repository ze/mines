"use strict";

var gamebar = document.getElementById("gamebar"),
    content = document.getElementById("content"),
    canvas = content.firstChild,
    ctx = canvas.getContext("2d");

var screen = boardSize();
var dist;

var img = new Image();
img.onload = function () {
    setup(screen.sizeX, screen.sizeY);
};
img.src = "assets/sheet.png";

var faces = {
    box: [0, 0],
    press: [16, 0],
    flag: [32, 0],
    mine: [48, 0],
    wrong: [64, 0],
    loss: [80, 0],
    question: [96, 0],
    questionPressed: [112, 0],
    "1": [0, 16],
    "2": [16, 16],
    "3": [32, 16],
    "4": [48, 16],
    "5": [64, 16],
    "6": [80, 16],
    "7": [96, 16],
    "8": [112, 16]
};

const [B_HEIGHT, B_WIDTH] = [16, 16];

var boxes = [];
var mineChance = 1 / 5;
var loss = false;

function boardSize() {
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
            loss = false;
            boxes = [];
            ctx.clearRect(0, 0, screen.sizeX, screen.sizeY);
            setup(screen.sizeX, screen.sizeY);
        }();
    }, false);

    return face;
}());

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
    if (loss) return;

    var b = getBox(fieldPos.x, fieldPos.y);
    if (b.exposed) return;

    // flag swapping
    b.flagged = b.flagged ? false : true;
    b.state = b.flagged ? faces.flag : faces.box;

    redrawBox(b);
}, false);

canvas.addEventListener("click", function () {
    if (loss) return;

    var b = getBox(fieldPos.x, fieldPos.y);
    if (b.exposed || b.flagged) return;
    b.clicked = true;

    if (b.isMine) {
        b.state = faces.loss;
    }

    if (b.state == faces.box) {
        b.state = faces.press;
    }

    determineStates(b);
}, false);

function setup(width, height) {
    canvas.width = width;
    canvas.height = height;

    if(!dist) {
        content.style.marginTop = function () {
            dist = window.innerHeight - document.body.clientHeight;
            return dist / 2 + "px";
        }();
    }

    drawGrid();
}

function drawGrid() {
    for (var i = 0; i < canvas.width; i += B_WIDTH) {
        for (var j = 0; j < canvas.height; j += B_HEIGHT) {
            drawBox(i, j);
        }
    }
}

function drawBox(x, y) {
    var b = new Box();
    [b.xpos, b.ypos] = [x, y];

    if (Math.random() < mineChance) b.isMine = true;

    ctx.drawImage(img, b.state[0], b.state[1], B_WIDTH, B_HEIGHT, x, y, B_WIDTH, B_HEIGHT);

    boxes.push(b);
}

function getBox(x, y) {
    for (var i = 0; i < boxes.length; i++) {
        if (boxes[i].xpos == x && boxes[i].ypos == y) return boxes[i];
    }
    return null;
}

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

function determineStates(box) {
    if (box.clicked && box.isMine) {
        loss = true;
        box.state = faces.loss;
        exposeField();
    } else {
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
            box.clicked = true;

            for (var i = 0; i < neighbors.length; i++) {
                neighbors[i].exposed = true;
                determineStates(neighbors[i]);
            }
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
