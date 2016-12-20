var canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d");

var img = new Image();
img.onload = function () {
    setup(960, 800);
}
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
    one: [0, 16],
    two: [16, 16],
    three: [32, 16],
    four: [48, 16],
    five: [64, 16],
    six: [80, 16],
    seven: [96, 16],
    eight: [112, 16]
};

var B_HEIGHT = 16,
    B_WIDTH = 16,
    MINE_CHANCE = .25;

var boxes = [];

function Box() {
    var xpos, ypos;

    var isMine = false,
        flagged = false;

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

        face.addEventListener("mouseleave", function() {
            if (face.id === "pressed") {
                face.id = "normal";
            }
        }, false);

        face.addEventListener("click", function() {
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
    
    ctx.fillStyle = "gray";
    ctx.fillRect(0, 0, 960, 800);

    canvas.addEventListener("click", function (evt) {
        var mousePos = function (evt) {
            rect = canvas.getBoundingClientRect();
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

        console.log(fieldPos.x + " " + fieldPos.y);

        b = getBox(fieldPos.x, fieldPos.y);
        b.state = faces.press;
        if (b.isMine) {
            b.state = faces.mine;
        }

    }, false);
    drawGrid();
    requestAnimationFrame(update);
}

function drawGrid() {
    for (var i = 0; i < canvas.width; i += B_WIDTH) {   
        for (var j = 0; j < canvas.height; j += B_HEIGHT) {
            drawBox(i, j);
        }
    }
}

function drawBox(x, y) {
    b = new Box();
    b.xpos = x;
    b.ypos = y;

    if (Math.random() > MINE_CHANCE) b.isMine = true;

    ctx.drawImage(img, b.state[0], b.state[1], B_WIDTH, B_HEIGHT, x, y, B_WIDTH, B_HEIGHT);

    boxes.push(b);
}

function getBox(x, y) {
     for (var i = 0; i < boxes.length; i++) {
        if (boxes[i].xpos == x && boxes[i].ypos == y) return boxes[i];
    }   
    return null;
}

function update() {
    requestAnimationFrame(update);
}