"use strict";

var canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d");

var img = new Image();
img.onload = function () {
    setup(960, 800);
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

var B_HEIGHT = 16,
    B_WIDTH = 16,
    MINE_CHANCE = 1 / 8;

var boxes = [];

function Box() {
    var xpos,
        ypos;

    var isMine,
        flagged,
        clicked,
        exposed = false;

    this.state = faces.box;
}

var header = function () {
    var bar = document.createElement("div");
    bar.setAttribute("id", "gamebar");

    var smiley = function () {
        var face = document.createElement("div");
        face.setAttribute("class", "face");
        face.setAttribute("id", "normal");

        face.addEventListener("mousedown", function () {
            face.id = "pressed";
        }, false);

        face.addEventListener("mouseleave", function () {
            if (face.id === "pressed") {
                face.id = "normal";
            }
        }, false);

        face.addEventListener("click", function () {
            face.id = "normal";
        }, false);

        return face;
    }

    bar.appendChild(smiley());
    return bar;
}

function setup(width, height) {
    var content = document.createElement("div");
    content.setAttribute("id", "content");
    canvas.width = width;
    canvas.height = height;

    content.appendChild(canvas);

    document.body.appendChild(header());
    document.body.appendChild(content);

    canvas.addEventListener("click", function (evt) {
        var mousePos = function (evt) {
            var rect = canvas.getBoundingClientRect();
            return {
                x: evt.clientX - rect.left,
                y: evt.clientY - rect.top
            };
        }

        var pos = mousePos(evt);

        var fieldPos = {
            x: Math.floor(pos.x / 16) * 16,
            y: Math.floor(pos.y / 16) * 16
        };

        var b = getBox(fieldPos.x, fieldPos.y);
        if (b.isMine) {
            b.state = faces.loss;
            b.clicked = true;
        }
        if (b.state == faces.box) {
            b.state = faces.press;
            b.clicked = true;
        }

        determineStates(b);
    }, false);
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
    b.xpos = x;
    b.ypos = y;

    if (Math.random() < MINE_CHANCE) b.isMine = true;

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
    var x = box.xpos,
        y = box.ypos;

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
        return b
    });

    return nearBounds;
}

function determineStates(box) {
    if (box.clicked && box.isMine) {
        box.state = faces.loss;
        redrawBox(box);
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
            for (var i = 0; i < neighbors.length; i++) {
                neighbors[i].clicked = true;
                box.exposed = true;
                determineStates(neighbors[i]);
            }
        }
    }
    redrawBox(box);
}

function redrawBox(box) {
    ctx.clearRect(box.xpos, box.ypos, B_WIDTH, B_HEIGHT);
    ctx.drawImage(img, box.state[0], box.state[1], B_WIDTH, B_HEIGHT, box.xpos, box.ypos, B_WIDTH, B_HEIGHT);
}

function exposeField() {
    for (var i = 0; i < boxes.length; i++) {
        if (!boxes[i].clicked && boxes[i].isMine) {
            boxes[i].state = faces.mine;
            redrawBox(boxes[i]);
        }
    }
}