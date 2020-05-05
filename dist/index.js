import { prng_create, number_to_hash } from "./random.js";

const input = document.querySelector('#input');
const canvas = document.querySelector('#canvas');
const image = document.querySelector('#image');
const zoomSlider = document.querySelector('#zoom');
const seedInput = document.querySelector('#seed');
const loadSeedButton = document.querySelector('input#loadSeed');
const newSeedButton = document.querySelector('input#newSeed');
const highlight = document.querySelector('#highlight');
const highlightSpan = highlight.querySelector('span');

/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext('2d');
let num_tiles_h_x;
let num_tiles_h_y;
let num_tiles_v_x;
let num_tiles_v_y;
let tileSize;
let tileInfos = { horizontal: {}, vertical: {} };
let imageData;
let mapData = {};
seedInput.value = '';
let rng = prng_create("hello");

function rgbToHex(val) { 
  let hex = Number(val).toString(16);
  if(hex.length < 2) {
    hex = '0' + hex;
  }
  return hex;
}

function fullColorHex(r,g,b) {   
  let red = rgbToHex(r);
  let green = rgbToHex(g);
  let blue = rgbToHex(b);
  return red + green + blue;
}

function assert(cond, msg) { if(!cond) throw new Error(msg); }

window.addEventListener('load', () => {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  image.src = 'inside.png';
  seedInput.value = number_to_hash(Math.random());
  rng = prng_create(seedInput.value);
  canvas.addEventListener('mousemove', ev => {
    const zoom = zoomSlider.value;
    const mouseX = ev.offsetX;
    const mouseY = ev.offsetY;
    const tileX = Math.floor(mouseX / (tileSize * zoom));   
    const tileY = Math.floor(mouseY / (tileSize * zoom));
    const idk = tileX - tileY;
    
    if(mapData[`${tileX}_${tileY}`] != undefined) {
    highlightSpan.innerText = (mapData[`${tileX}_${tileY}`].tilePos.x + 1) + ',' + (mapData[`${tileX}_${tileY}`].tilePos.y + 1);
      highlight.style.visibility = 'initial';
    } else {
      highlight.style.visibility = 'hidden';
    }
    if(idk % 4 == 0) {
      highlight.style.width = tileSize * 2 * zoom + 'px';
      highlight.style.height = tileSize * zoom + 'px';
      highlight.style.left = tileSize * tileX * zoom + 'px';
      highlight.style.top = tileSize * tileY * zoom + 'px';
      highlightSpan.style.justifySelf = 'start';
      highlightSpan.style.alignSelf = 'start';
    } else if(idk % 4 == 1 || idk % 4 == -3) {
      highlight.style.width = tileSize * 2 * zoom + 'px';
      highlight.style.height = tileSize * zoom + 'px';
      highlight.style.left = tileSize * (tileX - 1) * zoom + 'px';
      highlight.style.top = tileSize * tileY * zoom + 'px';
      highlightSpan.style.justifySelf = 'end';
      highlightSpan.style.alignSelf = 'end';
    } else if(idk % 4 == 2 || idk % 4 == -2) {
      highlight.style.width = tileSize * zoom + 'px';
      highlight.style.height = tileSize * 2 * zoom + 'px';
      highlight.style.left = tileSize * tileX * zoom + 'px';
      highlight.style.top = tileSize * (tileY - 1) * zoom + 'px';
      highlightSpan.style.justifySelf = 'end';
      highlightSpan.style.alignSelf = 'end';
    } else if(idk % 4 == 3 || idk % 4 == -1) {
      highlight.style.width = tileSize * zoom + 'px';
      highlight.style.height = tileSize * 2 * zoom + 'px';
      highlight.style.left = tileSize * tileX * zoom + 'px';
      highlight.style.top = tileSize * tileY * zoom + 'px';
      highlightSpan.style.justifySelf = 'start';
      highlightSpan.style.alignSelf = 'start';
    }
  });
});

image.addEventListener('load', () => { 
  ctx.imageSmoothingEnabled  = false;
  ctx.drawImage(image, 0, 0);
  imageData = ctx.getImageData(0, 0, image.width, image.height);
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  
  const wangData = parseImageData(imageData.data);
  tileSize = wangData.tileSize;
  num_tiles_h_x = wangData.count_h_x;
  num_tiles_h_y = wangData.count_h_y;
  num_tiles_v_x = wangData.count_v_x;
  num_tiles_v_y = wangData.count_v_y;

  highlight.style.width = tileSize * 2 * zoomSlider.value + 'px';
  highlight.style.height = tileSize * zoomSlider.value + 'px';
  highlight.className = 'zoom-level-' + zoomSlider.value;

  tileInfos = { horizontal: {}, vertical: {} };
  for(let y = 0; y < num_tiles_h_y; y++) {
    for(let x = 0; x < num_tiles_h_x; x++) {
      tileInfos.horizontal[`${x}_${y}`] = getTileInfo(x, y, true);
    }
  }
  for(let y = 0; y < num_tiles_v_y; y++) {
    for(let x = 0; x < num_tiles_v_x; x++) {
      tileInfos.vertical[`${x}_${y}`] = getTileInfo(x, y, false);
    }
  }
  drawMap();
});

zoomSlider.addEventListener('input', () => {
  if(image.complete) {
    highlight.style.width = tileSize * 2 * zoomSlider.value + 'px';
    highlight.style.height = tileSize * zoomSlider.value + 'px';
    highlight.className = 'zoom-level-' + zoomSlider.value;
    drawMap();
  }
});

loadSeedButton.addEventListener('click', () => {
  rng = prng_create(seedInput.value);
  if(image.complete) {
    drawMap();
  }
});

newSeedButton.addEventListener('click', () => {
  seedInput.value = number_to_hash(Math.random());
  rng = prng_create(seedInput.value);
  if(image.complete) {
    drawMap();
  }
});

function parseImageData(imageData) {
  // Count tiles
  let tileSize = -2;
  let count_h_x = 0;
  let count_h_y = 0;
  let count_v_x = 0;
  let count_v_y = 0;

  let currentPixel = 2;
  // Count tile size
  while(currentPixel <= image.height) {
    const [ a, r, g, b ] = getPixelData(imageData, 0, currentPixel, image.width);
    const color = fullColorHex(r, g, b);
    if(color === 'ffffff') {
      break;
    }
    tileSize++;
    currentPixel++;
  }
  
  currentPixel = 2;
  let prevColor = '';
  // Walk the pixels downards, count the white gaps between tiles and when the gap is bigger we have reached the end and start of vertical tiles
  while(currentPixel <= image.height) {
    const [ a, r, g, b ] = getPixelData(imageData, 0, currentPixel, image.width);
    const color = fullColorHex(r, g, b);
    if(color === 'ffffff') {
      if(prevColor === 'ffffff') {
        // We have reached the end
        currentPixel += 2;
        break;
      }
      count_h_y++;
    }
    prevColor = color;
    currentPixel++;
  }
  // We continue going downwards but now count_v_y
  while(currentPixel <= image.height) {
    const [ a, r, g, b ] = getPixelData(imageData, 0, currentPixel, image.width);
    const color = fullColorHex(r, g, b);
    if(color === 'ffffff') {
      count_v_y++;
    }
    currentPixel++;
  }
  // Now count from left to right count_h_x
  currentPixel = 0;
  prevColor = '';
  while(currentPixel <= image.width) {
    const [ a, r, g, b ] = getPixelData(imageData, currentPixel, 2, image.width);
    const color = fullColorHex(r, g, b);
    if(color === 'ffffff') {
      if(prevColor === 'ffffff') {
        break;
      }
      count_h_x++;
    }
    prevColor = color;
    currentPixel++;
  }
  // Lastly count_v_x
  currentPixel = 0;
  prevColor = '';
  while(currentPixel <= image.width) {
    const [ a, r, g, b ] = getPixelData(imageData, currentPixel, (tileSize + 3) * count_h_y + 4, image.width);
    const color = fullColorHex(r, g, b);
    if(color === 'ffffff') {
      if(prevColor === 'ffffff') {
        break;
      }
      count_v_x++;
    }
    prevColor = color;
    currentPixel++;
  }

  return {
    tileSize,
    count_h_x, count_h_y,
    count_v_x, count_v_y
  };
}

function getValidTiles(constraints, type) {
  const validTiles = [];
  let max_x = type == 'horizontal' ? num_tiles_h_x : num_tiles_v_x
  let max_y = type == 'horizontal' ? num_tiles_h_y : num_tiles_v_y
  for(let y = 0; y < max_y; y++) {
    for(let x = 0; x < max_x; x++) {
      const tileInfo = tileInfos[type][`${x}_${y}`];
      let failed = false;
      for(let [key, value] of Object.entries(constraints.edges)) {
        if(tileInfo.edges[key] != value) {
          failed = true;
          break;
        }
      }
      if(failed) {
        continue;
      }
      validTiles.push({ x, y });
    }  
  }
  return validTiles;
}

function drawMap() {
  mapData = {};
  const zoom = zoomSlider.value;
  ctx.lineWidth = '1';
  ctx.strokeStyle = 'red';

  let amountToDrawX = canvas.width / tileSize / zoom;
  let amountToDrawY = canvas.height / tileSize / zoom;  

  for(let y = -1; y < amountToDrawY; y++) {
    for(let x = -1; x < amountToDrawX; x++) {
      // Horizontal
      if((x - y) % 4 == 0) {
        const constraints = { edges: {} };

        if(mapData[`${x-1}_${y}`] != undefined) {
          constraints.edges.left = mapData[`${x-1}_${y}`].right;
        }
        if(mapData[`${x}_${y-1}`] != undefined) {
          constraints.edges.topLeft = mapData[`${x}_${y-1}`].bottom;
        }
        if(mapData[`${x+1}_${y-1}`] != undefined) {
          constraints.edges.topRight = mapData[`${x+1}_${y-1}`].bottom;
        }
        if(mapData[`${x+2}_${y}`] != undefined) {
          constraints.edges.right = mapData[`${x+2}_${y}`].left;
        }

        let validTiles = getValidTiles(constraints, 'horizontal');
        const randomIndex = Math.floor(rng(x, y) * validTiles.length);
        const randomTile = validTiles[randomIndex];
        const tileInfo = tileInfos.horizontal[`${randomTile.x}_${randomTile.y}`];
        const { x:tile_coords_x, y:tile_coords_y } = tilePosToPixelCoordinates(randomTile.x, randomTile.y, true);
        ctx.drawImage(image, tile_coords_x+1, tile_coords_y+1, tileSize*2, tileSize,
          x * tileSize * zoom, y * tileSize * zoom,
          tileSize*2*zoom, tileSize * zoom);

        mapData[`${x}_${y}`] = {
          tilePos: { type: 'horizontal', x:randomTile.x, y:randomTile.y },
          tileInfo,
          top: tileInfo.edges.topLeft,
          left: tileInfo.edges.left,
          bottom: tileInfo.edges.bottomLeft,
        }
        mapData[`${x+1}_${y}`] = {
          tilePos: { type: 'horizontal', x:randomTile.x, y:randomTile.y },
          tileInfo,
          top: tileInfo.edges.topRight,
          right: tileInfo.edges.right,
          bottom: tileInfo.edges.bottomRight,
        }
      }
      // Vertical down
      if((x - y) % 4 == 3 || (x - y) % 4 == -1) {
        const constraints = { edges: {} };

        if(mapData[`${x-1}_${y}`] != undefined) {
          constraints.edges.topLeft = mapData[`${x-1}_${y}`].right;
        }
        if(mapData[`${x}_${y-1}`] != undefined) {
          constraints.edges.top = mapData[`${x}_${y-1}`].bottom;
        }

        let validTiles = getValidTiles(constraints, 'vertical');
        const randomIndex = Math.floor(rng(x, y) * validTiles.length); //Math.floor(Math.random() * validTiles.length);
        const randomTile = validTiles[randomIndex];
        const tileInfo = tileInfos.vertical[`${randomTile.x}_${randomTile.y}`];

        const { x:tile_coords_x, y:tile_coords_y } = tilePosToPixelCoordinates(randomTile.x, randomTile.y, false);
        ctx.drawImage(image, tile_coords_x+1, tile_coords_y+1, tileSize, tileSize*2,
          x * tileSize * zoom, y * tileSize * zoom,
          tileSize*zoom, tileSize*2*zoom);
        
        mapData[`${x}_${y}`] = {
          tilePos: { type: 'vertical', x:randomTile.x, y:randomTile.y },
          tileInfo,
          left: tileInfo.edges.topLeft,
          top: tileInfo.edges.top,
          right: tileInfo.edges.topRight,
        }
        mapData[`${x}_${y+1}`] = {
          tilePos: { type: 'vertical', x:randomTile.x, y:randomTile.y },
          tileInfo,
          left: tileInfo.edges.bottomLeft,
          bottom: tileInfo.edges.bottom,
          right: tileInfo.edges.bottomRight,
        }
      }
    }
  }
}
/* 
Input is the tile position (e.g. 2, 1 = second from the left, first from top) and
returns the coordinates of the topleft pixel of that tile.
*/
function tilePosToPixelCoordinates(tx, ty, horizontal) {
  let x, y;
  if(horizontal) {
    x = tx * tileSize * 2 + 3 * tx;
    y = ty * tileSize + 3 * ty + 2;
  } else {
    const offset_vertical_tiles_start = num_tiles_h_y * (tileSize + 3) + 4;
    x = tx * tileSize + 3 * tx;
    y = ty * tileSize * 2 + 3 * ty;
    y += offset_vertical_tiles_start;
  }
  return { x, y }
}

function getPixelData(imageData, x, y, imageWidth) {
  let r = imageData[(y * imageWidth + x) * 4 + 0];
  let g = imageData[(y * imageWidth + x) * 4 + 1];
  let b = imageData[(y * imageWidth + x) * 4 + 2];
  let a = imageData[(y * imageWidth + x) * 4 + 3];
  return [ a, r, g, b ];
}

function getTileInfo(tx, ty, horizontal) {
  let points_h = {
    corners: {
      topLeft: { x: 0, y: 0 },
      top: { x: tileSize, y: 0 },
      topRight: { x: tileSize*2+1, y: 0 },
      bottomLeft: { x: 0, y: tileSize+1 },
      bottom: { x: tileSize, y: tileSize+1 },
      bottomRight: { x: tileSize*2+1, y: tileSize+1 },
    },
    edges: {
      topLeft: { x: Math.floor(tileSize * 0.5), y: 0 },
      topRight: { x: Math.floor(tileSize * 1.5), y: 0 },
      left: { x: 0, y: Math.floor(tileSize * 0.5) },
      right: { x: tileSize * 2 + 1, y: Math.floor(tileSize * 0.5) },
      bottomLeft: { x: Math.floor(tileSize * 0.5), y: tileSize + 1 },
      bottomRight: { x: Math.floor(tileSize * 1.5), y: tileSize + 1 },
    }
  }

  let points_v = {
    corners: {
      topLeft: { x: 0, y: 0 },
      topRight: { x: tileSize+1, y: 0 },
      left: { x: 0, y: tileSize },
      right: { x: tileSize+1, y: tileSize },
      bottomLeft: { x: 0, y: tileSize*2+1 },
      bottomRight: { x: tileSize+1, y: tileSize*2+1 },
    },
    edges: {
      topLeft: { x: 0, y: Math.floor(tileSize * 0.5) },
      top: { x: Math.floor(tileSize * 0.5), y: 0 },
      topRight: { x: tileSize+1, y: Math.floor(tileSize * 0.5) },
      bottomLeft: { x: 0, y: Math.floor(tileSize * 1.5) },
      bottom: { x: Math.floor(tileSize * 0.5), y: tileSize*2 + 1 },
      bottomRight: { x: tileSize+1, y: Math.floor(tileSize * 1.5) },
    }
  }

  const points = horizontal ? points_h : points_v;

  let tileCoords = tilePosToPixelCoordinates(tx, ty, horizontal);
  for(let [key, value] of Object.entries(points.corners)) {
    let x = tileCoords.x + value.x;
    let y = tileCoords.y + value.y;    
    const [ a, r, g, b ] = getPixelData(imageData.data, x, y, imageData.width, imageData.height);
    points.corners[key] = fullColorHex(r, g, b);
  }
  for(let [key, value] of Object.entries(points.edges)) {
    let x = tileCoords.x + value.x;
    let y = tileCoords.y + value.y;    
    const [ a, r, g, b ] = getPixelData(imageData.data, x, y, imageData.width, imageData.height);
    points.edges[key] = fullColorHex(r, g, b);
  }

  return points;
}

input.addEventListener('input', ev => {
  const file = ev.target.files[0];
  const reader = new FileReader();
  reader.addEventListener('load', ev => {
    const result = ev.target.result;
    image.src = result;
  });
  reader.readAsDataURL(file);
});
